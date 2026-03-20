'use client'

import { useEffect, type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { useQueryStore } from '@/store/query-store'
import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from './query-provider'
import { CommandPalette } from '@/components/command-palette'

import { useSession } from 'next-auth/react'

function StoreInitializer() {
  const { initialize, isLoading, isInitialized } = useQueryStore()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && !isInitialized && !isLoading) {
      initialize()
    }
  }, [status, initialize, isInitialized, isLoading])

  return null
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreInitializer />
          {children}
          <CommandPalette />
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
