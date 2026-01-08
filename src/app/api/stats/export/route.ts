import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSummaryStatsWithTrends } from "@/app/actions/stats"

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { filters, period, format } = body

        // Validate format
        if (format !== "csv" && format !== "xlsx") {
            // For now we only implement CSV as per plan, but route can be extensible
        }

        const statsResult = await getSummaryStatsWithTrends(filters, period)
        if (!statsResult.success || !statsResult.data) {
            return new NextResponse(statsResult.error || "Failed to fetch stats", { status: 500 })
        }

        const stats = statsResult.data

        // Generate CSV
        // Columns: Metric, Value, Trend Direction, Trend Value
        const headers = "Metric,Value,Trend Direction,Trend Percentage,Context\n"
        let csvContent = headers

        for (const [key, stat] of Object.entries(stats)) {
            const line = [
                key, // Metric Name
                stat.value,
                stat.trend?.direction || "neutral",
                JSON.stringify(stat.trend?.percentage || 0), // handle undefined
                "Global/User Dashboard" // Context
            ].join(",")
            csvContent += line + "\n"
        }

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="stats-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        })

    } catch (error: any) {
        console.error("Export error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
