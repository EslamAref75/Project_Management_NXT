import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, differenceInHours } from "date-fns";

type Period = {
    start: Date;
    end: Date;
};

export const PRODUCTIVITY_WEIGHTS = {
    COMPLETION: 0.30,
    ON_TIME: 0.25,
    FOCUS: 0.15,
    DEPENDENCY: 0.15,
    URGENT: 0.15,
};

async function getProjectProductivity(projectId: number, period: Period) {
    const { start, end } = period;

    // Execute all queries in parallel
    const [activeTasks, tasksCompletedInPeriod, focusTasks, urgentTasks, overdueBlocking] = await Promise.all([
        // 1. activeTasks
        prisma.task.findMany({
            where: {
                projectId: projectId,
                OR: [
                    { dueDate: { gte: start, lte: end } },
                    { plannedDate: { gte: start, lte: end } },
                    { completedAt: { gte: start, lte: end } }
                ]
            } as any,
            select: { id: true, status: true, taskStatus: true } as any
        }),
        // 2. tasksCompletedInPeriod
        prisma.task.findMany({
            where: {
                projectId: projectId,
                completedAt: { gte: start, lte: end },
                OR: [
                    { status: 'completed' },
                    { taskStatus: { isFinal: true } }
                ]
            } as any,
            select: { id: true, dueDate: true, completedAt: true } as any
        }),
        // 3. focusTasks
        prisma.task.findMany({
            where: {
                projectId: projectId,
                plannedDate: { gte: start, lte: end }
            },
            select: { id: true, plannedDate: true, completedAt: true } as any
        }),
        // 4. urgentTasks
        prisma.task.findMany({
            where: {
                projectId: projectId,
                priority: 'urgent',
                createdAt: { gte: start, lte: end },
                startedAt: { not: null }
            } as any,
            select: { createdAt: true, startedAt: true } as any
        }),
        // 5. overdueBlocking
        prisma.task.count({
            where: {
                projectId: projectId,
                dueDate: { lt: new Date() },
                status: { not: 'completed' },
                taskStatus: { isFinal: false },
                dependents: { some: {} }
            }
        })
    ]) as [any[], any[], any[], any[], number];

    // 1. Completion Rate
    const totalActive = activeTasks.length;
    const completedTasks = activeTasks.filter(t =>
        t.status === 'completed' || t.taskStatus?.isFinal
    );
    const completionRate = totalActive > 0 ? (completedTasks.length / totalActive) * 100 : 100;

    // 2. On-Time Rate
    let onTimeCount = 0;
    tasksCompletedInPeriod.forEach(t => {
        if (!t.dueDate || (t.completedAt && t.completedAt <= t.dueDate)) {
            onTimeCount++;
        }
    });
    const onTimeRate = tasksCompletedInPeriod.length > 0
        ? (onTimeCount / tasksCompletedInPeriod.length) * 100
        : 100;

    // 3. Focus Rate
    let focusSuccess = 0;
    focusTasks.forEach(t => {
        if (t.plannedDate && t.completedAt) {
            const plannedStart = startOfDay(t.plannedDate);
            const plannedEnd = endOfDay(t.plannedDate);
            if (t.completedAt >= plannedStart && t.completedAt <= plannedEnd) {
                focusSuccess++;
            }
        }
    });
    const focusRate = focusTasks.length > 0 ? (focusSuccess / focusTasks.length) * 100 : 100;

    // 4. Urgent Rate
    let urgentRate = 100;
    let urgentScoreSum = 0;
    if (urgentTasks.length > 0) {
        urgentTasks.forEach(t => {
            if (t.startedAt) {
                const hours = differenceInHours(t.startedAt, t.createdAt);
                if (hours <= 2) urgentScoreSum += 100;
                else if (hours <= 4) urgentScoreSum += 80;
                else if (hours <= 8) urgentScoreSum += 50;
                else if (hours <= 24) urgentScoreSum += 20;
                else urgentScoreSum += 0;
            }
        });
        urgentRate = urgentScoreSum / urgentTasks.length;
    }
    const dependencyRate = Math.max(0, 100 - (overdueBlocking * 20));

    const finalScore =
        (completionRate * PRODUCTIVITY_WEIGHTS.COMPLETION) +
        (onTimeRate * PRODUCTIVITY_WEIGHTS.ON_TIME) +
        (focusRate * PRODUCTIVITY_WEIGHTS.FOCUS) +
        (dependencyRate * PRODUCTIVITY_WEIGHTS.DEPENDENCY) +
        (urgentRate * PRODUCTIVITY_WEIGHTS.URGENT);

    return {
        score: Math.round(finalScore),
        metrics: {
            completionRate: Math.round(completionRate),
            onTimeRate: Math.round(onTimeRate),
            focusRate: Math.round(focusRate),
            urgentRate: Math.round(urgentRate),
            dependencyRate: Math.round(dependencyRate)
        }
    };
}

