'use client'

import { useEffect, type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { useQueryStore } from '@/store/query-store'
import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from './query-provider'

import { useSession } from 'next-auth/react'

function StoreInitializer() {
  const { initialize, isLoading, queries } = useQueryStore()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && queries.length === 0 && !isLoading) {
      initialize()
    }
  }, [status, initialize, queries.length, isLoading])

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
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
