import { NavLinks } from "./nav-links"
import { DashboardBranding } from "@/components/layout/dashboard-branding"
import Link from "next/link"
import { UserButton } from "@/components/user-button" // We will create this or inline simple signout for now
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { ProjectNotificationsHeader } from "@/components/project-notifications/project-notifications-header"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen w-full flex-col md:flex-row">
            {/* Sidebar for Desktop */}
            <div className="hidden border-r bg-gray-100/40 md:block md:w-64 lg:w-72 dark:bg-gray-800/40">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <DashboardBranding />
                    <div className="flex-1 overflow-auto py-2 px-4">
                        <nav className="grid items-start px-2 text-sm font-medium">
                            <div className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground">
                                Menu
                            </div>
                            <NavLinks />
                        </nav>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button className="md:hidden" size="icon" variant="outline">
                                <Menu className="h-4 w-4" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="md:max-w-xs">
                            <nav className="grid gap-6 text-lg font-medium">
                                <DashboardBranding />
                                <NavLinks />
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        {/* Search or breadcrumbs could go here */}
                    </div>
                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <ProjectNotificationsHeader />
                        <UserButton />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
