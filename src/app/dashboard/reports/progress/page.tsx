import { ProgressReportView } from "@/components/reports/progress-report-view"

export default function ReportsPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <ProgressReportView />
        </div>
    )
}
