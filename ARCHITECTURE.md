# Arquitetura do SQL Vault

## 1. Visão geral do projeto

SQL Vault é um sistema local-first projetado para desenvolvedores, analistas de dados e equipes de engenharia organizarem, versionarem e executarem consultas SQL e rotinas de banco de dados em um repositório centralizado. Ele atua como um ambiente principal para gerenciar scripts de banco de dados com foco em busca rápida, tags, versionamento e integração segura com ferramentas externas.

## 2. Stack tecnológica

* **Next.js (App Router)**: Framework para construir a aplicação React. Fornece capacidades full-stack integradas com rotas de API e segregação entre server components e client components.
* **TypeScript**: Garante tipagem forte em toda a aplicação, prevenindo erros em tempo de execução e impondo limites contratuais.
* **Prisma**: ORM type-safe usado para interagir com o banco de dados, lidar com migrations e gerar definições estritas de schema em TypeScript.
* **SQLite**: Banco local principal. Escolhido pela persistência local sem configuração, combinando perfeitamente com a natureza local-first do SQL Vault.
* **NextAuth v5 (Auth.js)**: Gerencia sessões de autenticação nativamente no Next.js usando cookies HTTP-only seguros e bcrypt para hash de senhas.
* **TanStack Query**: Biblioteca de busca de dados para gerenciar estado remoto, cache, atualizações em background e invalidação no frontend.
* **Zustand**: Gerenciamento leve de estado global para a camada de UI (selecionado em vez de Context API por desempenho e menor boilerplate em stores complexas).
* **shadcn/ui**: Biblioteca de componentes acessíveis e personalizáveis construída sobre primitivas do Radix UI.
* **Tailwind CSS**: Framework utility-first para estilização rápida diretamente nos componentes React.
* **Monaco Editor**: Editor poderoso que alimenta os campos de entrada SQL com destaque avançado de sintaxe e capacidades de autocomplete.
* **bcryptjs**: Usado especificamente no fluxo do provider de credenciais do NextAuth para hash e verificação segura de senhas.

## 3. Estrutura do projeto

* `app/(auth)/`: Rotas públicas não autenticadas (ex.: login, cadastro). Contém os pontos de entrada para obtenção de contexto de sessão.
* `app/(app)/`: Rotas principais autenticadas da aplicação. O layout de wrapper garante que uma sessão válida exista antes de renderizar a sidebar ou páginas internas.
* `app/api/`: Endpoints RESTful. Cada handler impõe ownership, autenticação e respostas de erro estruturadas.
* `components/`: Componentes de UI puros e reutilizáveis (ex.: botões, inputs, elementos de layout como `DatabaseBadge`, `TagChip`, `EmptyState`, `SkeletonCard`, `SkeletonRow`, `VersionTimeline`, `VersionDiffModal`).
* `store/`: Slices globais do Zustand. Organizadas por domínio de negócio (`query-store.ts`, `routine-store.ts`, `ui-store.ts`).
* `types/`: Definições globais de TypeScript, aliases de tipos e interfaces amplamente reutilizadas.
* `lib/`: Funções utilitárias centrais, helpers reutilizáveis e singletons do sistema (ex.: instanciador do Prisma client `db.ts`, helper de auth de API key `auth-api-key.ts`).
* `prisma/`: Definições do schema do banco (`schema.prisma`), migrations e arquivo SQLite (`dev.db`).

## 4. Schema do banco de dados

* **User**: Representa o usuário do sistema.

  * *Obrigatórios*: `email`, `password` (hasheada).
  * *Relações*: Possui `queries`, `routines`, `tags` e `apiKeys`.
* **Query**: Representa um script SQL salvo.

  * *Obrigatórios*: `id`, `name`, `sql`, `database` (enum), `status` (`'active' | 'draft'`), `isFavorite`, `copyCount`, `userId`.
  * *Especial*: `deletedAt` para funcionalidade de soft delete.
  * *Relações*: Possui muitas `tags` e `versions`.
* **QueryVersion**: Snapshot imutável de um Query em um ponto no tempo.
  * *Obrigatórios*: `id`, `queryId`, `sql`, `createdAt`.
  * *Criação automática*: gerada pelo handler `PUT /api/queries/[id]` sempre que o campo `sql` da Query mudar em relação ao valor atual no banco.
