-- Transitional API key hardening.
-- Plaintext token remains temporarily for backward-compatible rollout.
ALTER TABLE "ApiKey" ADD COLUMN "tokenHash" TEXT;

CREATE UNIQUE INDEX "ApiKey_tokenHash_key" ON "ApiKey"("tokenHash");
