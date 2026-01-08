import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLogicalIntegrity() {
    console.log('--- Starting Logical Integrity Check ---');

    // 1. Check for Tasks with missing Dynamic Status (Migration check)
    const tasksWithoutStatusId = await prisma.task.count({
        where: {
            taskStatusId: null
        }
    });

    if (tasksWithoutStatusId > 0) {
        console.warn(`[WARN] Found ${tasksWithoutStatusId} tasks using only legacy 'status' string (taskStatusId is null).`);
    } else {
        console.log('[OK] All tasks have a dynamic TaskStatus assigned.');
    }

    // 2. Check for Projects with missing Dynamic Type (Migration check)
    const projectsWithoutTypeId = await prisma.project.count({
        where: {
            projectTypeId: null
        }
    });

    if (projectsWithoutTypeId > 0) {
        console.warn(`[WARN] Found ${projectsWithoutTypeId} projects using only legacy 'type' string (projectTypeId is null).`);
    }

    // 3. Check for Users without granular UserRole entries (Hybrid RBAC check)
    const usersWithoutRoles = await prisma.user.findMany({
        where: {
            roles: {
                none: {}
            }
        },
        select: { id: true, username: true, role: true }
    });

    if (usersWithoutRoles.length > 0) {
        console.warn(`[WARN] Found ${usersWithoutRoles.length} users with legacy 'role' string but no entries in 'UserRole' table:`);
        // usersWithoutRoles.forEach(u => console.log(` - ${u.username} (Legacy: ${u.role})`));
    } else {
        console.log('[OK] All users have at least one granular UserRole.');
    }

    // 4. Check for Tasks where Legacy Status mismatches Dynamic Status Name (Consistency)
    // We'll fetch a batch to check consistency
    const tasks = await prisma.task.findMany({
        where: { taskStatusId: { not: null } },
        include: { taskStatus: true },
        take: 100 // Check sample
    });

    let mismatchCount = 0;
    tasks.forEach(t => {
        // Loose comparison: e.g. "in_progress" vs "In Progress"
        const legacy = t.status.toLowerCase().replace('_', ' ');
        const dynamic = t.taskStatus?.name.toLowerCase().replace('_', ' ') || '';
        if (legacy !== dynamic && !dynamic.includes(legacy)) {
            // Only flag strict mismatches if needed, but for now just count
            // console.log(`Mismatch: Task ${t.id} - Legacy: '${t.status}' vs Dynamic: '${t.taskStatus?.name}'`);
            mismatchCount++;
        }
    });

    if (mismatchCount > 0) {
        console.warn(`[WARN] Found ${mismatchCount} tasks (in sample of 100) where legacy status string matches dynamic status name.`);
    }

    // 5. Check Date Logic (Start Date > End Date)
    const invalidDateProjects = await prisma.project.findMany({
        where: {
            startDate: { not: null },
            endDate: { not: null },
            // Prisma doesn't support field comparison directly in where like this easily without raw, so let's fetch matching dates.
            // actually, just fetch all with dates and filter in JS for this script simplicity
        },
        select: { id: true, name: true, startDate: true, endDate: true }
    });

    // Filter manually since Prisma `gt` expects a value, not a field reference in standard API (unless using extensions)
    const dateErrors = invalidDateProjects.filter(p => p.startDate && p.endDate && p.startDate > p.endDate);

    if (dateErrors.length > 0) {
        console.error(`[ERROR] Found ${dateErrors.length} projects where Start Date > End Date:`);
        dateErrors.forEach(p => console.log(` - ID: ${p.id}, Name: ${p.name}`));
    } else {
        console.log('[OK] All projects have valid date ranges (Start <= End).');
    }

    // 6. Check Completed Tasks without Completion Date (if applicable) or unexpected state
    // Let's check: Actual Hours > 0 but Status = 'pending' (Maybe they forgot to update status?)
    const startedButPending = await prisma.task.count({
        where: {
            status: 'pending',
            actualHours: { gt: 0 }
        }
    });

    if (startedButPending > 0) {
        console.warn(`[WARN] Found ${startedButPending} tasks with 'Pending' status but have logged hours.`);
    } else {
        console.log('[OK] No pending tasks with logged hours.');
    }

    console.log('--- Integrity Check Complete ---');
}

checkLogicalIntegrity()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
