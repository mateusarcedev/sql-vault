-- CreateTable
CREATE TABLE "DatabaseContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "schemaFormat" TEXT NOT NULL,
    "schemaDefinition" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DatabaseContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Query" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sql" TEXT NOT NULL,
    "database" TEXT NOT NULL DEFAULT 'postgresql',
    "databaseId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Query_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "DatabaseContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Query_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Query" ("copyCount", "createdAt", "database", "deletedAt", "description", "id", "isFavorite", "sql", "status", "title", "updatedAt", "userId") SELECT "copyCount", "createdAt", "database", "deletedAt", "description", "id", "isFavorite", "sql", "status", "title", "updatedAt", "userId" FROM "Query";
DROP TABLE "Query";
ALTER TABLE "new_Query" RENAME TO "Query";
CREATE INDEX "Query_userId_isPublic_idx" ON "Query"("userId", "isPublic");
CREATE INDEX "Query_databaseId_idx" ON "Query"("databaseId");
CREATE TABLE "new_Routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "databaseId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sql" TEXT NOT NULL,
    "parameters" TEXT,
    "returnType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Routine_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "DatabaseContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Routine" ("copyCount", "createdAt", "database", "deletedAt", "description", "id", "isFavorite", "name", "parameters", "returnType", "sql", "status", "type", "updatedAt", "userId") SELECT "copyCount", "createdAt", "database", "deletedAt", "description", "id", "isFavorite", "name", "parameters", "returnType", "sql", "status", "type", "updatedAt", "userId" FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
CREATE INDEX "Routine_userId_isPublic_idx" ON "Routine"("userId", "isPublic");
CREATE INDEX "Routine_databaseId_idx" ON "Routine"("databaseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DatabaseContext_userId_isPublic_idx" ON "DatabaseContext"("userId", "isPublic");
