# Legend Studio - Agent Guide

This document is designed to help AI agents understand the structure, workflows, and conventions of the `legend-studio` repository.

## Project Overview

`legend-studio` is the codebase for Legend applications, including Legend Studio, Legend Query, and others. It is a monorepo managed with Yarn workspaces.

## Environment Setup

To set up the environment, run the following commands:

```bash
yarn install
yarn setup
```

## Development Workflow

### Running Applications

The repository contains multiple applications. Use the following commands to run them in development mode:

- **Legend Studio**: `yarn dev` (or `yarn dev:studio`)
- **Legend Query**: `yarn dev:query`
- **Legend DataCube**: `yarn dev:datacube`
- **Legend Marketplace**: `yarn dev:marketplace`

These commands start the development server for the respective application.

### Testing

- Run all tests: `yarn test`
- Run tests for a specific group: `yarn test:group <group_name>`
- Run tests in watch mode: `yarn test:watch`

#### Running Engine Server

Some tests require a running Engine Server. You can start it using Docker:

1.  Navigate to the setup directory: `cd fixtures/legend-docker-setup/grammar-test-setup`
2.  Run the server: `docker compose --file=grammar-test-setup-docker-compose.yml up --detach`

### Linting and Formatting

- Lint code: `yarn lint`
- Check CI checks (linting, formatting, types, copyright): `yarn check:ci`
- Fix formatting and linting issues: `yarn fix`

## Project Structure

- `packages/`: Contains the source code for the various workspace packages (monorepo).
- `scripts/`: Contains automation and workflow scripts.
- `docs/`: Documentation for the project.
- `setup.js`: Setup script for the repository.

## Key Conventions

- **Language**: TypeScript is used throughout the project.
- **Versioning**: We use [Changesets](https://github.com/atlassian/changesets) for versioning.

  To create a changeset:

  1.  Run `yarn changeset -v latest -m "message about the changed packages"`.
  2.  This will create a new file in the `.changeset` directory.
  3.  Open the file and populate the top section with the packages that were changed and their change type (usually `patch`).

  Example changeset file content:

  ```markdown
  ---
  '@finos/legend-extension-dsl-data-product': patch
  '@finos/legend-application-marketplace': patch
  '@finos/legend-server-lakehouse': patch
  ---

  Show Lakehouse env and owners on DataProduct search result cards and DataProduct viewer
  ```

  If you are making multiple different types of changes, create multiple changeset files where each explains the changes made to the packages it references.

- **Commit Messages**: Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`
- **Formatting**: Prettier is used for code formatting.
