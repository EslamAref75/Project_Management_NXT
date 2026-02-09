"use client"

import * as React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "destructive"

export type Toast = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastContextValue = {
  toasts: Toast[]
  toast: (props: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback(
    ({ title, description, variant }: { title: string; description?: string; variant?: ToastVariant }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, title, description, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, TOAST_DURATION_MS)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <Toaster toasts={toasts} />
    </ToastContext.Provider>
  )
}

function Toaster({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-w-[420px] flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <Alert
          key={t.id}
          variant={t.variant === "destructive" ? "destructive" : "default"}
          className={cn(
            "shadow-lg",
            t.variant === "destructive" && "border-destructive bg-destructive/10 text-destructive [&>svg]:text-destructive"
          )}
        >
          <AlertTitle>{t.title}</AlertTitle>
          {t.description && <AlertDescription>{t.description}</AlertDescription>}
        </Alert>
      ))}
    </div>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    return {
      toasts: [] as Toast[],
      toast: ({ title, description, variant }: { title: string; description?: string; variant?: ToastVariant }) => {
        console.warn("Toast used without ToastProvider:", title, description, variant)
      },
    }
  }
  return ctx
}
