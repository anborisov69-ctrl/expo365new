'use client'

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ══════════════════════════════════════════════════════════════════
// ТИПЫ
// ══════════════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number // в миллисекундах, 0 = не исчезает автоматически
}

export interface ToastOptions {
  title: string
  description?: string
  type?: ToastType
  duration?: number
}

// ══════════════════════════════════════════════════════════════════
// КОНТЕКСТ
// ══════════════════════════════════════════════════════════════════

interface ToastContextType {
  toasts: Toast[]
  addToast: (options: ToastOptions) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// ══════════════════════════════════════════════════════════════════
// ПРОВАЙДЕР
// ══════════════════════════════════════════════════════════════════

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      type: options.type || 'info',
      duration: options.duration ?? 5000,
    }

    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// ══════════════════════════════════════════════════════════════════
// КОМПОНЕНТ ТОСТА
// ══════════════════════════════════════════════════════════════════

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, removeToast])

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-500',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      iconColor: 'text-amber-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-500',
    },
  }

  const config = typeConfig[toast.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'relative w-full max-w-sm rounded-xl border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right-10',
        config.bg
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold text-sm mb-1', config.text)}>
            {toast.title}
          </h4>
          {toast.description && (
            <p className={cn('text-sm opacity-90', config.text)}>
              {toast.description}
            </p>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-2 p-1 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Закрыть уведомление"
        >
          <X size={14} className={config.iconColor} />
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// КОНТЕЙНЕР
// ══════════════════════════════════════════════════════════════════

function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ХУКИ-ХЕЛПЕРЫ
// ══════════════════════════════════════════════════════════════════

export function useNewsToast() {
  const { addToast } = useToast()

  const showSuccess = useCallback((title: string, description?: string) => {
    return addToast({
      title,
      description,
      type: 'success',
      duration: 4000,
    })
  }, [addToast])

  const showError = useCallback((title: string, description?: string) => {
    return addToast({
      title,
      description,
      type: 'error',
      duration: 6000,
    })
  }, [addToast])

  const showInfo = useCallback((title: string, description?: string) => {
    return addToast({
      title,
      description,
      type: 'info',
      duration: 4000,
    })
  }, [addToast])

  const showWarning = useCallback((title: string, description?: string) => {
    return addToast({
      title,
      description,
      type: 'warning',
      duration: 5000,
    })
  }, [addToast])

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
  }
}