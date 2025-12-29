"use client"

import { Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { ProjectNotificationsHeader } from "@/components/project-notifications/project-notifications-header"

export function Header() {
    const { data: session } = useSession()

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <div className="flex flex-1 items-center gap-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search projects, tasks..."
                    className="w-[200px] md:w-[300px] lg:w-[400px]"
                />
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
                <ProjectNotificationsHeader />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="" alt={session?.user?.name || "User"} />
                                <AvatarFallback>{session?.user?.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name || "Guest"}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email || "guest@example.com"}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings">Settings</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
