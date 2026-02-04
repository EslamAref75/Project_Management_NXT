import { prisma } from "@/lib/prisma";
import { addBusinessDays, differenceInBusinessDays, addDays } from "date-fns";

export async function predictTaskCompletion(taskId: number) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            assignees: { select: { id: true } },
            dependencies: { include: { dependsOnTask: true } }
        }
    });

    if (!task) return null;

    // RULE 1: Historical Velocity
    // Calculate average metrics for the assignees
    const avgDailyVelocity = 0; // Tasks per day
    const totalCompleted = 0;

    // Default to 1 task/day if no history (or 1 / estimatedHours if available)
    let defaultTime = task.estimatedHours > 0 ? task.estimatedHours / 8 : 1; // Days

    if (task.assignees.length > 0) {
        // Simple velocity: Look at last 10 completed tasks
        const recentTasks = await prisma.task.findMany({
            where: {
                assignees: { some: { id: { in: task.assignees.map(a => a.id) } } },
                status: 'completed',
                completedAt: { not: null }
            },
            take: 10,
            orderBy: { completedAt: 'desc' },
            select: { estimatedHours: true, actualHours: true, createdAt: true, completedAt: true }
        });

        if (recentTasks.length > 0) {
            // Calculate a "Pessimism Factor": Actual / Estimated
            // e.g. Est 4h, Act 6h => 1.5 factor
            let totalFactor = 0;
            let validSamples = 0;

            recentTasks.forEach(t => {
                if (t.estimatedHours > 0 && t.actualHours > 0) {
                    totalFactor += (t.actualHours / t.estimatedHours);
                    validSamples++;
                }
            });

            const assigneeFactor = validSamples > 0 ? (totalFactor / validSamples) : 1.2; // Default 1.2 if no estimates

            // Adjust estimated time by this factor
            if (task.estimatedHours > 0) {
                defaultTime = (task.estimatedHours * assigneeFactor) / 8; // Convert hours to workdays (8h/day)
            }
        }
    }

    // RULE 2: Dependency Delays
    // If blocked, start date is NOT now. Start date is max(dependency completion).
    let estimatedStartDate = new Date();
    let dependencyRisk = false;

    if (task.dependencies.length > 0) {
        let maxDependencyEnd = new Date();
        for (const dep of task.dependencies) {
            const dt = dep.dependsOnTask;
            if (dt.status !== 'completed' && !dt.taskStatusId) { // simple check
                // If dependency is not done, when will IT be done?
                // For recursion, we would predict that too. For Phase 1, assume dependency due date or today + 1
                const depDate = dt.dueDate ? new Date(dt.dueDate) : addDays(new Date(), 1);
                if (depDate > maxDependencyEnd) maxDependencyEnd = depDate;
                dependencyRisk = true;
            }
        }
        if (maxDependencyEnd > estimatedStartDate) {
            estimatedStartDate = maxDependencyEnd;
        }
    }

    const predictedDate = addBusinessDays(estimatedStartDate, Math.ceil(defaultTime));

    // Confidence & Explanation
    let confidence = 85;
    const reasons: string[] = [];

    if (dependencyRisk) {
        confidence -= 15;
        reasons.push("Dependent on incomplete tasks");
    }

    if (task.dueDate && predictedDate > task.dueDate) {
        reasons.push("Historical velocity suggests delay");
    }

    if (task.assignees.length === 0) {
        confidence -= 20;
        reasons.push("No assignee to gauge velocity");
    }

    let riskLevel = "low";
    if (task.dueDate && predictedDate > task.dueDate) {
        const delayDays = differenceInBusinessDays(predictedDate, task.dueDate);
        if (delayDays > 2) riskLevel = "high";
        else riskLevel = "medium";
    }

    return {
        taskId,
        predictedDate,
        riskLevel,
        confidence,
        explanation: reasons.join(", ") || "Based on average team velocity"
    };
}
