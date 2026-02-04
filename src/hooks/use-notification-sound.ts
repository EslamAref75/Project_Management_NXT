"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { playNotificationSound } from "../lib/notification-sound"

export function useNotificationSound() {
    const { data: session } = useSession()
    const [soundEnabled, setSoundEnabled] = useState(true)

    useEffect(() => {

        // Check user's notification sound preference
        const checkSoundPreference = async () => {
            if (!session) return

            try {
                const { getUserSetting } = await import("@/app/actions/user-settings")
                const result = await getUserSetting(parseInt(session.user.id), "notifications")
                const settings = result.success ? result.setting?.value : null

                // Default to true if not set
                const enabled = settings?.soundEnabled !== false
                setSoundEnabled(enabled)
            } catch (error) {
                console.error("Error checking sound preference:", error)
                // Default to enabled on error
                setSoundEnabled(true)
            }
        }

        checkSoundPreference()

    }, [session])

    const playSound = async () => {
        if (!session || !soundEnabled) return

        await playNotificationSound()
    }

    return { playSound }
}