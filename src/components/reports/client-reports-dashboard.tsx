"use client"

import dynamic from "next/dynamic"

const ReportsDashboard = dynamic(
    () => import("@/components/reports/reports-dashboard").then((mod) => mod.ReportsDashboard),
    { ssr: false }
)

interface ClientReportsDashboardProps {
    userId: number
    userRole: string
}

export function ClientReportsDashboard({ userId, userRole }: ClientReportsDashboardProps) {
    return <ReportsDashboard userId={userId} userRole={userRole} />
}
