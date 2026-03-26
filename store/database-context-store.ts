'use client'

import { create } from 'zustand'
import type {
  DatabaseContext,
  DatabaseContextCreateInput,
  DatabaseContextUpdateInput,
} from '@/types/database-context'

type DatabaseContextScope = 'mine' | 'public' | 'all'

interface DatabaseContextStore {
  contexts: DatabaseContext[]
  isLoading: boolean
  isInitialized: boolean
  isSubmitting: boolean
  scope: DatabaseContextScope

  initialize: (scope?: DatabaseContextScope) => Promise<void>
  setScope: (scope: DatabaseContextScope) => Promise<void>

  listContexts: () => DatabaseContext[]
  getContext: (id: string) => DatabaseContext | undefined
  fetchContext: (id: string) => Promise<DatabaseContext>
  createContext: (data: DatabaseContextCreateInput) => Promise<DatabaseContext>
  updateContext: (id: string, data: DatabaseContextUpdateInput) => Promise<DatabaseContext>
  deleteContext: (id: string) => Promise<void>
}

export const useDatabaseContextStore = create<DatabaseContextStore>((set, get) => ({
  contexts: [],
  isLoading: false,
  isInitialized: false,
  isSubmitting: false,
  scope: 'mine',

  initialize: async (scope = 'mine') => {
    set({ isLoading: true })
    try {
      const response = await fetch(`/api/database-contexts?scope=${scope}`)

      if (response.status === 401) {
        set({ isLoading: false })
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch database contexts')
      }

      const contexts = (await response.json()) as DatabaseContext[]
      set({ contexts, isLoading: false, isInitialized: true, scope })
    } catch (error) {
      console.error('Database context store initialization error:', error)
      set({ isLoading: false, isInitialized: true })
    }
  },

  setScope: async (scope) => {
    await get().initialize(scope)
  },

  listContexts: () => {
    const { contexts } = get()
    return contexts.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  getContext: (id) => {
    const { contexts } = get()
    return contexts.find((context) => context.id === id)
  },

  fetchContext: async (id) => {
    const response = await fetch(`/api/database-contexts/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch database context')
    }

    const context = (await response.json()) as DatabaseContext

    set((state) => {
      const exists = state.contexts.some((item) => item.id === context.id)
      if (exists) {
        return {
          contexts: state.contexts.map((item) => (item.id === context.id ? context : item)),
        }
      }

      return { contexts: [context, ...state.contexts] }
    })

    return context
  },

  createContext: async (data) => {
    set({ isSubmitting: true })
    try {
      const payload = {
        ...data,
        isPublic: Boolean(data.isPublic),
      }

      const response = await fetch('/api/database-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create database context')
      }

      const context = (await response.json()) as DatabaseContext
      set((state) => ({
        contexts: [context, ...state.contexts],
        isSubmitting: false,
      }))

      return context
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  updateContext: async (id, data) => {
    set({ isSubmitting: true })
    try {
      const existing = get().getContext(id)
      const payload = {
        ...data,
        isPublic: data.isPublic ?? existing?.isPublic ?? false,
      }

      const response = await fetch(`/api/database-contexts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to update database context')
      }

      const context = (await response.json()) as DatabaseContext
      set((state) => ({
        contexts: state.contexts.map((item) => (item.id === id ? context : item)),
        isSubmitting: false,
      }))

      return context
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  deleteContext: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/database-contexts/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error('Failed to delete database context')
      }

      set((state) => ({
        contexts: state.contexts.filter((item) => item.id !== id),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },
}))
