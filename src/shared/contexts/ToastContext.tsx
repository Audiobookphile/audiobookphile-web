'use client'

import React, { createContext, ReactNode, useCallback, useContext } from 'react'
import { toast } from 'sonner'

interface ToastContextType {
  showToast: (
    message: string,
    options?: {
      type?: 'success' | 'error' | 'warning' | 'info'
      title?: string
      duration?: number
      onDismiss?: () => void
    }
  ) => string | number
  removeToast: (id: string | number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const showToast = useCallback(
    (
      message: string,
      options?: {
        type?: 'success' | 'error' | 'warning' | 'info'
        title?: string
        duration?: number
        onDismiss?: () => void
      }
    ) => {
      const toastOptions = {
        description: options?.title,
        duration: options?.duration,
        onAutoClose: options?.onDismiss,
        onDismiss: options?.onDismiss,
      }

      switch (options?.type) {
        case 'success':
          return toast.success(message, toastOptions)
        case 'error':
          return toast.error(message, toastOptions)
        case 'warning':
          return toast.warning(message, toastOptions)
        case 'info':
        default:
          return toast.info(message, toastOptions)
      }
    },
    []
  )

  const removeToast = useCallback((id: string | number) => {
    toast.dismiss(id)
  }, [])

  const value: ToastContextType = {
    showToast,
    removeToast,
  }

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export const useGlobalToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useGlobalToast must be used within a ToastProvider')
  }
  return context
}
