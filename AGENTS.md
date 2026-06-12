# Legend Studio - Agent Guide

This document is designed to help AI agents understand the structure, workflows, and conventions of the `legend-studio` repository.

## Project Overview

`legend-studio` is the codebase for Legend applications, including Legend Studio, Legend Query, Legend DataCube, Legend Marketplace, Legend Pure IDE, and Legend REPL. It is a monorepo managed with Yarn workspaces.

## Environment Setup

### Prerequisites

- **Node.js** `>= 20`
- **Yarn 4.x** (Berry). The repo pins `packageManager` to `yarn@4.x` — enable via Corepack: `corepack enable`. Do **NOT** use `npm` or `pnpm`; doing so will corrupt the `yarn.lock`.
- **Docker** (only required for tests/dev that talk to the Engine or other backend servers).

### Install

```bash
yarn install
yarn setup   # runs per-workspace setup + full build
```

## Development Workflow

### Running Applications

Each application has a dedicated `dev:*` script that runs the corresponding `*-deployment` workspace:

- **Legend Studio**: `yarn dev` (alias for `yarn dev:studio`)
- **Legend Query**: `yarn dev:query`
- **Legend DataCube**: `yarn dev:datacube`
- **Legend Marketplace**: `yarn dev:marketplace`
- **Legend Pure IDE**: `yarn dev:pure`
- **Legend REPL**: `yarn dev:repl`

Useful companions while developing:

- `yarn dev:ts` — TypeScript project-references watch (rebuilds `.d.ts` across packages).
- `yarn dev:sass` — Sass watch.
- `yarn dev:mock-server` / `yarn dev:mock-depot-server` — lightweight mock backends (avoids needing real servers).
- `yarn dev:assemblage` — wire a local dev assemblage. See [docs/workflow/local-development-assemblage.md](docs/workflow/local-development-assemblage.md).

### Scoping commands to a single workspace

This is a Yarn workspaces monorepo. Run any package script against a single workspace with:

```bash
yarn workspace @finos/<package-name> <script>
# e.g.
yarn workspace @finos/legend-query-builder test
yarn workspace @finos/legend-graph build
```

Most top-level scripts (`lint`, `test`, `build`) fan out across all workspaces in parallel.

### Building

- `yarn build` — full clean + TypeScript + Sass build.
- `yarn build:ts` — TypeScript only.
- `yarn clean` — remove `build/` and per-package artifacts.
- `yarn clean:cache` — also clears the Jest cache. Run this after touching project references or `package.json` dependencies.

### Testing

- `yarn test` — run all tests.
- `yarn test:group <name>` — run a specific group (groups are defined per package; list them with `yarn test:list-groups`).
- `yarn test:watch` — watch mode.
- `yarn workspace @finos/<pkg> test` — tests for one package.

Test strategy reference: [docs/technical/test-strategy.md](docs/technical/test-strategy.md).

#### Running Engine Server

Some integration tests (roundtrip / grammar) require a running Engine Server. Start it with Docker:

1. `cd fixtures/legend-docker-setup/grammar-test-setup`
2. `docker compose --file=grammar-test-setup-docker-compose.yml up --detach`

For unit-level work, prefer the in-repo mock server in [fixtures/legend-mock-server](fixtures/legend-mock-server) (`yarn dev:mock-server`).

### Linting, Formatting, and CI Checks

- `yarn lint` — ESLint + Stylelint across all workspaces.
- `yarn check:ci` — full CI gate: `check:pkg` + `check:ts` + `check:format` + `check:copyright` + `check:changeset`.
- Individual checks: `yarn check:ts`, `yarn check:format`, `yarn check:copyright`, `yarn check:pkg`.
- `yarn fix` — auto-fix copyright headers, styles, JS, and formatting.
- `yarn fix:copyright` — insert the Apache 2.0 header into any new source file (see below).

## Project Structure

- [packages/](packages) — all workspace packages (see taxonomy below).
- [scripts/](scripts) — automation: `workflow/`, `release/`, `copyright/`, `test/`, `docker/`, `website/`, `github-bot/`.
- [docs/](docs) — `design/`, `technical/`, `workflow/`, `ux/` documentation.
- [fixtures/](fixtures) — Docker setups and mock servers used by tests and local dev.
- [setup.js](setup.js) — bootstrap helper used by `yarn setup`.

