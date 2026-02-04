"use client"

export const NOTIFICATION_SOUND_SRC = "/sounds/notification-v2.mp3"

export async function playNotificationSound() {
    if (typeof window === "undefined") return

    try {
        const audio = new Audio(NOTIFICATION_SOUND_SRC)
        audio.preload = "auto"
        await audio.play()
    } catch (error: any) {
        // Ignore NotAllowedError which happens if user hasn't interacted with the document yet
        if (error?.name === "NotAllowedError") {
            return
        }
        console.error("Error playing notification sound:", error)
    }
}