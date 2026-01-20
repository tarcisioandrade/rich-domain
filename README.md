<div align="center">
 
<img width="1463" height="246" alt="Dark" src="https://github.com/user-attachments/assets/8b848f42-307f-41a2-9fc3-8074348d3f83" />

A comprehensive TypeScript monorepo for Domain-Driven Design, providing enterprise-ready tools for building maintainable, scalable applications with clean architecture patterns.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.12.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue)](https://www.typescriptlang.org/)
</div>

## 📦 Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@woltz/rich-domain](./packages/rich-domain) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain.svg)](https://www.npmjs.com/package/@woltz/rich-domain) | Core DDD library with entities, aggregates, value objects, and automatic change tracking |
| [@woltz/rich-domain-prisma](./packages/rich-domain-prisma) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-prisma.svg)](https://www.npmjs.com/package/@woltz/rich-domain-prisma) | Prisma adapter with Unit of Work and batch operations |
| [@woltz/rich-domain-typeorm](./packages/rich-domain-typeorm) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-typeorm.svg)](https://www.npmjs.com/package/@woltz/rich-domain-typeorm) | TypeORM adapter with transaction support |
| [@woltz/rich-domain-criteria-zod](./packages/rich-domain-criteria-zod) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-criteria-zod.svg)](https://www.npmjs.com/package/@woltz/rich-domain-criteria-zod) | Zod-based criteria builder for type-safe queries |
| [@woltz/rich-domain-cli](./packages/rich-domain-cli) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-cli.svg)](https://www.npmjs.com/package/@woltz/rich-domain-cli) | CLI for project scaffolding and code generation |
| [@woltz/rich-domain-export](./packages/rich-domain-export) | [![npm](https://img.shields.io/npm/v/@woltz/rich-domain-export.svg)](https://www.npmjs.com/package/@woltz/rich-domain-export) | Export data to @woltz/rich-domain repository

## 🚀 Quick Start

### Installation

```bash
# Core library
npm install @woltz/rich-domain

# With your preferred ORM
npm install @woltz/rich-domain-prisma
# or
npm install @woltz/rich-domain-typeorm
# CLI tools
npm install -g @woltz/rich-domain-cli
```

### Using the CLI

```bash
# Initialize a new project from template
rich-domain init my-app --template fullstack

# Generate domain from Prisma schema
rich-domain generate --schema prisma/schema.prisma

# Manually add entities
rich-domain add User name:string email:string --with-repo
```

### Basic Example

```typescript
import { Aggregate, Entity, Id } from "@woltz/rich-domain";
import { z } from "zod";

// Define your domain model
class User extends Aggregate<UserProps> {
  protected static validation = {
    schema: z.object({
      id: z.custom<Id>(),
      name: z.string(),
      email: z.string().email(),
      posts: z.array(z.instanceof(Post)),
    }),
  };

  addPost(title: string, content: string): void {
    const post = new Post({ title, content });
    this.props.posts.push(post);
  }

  // Getters...
}

// Automatic change tracking
const user = new User({ /* ... */ });
user.addPost("First Post", "Content");

const changes = user.getChanges();
// {
//   creates: [{ entity: "Post", ... }],
//   updates: [],
//   deletes: []
// }
```

## 🎯 Core Features

### Domain-Driven Design Building Blocks

- **Entities** - Objects with identity and lifecycle
- **Aggregates** - Consistency boundaries with automatic change tracking
- **Value Objects** - Immutable objects compared by value
- **Domain Events** - Cross-aggregate communication
- **Repository Pattern** - Abstract persistence layer

### Validation & Type Safety

- **Standard Schema Support** - Works with Zod, Valibot, ArkType
- **Full TypeScript Integration** - Type inference for field paths and operations
- **Lifecycle Hooks** - onCreate, onBeforeUpdate, business rules
- **Custom Exceptions** - 20+ domain-specific error types

### Data Management

- **Automatic Change Tracking** - Track nested entities and collections
- **Batch Operations** - Optimized bulk inserts, updates, deletes
- **Type-Safe Queries** - Fluent Criteria API with full type safety
- **Pagination** - Built-in paginated results with metadata

### Persistence Adapters

- **ORM Agnostic** - Core library works with any persistence layer
- **Prisma Adapter** - Unit of Work with AsyncLocalStorage
- **TypeORM Adapter** - Transaction decorator support
- **Custom Adapters** - Easy to implement for other ORMs

### Developer Experience

- **CLI Tooling** - Project scaffolding and code generation
- **React Components** - Data tables with shadcn/ui integration
- **React Query Integration** - useCriteriaQuery hook
- **Documentation** - Comprehensive guides and API reference

## 📁 Repository Structure

```
rich-domain/
├── packages/
│   ├── rich-domain/              # Core library
│   ├── rich-domain-prisma/       # Prisma adapter
│   ├── rich-domain-typeorm/      # TypeORM adapter
│   ├── rich-domain-criteria-zod/ # Zod criteria builder
│   ├── react-rich-domain/        # React components
│   └── rich-domain-cli/          # CLI tool
├── examples/
│   ├── backend/
│   │   └── fastify-with-prisma/  # Fastify + Prisma example
│   └── frontend/
│       └── react-with-react-query/ # React + React Query example
├── docs/                         # Mintlify documentation
└── package.json                  # Workspace configuration
```

## 🛠️ Development

### Prerequisites

- Node.js >= 20.0.0
- npm, pnpm, yarn, or bun

### Setup

```bash
# Clone the repository
git clone https://github.com/tarcisioandrade/rich-domain.git
cd rich-domain

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Type checking
npm run check

# Linting
npm run lint
```

### Workspace Commands

```bash
# Build specific package
npm run build --workspace=@woltz/rich-domain

# Test specific package
npm run test --workspace=@woltz/rich-domain

# Clean all packages
npm run clean
```

## 📖 Documentation

Visit our [complete documentation](https://woltz.mintlify.app) for:

- **Getting Started** - Quick start guide and installation
- **Core Concepts** - Entities, Aggregates, Value Objects, Change Tracking
- **Validation** - Schema validation, hooks, error handling
- **Criteria** - Type-safe query building
- **Repository** - Persistence abstraction and mappers
- **Integrations** - Prisma, TypeORM, Zod, React
- **CLI Reference** - Command-line tools guide

## 🎓 Examples

### Backend Examples

#### Fastify with Prisma

Complete REST API with:
- Domain-Driven Design architecture
- Prisma ORM integration
- BullMQ for background jobs
- Zod validation
- Docker setup

```bash
cd examples/backend/fastify-with-prisma
npm install
npm run docker:up
npm run db:push
npm run dev
```

### Frontend Examples

#### React with React Query

Full-stack application with:
- React + Vite
- React Query integration
- shadcn/ui components
- Data tables with criteria
- Type-safe queries

```bash
cd examples/frontend/react-with-react-query
npm install
npm run dev
```

## 🏗️ Architecture Principles

### Clean Architecture

```
┌─────────────────────────────────────────────┐
│              Presentation Layer             │
│         (Controllers, REST/GraphQL)         │
├─────────────────────────────────────────────┤
│             Application Layer               │
│          (Use Cases, Services)              │
├─────────────────────────────────────────────┤
│               Domain Layer                  │
│   (Entities, Aggregates, Value Objects)     │
├─────────────────────────────────────────────┤
│           Infrastructure Layer              │
│    (Repositories, ORM, External APIs)       │
└─────────────────────────────────────────────┘
```

### DDD Patterns Implemented

- **Strategic Design**
  - Bounded Contexts
  - Ubiquitous Language
  - Domain Events

- **Tactical Design**
  - Entities & Aggregates
  - Value Objects
  - Repositories
  - Domain Services
  - Factories

- **Supporting Patterns**
  - Unit of Work
  - Specification (Criteria)
  - Change Tracking
  - Event Sourcing (via Domain Events)

## 🔧 Configuration

### Monorepo Setup

The repository uses npm workspaces for package management:

```json
{
  "workspaces": [
    "packages/*",
    "examples/**/*"
  ]
}
```

### TypeScript Configuration

All packages use:
- TypeScript 5.4+
- Strict mode enabled
- Dual module format (ESM + CommonJS)
- Full type definitions

### Publishing

Each package is independently versioned and published to npm:

```bash
# Publish specific package
npm publish --workspace=@woltz/rich-domain

# Version update
npm run release --workspace=@woltz/rich-domain
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `npm run check` and `npm test`
6. Submit a pull request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug
docs: update documentation
chore: update dependencies
refactor: refactor code
test: add tests
```

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for details on changes in each version.

## 📜 License

MIT © [Tarcisio Andrade](https://github.com/tarcisioandrade)

## 🔗 Links

- [Documentation](https://woltz.mintlify.app)
- [GitHub Repository](https://github.com/tarcisioandrade/rich-domain)
- [npm Organization](https://www.npmjs.com/org/woltz)
- [Issues](https://github.com/tarcisioandrade/rich-domain/issues)

## 🙏 Acknowledgments

This project is inspired by:
- Domain-Driven Design by Eric Evans
- Implementing Domain-Driven Design by Vaughn Vernon
- Standard Schema specification
- The TypeScript and Node.js communities

## 📊 Project Status

- ✅ Core library: **Stable**
- ✅ Prisma adapter: **Stable**
- ✅ TypeORM adapter: **Beta**
- ✅ CLI tool: **Beta**
- 🚧 Drizzle adapter: **Planned**

## 💬 Community

- GitHub Discussions: [Ask questions and share ideas](https://github.com/tarcisioandrade/rich-domain/discussions)
- GitHub Issues: [Report bugs and request features](https://github.com/tarcisioandrade/rich-domain/issues)

---

**Made with ❤️ by developers, for developers building better domain models.**
