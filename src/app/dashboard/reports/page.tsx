import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ClientReportsDashboard } from "@/components/reports/client-reports-dashboard"
import { notFound } from "next/navigation"

export default async function ReportsPage() {
    const session = await getServerSession(authOptions)
    if (!session) {
        notFound()
    }

    return <ClientReportsDashboard userId={parseInt(session.user.id)} userRole={session.user.role || "developer"} />
}
