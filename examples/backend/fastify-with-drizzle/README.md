# Fastify + Drizzle with DDD Architecture Example

Este é um exemplo de aplicação usando Fastify, Drizzle ORM e arquitetura DDD (Domain-Driven Design) com a biblioteca `@woltz/rich-domain`.

## Estrutura do Projeto

```
src/
├── domain/
│   ├── entities/          # Entidades de domínio
│   │   ├── user.entity.ts
│   │   ├── post.entity.ts
│   │   └── comment.entity.ts
│   └── repositories/      # Interfaces de repositório
│       ├── user.repository.ts
│       └── post.repository.ts
├── application/
│   └── use-cases/         # Casos de uso
│       ├── create-user.use-case.ts
│       ├── get-user-by-id.use-case.ts
│       ├── update-user.use-case.ts
│       ├── create-post.use-case.ts
│       ├── get-post-by-id.use-case.ts
│       └── add-comment-to-post.use-case.ts
└── infrastructure/
    ├── database/
    │   ├── schema/        # Schemas Drizzle
    │   │   ├── users.schema.ts
    │   │   ├── posts.schema.ts
    │   │   └── comments.schema.ts
    │   ├── repositories/  # Implementações de repositório
    │   │   ├── user.repository.impl.ts
    │   │   └── post.repository.impl.ts
    │   ├── connection.ts
    │   └── migrate.ts
    └── http/
        └── routes/        # Rotas HTTP
            ├── user.routes.ts
            └── post.routes.ts
```

## Domínio

O domínio consiste em 3 entidades principais:

- **User** (Aggregate): Usuários do sistema
- **Post** (Aggregate): Posts criados por usuários
- **Comment** (Entity): Comentários em posts

## Como Executar

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar banco de dados

```bash
docker-compose up -d
```

### 3. Gerar migrações

```bash
npm run db:generate
```

### 4. Executar migrações

```bash
npm run db:migrate
```

### 5. Iniciar servidor

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## API Endpoints

### Users

- `POST /api/users` - Criar usuário
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

- `GET /api/users` - Listar todos os usuários

- `GET /api/users/:id` - Buscar usuário por ID

- `PUT /api/users/:id` - Atualizar usuário
  ```json
  {
    "name": "John Updated",
    "email": "john.updated@example.com"
  }
  ```

### Posts

- `POST /api/posts` - Criar post
  ```json
  {
    "title": "My Post",
    "content": "Post content here",
    "userId": "user-uuid"
  }
  ```

- `GET /api/posts` - Listar todos os posts

- `GET /api/posts/:id` - Buscar post por ID

- `POST /api/posts/:id/comments` - Adicionar comentário ao post
  ```json
  {
    "userId": "user-uuid",
    "content": "Comment content here"
  }
  ```

### Health Check

- `GET /health` - Verificar status do servidor

## Scripts Disponíveis

- `npm run dev` - Iniciar servidor em modo desenvolvimento
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor compilado
- `npm run db:generate` - Gerar migrações do Drizzle
- `npm run db:migrate` - Executar migrações
- `npm run db:push` - Sincronizar schema com banco (sem migrações)
- `npm run db:studio` - Abrir Drizzle Studio

## Tecnologias

- **Fastify** - Framework web
- **Drizzle ORM** - ORM para PostgreSQL
- **@woltz/rich-domain** - Biblioteca DDD com suporte a validação
- **Zod** - Validação de schema
- **TypeScript** - Tipagem estática
- **PostgreSQL** - Banco de dados
