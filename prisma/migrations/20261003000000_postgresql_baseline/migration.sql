-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAIConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "openaiApiKey" TEXT,
    "anthropicApiKey" TEXT,
    "geminiApiKey" TEXT,
    "modelsUrl" TEXT,
    "connectionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "regeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "userId" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryVersion" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineVersion" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseContext" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "schemaFormat" TEXT NOT NULL,
    "schemaDefinition" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QueryToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QueryToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RoutineToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoutineToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserAIConfig_userId_key" ON "UserAIConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_token_key" ON "ApiKey"("token");

-- CreateIndex
CREATE INDEX "Query_userId_isPublic_idx" ON "Query"("userId", "isPublic");

-- CreateIndex
CREATE INDEX "Query_databaseId_idx" ON "Query"("databaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_userId_key" ON "Tag"("name", "userId");

-- CreateIndex
CREATE INDEX "Routine_userId_isPublic_idx" ON "Routine"("userId", "isPublic");

-- CreateIndex
CREATE INDEX "Routine_databaseId_idx" ON "Routine"("databaseId");

-- CreateIndex
CREATE INDEX "DatabaseContext_userId_isPublic_idx" ON "DatabaseContext"("userId", "isPublic");

-- CreateIndex
CREATE INDEX "_QueryToTag_B_index" ON "_QueryToTag"("B");

-- CreateIndex
CREATE INDEX "_RoutineToTag_B_index" ON "_RoutineToTag"("B");

-- AddForeignKey
ALTER TABLE "UserAIConfig" ADD CONSTRAINT "UserAIConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "DatabaseContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryVersion" ADD CONSTRAINT "QueryVersion_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "DatabaseContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineVersion" ADD CONSTRAINT "RoutineVersion_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseContext" ADD CONSTRAINT "DatabaseContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueryToTag" ADD CONSTRAINT "_QueryToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QueryToTag" ADD CONSTRAINT "_QueryToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoutineToTag" ADD CONSTRAINT "_RoutineToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoutineToTag" ADD CONSTRAINT "_RoutineToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
