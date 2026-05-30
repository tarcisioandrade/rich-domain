# Contributing

## Monorepo layout

- `packages/*` — publishable `@woltz/*` libraries
- `examples/**/*` — private demo apps (use `*` for local `@woltz` deps)
- `apps/**/*` — internal apps

Internal dependencies use semver ranges (e.g. `"^1.8.10"`) on `@woltz/*` packages. npm workspaces install them from the local `packages/` tree when the range matches.

With `updateInternalDependencies: "patch"`, releasing `@woltz/rich-domain` also **patch-bumps** packages that depend on it (prisma, react-rich-domain, etc.) and updates their `^` range. That is intentional for npm consumers, but if adapters had **no code changes**, you may revert their `version` and `CHANGELOG` before merging and only publish `@woltz/rich-domain`. Only add adapter names to a changeset when that adapter actually changed.

Note: npm does not support the `workspace:*` protocol in `package.json` (that is a pnpm/yarn feature). Do not use `workspace:*` here.

## Changesets (required for publishable package changes)

Every pull request that changes a publishable package under `packages/` should include a changeset.

### 1. Create a changeset

After implementing your change:

```bash
npm run changeset
```

Follow the prompts:

- Select the affected package(s) (`@woltz/rich-domain`, adapters, etc.)
- Choose semver bump: `patch`, `minor`, or `major`
- Write a short summary for the changelog

This creates a markdown file under `.changeset/` that should be committed with your PR.

### 2. Version packages (release prep)

When you are ready to release (typically on `main`):

```bash
npm run version:packages
```

This will:

- Bump `version` in affected `package.json` files
- Update `CHANGELOG.md` per package
- Refresh dependency ranges for publication (workspace protocol is resolved to semver for consumers)

Commit the result with a message like `chore: version packages`.

### 3. Build and publish

```bash
npm run build:packages
npm run release
```

`npm run release` runs `changeset publish` and publishes only packages whose version changed.

You must be logged in to npm (`npm login`) and have publish rights for the `@woltz` scope.

## What replaced `standard-version`?

Previously each package had `npm run release:minor` (via `standard-version`) plus manual `npm publish` and grep across dependents.

That flow is replaced by the root scripts above. Do not bump versions by hand in individual packages.

## CI

Pull requests are checked with `changeset status` to ensure publishable package changes include a changeset file.
