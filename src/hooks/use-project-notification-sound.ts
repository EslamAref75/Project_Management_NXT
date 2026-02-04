"use client"

import { useEffect, useRef } from "react"
import { getProjectNotificationPreferences } from "@/app/actions/project-notifications"
import { playNotificationSound } from "@/lib/notification-sound"

interface UseProjectNotificationSoundProps {
  projectId: number
  notification?: {
    id: number
    soundRequired: boolean
    isRead: boolean
  }
}

export function useProjectNotificationSound({
  projectId,
  notification,
}: UseProjectNotificationSoundProps) {
  const lastPlayedIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!notification || notification.isRead) return

    // Only play sound for new unread notifications
    if (lastPlayedIdRef.current === notification.id) return

    const playSound = async () => {
      try {
        // Check user's notification preferences
        const prefsResult = await getProjectNotificationPreferences(projectId)
        if (!prefsResult.success || !prefsResult.preferences) return

        const preferences = prefsResult.preferences

        // Critical notifications always play sound
        if (!notification.soundRequired && !preferences.soundEnabled) {
          return
        }

        await playNotificationSound()
        lastPlayedIdRef.current = notification.id
      } catch (error) {
        console.error("Error playing notification sound:", error)
      }
    }

    playSound()
  }, [projectId, notification])

  return null
}
