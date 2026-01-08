import { NextRequest, NextResponse } from "next/server";
import { calculateProjectProductivity } from "@/lib/productivity";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = parseInt(params.id);
    const mode = request.nextUrl.searchParams.get("period") || "current_week";

    let start, end;

    if (mode === "last_week") {
        const lastWeek = subWeeks(new Date(), 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
    } else {
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    try {
        const result = await calculateProjectProductivity(projectId, { start, end });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
