# Fastify DDD Project

Projeto base usando Fastify, Prisma, Zod e Domain-Driven Design (DDD).

## Estrutura do Projeto

```
src/
├── domain/                 # Camada de Domínio
│   ├── user/
│   │   ├── user.entity.ts       # Agregado User
│   │   └── user.repository.ts   # Interface do repositório
│   └── post/
│       ├── post.entity.ts       # Agregado Post
│       └── post.repository.ts   # Interface do repositório
├── application/            # Camada de Aplicação
│   └── use-cases/
│       ├── user/                # Casos de uso de User
│       └── post/                # Casos de uso de Post
├── infrastructure/         # Camada de Infraestrutura
│   ├── database/
│   │   └── prisma.ts            # Cliente Prisma
│   ├── repositories/
│   │   ├── prisma-user.repository.ts
│   │   └── prisma-post.repository.ts
│   └── http/
│       └── routes/
│           ├── user.routes.ts
│           └── post.routes.ts
└── server.ts              # Arquivo principal do servidor
```

## Requisitos

- Node.js 18+
- Docker e Docker Compose

## Configuração

1. Instalar dependências:

```bash
npm install
```

2. Copiar o arquivo de ambiente:

```bash
cp .env.example .env
```

3. Iniciar o banco de dados PostgreSQL:

```bash
docker-compose up -d
```

4. Gerar o Prisma Client:

```bash
npm run prisma:generate
```

5. Executar as migrations:

```bash
npm run prisma:migrate
```

## Executar o Projeto

Desenvolvimento:

```bash
npm run dev
```

Build:

```bash
npm run build
npm start
```

## API Endpoints

### Users

- `POST /users` - Criar usuário
- `GET /users` - Listar todos os usuários
- `GET /users/:id` - Buscar usuário por ID

### Posts

- `POST /posts` - Criar post
- `GET /posts` - Listar todos os posts
- `GET /posts/:id` - Buscar post por ID
- `PATCH /posts/:id/publish` - Publicar post

### Health Check

- `GET /health` - Verificar status do servidor

## Tecnologias

- Fastify - Framework web
- Prisma - ORM
- Zod - Validação de schemas
- PostgreSQL - Banco de dados
- TypeScript - Linguagem