* **Tag**: Rótulo de categorização de metadados.

  * *Obrigatórios*: `id`, `name`, `color`, `userId`.
  * *Especial*: Compartilhada de forma intercambiável entre Queries e Routines por meio de relações independentes.
* **Routine**: Representa uma sequência executável ou job agendado de banco de dados.
  * *Obrigatórios*: `id`, `name`, `sql`, `database`, `type`, `userId`.
  * *Especial*: `parameters` (deve ser serializado como string JSON ao persistir; desserializado ao ler). Usa `deletedAt` para soft delete.
  * *Relações*: Possui muitas `tags` e `versions`.
* **RoutineVersion**: Snapshot imutável de uma Routine em um ponto no tempo.
  * *Obrigatórios*: `id`, `routineId`, `sql`, `createdAt`.
  * *Criação automática*: gerada pelo handler `PUT /api/routines/[id]` sempre que o campo `sql` da Routine mudar em relação ao valor atual no banco.
* **ApiKey**: Token de autenticação para sistemas externos (ex.: extensão VS Code).

  * *Obrigatórios*: `id`, `name`, `token` (gerado automaticamente de forma segura), `userId`.
  * *Especial*: Registra `lastUsedAt`.

## 5. Regras arquiteturais

1. **Ownership obrigatório**: Todo modelo que armazena dados de usuário *deve* ter uma relação obrigatória com `userId`.
2. **Soft delete**: Registros em `Query` e `Routine` nunca são removidos permanentemente por código da aplicação (hard delete). Devem usar atualizações em `deletedAt` (mecanismo de soft delete).
3. **Serialização de parâmetros de Routine**: O atributo `parameters` dentro do modelo `Routine` é estritamente tratado como uma string JSON serializada na camada de banco. Ele deve sempre ser desserializado para um objeto antes de ser exposto pela resposta da API e serializado novamente antes da persistência.
4. **Metadados compartilhados**: Modelos `Tag` são utilizados para categorização em múltiplos domínios. Eles são compartilhados entre `Query` e `Routine` por meio de relações distintas (`queries` / `routines` nos campos array do modelo Tag).
5. **Segurança de token**: A string `token` pertencente a uma entidade `ApiKey` é exposta ao cliente exatamente uma vez: na resposta de `POST /api/keys`. É estritamente proibido retorná-la em quaisquer requisições `GET` subsequentes ou listas.
6. **Versionamento automático**: Os handlers `PUT /api/queries/[id]` e `PUT /api/routines/[id]` devem comparar o campo `sql` recebido com o valor persistido antes de executar o update. Se houver diferença, criar um registro em `QueryVersion` ou `RoutineVersion` com o SQL atual (antes do update) antes de sobrescrever. Nunca criar versão se o SQL não mudou.

## 6. Autenticação

O SQL Vault utiliza um mecanismo rígido de dupla autenticação:

1. **NextAuth v5 (cookies de sessão)**: Método primário de autenticação para a interface web usando o provider Credentials (email/senha verificados via `bcryptjs`).
2. **Chaves de API pessoais (tokens)**: Mecanismo de autenticação headless para consumidores externos (como a extensão VS Code). Requer que as requisições enviem `Authorization: Bearer {token}`.

**Motor de resolução**:
A resolução de token passa exclusivamente por um único ponto de verdade: a função `getUserFromApiKey` localizada em `lib/auth-api-key.ts`.

**Proteção de rotas**:

* Rotas da interface/browser (`/queries`, `/routines`, `/settings`) dependem estritamente do contexto de sessão do NextAuth.
* Rotas de lógica de negócio da API (`/api/queries`, `/api/routines`, `/api/tags`, `/api/export`) aceitam **tanto** sessões NextAuth quanto API Keys.
* Rotas de gerenciamento de recursos (`/api/keys`) aceitam apenas sessões NextAuth (API Keys não podem gerenciar API Keys).

## 7. Convenções da API

1. **Validação prévia**: Toda rota autenticada estabelece imediatamente o `userId` atuante dentro da lógica do handler (invocando a recuperação de sessão ou o helper `getUserFromApiKey`).
2. **Respostas padronizadas**:

   * `401 Unauthorized`: Nenhuma sessão válida ou API Key fornecida.
   * `403 Forbidden`: Autenticado, mas tentando alterar ou acessar um registro pertencente a outro `userId`.
   * `404 Not Found`: O recurso não existe ou foi soft-deleted (`deletedAt` não é nulo).
