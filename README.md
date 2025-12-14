<div align="center">
 
<img width="1463" height="246" alt="Dark" src="https://github.com/user-attachments/assets/8b848f42-307f-41a2-9fc3-8074348d3f83" />

  <p>
    <strong>Enterprise-grade Domain-Driven Design (DDD) toolkit for TypeScript</strong>
  </p>
  <p>
    <a href="https://woltz.mintlify.app"><strong>Documentation</strong></a> ·
    <a href="https://github.com/tarcisioandrade/rich-domain"><strong>GitHub</strong></a> ·
    <a href="https://github.com/tarcisioandrade/rich-domain/issues"><strong>Issues</strong></a>
  </p>
</div>

---

## Overview

A comprehensive monorepo containing Domain-Driven Design (DDD) libraries, tools, and integrations for building scalable TypeScript applications with rich domain models, type-safe validation, and enterprise-ready patterns.

## Packages

### Core Library

- **[@woltz/rich-domain](./packages/rich-domain)** - Core DDD library with entities, aggregates, value objects, Standard Schema validation, change tracking, events, repositories, and criteria pattern

### Integrations

- **[@woltz/rich-domain-prisma](./packages/rich-domain-prisma)** - Prisma ORM integration with ready-to-use repository implementations and Unit of Work pattern
- **[@woltz/rich-domain-criteria-zod](./packages/rich-domain-criteria-zod)** - Zod schemas for validating Criteria queries from external sources (APIs, GraphQL)
- **[@woltz/react-rich-domain](./packages/react-rich-domain)** (Shadcn Registry) - React components and hooks for working with Rich Domain entities (Data Tables, Filters, Forms)
- **[@woltz/rich-domain-typeorm](./packages/rich-domain-typeorm)** - TypeORM Plug and Play implementation
- **@woltz/rich-domain-drizzle** - Coming Soon

### Tooling

- **[@woltz/rich-domain-cli](./packages/rich-domain-cli)** - CLI tool to generate domain entities, aggregates, and repositories from Prisma schema

## Features

- **Entities & Aggregates** - Base classes with identity, lifecycle management, and business logic encapsulation
- **Value Objects** - Immutable objects compared by value with deep equality
- **Standard Schema Validation** - Works with Zod, ArkType, Valibot, and any Standard Schema-compliant library
- **Change Tracking** - Automatic history of all property changes via Proxy
- **Subscriptions & Events** - Observe entity changes and dispatch domain events
- **Smart IDs** - Identifiers that know if an entity is new or persisted
- **Criteria Pattern** - Type-safe query builder with filters, ordering, pagination, and search
- **Repository Pattern** - Abstract persistence with implementations for Prisma, TypeORM, and in-memory testing
- **Unit of Work** - Transaction management across multiple repositories
- **Paginated Results** - Deep serialization for APIs with metadata
- **React Components** - Pre-built Data Tables, Filters, and Form components
- **CLI Generator** - Scaffold domain models from database schema

## Quick Start

### Installation

Install the core library:

```bash
npm install @woltz/rich-domain
```

For Prisma integration:

```bash
npm install @woltz/rich-domain-prisma
```

React components:

UseCriteria Hook 

```bash
npx shadcn@lates add https://tarcisioandrade.github.io/rich-domain/packages/react-rich-domain/public/r/use-criteria.json
```

DataTableCriteria component 

```bash
npx shadcn@lates add https://tarcisioandrade.github.io/rich-domain/packages/react-rich-domain/public/r/data-table-criteria.json
```

Filter component 

```bash
npx shadcn@lates add https://tarcisioandrade.github.io/rich-domain/packages/react-rich-domain/public/r/filter.json
```

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/tarcisioandrade/rich-domain.git
cd rich-domain
npm install
```

### Common Commands

All commands run from the repository root:

```bash
# Build all packages
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run check

# Linting
npm run lint

# Code coverage
npm run coverage

# Clean all build artifacts
npm run clean
```

### Working with Individual Packages

Build a specific package:

```bash
npm run build --workspace=@woltz/rich-domain
```

Test a specific package:

```bash
npm test --workspace=@woltz/rich-domain
```

### Monorepo Structure

```
.
├── packages/
│   ├── rich-domain/              # Core DDD library
│   ├── rich-domain-prisma/       # Prisma integration
│   ├── rich-domain-criteria-zod/ # Zod validation for Criteria
│   ├── react-rich-domain/        # React components
│   └── rich-domain-cli/          # CLI generator
├── examples/                     # Example applications
├── package.json                  # Root workspace config
├── tsconfig.base.json            # Shared TypeScript config
└── README.md                     # This file
```

## Publishing

Each package is published independently to npm under the `@woltz` scope:

```bash
# Publish core library
npm run publish:rich-domain

# Or publish any package individually
cd packages/rich-domain-prisma
npm publish
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Runs on Node.js 16.x, 18.x, and 20.x
- Executes linting, type checking, tests, and build
- All checks must pass before merging

## Contributing

Contributions are welcome!

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new feature
fix: fix a bug
docs: update documentation
chore: update dependencies
```

Commits are enforced via commitlint and husky hooks.

## Documentation

- [Core Library Documentation](./packages/rich-domain/README.md)
- [Prisma Integration](./packages/rich-domain-prisma/README.md)
- [React Components](./packages/react-rich-domain/README.md)
- [CLI Tool](./packages/rich-domain-cli/README.md)
- [Full Documentation](https://woltz.mintlify.app)

## License

MIT - See [LICENSE](./LICENSE) for details.

## Links

- [Documentation](https://woltz.mintlify.app)
- [GitHub Repository](https://github.com/tarcisioandrade/rich-domain)
- [Report Issues](https://github.com/tarcisioandrade/rich-domain/issues)
- [npm Packages](https://www.npmjs.com/search?q=%40woltz)

---

<div align="center">
  <p>Built with by <a href="https://github.com/tarcisioandrade">Tarcisio Andrade</a></p>
</div>
