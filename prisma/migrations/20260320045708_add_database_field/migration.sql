-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Query" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sql" TEXT NOT NULL,
    "database" TEXT NOT NULL DEFAULT 'postgresql',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Query_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Query" ("copyCount", "createdAt", "description", "id", "isFavorite", "sql", "title", "updatedAt", "userId") SELECT "copyCount", "createdAt", "description", "id", "isFavorite", "sql", "title", "updatedAt", "userId" FROM "Query";
DROP TABLE "Query";
ALTER TABLE "new_Query" RENAME TO "Query";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
