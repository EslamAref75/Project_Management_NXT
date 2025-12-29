"use client"

import { useEffect, useRef } from "react"
import { getProjectNotificationPreferences } from "@/app/actions/project-notifications"

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
  const audioContextRef = useRef<AudioContext | null>(null)
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

        // Initialize audio context if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)()
        }

        const ctx = audioContextRef.current

        // Create two-tone beep (800Hz → 1000Hz)
        const duration = 0.25
        const sampleRate = ctx.sampleRate
        const numSamples = duration * sampleRate

        const buffer = ctx.createBuffer(1, numSamples, sampleRate)
        const data = buffer.getChannelData(0)

        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate
          // Transition from 800Hz to 1000Hz
          const frequency = 800 + (200 * t) / duration
          const fadeIn = Math.min(1, t / 0.05)
          const fadeOut = Math.min(1, (duration - t) / 0.05)
          const envelope = fadeIn * fadeOut
          data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3
        }

        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(0)

        lastPlayedIdRef.current = notification.id
      } catch (error) {
        console.error("Error playing notification sound:", error)
      }
    }

    playSound()
  }, [projectId, notification])

  return null
}