### Package taxonomy

The flat [packages/](packages) directory is large. Quick legend for picking the right package:

- `legend-application-<app>` — application shell (studio, query, datacube, marketplace, pure-ide, repl).
- `legend-application-<app>-bootstrap` — shared bootstrap wiring for that app.
- `legend-application-<app>-deployment` — webpack/vite entry points; this is what `yarn dev:*` runs.
- `legend-extension-dsl-*` / `legend-extension-store-*` — pluggable DSL / store extensions. See [docs/technical/extension-authoring.md](docs/technical/extension-authoring.md) and [docs/technical/instructions-add-plugin.md](docs/technical/instructions-add-plugin.md).
- `legend-server-*` — typed clients for backend services (SDLC, Depot, Lakehouse, Marketplace, Showcase).
- `legend-graph` — PURE metamodel + protocol layer (core).
- `legend-query-builder`, `legend-data-cube`, `legend-code-editor`, `legend-lego`, `legend-art` — shared UI / feature libraries.
- `legend-shared`, `legend-storage`, `legend-dev-utils` — cross-cutting utilities.
- `babel-preset`, `eslint-plugin`, `stylelint-config` — internal tooling configs.

Architecture/typing references: [docs/technical/monorepo.md](docs/technical/monorepo.md), [docs/technical/typescript-usage.md](docs/technical/typescript-usage.md).

## Key Conventions

- **Language**: TypeScript throughout. The repo uses TS project references — after editing a package's `package.json` dependencies, run `yarn check:pkg` (which also runs `yarn constraints`) to validate/regenerate references.
- **Metamodel vs V1 protocol models**: In [legend-graph](packages/legend-graph) and consumers like [legend-application-studio](packages/legend-application-studio), [legend-query-builder](packages/legend-query-builder), and the UI extensions, code outside the `v1/` folder must work with the **metamodel** classes, not the V1 protocol (`V1_*`) classes.
  - V1 protocol classes are the on-the-wire/JSON shape; they live under `v1/` and must stay confined to it (plus a thin transformation seam).
  - **Builders** convert V1 protocol → metamodel on the way in; **transformers** convert metamodel → V1 protocol on the way out.
  - Studio, query builder, DataCube, and all UI / editor / state code consume metamodel only. Importing a `V1_*` symbol from outside `v1/` is a review red flag.
