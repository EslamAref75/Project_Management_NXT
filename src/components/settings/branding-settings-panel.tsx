"use client"

import { useState, useEffect } from "react"
import { useSystemSettings } from "@/components/providers/system-settings-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { updateSetting } from "@/app/actions/settings"
import { uploadSystemLogo } from "@/app/actions/logo-upload"
import { Loader2, Upload, Save, CheckCircle2 } from "lucide-react"
import Image from "next/image"

export function BrandingSettingsPanel() {
    const { settings, refreshSettings } = useSystemSettings()
    const [name, setName] = useState(settings.systemName)
    const [logoPreview, setLogoPreview] = useState(settings.systemLogo)
    const [allowRegistration, setAllowRegistration] = useState(settings.allowRegistration)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Update local state when settings change (e.g. after fetch)
    useEffect(() => {
        setName(settings.systemName)
        setLogoPreview(settings.systemLogo)
        setAllowRegistration(settings.allowRegistration)
    }, [settings])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'File size must be less than 2MB' })
                return
            }
            setSelectedFile(file)
            // Create local preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
            setMessage(null)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        try {
            let logoUrl = settings.systemLogo

            // 1. Upload new logo if selected
            if (selectedFile) {
                const formData = new FormData()
                formData.append("file", selectedFile)

                const uploadResult = await uploadSystemLogo(formData)
                if (uploadResult.error) {
                    throw new Error(uploadResult.error)
                }
                if (uploadResult.url) {
                    logoUrl = uploadResult.url
                }
            }

            // 2. Update settings
            const result = await updateSetting("general", {
                ...settings, // Keep other generic settings
                systemName: name,
                systemLogo: logoUrl,
                allowRegistration
            }, "Updated branding settings", "general")

            if (result.error) {
                throw new Error(result.error)
            }

            // 3. Refresh context
            await refreshSettings()

            setMessage({ type: 'success', text: 'Branding settings updated successfully' })
            setSelectedFile(null) // Reset file selection on success

            // Force reload to update layout/metadata
            window.location.reload()

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "Failed to update settings" })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Branding</CardTitle>
                <CardDescription>
                    Customize the look and feel of your application.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* System Name */}
                <div className="space-y-2">
                    <Label htmlFor="system-name">System Name</Label>
                    <Input
                        id="system-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Acme Corp PMS"
                    />
                </div>

                {/* System Logo */}
                <div className="space-y-2">
                    <Label>System Logo</Label>
                    <div className="flex items-center gap-4 border p-4 rounded-lg bg-gray-50/50">
                        <div className="relative h-16 w-16 bg-white rounded-md border flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                                <Image
                                    src={logoPreview}
                                    alt="Logo preview"
                                    fill
                                    className="object-contain p-1"
                                />
                            ) : (
                                <span className="text-xs text-muted-foreground">No logo</span>
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor="logo-upload"
                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Choose Image
                                </Label>
                                <Input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/png, image/jpeg, image/svg+xml"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {selectedFile ? selectedFile.name : "No file chosen"}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Recommended: PNG or SVG, max 2MB.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Registration Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label>Public Registration</Label>
                        <p className="text-sm text-muted-foreground">
                            Allow users to sign up for an account publicly.
                        </p>
                    </div>
                    <Switch
                        checked={allowRegistration}
                        onCheckedChange={setAllowRegistration}
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                        {message.text}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isSaving && <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    )
}