3. **Filtro implícito de ownership**: As consultas Prisma que conduzem handlers `GET`, `PUT` e `DELETE` devem anexar `userId` de forma inerente nas cláusulas `where` inteiras. Dados pertencentes a `userId: 'A'` são fundamentalmente inacessíveis por `userId: 'B'`.
4. **Formato de data**: Todos os campos temporais devem ser serializados em formato ISO 8601 antes de sair da camada de API.

## 8. Mapa de rotas

*Todas as rotas suportam autenticação por Sessão e API Key, salvo indicação em contrário.*

**API de Queries**

* `GET    /api/queries`             - Lista todas as queries do usuário atual (suporta filtro `?search={term}`).
* `POST   /api/queries`             - Cria uma nova query SQL.
* `GET    /api/queries/[id]`        - Busca uma query específica e seus detalhes completos.
* `PUT    /api/queries/[id]`        - Modifica uma query existente.
* `DELETE /api/queries/[id]`        - Soft-deleta uma query específica.
* `POST   /api/queries/[id]/copy`   - Incrementa a métrica `copyCount` de uma query específica.

**API de Routines**

* `GET    /api/routines`            - Lista todas as routines de banco do usuário atual.
* `POST   /api/routines`            - Cria uma nova routine.
* `GET    /api/routines/[id]`       - Busca os detalhes de uma routine específica.
* `PUT    /api/routines/[id]`        - Modifica uma routine existente.
* `DELETE /api/routines/[id]`       - Soft-deleta uma routine específica.
* `POST   /api/routines/[id]/copy`  - Incrementa a métrica `copyCount` de uma routine específica.

**API de Tags**

* `GET    /api/tags`                - Lista todas as tags criadas pelo usuário.
* `POST   /api/tags`               - Cria uma nova instância de tag.

**API de Exportação**

* `GET    /api/export`              - Gera um payload completo contendo todos os dados de Queries e Routines do usuário para backup.

**API de Chaves** *(Requer apenas Sessão NextAuth)*

* `GET    /api/keys`                - Lista todas as representações não sensíveis das chaves de API registradas pelo usuário.
* `POST   /api/keys`                - Gera uma nova API Key (retorna o token bruto estritamente uma vez).
* `DELETE /api/keys/[id]`           - Revoga permanentemente (hard-delete) uma API Key.

**API de Versões** *(Suporta Sessão e API Key)*

* `GET    /api/queries/[id]/versions`
  - Lista todas as versões de uma query ordenadas por `createdAt desc`.
* `POST   /api/queries/[id]/versions/[versionId]/restore`
  - Salva o SQL atual como nova versão, então substitui `Query.sql` pelo SQL da versão selecionada.
* `GET    /api/routines/[id]/versions`
  - Lista todas as versões de uma routine ordenadas por `createdAt desc`.
* `POST   /api/routines/[id]/versions/[versionId]/restore`
  - Salva o SQL atual como nova versão, então substitui `Routine.sql` pelo SQL da versão selecionada.

**API de Export/Import** *(Export suporta Sessão e API Key; Import requer apenas Sessão)*

* `GET    /api/export?format=json`
  - Exporta todas as queries, routines e tags como JSON (`ExportPayload` version 2).
* `GET    /api/export?format=sql`
  - Exporta queries e routines ativas como arquivo `.sql` comentado.
* `POST   /api/import`
  - Importa payload JSON (version 1 ou 2). Estratégia: upsert por nome. Requer sessão NextAuth — API Key não é aceita nesta rota.

## 9. Padrões de frontend

1. **Posse de estado**:

   * Estado reativo complexo que atravessa múltiplos componentes é controlado via Zustand (particionado por domínio: `query-store`, `routine-store`, `ui-store`).
   * Ciclo de vida de dados do servidor, invalidação de cache e sincronização em background são delegados naturalmente ao TanStack Query.
2. **Navegação por Drawer/Modal**: Drawers em tela cheia e modais pesados são controlados diretamente por parâmetros de query na URL (ex.: `?drawer=new`, `?drawer=edit`). Isso preserva o estado de navegação e permite deep-links compartilháveis.
3. **Segregação de rotas**: Separação topológica clara por meio de Route Groups: `(auth)` limita o contexto para views não autenticadas, enquanto `(app)` garante o envolvimento por providers de contexto.
4. **Integridade da store**: O `StoreInitializer` provisiona estados do Zustand diretamente na memória *somente* quando o estado de execução garante `status === 'authenticated'`.
5. **Reutilização de componentes**: Todos os elementos fundamentais de UI (`DatabaseBadge`, `TagChip`, `EmptyState`, `SkeletonCard`, `SkeletonRow`, `VersionTimeline`, `VersionDiffModal`) devem ser reutilizados de forma agressiva em vez de duplicados de maneira ad hoc.

