# Deploy do SQL Vault em VPS

Este guia descreve o deploy de produção do SQL Vault com PostgreSQL 17, Docker Compose e Caddy com HTTPS automático.

## Topologia

```text
Internet
  |
  | 80/443
  v
Caddy
  |
  | rede Docker frontend
  v
SQL Vault :3000
  |
  | rede Docker backend (internal)
  v
PostgreSQL :5432
```

Em produção:
- somente Caddy publica portas no host;
- a aplicação **não** publica `3000/tcp`;
- PostgreSQL **não** publica `5432/tcp`;
- a rede `backend` é marcada como interna pelo Docker;
- o processo do SQL Vault roda como usuário não-root;
- migrations e backfills de segurança rodam em `db:prepare` antes do Next.js.

## 1. Pré-requisitos da VPS

Recomendado:
- Linux x86_64/arm64 suportado pelo Docker;
- Docker Engine e Docker Compose plugin;
- Git;
- domínio apontando para o IP público da VPS;
- portas TCP `22`, `80` e `443` liberadas;
- porta UDP `443` opcional para HTTP/3.

O firewall **não deve** liberar `3000` ou `5432`.

## 2. DNS

Crie um registro A/AAAA para o hostname escolhido, por exemplo:

```text
sqlvault.example.com -> IP_DA_VPS
```

A propagação DNS deve estar funcional antes de esperar emissão automática do certificado pelo Caddy.

## 3. Preparar o projeto

```bash
git clone https://github.com/mateusarcedev/sql-vault.git
cd sql-vault
cp .env.production.example .env.production
```

Edite `.env.production`.

Gere segredos:

```bash
node -e "const c=require('crypto'); console.log('AUTH_SECRET='+c.randomBytes(48).toString('base64')); console.log('AI_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64')); console.log('POSTGRES_PASSWORD='+c.randomBytes(32).toString('hex'))"
```

Ajuste também:

```text
SQLVAULT_DOMAIN=sqlvault.example.com
ACME_EMAIL=admin@example.com
NEXTAUTH_URL=https://sqlvault.example.com
DATABASE_URL=postgresql://sqlvault:<SENHA_URL_ENCODED>@db:5432/sqlvault?schema=public
```

Se a senha do PostgreSQL tiver caracteres especiais, faça URL encoding antes de colocá-la em `DATABASE_URL`.

Nunca commite `.env.production`.

## 4. Validar configuração antes do deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Confira que:
- somente `caddy` possui `ports`;
- `app` possui apenas `expose: 3000`;
- `db` não possui `ports`;
- `NEXTAUTH_URL` usa HTTPS;
- `DATABASE_URL` aponta para host `db`, não `localhost`.

## 5. Primeiro deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Acompanhe logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app caddy
```

Smoke tests:

```bash
curl -fsS https://sqlvault.example.com/api/health
curl -I https://sqlvault.example.com
```

O primeiro comando deve retornar:

```json
{"status":"ok"}
```

## 6. Backup PostgreSQL

Antes de qualquer deploy que possa aplicar migration:

```bash
sh deploy/backup-postgres.sh
```

O script cria um dump custom-format em:

```text
backups/sql-vault-YYYYMMDDTHHMMSSZ.dump
```

Verifique que o arquivo existe e não está vazio antes de seguir.

Recomendações:
- copie backups críticos para armazenamento fora da VPS;
- mantenha política de retenção;
- teste restore periodicamente;
- proteja backups com a mesma classificação de segurança do banco.

## 7. Deploy de atualização

Fluxo recomendado:

```bash
# 1. Backup
sh deploy/backup-postgres.sh

# 2. Registrar revisão atual para eventual rollback
git rev-parse HEAD

# 3. Atualizar código
git fetch --all --prune
git pull --ff-only

# 4. Validar compose
docker compose --env-file .env.production -f docker-compose.prod.yml config

# 5. Construir nova imagem
docker compose --env-file .env.production -f docker-compose.prod.yml build app

# 6. Subir stack
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 7. Verificar saúde
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -fsS https://sqlvault.example.com/api/health
```

O container da aplicação executa automaticamente:
1. validação de env;
2. `prisma migrate deploy`;
3. backfill de hashes de API key;
4. backfill de criptografia das credenciais de IA;
5. Next.js.

## 8. Restore

Restore é destrutivo para objetos existentes e exige confirmação explícita.

```bash
CONFIRM_RESTORE=sqlvault sh deploy/restore-postgres.sh backups/sql-vault-YYYYMMDDTHHMMSSZ.dump
```

Depois:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart app
curl -fsS https://sqlvault.example.com/api/health
```

## 9. Rollback da aplicação

Se o deploy falhar **sem migration incompatível**:

```bash
git checkout <COMMIT_ANTERIOR>
docker compose --env-file .env.production -f docker-compose.prod.yml build app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
curl -fsS https://sqlvault.example.com/api/health
```

Se uma migration aplicada não for compatível com a versão anterior:
1. pare a aplicação;
2. restaure o dump feito antes do deploy;
3. volte ao commit anterior;
4. reconstrua e suba a aplicação;
5. execute smoke test.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop app
CONFIRM_RESTORE=sqlvault sh deploy/restore-postgres.sh backups/<BACKUP>.dump
git checkout <COMMIT_ANTERIOR>
docker compose --env-file .env.production -f docker-compose.prod.yml build app
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Nunca tente "desfazer" manualmente uma migration em produção sem um plano explícito.

## 10. Rotação e perda de segredos

### AUTH_SECRET
Trocar invalida sessões existentes.

### AI_ENCRYPTION_KEY
Não troque sem uma rotina de recriptografia. Perder a chave impede descriptografar credenciais de IA salvas.

### POSTGRES_PASSWORD
Ao rotacionar:
- atualize `POSTGRES_PASSWORD`;
- atualize a senha do role dentro do PostgreSQL;
- atualize a senha URL-encoded em `DATABASE_URL`;
- reinicie os serviços.

## 11. Operação

Status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=200
```

Reiniciar somente app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart app
```

Parar stack preservando volumes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

**Não use `down -v` em produção**, pois ele remove os volumes nomeados do PostgreSQL e do Caddy.
