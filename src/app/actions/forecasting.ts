"use server";

import { predictTaskCompletion } from "@/lib/forecasting";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getForecastsForTasks(taskIds: number[]) {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    try {
        const forecasts = await Promise.all(
            taskIds.map(async (id) => {
                const prediction = await predictTaskCompletion(id);
                return { taskId: id, prediction };
            })
        );

        // Convert to map for easier lookup
        const forecastMap: Record<number, any> = {};
        forecasts.forEach(f => {
            forecastMap[f.taskId] = f.prediction;
        });

        return { success: true, data: forecastMap };
    } catch (e) {
        console.error("Failed to get forecasts", e);
        return { error: "Failed to load forecasts" };
    }
}
