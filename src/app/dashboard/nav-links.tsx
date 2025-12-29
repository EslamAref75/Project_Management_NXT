"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FolderKanban, Users, Users2, Settings, Target, Calendar, FileText, BarChart3 } from "lucide-react"
import { useSession } from "next-auth/react"

export function NavLinks() {
    const pathname = usePathname()
    const { data: session } = useSession()

    const links = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
        { name: "All Tasks", href: "/dashboard/tasks", icon: FolderKanban },
        { name: "Today's Focus", href: "/dashboard/focus", icon: Target },
        ...(session?.user?.role === "admin" || session?.user?.role === "team_lead" 
            ? [{ name: "Task Assignment", href: "/dashboard/today-tasks-assignment", icon: Calendar }]
            : []),
        { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        { name: "Teams", href: "/dashboard/teams", icon: Users2 },
        { name: "Users", href: "/dashboard/users", icon: Users },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
        ...(session?.user?.role === "admin"
            ? [
                { name: "Activity Logs", href: "/dashboard/admin/activity-logs", icon: FileText },
                { name: "Roles & Permissions", href: "/dashboard/admin/roles", icon: Users },
              ]
            : []),
    ]

    return (
        <>
            {links.map((link) => {
                const LinkIcon = link.icon
                return (
                    <Link
                        key={link.name}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                            pathname === link.href ? "bg-muted text-primary" : ""
                        )}
                    >
                        <LinkIcon className="h-4 w-4" />
                        {link.name}
                    </Link>
                )
            })}
        </>
    )
}
