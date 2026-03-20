import type { Tag, DatabaseType } from './query'

export type RoutineType = 'function' | 'procedure' | 'trigger' | 'view'

export type RoutineParameter = {
  name: string
  type: string        // ex: "INTEGER", "VARCHAR(255)", "BOOLEAN"
  direction: 'IN' | 'OUT' | 'INOUT' // ignorado para triggers e views
}

export type Routine = {
  id: string
  name: string
  description: string | null
  type: RoutineType
  database: DatabaseType
  sql: string
  parameters: RoutineParameter[] // deserializado do campo JSON no client, persistido como JSON
  returnType: string | null
  status: 'active' | 'draft'
  isFavorite: boolean
  copyCount: number
  tags: Tag[]
  versions: RoutineVersion[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type RoutineVersion = {
  id: string
  routineId: string
  sql: string
  createdAt: string
}
