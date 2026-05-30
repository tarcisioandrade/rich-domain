# Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs in this monorepo.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full release workflow.

## Quick reference

```bash
# After implementing a change in a publishable package
npm run changeset

# When ready to release (bumps versions + updates CHANGELOGs)
npm run version:packages

# Build and publish to npm
npm run build:packages
npm run release
```