- **Copyright headers**: Every source file (`.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.scss`, `.css`) must start with the Apache 2.0 header. CI enforces this via `yarn check:copyright`. Run `yarn fix:copyright` to insert headers automatically.
- **Formatting**: Prettier (via `yarn fix:format`). Stylelint for SCSS/CSS.
- **Pre-commit hooks**: Husky + lint-staged auto-formats staged files. Do **not** bypass with `--no-verify`.
- **Commit messages**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat: …`, `fix: …`, `docs: …`, `chore: …`, `refactor: …`. PR titles follow the same convention; the squash-merge commit becomes the changelog entry.
- **Versioning / Changesets**: We use [Changesets](https://github.com/atlassian/changesets).
  - Generate a changeset for your branch: `yarn changeset:branch` (auto-detects changed packages from git).
  - Manual entry: `yarn changeset:cli`.
  - Severity (this repo's convention):
    - `patch` — **default for almost all changes**, including bug fixes, refactors, internal improvements, and most additive non-breaking changes.
    - `minor` — reserved for notable new user-facing features.
    - `major` — breaking changes only (removed/renamed exports, changed plugin contracts, incompatible behavior).
  - `legend-application-*` deployment packages are private and do not need changeset entries; library packages do.
- **Contributions**: See [docs/workflow/code-contributor-guide.md](docs/workflow/code-contributor-guide.md) for the full PR workflow.

## Code Review Checklist

When reviewing a PR or diff in this repo, walk this checklist top-to-bottom. The first three items catch the vast majority of CI failures.

### CI gates (must pass)

- [ ] `yarn check:ci` clean — runs `check:pkg`, `check:ts`, `check:format`, `check:copyright`, `check:changeset`.
- [ ] `yarn lint:ci` clean (no warnings; `--max-warnings=0`).
- [ ] `yarn test` (or the relevant `yarn test:group <name>`) passes.

### Changesets & versioning

- [ ] Every touched **library** package has a corresponding entry in `.changeset/*.md`.
- [ ] Severity matches repo convention: `patch` for most changes (bug fixes, refactors, small additive changes), `minor` only for notable new features, `major` only for breaking changes. **When in doubt, prefer `patch`.**
- [ ] Private packages (`legend-application-*-deployment`, fixtures, internal tooling) are **not** listed in the changeset.
- [ ] Removing or renaming an exported symbol from a package's `index.ts` or `package.json` `exports` map = breaking → requires `major`.

### Dependencies & project references

- [ ] Dependencies flow the right way: library packages (`legend-graph`, `legend-shared`, `legend-query-builder`, `legend-art`, etc.) do **not** depend on `legend-application-*`, `*-bootstrap`, or `*-deployment` packages.
- [ ] If `package.json` `dependencies` / `devDependencies` changed, `yarn check:pkg` was run so `tsconfig` project references stay in sync.
- [ ] No new third-party dependency added without justification (prefer existing ones already in the lockfile).
- [ ] `yarn.lock` changes are consistent with `package.json` changes (no stray edits).

### Source hygiene

- [ ] Every new `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.scss`, `.css` file starts with the Apache 2.0 copyright header.
- [ ] No generated output committed under `build/`, `lib/`, or `dist/`.
- [ ] No stray `console.log`, `debugger`, `.only` / `.skip` left in tests.
- [ ] No hardcoded URLs, tokens, credentials, or absolute local paths.
- [ ] TypeScript: no new `any` unless justified; no `@ts-ignore` without a comment explaining why.
- [ ] API / server responses are deserialized into a **TypeScript class** (typically via `serializr` model schemas), not consumed as a raw `interface` / plain object. Classes give us runtime construction, methods, identity, and a single place to enforce defaults and invariants.
- [ ] `interface` / `type` aliases are reserved for lightweight, throwaway shapes \u2014 e.g. component prop bags, option objects for custom selectors/menus, generic helper types. They should **not** stand in for a domain model coming off the wire.

### Architecture & extension boundaries

- [ ] New DSL or store features are wired through the plugin system (see [docs/technical/extension-authoring.md](docs/technical/extension-authoring.md) and [docs/technical/instructions-add-plugin.md](docs/technical/instructions-add-plugin.md)) — **not** hard-coded into core packages like `legend-graph` or `legend-application-studio`.
- [ ] Code lives in the right package per the taxonomy above (e.g. shared UI in `legend-art` / `legend-lego`, not duplicated inside an application package).
- [ ] No `V1_*` protocol class is imported or referenced outside a `v1/` folder. UI, state, and non-`v1/` graph code must use the metamodel; conversions belong in builders (V1 → metamodel) and transformers (metamodel → V1).
- [ ] Public API changes (exports, plugin contracts) are intentional and documented.

### Tests

- [ ] New behavior has tests in the owning package's `__tests__` directory.
- [ ] Roundtrip / grammar / protocol changes have engine-backed tests (see [docs/technical/test-strategy.md](docs/technical/test-strategy.md)).
- [ ] Tests don't depend on machine-specific state (network, absolute paths, wall-clock time).

### PR metadata

- [ ] PR title follows [Conventional Commits](https://www.conventionalcommits.org/) — it becomes the squash-merge message and feeds the changelog.
- [ ] PR description explains the _why_, not just the _what_.
- [ ] Linked issue (if applicable).

## Don'ts (common agent pitfalls)

- Don't use `npm install` or `pnpm` — only Yarn 4. If `yarn.lock` looks broken, regenerate via `yarn fix:pkg`.
- Don't commit source files without the Apache 2.0 header — run `yarn fix:copyright`.
- Don't bypass git hooks with `--no-verify`.
- Don't hand-edit `yarn.lock`.
- Don't add a dependency from a library package (`legend-graph`, `legend-shared`, etc.) onto an application / deployment / bootstrap package — dependencies flow the other way.
- Don't commit generated output under `build/`, `lib/`, or `dist/`.
- Don't forget the changeset for library-package changes; `yarn check:changeset` will fail in CI.
- Don't run `yarn dev:*` expecting backend data without either Docker engine running or the mock servers started.
