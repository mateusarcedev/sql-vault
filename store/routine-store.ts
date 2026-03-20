'use client'

import { create } from 'zustand'
import type { Routine, RoutineType } from '@/types/routine'
import type { DatabaseType } from '@/types/query'

interface RoutineFilters {
  search?: string
  type?: RoutineType
  database?: DatabaseType
  tags?: string[]
  onlyFavorites?: boolean
  sortBy?: 'createdAt' | 'name' | 'copyCount'
}

export interface RoutineStore {
  routines: Routine[]
  loading: boolean
  isInitialized: boolean
  isSubmitting: boolean

  listRoutines: (filters?: RoutineFilters) => Routine[]
  listTrashed: () => Routine[]
  getById: (id: string) => Routine | undefined
  initialize: () => Promise<void>
  create: (data: Omit<Routine, 'id' | 'createdAt' | 'updatedAt' | 'copyCount' | 'versions' | 'tags'> & { tagIds: string[] }) => Promise<void>
  update: (id: string, data: Partial<Routine> & { tagIds?: string[] }) => Promise<void>
  remove: (id: string) => Promise<void>
  permanentDelete: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  incrementCopyCount: (id: string) => Promise<void>
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  routines: [],
  loading: false,
  isInitialized: false,
  isSubmitting: false,

  initialize: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/routines')
      
      if (res.status === 401) {
        set({ loading: false })
        return
      }
      
      if (!res.ok) throw new Error('Failed to fetch routines')
      
      const routines = await res.json()
      set({ routines, loading: false, isInitialized: true })
    } catch (error) {
      console.error('Routine store initialization error:', error)
      set({ loading: false, isInitialized: true })
    }
  },

  listRoutines: (filters?: RoutineFilters) => {
    const { routines } = get()
    let filtered = routines.filter((r) => !r.deletedAt)

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search) ||
          r.sql.toLowerCase().includes(search)
      )
    }

    if (filters?.type) {
      filtered = filtered.filter((r) => r.type === filters.type)
    }

    if (filters?.database) {
      filtered = filtered.filter((r) => r.database === filters.database)
    }

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((r) =>
        filters.tags!.some((tagId) => r.tags.some(t => t.id === tagId))
      )
    }

    if (filters?.onlyFavorites) {
      filtered = filtered.filter((r) => r.isFavorite)
    }

    const sortOption = filters?.sortBy || 'createdAt'
    return filtered.sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name)
      }
      if (sortOption === 'copyCount') {
        return b.copyCount - a.copyCount
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  },

  listTrashed: () => {
    const { routines } = get()
    return routines
      .filter((r) => r.deletedAt)
      .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
  },

  getById: (id: string) => {
    return get().routines.find((r) => r.id === id)
  },

  create: async (data) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Failed to create routine')
      
      const newRoutine = await response.json()
      set((state) => ({
        routines: [newRoutine, ...state.routines],
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  update: async (id, data) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/routines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Failed to update routine')
      
      const updatedRoutine = await response.json()
      set((state) => ({
        routines: state.routines.map((r) => (r.id === id ? updatedRoutine : r)),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  remove: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/routines/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete routine')
      
      set((state) => ({
        routines: state.routines.map((r) =>
          r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r
        ),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  permanentDelete: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/routines/${id}?permanent=true`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to permanent delete routine')
      
      set((state) => ({
        routines: state.routines.filter((r) => r.id !== id),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  restore: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/routines/${id}/restore`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to restore routine')
      
      const restoredRoutine = await response.json()
      
      set((state) => {
        const exists = state.routines.some(r => r.id === id)
        if (exists) {
          return {
            routines: state.routines.map((r) => (r.id === id ? restoredRoutine : r)),
            isSubmitting: false,
          }
        }
        return {
          routines: [restoredRoutine, ...state.routines],
          isSubmitting: false,
        }
      })
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  toggleFavorite: async (id) => {
    const routine = get().getById(id)
    if (!routine) return
    
    try {
      const response = await fetch(`/api/routines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !routine.isFavorite }),
      })
      
      if (!response.ok) throw new Error('Failed to toggle favorite')
      
      const updatedRoutine = await response.json()
      set((state) => ({
        routines: state.routines.map((r) => (r.id === id ? updatedRoutine : r)),
      }))
    } catch (error) {
      console.error(error)
    }
  },

  incrementCopyCount: async (id) => {
    try {
      const response = await fetch(`/api/routines/${id}/copy`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to copy routine')
      
      const { copyCount } = await response.json()
      set((state) => ({
        routines: state.routines.map(r => r.id === id ? { ...r, copyCount } : r),
      }))
    } catch (error) {
      console.error(error)
    }
  },
}))
