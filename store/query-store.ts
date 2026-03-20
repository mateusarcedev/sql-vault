'use client'

import { create } from 'zustand'
import type { Query, Tag, QueryFilters, QueryVersion, DatabaseType } from '@/types/query'

interface QueryStore {
  // Data
  queries: Query[]
  tags: Tag[]
  
  // Loading states
  isLoading: boolean
  isInitialized: boolean
  isSubmitting: boolean
  
  // Actions
  initialize: () => Promise<void>
  
  // Query CRUD
  listQueries: (filters?: QueryFilters) => Query[]
  listTrashed: () => Query[]
  getQuery: (id: string) => Query | undefined
  createQuery: (data: Omit<Query, 'id' | 'versions' | 'copyCount' | 'createdAt' | 'updatedAt' | 'userId' | 'tags'> & { tagIds?: string[] }) => Promise<Query>
  updateQuery: (id: string, data: Partial<Query> & { tagIds?: string[], restore?: boolean }) => Promise<Query>
  deleteQuery: (id: string) => Promise<void>
  restoreQuery: (id: string) => Promise<void>
  permanentDeleteQuery: (id: string) => Promise<void>
  
  // Query helpers
  toggleFavorite: (id: string) => Promise<void>
  incrementCopyCount: (id: string) => Promise<void>
  addVersion: (queryId: string, sql: string, description: string) => Promise<void>
  
  // Tag CRUD
  createTag: (name: string, color: string) => Promise<Tag>
  updateTag: (id: string, name: string, color: string) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  getTag: (id: string) => Tag | undefined
  
  // Stats
  getStats: () => {
    totalQueries: number
    favoriteCount: number
    totalCopies: number
    databaseCounts: Record<DatabaseType, number>
  }
}

export const useQueryStore = create<QueryStore>((set, get) => ({
  queries: [],
  tags: [],
  isLoading: false,
  isInitialized: false,
  isSubmitting: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const [queriesRes, tagsRes] = await Promise.all([
        fetch('/api/queries'),
        fetch('/api/tags')
      ])
      
      if (queriesRes.status === 401 || tagsRes.status === 401) {
        set({ isLoading: false })
        return
      }
      
      if (!queriesRes.ok || !tagsRes.ok) throw new Error('Failed to fetch data')
      
      const queries = await queriesRes.json()
      const tags = await tagsRes.json()
      
      set({ queries, tags, isLoading: false, isInitialized: true })
    } catch (error) {
      console.error('Store initialization error:', error)
      set({ isLoading: false, isInitialized: true }) // Prevent loop on error
    }
  },

  listQueries: (filters?: QueryFilters) => {
    const { queries } = get()
    let filtered = queries.filter((q) => !q.deletedAt)

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(search) ||
          q.description?.toLowerCase().includes(search) ||
          q.sql.toLowerCase().includes(search)
      )
    }

    if (filters?.database) {
      filtered = filtered.filter((q) => q.database === filters.database)
    }

    if (filters?.tagIds && filters.tagIds.length > 0) {
      filtered = filtered.filter((q) =>
        filters.tagIds!.some((tagId) => q.tags.some(t => t.id === tagId))
      )
    }

    if (filters?.isFavorite !== undefined) {
      filtered = filtered.filter((q) => q.isFavorite === filters.isFavorite)
    }

    return filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  listTrashed: () => {
    const { queries } = get()
    return queries
      .filter((q) => q.deletedAt)
      .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime())
  },

  getQuery: (id: string) => {
    const { queries } = get()
    return queries.find((q) => q.id === id)
  },

  createQuery: async (data) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Failed to create query')
      
      const newQuery = await response.json()
      set((state) => ({
        queries: [newQuery, ...state.queries],
        isSubmitting: false,
      }))
      return newQuery
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  updateQuery: async (id, data) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/queries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Failed to update query')
      
      const updatedQuery = await response.json()
      set((state) => ({
        queries: state.queries.map((q) => (q.id === id ? updatedQuery : q)),
        isSubmitting: false,
      }))
      return updatedQuery
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  deleteQuery: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/queries/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete query')
      
      set((state) => ({
        queries: state.queries.map((q) =>
          q.id === id ? { ...q, deletedAt: new Date().toISOString() } : q
        ),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  restoreQuery: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/queries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      })
      
      if (!response.ok) throw new Error('Failed to restore query')
      
      const updatedQuery = await response.json()
      set((state) => ({
        queries: state.queries.map((q) => (q.id === id ? updatedQuery : q)),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  permanentDeleteQuery: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/queries/${id}?permanent=true`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to permanent delete query')
      
      set((state) => ({
        queries: state.queries.filter((q) => q.id !== id),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  toggleFavorite: async (id) => {
    const q = get().getQuery(id)
    if (!q) return
    
    try {
      const response = await fetch(`/api/queries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !q.isFavorite }),
      })
      
      if (!response.ok) throw new Error('Failed to toggle favorite')
      
      const updatedQuery = await response.json()
      set((state) => ({
        queries: state.queries.map((q) => (q.id === id ? updatedQuery : q)),
      }))
    } catch (error) {
      console.error(error)
    }
  },

  incrementCopyCount: async (id) => {
    try {
      const response = await fetch(`/api/queries/${id}/copy`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to copy query')
      
      const newCopy = await response.json()
      set((state) => ({
        queries: [newCopy, ...state.queries.map(q => q.id === id ? { ...q, copyCount: q.copyCount + 1 } : q)],
      }))
    } catch (error) {
      console.error(error)
    }
  },

  addVersion: async (queryId, sql, description) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/queries/${queryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, description }),
      })
      
      if (!response.ok) throw new Error('Failed to add version')
      
      const updatedQuery = await response.json()
      set((state) => ({
        queries: state.queries.map((q) => (q.id === queryId ? updatedQuery : q)),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  createTag: async (name, color) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      
      if (!response.ok) throw new Error('Failed to create tag')
      
      const newTag = await response.json()
      set((state) => ({
        tags: [...state.tags, newTag],
        isSubmitting: false,
      }))
      return newTag
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  updateTag: async (id, name, color) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      
      if (!response.ok) throw new Error('Failed to update tag')
      
      const updatedTag = await response.json()
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? updatedTag : t)),
        isSubmitting: false,
      }))
      return updatedTag
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  deleteTag: async (id) => {
    set({ isSubmitting: true })
    try {
      const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete tag')
      
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
        queries: state.queries.map((q) => ({
          ...q,
          tags: q.tags.filter((t) => t.id !== id),
        })),
        isSubmitting: false,
      }))
    } catch (error) {
      set({ isSubmitting: false })
      throw error
    }
  },

  getTag: (id) => {
    const { tags } = get()
    return tags.find((t) => t.id === id)
  },

  getStats: () => {
    const { queries } = get()
    const activeQueries = queries.filter((q) => !q.deletedAt)

    const databaseCounts = activeQueries.reduce((acc, q) => {
      acc[q.database] = (acc[q.database] || 0) + 1
      return acc
    }, {} as Record<DatabaseType, number>)

    return {
      totalQueries: activeQueries.length,
      favoriteCount: activeQueries.filter((q) => q.isFavorite).length,
      totalCopies: activeQueries.reduce((sum, q) => sum + q.copyCount, 0),
      databaseCounts,
    }
  },
}))
