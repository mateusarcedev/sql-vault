# Contribuindo para o SQL Vault

Obrigado por seu interesse em contribuir para o SQL Vault! Este documento serve como guia para configurar seu ambiente de desenvolvimento e garantir que suas contribuições estejam alinhadas com as decisões arquiteturais do projeto.

## 📜 Regra de Ouro
Antes de iniciar qualquer tarefa, leia atentamente o arquivo [ARCHITECTURE.md](file:///Users/mateusarce/projetos/sql-vault/ARCHITECTURE.md). Ele contém as regras invioláveis de ownership, segurança e padrões de código que devem ser seguidos rigorosamente.

---

## 🚀 Como começar

### 1. Configuração do Ambiente
1.  **Clone o repositório**
2.  **Instale as dependências**:
    ```bash
    npm install
    ```
3.  **Configuração de Variáveis de Ambiente**:
    - Copie o arquivo `.env.example` para `.env`.
    - Gere um secret para o NextAuth: `openssl rand -base64 32`.
    - Certifique-se de que o `DATABASE_URL` aponta para seu arquivo SQLite local.
4.  **Banco de Dados**:
    ```bash
    npx prisma migrate dev
    ```
5.  **Inicie o Servidor**:
    ```bash
    npm run dev
    ```
Acesse `http://localhost:3000` para ver a aplicação rodando.

---

## 🛠 Padrões de Desenvolvimento

### 1. Backend e API
- **Ownership**: Todas as consultas ao banco de dados (Prisma) *devem* filtrar pelo `userId` do usuário autenticado. Nunca confie apenas no ID do recurso.
- **Handlers**: Use o helper `getUserFromApiKey` ou a sessão do NextAuth no início de cada rota para identificar o usuário.
- **Soft Delete**: Não use `delete` no Prisma para Queries e Routines. Atualize o campo `deletedAt`.
- **Versionamento**: Ao editar o campo `sql`, certifique-se de disparar a criação de uma `QueryVersion` ou `RoutineVersion` com o conteúdo anterior.

### 2. Frontend e UI
- **Componentes**: Verifique a pasta `components/` antes de criar um novo elemento. Use `DatabaseBadge`, `TagChip`, `EmptyState` e `Skeleton*` para manter a consistência visual.
- **Estado**: 
  - Estado de UI/Global: **Zustand** (`store/`).
  - Cache/Dados Remotos: **TanStack Query**.
- **UX**: A abertura de Drawers e Modais complexos deve ser controlada via query params (`?drawer=new`, etc.) para permitir deep-linking.

### 3. Design Tokens
Siga a paleta de cores definida no `ARCHITECTURE.md`. Use as classes do Tailwind que apontam para as variáveis de tema zinc/slate configuradas.

---

## 📋 Checklist de Pull Request
Antes de abrir um PR, verifique se:
- [ ] O código compila sem erros de TypeScript (`npm run build`).
- [ ] Não há `console.log` ou comentários de debug.
- [ ] Novas rotas de API foram documentadas ou seguem os padrões existentes.
- [ ] O ownership do dado é verificado em cada transação.
- [ ] As regras de persistência (como serialização de parâmetros em Routines) foram respeitadas.

## 🔌 VS Code Extension
Se estiver contribuindo para a extensão (pasta `sqlvault-vscode`), lembre-se que ela é um projeto standalone. Use apenas módulos nativos do Node.js (`http`/`https`) para manter o cliente leve e sem dependências de terceiros.

---

Precisa de ajuda? Consulte o `ARCHITECTURE.md` ou abra uma issue detalhando sua dúvida!
