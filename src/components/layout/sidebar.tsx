"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    FolderOpen,
    CheckSquare,
    Users,
    Settings,
    Calendar,
    BarChart,
    Zap,
    Target
} from "lucide-react"

const sidebarItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderOpen },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "My Team", href: "/teams", icon: Users },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Reports", href: "/reports", icon: BarChart },
    { name: "Focus Board", href: "/focus", icon: Target },
    { name: "Automation", href: "/automation", icon: Zap },
    { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col border-r bg-gray-900 text-white">
            <div className="flex h-14 items-center border-b border-gray-800 px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-blue-500">Qeema</span>Tech
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="border-t border-gray-800 p-4">
                <div className="rounded-lg bg-gray-800 p-4">
                    <p className="text-xs text-gray-400">Pro Plan</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                        <div className="h-2 w-3/4 rounded-full bg-blue-500" />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Used 12/15 Projects</p>
                </div>
            </div>
        </div>
    )
}
