import { NextRequest, NextResponse } from "next/server";
import { predictTaskCompletion } from "@/lib/forecasting";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const taskId = parseInt(params.id);

    try {
        const prediction = await predictTaskCompletion(taskId);
        if (!prediction) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json(prediction);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