// Re-export User Productivity for continuity
export async function calculateUserProductivity(userId: number, period: Period) {
    const { start, end } = period;

    // Execute all queries in parallel
    const [assignedTasks, tasksCompletedInPeriod, focusTasks, urgentTasks, overdueBlocking] = await Promise.all([
        // 1. assignedTasks
        prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                OR: [
                    { dueDate: { gte: start, lte: end } },
                    { plannedDate: { gte: start, lte: end } },
                    { completedAt: { gte: start, lte: end } }
                ]
            } as any,
            select: { id: true, status: true, taskStatus: true } as any
        }),
        // 2. tasksCompletedInPeriod
        prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                completedAt: { gte: start, lte: end },
                OR: [
                    { status: 'completed' },
                    { taskStatus: { isFinal: true } }
                ]
            } as any,
            select: { id: true, dueDate: true, completedAt: true } as any
        }),
        // 3. focusTasks
        prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                plannedDate: { gte: start, lte: end }
            },
            select: { id: true, plannedDate: true, completedAt: true } as any
        }),
        // 4. urgentTasks
        prisma.task.findMany({
            where: {
                assignees: { some: { id: userId } },
                priority: 'urgent',
                createdAt: { gte: start, lte: end },
                startedAt: { not: null }
            } as any,
            select: { createdAt: true, startedAt: true } as any
        }),
        // 5. overdueBlocking
        prisma.task.count({
            where: {
                assignees: { some: { id: userId } },
                dueDate: { lt: new Date() },
                status: { not: 'completed' },
                taskStatus: { isFinal: false },
                dependents: { some: {} }
            } as any
        })
    ]) as [any[], any[], any[], any[], number];

    // 1. Completion Rate
    const totalAssigned = assignedTasks.length;
    const completedTasks = assignedTasks.filter(t =>
        t.status === 'completed' || t.taskStatus?.isFinal
    );
    const completionRate = totalAssigned > 0 ? (completedTasks.length / totalAssigned) * 100 : 100;

    // 2. On-Time Rate
    let onTimeCount = 0;
    tasksCompletedInPeriod.forEach(t => {
        if (!t.dueDate || (t.completedAt && t.completedAt <= t.dueDate)) {
            onTimeCount++;
        }
    });
    const onTimeRate = tasksCompletedInPeriod.length > 0
        ? (onTimeCount / tasksCompletedInPeriod.length) * 100
        : 100;

    // 3. Focus Rate
    let focusSuccess = 0;
    focusTasks.forEach(t => {
        if (t.plannedDate && t.completedAt) {
            // Check if completed on same day as planned
            const plannedStart = startOfDay(t.plannedDate);
            const plannedEnd = endOfDay(t.plannedDate);
            if (t.completedAt >= plannedStart && t.completedAt <= plannedEnd) {
                focusSuccess++;
            }
        }
    });
    const focusRate = focusTasks.length > 0 ? (focusSuccess / focusTasks.length) * 100 : 100;

    // 4. Urgent Rate
    let urgentRate = 100;
    let urgentScoreSum = 0;
    if (urgentTasks.length > 0) {
        urgentTasks.forEach(t => {
            if (t.startedAt) {
                const hours = differenceInHours(t.startedAt, t.createdAt);
                if (hours <= 2) urgentScoreSum += 100;
                else if (hours <= 4) urgentScoreSum += 80;
                else if (hours <= 8) urgentScoreSum += 50;
                else if (hours <= 24) urgentScoreSum += 20;
                else urgentScoreSum += 0;
            }
        });
        urgentRate = urgentScoreSum / urgentTasks.length;
    }
    const dependencyRate = Math.max(0, 100 - (overdueBlocking * 20)); // Deduct 20 pts per blocking overdue task

    // Final Weighted Score
    const finalScore =
        (completionRate * PRODUCTIVITY_WEIGHTS.COMPLETION) +
        (onTimeRate * PRODUCTIVITY_WEIGHTS.ON_TIME) +
        (focusRate * PRODUCTIVITY_WEIGHTS.FOCUS) +
        (dependencyRate * PRODUCTIVITY_WEIGHTS.DEPENDENCY) +
        (urgentRate * PRODUCTIVITY_WEIGHTS.URGENT);

    return {
        score: Math.round(finalScore),
        metrics: {
            completionRate: Math.round(completionRate),
            onTimeRate: Math.round(onTimeRate),
            focusRate: Math.round(focusRate),
            urgentRate: Math.round(urgentRate),
            dependencyRate: Math.round(dependencyRate)
        }
    };
}

export { getProjectProductivity as calculateProjectProductivity }; // Export alias
