# Woltz Monorepo

Monorepo containing Domain-Driven Design (DDD) libraries and related packages.

## Packages

- **[@woltz/rich-domain](./packages/rich-domain)** - Rich Domain Library with Standard Schema validation support

## Getting Started

### Installation

```bash
npm install
```

### Building All Packages

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run check
```

### Coverage

```bash
npm run coverage
```

## Workspace Structure

This monorepo uses npm workspaces to manage multiple packages. Each package is located in the `packages/` directory and can be developed independently.

### Adding a New Package

1. Create a new directory in `packages/`
2. Initialize with `npm init` or create a `package.json` manually
3. Add the package name to scripts if needed
4. Run `npm install` from the root to link dependencies

## Development

Each package can be developed independently:

```bash
cd packages/rich-domain
npm run build
npm test
```

Or use workspace commands from the root:

```bash
npm run build --workspace=@woltz/rich-domain
npm test --workspace=@woltz/rich-domain
```

## Publishing

Each package can be published independently. Navigate to the package directory and use:

```bash
cd packages/rich-domain
npm publish
```

## License

MIT
