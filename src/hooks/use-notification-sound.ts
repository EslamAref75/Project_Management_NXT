"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"

export function useNotificationSound() {
    const audioContextRef = useRef<AudioContext | null>(null)
    const { data: session } = useSession()
    const [soundEnabled, setSoundEnabled] = useState(true)

    useEffect(() => {
        // Initialize AudioContext
        const initAudio = async () => {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
                audioContextRef.current = new AudioContextClass()
                
                // Resume audio context if suspended (browser autoplay policy)
                if (audioContextRef.current.state === "suspended") {
                    await audioContextRef.current.resume()
                }
            } catch (error) {
                console.error("Error initializing audio context:", error)
            }
        }

        initAudio()

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

        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                audioContextRef.current.close()
            }
        }
    }, [session])

    const playSound = async () => {
        if (!session || !soundEnabled) return

        try {
            const audioContext = audioContextRef.current
            if (!audioContext) return

            // Resume audio context if suspended
            if (audioContext.state === "suspended") {
                await audioContext.resume()
            }

            // Generate a pleasant notification beep
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            
            // Create a two-tone beep (more pleasant than single tone)
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
            oscillator.type = "sine"
            
            // Fade in and out for smooth sound
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05)
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.15)
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25)
            
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.25)
        } catch (error) {
            console.error("Error playing notification sound:", error)
        }
    }

    return { playSound }
}

