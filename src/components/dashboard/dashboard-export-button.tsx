"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState } from "react"

export function DashboardExportButton() {
    const [isLoading, setIsLoading] = useState(false)

    const handleExport = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/stats/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ format: "csv" })
            })

            if (!response.ok) throw new Error("Export failed")

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `stats-export-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            // toast.success("Stats exported successfully")
        } catch (error) {
            console.error("Export error:", error)
            // toast.error("Failed to export stats")
            alert("Failed to export stats")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? "Exporting..." : "Export Stats"}
        </Button>
    )
}
