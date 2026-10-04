# Contribuindo para o SQL Vault

Obrigado por seu interesse em contribuir para o SQL Vault.

> Idioma: **Português (Brasil)** | [English](CONTRIBUTING.en.md)

Antes de começar, leia [ARCHITECTURE.md](ARCHITECTURE.md). Ele contém as regras arquiteturais e de segurança que devem ser preservadas.

## Como começar

### 1. Pré-requisitos

- Node.js 22 LTS
- npm
- Docker + Docker Compose
- Git

### 2. Clone e configuração

```bash
git clone https://github.com/mateusarcedev/sql-vault.git
cd sql-vault
cp .env.example .env
npm ci
```

Gere `AUTH_SECRET` e `AI_ENCRYPTION_KEY`:

```bash
node -e "const c=require('crypto'); console.log('AUTH_SECRET='+c.randomBytes(32).toString('base64')); console.log('AI_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64'))"
```

Copie os valores para `.env`.

### 3. Banco de dados

```bash
docker compose up -d db
npm run prisma:generate
npm run db:migrate:deploy
```

### 4. Desenvolvimento

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

## Padrões de desenvolvimento

### Backend e API

- **Ownership:** toda leitura/escrita de dados de usuário deve respeitar `userId`.
- **Autenticação:** use a sessão Auth.js ou `getUserFromApiKey` conforme o contrato da rota.
- **Soft delete:** Queries e Routines usam `deletedAt`; não faça hard-delete nesses modelos.
- **Versionamento:** mudanças em `sql` devem preservar a versão anterior.
- **Segredos:** nunca retorne password, token bruto persistido ou credenciais de IA.
- **Migrations:** mudanças de schema devem ser feitas via migration incremental e testável.

### Frontend

- reutilize componentes existentes antes de criar novos;
- use Zustand para estado global de UI;
- use TanStack Query para dados remotos;
- preserve os padrões de drawers/modais controlados por query params;
- siga os tokens definidos em `ARCHITECTURE.md`.

## Validação antes do PR

Execute:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Se a mudança afetar fluxos de interface, autenticação, navegação ou integrações críticas, instale o Chromium do Playwright uma vez e execute:

```bash
npx playwright install chromium
npm run test:e2e
```

Os testes E2E usam PostgreSQL e o seed demo; mantenha o banco local preparado conforme a seção anterior.

Se a mudança afetar banco ou Docker, valide também:

```bash
npm run prisma:generate
npm run db:migrate:deploy
docker compose build
```

## Checklist de Pull Request

- [ ] O escopo está limitado e descrito claramente.
- [ ] Lint passou.
- [ ] Typecheck passou.
- [ ] Testes unitários/API passaram.
- [ ] E2E Playwright passou quando o fluxo alterado é coberto pela suíte.
- [ ] Build passou.
- [ ] Novas rotas ou regras foram testadas.
- [ ] Ownership e autenticação foram revisados.
- [ ] Nenhum segredo, `.env`, dump ou artefato gerado foi commitado.
- [ ] Documentação PT/EN foi atualizada quando aplicável.
- [ ] Migrations são compatíveis com o fluxo de deploy.

## Segurança

Não abra issue pública para vulnerabilidades. Consulte [SECURITY.md](SECURITY.md).

## Extensão VS Code

A extensão é mantida em repositório separado e usa API Keys para autenticação. Mudanças específicas da extensão devem ser feitas no repositório correspondente.

## Ajuda

Abra uma issue para bugs, melhorias ou dúvidas de contribuição que não envolvam informações de segurança sensíveis.