## 10. Tokens de design da UI

Configurações visuais estritamente aplicadas nativamente via lógica do Tailwind:

**Cores**:

* **Background**: `#0F172A`
* **Sidebar e Cards centrais**: `#1E293B`
* **Bordas e divisores**: `#334155`
* **Texto primário**: `#F1F5F9`
* **Texto secundário / secundário suave**: `#94A3B8`
* **Destaque de acento**: `#3B82F6`

**Formulação da paleta de tags** (8 constantes hex fixas):

1. `#ef4444` (Vermelho)
2. `#f97316` (Laranja)
3. `#eab308` (Amarelo)
4. `#22c55e` (Verde)
5. `#06b6d4` (Ciano)
6. `#3b82f6` (Azul)
7. `#a855f7` (Roxo)
8. `#ec4899` (Rosa)

**Tipos semânticos de banco**:
`postgresql`, `mysql`, `sqlite`, `sqlserver`, `oracle`, `other` (cada um mapeado para combinações determinísticas de ícone/cor dentro dos tokens genéricos de design).

**Tipos semânticos de routine**:
Cada tipo explicitamente enumerado aplica uma lógica fixa de configuração estética específica.

## 11. O que NÃO fazer (anti-patterns)

* ❌ **NUNCA** retornar `password` (nem variantes com hash) ou um token de API Key em respostas de consulta maiores da API ou endpoints de listagem.
* ❌ **NUNCA** expor o campo `parameters` de uma Routine como string JSON bruta para o payload do frontend. Sempre mapeá-lo para um boundary de objeto JSON interativo no handler da API.
* ❌ **NUNCA** inicializar a store de dados da aplicação antes que a verificação de autenticação `status === 'authenticated'` seja concluída definitivamente.
* ❌ **NUNCA** modelar discriminadores semânticos como `DatabaseType` e `RoutineType` como entidades genéricas de `Tag` no banco. Eles são Types sistêmicos, não Tags de categorização abstrata.
* ❌ **NUNCA** instalar dependências externas de runtime além da especificação base, a menos que uma justificativa arquitetural explícita e documentada seja necessária.

## 12. Variáveis de ambiente

Arquivo `.env` obrigatório na raiz do projeto. Nunca commitar este arquivo.

| Variável | Obrigatória | Descrição |
| :--- | :--- | :--- |
| `DATABASE_URL` | Sim | Path do SQLite. Ex: `file:./prisma/dev.db` |
| `AUTH_SECRET` | Sim | Secret do NextAuth. Gerar com: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Sim (prod) | URL base da aplicação. Ex: `http://localhost:3000` |

Copiar `.env.example` como ponto de partida:

```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
```

## 13. VS Code Extension

Repositório separado: `github.com/{usuario}/sqlvault-vscode`

Extensão standalone para integrar o SQL Vault diretamente no editor. Não faz parte do monorepo — tem seu próprio `package.json`, `tsconfig.json` e ciclo de release independente.

**Autenticação:** exclusivamente via API Key (`Authorization: Bearer {token}`). Nunca usa cookies de sessão.

**Rotas consumidas:**

* `GET /api/queries?search={term}` — busca e listagem
* `POST /api/queries` — salvar SQL selecionado
* `GET /api/tags` — listagem para autocomplete
* `POST /api/queries/[id]/copy` — incrementar copyCount ao inserir no editor

**Dependências de runtime:** nenhuma — usa apenas `node:http` e `node:https` nativos.

**Comandos registrados:**

* `SQL Vault: Search Query` (`Cmd+Shift+S`) — QuickPick com busca reativa
* `SQL Vault: Save Selected SQL` — menu de contexto quando há seleção
* `SQL Vault: Configure API Key` — abre `/settings` no browser e solicita o token

**Configuração do usuário (`settings.json`):**

```json
{
  "sqlvault.apiUrl": "http://localhost:3000",
  "sqlvault.apiKey": ""
}
```