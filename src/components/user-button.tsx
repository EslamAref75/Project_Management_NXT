"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut, useSession } from "next-auth/react"
import { Settings, LogOut, User } from "lucide-react"
import Link from "next/link"

export function UserButton() {
    const { data: session } = useSession()

    if (!session?.user) {
        return null
    }

    const { name, email } = session.user
    const initials = name
        ? name.slice(0, 2).toUpperCase()
        : email?.slice(0, 2).toUpperCase() || "U"

    // Generate a consistent color based on initials
    const colors = [
        "bg-blue-500",
        "bg-purple-500",
        "bg-pink-500",
        "bg-green-500",
        "bg-orange-500",
        "bg-red-500",
        "bg-indigo-500",
        "bg-cyan-500",
    ]
    const colorIndex = initials.charCodeAt(0) % colors.length
    const avatarColor = colors[colorIndex]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                >
                    <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={name || ""} />
                        <AvatarFallback className={`${avatarColor} text-white font-semibold text-sm`}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 shadow-lg" align="end" forceMount>
                {/* User Info Section */}
                <DropdownMenuLabel className="font-normal px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src="" alt={name || ""} />
                            <AvatarFallback className={`${avatarColor} text-white font-semibold text-base`}>
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1 min-w-0">
                            <p className="text-sm font-semibold leading-none truncate">{name}</p>
                            <p className="text-xs leading-none text-muted-foreground truncate">
                                {email}
                            </p>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-2" />

                {/* Quick Actions Section */}
                <div className="px-2 py-2 flex items-center justify-center gap-4">
                    <Link href="/dashboard/settings/profile" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-150" title="Profile">
                        <User className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Link href="/dashboard/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-150" title="Settings">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </div>

                <DropdownMenuSeparator className="my-2" />

                {/* Logout Section */}
                <div className="px-2 py-2">
                    <DropdownMenuItem
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center justify-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md px-3 py-2 transition-colors duration-150 text-red-600 dark:text-red-400"
                        title="Log out"
                    >
                        <LogOut className="h-5 w-5" />
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
