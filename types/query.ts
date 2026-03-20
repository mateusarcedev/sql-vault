export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'oracle' | 'other'

export interface Tag {
  id: string
  name: string
  color: string
  userId: string
  createdAt: string
}

export interface QueryVersion {
  id: string
  sql: string
  description: string
  createdAt: string
}

export interface Query {
  id: string
  title: string
  description: string
  sql: string
  database: DatabaseType
  userId: string
  tags: Tag[]
  versions: QueryVersion[]
  status: 'active' | 'draft'
  isFavorite: boolean
  copyCount: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface QueryFilters {
  search?: string
  database?: DatabaseType
  tagIds?: string[]
  isFavorite?: boolean
}

export const DATABASE_COLORS: Record<DatabaseType, string> = {
  postgresql: '#336791',
  mysql: '#E48E00',
  sqlite: '#0F80CC',
  sqlserver: '#CC2927',
  oracle: '#F80000',
  other: '#6B7280',
}

export const DATABASE_LABELS: Record<DatabaseType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  sqlserver: 'SQL Server',
  oracle: 'Oracle',
  other: 'Outro',
}

export const TAG_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
] as const
