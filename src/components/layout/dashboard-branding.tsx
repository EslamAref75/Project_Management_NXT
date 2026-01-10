"use client"

import Link from "next/link"
import Image from "next/image"
import { useSystemSettings } from "@/components/providers/system-settings-provider"
import { Package2 } from "lucide-react"

export function DashboardBranding() {
    const { settings } = useSystemSettings()

    // Fallback if settings aren't loaded yet or logo is default
    const showDefaultLogo = !settings.systemLogo || settings.systemLogo === "/assets/logo.png"

    return (
        <div className="flex h-[60px] items-center border-b px-6">
            <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
                <div className="relative h-6 w-6">
                    {showDefaultLogo ? (
                        <Package2 className="h-6 w-6" />
                    ) : (
                        <Image
                            src={settings.systemLogo}
                            alt="Logo"
                            fill
                            className="object-contain"
                        />
                    )}
                </div>
                <span className="">{settings.systemName}</span>
            </Link>
        </div>
    )
}
