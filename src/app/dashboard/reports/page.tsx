import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ReportsDashboard } from "@/components/reports/reports-dashboard"
import { notFound } from "next/navigation"

export default async function ReportsPage() {
    const session = await getServerSession(authOptions)
    if (!session) {
        notFound()
    }

    return <ReportsDashboard userId={parseInt(session.user.id)} userRole={session.user.role || "developer"} />
}

