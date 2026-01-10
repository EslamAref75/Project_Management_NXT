"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { getPublicSystemSettings } from "@/app/actions/settings"

interface SystemSettings {
    systemName: string
    systemLogo: string
    allowRegistration: boolean
}

interface SystemSettingsContextType {
    settings: SystemSettings
    isLoading: boolean
    refreshSettings: () => Promise<void>
}

const defaultSettings: SystemSettings = {
    systemName: "Qeema PMS",
    systemLogo: "/assets/logo.png",
    allowRegistration: true
}

const SystemSettingsContext = createContext<SystemSettingsContextType>({
    settings: defaultSettings,
    isLoading: true,
    refreshSettings: async () => { }
})

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)

    const fetchSettings = async () => {
        try {
            const result = await getPublicSystemSettings()
            if (result.success && result.settings) {
                setSettings(result.settings)
            }
        } catch (error) {
            console.error("Failed to fetch system settings:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    return (
        <SystemSettingsContext.Provider
            value={{
                settings,
                isLoading,
                refreshSettings: fetchSettings
            }}
        >
            {children}
        </SystemSettingsContext.Provider>
    )
}

export function useSystemSettings() {
    return useContext(SystemSettingsContext)
}
