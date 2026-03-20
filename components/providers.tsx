'use client'

import { useEffect, type ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { useQueryStore } from '@/store/query-store'
import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from './query-provider'
import { CommandPalette } from '@/components/command-palette'

import { useSession } from 'next-auth/react'

import { useRoutineStore } from '@/store/routine-store'

function StoreInitializer() {
  const { initialize: initQueries, isLoading: queriesLoading, isInitialized: queriesInit } = useQueryStore()
  const { initialize: initRoutines, loading: routinesLoading, isInitialized: routinesInit } = useRoutineStore()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      if (!queriesInit && !queriesLoading) initQueries()
      if (!routinesInit && !routinesLoading) initRoutines()
    }
  }, [status, initQueries, queriesInit, queriesLoading, initRoutines, routinesInit, routinesLoading])

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
