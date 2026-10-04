# SQL Vault VPS Deployment

This guide describes production deployment for SQL Vault using PostgreSQL 17, Docker Compose, and Caddy with automatic HTTPS.

## Topology

```text
Internet
  |
  | 80/443
  v
Caddy
  |
  | Docker frontend network
  v
SQL Vault :3000
  |
  | Docker backend network (internal)
  v
PostgreSQL :5432
```

In production:
- only Caddy publishes host ports;
- the application does **not** publish `3000/tcp`;
- PostgreSQL does **not** publish `5432/tcp`;
- the Docker `backend` network is internal;
- SQL Vault runs as a non-root user;
- migrations and security backfills run through `db:prepare` before Next.js starts.

## 1. VPS prerequisites

Recommended:
- Linux supported by Docker;
- Docker Engine and Docker Compose plugin;
- Git;
- a DNS hostname pointing to the VPS public IP;
- TCP ports `22`, `80`, and `443` open;
- optional UDP `443` for HTTP/3.

Do **not** expose ports `3000` or `5432` in the firewall.

## 2. DNS

Create an A/AAAA record, for example:

```text
sqlvault.example.com -> VPS_PUBLIC_IP
```

DNS must resolve correctly before Caddy can obtain a public certificate.

## 3. Prepare the project

```bash
git clone https://github.com/mateusarcedev/sql-vault.git
cd sql-vault
cp .env.production.example .env.production
```

Edit `.env.production`.

Generate secrets:

```bash
node -e "const c=require('crypto'); console.log('AUTH_SECRET='+c.randomBytes(48).toString('base64')); console.log('AI_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64')); console.log('POSTGRES_PASSWORD='+c.randomBytes(32).toString('hex'))"
```

Set:

```text
SQLVAULT_DOMAIN=sqlvault.example.com
ACME_EMAIL=admin@example.com
NEXTAUTH_URL=https://sqlvault.example.com
DATABASE_URL=postgresql://sqlvault:<URL_ENCODED_PASSWORD>@db:5432/sqlvault?schema=public
```

URL-encode PostgreSQL password special characters before placing it in `DATABASE_URL`.

Never commit `.env.production`.

## 4. Validate before deployment

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Verify:
- only `caddy` has `ports`;
- `app` has only `expose: 3000`;
- `db` has no `ports`;
- `NEXTAUTH_URL` uses HTTPS;
- `DATABASE_URL` points to host `db`, not `localhost`.

## 5. First deployment

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Follow logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app caddy
```

Smoke tests:

```bash
curl -fsS https://sqlvault.example.com/api/health
curl -I https://sqlvault.example.com
```

The health endpoint must return:

```json
{"status":"ok"}
```

## 6. PostgreSQL backup

Before any deployment that may apply migrations:

```bash
sh deploy/backup-postgres.sh
```

The script creates a custom-format dump under:

```text
backups/sql-vault-YYYYMMDDTHHMMSSZ.dump
```

Confirm the file exists and is not empty.

Recommended:
- copy critical backups off the VPS;
- define retention;
- periodically test restore;
- protect backups as sensitive database material.

## 7. Updating production

Recommended flow:

```bash
# 1. Backup
sh deploy/backup-postgres.sh

# 2. Record current revision for rollback
git rev-parse HEAD

# 3. Update source
git fetch --all --prune
git pull --ff-only

# 4. Validate compose
docker compose --env-file .env.production -f docker-compose.prod.yml config

# 5. Build new image
docker compose --env-file .env.production -f docker-compose.prod.yml build app

# 6. Start/update stack
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 7. Health check
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS https://sqlvault.example.com/api/health
```

Application startup automatically runs:
1. environment validation;
2. `prisma migrate deploy`;
3. API-key hash backfill;
4. AI-secret encryption backfill;
5. Next.js.

## 8. Restore

Restore replaces existing database objects and requires explicit confirmation.

```bash
CONFIRM_RESTORE=sqlvault sh deploy/restore-postgres.sh backups/sql-vault-YYYYMMDDTHHMMSSZ.dump
```

Then:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart app
curl -fsS https://sqlvault.example.com/api/health
```

## 9. Application rollback

If deployment fails **without an incompatible database migration**:

```bash
git checkout <PREVIOUS_COMMIT>
docker compose --env-file .env.production -f docker-compose.prod.yml build app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
curl -fsS https://sqlvault.example.com/api/health
```

If an applied migration is incompatible with the previous version:
1. stop the app;
2. restore the pre-deploy dump;
3. checkout the previous commit;
4. rebuild and start;
5. run the smoke test.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop app
CONFIRM_RESTORE=sqlvault sh deploy/restore-postgres.sh backups/<BACKUP>.dump
git checkout <PREVIOUS_COMMIT>
docker compose --env-file .env.production -f docker-compose.prod.yml build app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Never manually reverse a production migration without an explicit recovery plan.

## 10. Secret rotation

### AUTH_SECRET
Changing it invalidates active sessions.

### AI_ENCRYPTION_KEY
Do not rotate it without a re-encryption procedure. Losing it makes stored AI credentials unreadable.

### POSTGRES_PASSWORD
When rotating:
- update the PostgreSQL role password;
- update `POSTGRES_PASSWORD`;
- update the URL-encoded value in `DATABASE_URL`;
- restart services.

## 11. Operations

Status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=200
```

Restart only the app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart app
```

Stop the stack while preserving volumes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

**Never use `down -v` in production**, because it deletes the PostgreSQL and Caddy named volumes.
