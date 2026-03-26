export type DatabaseContextType = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'oracle' | 'other'
export type SchemaFormat = 'prisma' | 'sql' | 'other'

export interface DatabaseContext {
  id: string
  name: string
  description: string | null
  type: DatabaseContextType
  schemaFormat: SchemaFormat
  schemaDefinition: string
  isPublic: boolean
  userId: string
  owner?: DatabaseContextOwner
  createdAt: string
  updatedAt: string
}

export interface DatabaseContextOwner {
  id: string
  name: string | null
}

export interface DatabaseContextPublic extends Omit<DatabaseContext, 'userId'> {
  owner: DatabaseContextOwner
}

export interface DatabaseContextCreateInput {
  name: string
  description?: string | null
  type: DatabaseContextType
  schemaFormat: SchemaFormat
  schemaDefinition: string
  isPublic?: boolean
}

export interface DatabaseContextUpdateInput {
  name?: string
  description?: string | null
  type?: DatabaseContextType
  schemaFormat?: SchemaFormat
  schemaDefinition?: string
  isPublic?: boolean
}
