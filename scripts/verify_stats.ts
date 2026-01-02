import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({
        where: {
            status: {
                not: 'completed' // Approximating 'active' based on status not being completed. 
                // Note: Needs to match actual Dashboard logic which might be specific string or ID.
            }
        }
    });

    const totalTasks = await prisma.task.count();
    const completedTasks = await prisma.task.count({
        where: {
            status: 'completed' // Legacy status check, likely used in Dashboard
        }
    });

    const users = await prisma.user.count();

    console.log(JSON.stringify({
        totalProjects,
        totalTasks,
        completedTasks,
        users
    }, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
