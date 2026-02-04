"use client"

export const NOTIFICATION_SOUND_SRC = "/sounds/notification-v2.mp3"

export async function playNotificationSound() {
    if (typeof window === "undefined") return

    try {
        const audio = new Audio(NOTIFICATION_SOUND_SRC)
        audio.preload = "auto"
        await audio.play()
    } catch (error) {
        console.error("Error playing notification sound:", error)
    }
}