# Contributing

Thank you so much for being interested in contributing to our project! Before submitting your contribution, please read the following guidelines:

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Guidelines](#development-guidelines)
- [License](#license)

We welcome any type of contribution, not only code. You can help with

- **:bug: QA**: file bug reports, (see [issue guidelines](#issue-reporting-guidelines)). Don't hesitate to try out new features and give us feedback :raised_hands:, ...
- **:memo: Documentation**: improving documentation (by sending pull requests to [this repository](https://github.com/finos/legend)), add demos and examples, ...
- **:speech_balloon: Community**: writing blog posts, guides, howto's, ... presenting the project at meetups, organizing a workshop or meetup for the local community, ...
- **:pencil2: Code**: take a look at the [open issues](https://github.com/finos/legend-studio/issues). Even if you can't write code, commenting on them, engaging in the conversation, showing that you care about a given issue matters. It helps us triage them.

## Issue Reporting Guidelines

Please file issue via our [Github Issues page](https://github.com/finos/legend-studio/issues). Make sure to fill out the issue template or else we might close it due to lack of information.

## Pull Request Guidelines

- It's absolutely fine to break your change down into multiple small commits as you work on the PR - GitHub will automatically squash them before merging; however, when writing the PR title and commit messages, please try to follow our [commit message convention](#commit-convention).
- Adding a `changeset` if applicable (see [changeset](#changeset)).
- Make sure `yarn test` passes (see [development guidelines](#development-guidelines))
- Fill out the pull request template.

### Commit Convention

We highly recommend you to write commit messages following [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/).

```md
<type>[optional scope][optional '!']: <description>

<!-- Examples
feat: allow provided config object to extend other configs
refactor!: drop support for Node 6
docs: correct spelling of CHANGELOG
fix: correct minor typos in code
-->
```

If you are not familiar with the commit message convention, you can use `yarn commit` instead of `git commit`, which provides an interactive prompt which helps you build compliant commit messages.

> Structuring commit messages this way has many advantages. It's parsable by changelog generation tools. Also, we hope that this convention encourages contributors to break their work down into smaller logical units, making it easier to understand and review PRs.

### Changeset

A `changeset` is an intent to release a set of packages at particular [semver bump types](https://semver.org/) with a summary of the changes made. Therefore, for a PR with significant changes (refactoring, maintenance, bug fixes, or adding new features), we expect the author to create a `changeset` file which indicates which packages should be re-released due to this change and a brief summary of the changes to be added to release note/changelog. We use [changesets](https://github.com/atlassian/changesets) to manage this process. The command `yarn changeset` will open an interactive prompt which helps you build the changeset.

> Changes like adding documentation or testing are also important, but they don't affect the functionalities of the app and thus never requires a release. As such, you might not need to create a changeset for these changes.

```md
---
'pkg1': minor <!-- this signals us to release a minor version for pkg1 -->
'pkg2': patch <!-- this signals us to release a patch for pkg2 -->
---

An example description of the major changes.

<!--
Please note any breaking changes and potential migration.
Also try to adhere to the format in existing changelogs.
-->
```

## Development Guidelines

> Don't forget to check out the `scripts` section in the root and each workspace `package.json` to explore many more useful development utilities that we use in our daily development workflow.

#### :zap: Setting up your workstation

Make sure to install [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/). For IDE, we highly recommend [Visual Studio Code](https://code.visualstudio.com/). Also, to assist development, don't forget to install [ESLint](https://eslint.org/) and [Stylelint](https://stylelint.io/) plugins to help you catch problems while writing code; and install [Prettier](https://prettier.io/) plugin to help you auto-format code. Last but not least, run the `setup` script.

```sh
# Install dependencies, link and set up the workspaces, and build the workspaces to make sure your project is in good shape.
yarn setup
```

#### :pencil2: Writing code

After setting up, you can start Legend Studio.

```sh
# Run the main web application (top-level workspace) in development mode.
yarn dev # alias: `yarn start`
```

Each workspace in the monorepo should have a `dev` script. Run these (in separate terminal tabs) when you are making changes in these workspaces to rebuild on change. Otherwise, after making change, you have to manually rebuild the workspace using the `build` script. Following are some useful scripts for development.

```sh
# Clean and build all workspaces.
yarn build

# NOTE: Building top-level workspaces can take more time due to bundling
# and minification, so it's best to avoid rebuilding these. The tip is to keep the rebuilding scope as close to your changes as possible.
#
# In general, you can call a script from a particular workspace using
# the following command construct
#   yarn worksapce <workspact-name> <workspace-script>
# e.g. To call `build` script of workspace `lib1`:
#   yarn workspace lib1 build
#
# There are also other build scripts that target a smaller build scopes.

# Clean and build all workspaces other than the top-level ones.
yarn build:setup

# Using project reference, build and develop Typescript files in all workspaces.
# This is usually suficient if you make code change not related to styling.
yarn build:tsc
yarn dev:tsc
```

#### :construction: Testing your code

Read our [guide on testing](./docs/test-strategy.md) to understand our approach to testing.

```sh
# Use this on root directory or workspace directory to run unit
# and integration test suites.
yarn test

# Re-run tests on changes.
# NOTE: you can also install `watchman` if the startup time seems slow.
yarn test:watch

# TODO: add e2e test suite run command

# Besides, you should run linting to let static analyzer catch
# issues with your code.
yarn lint
yarn lint:fix # this can help you fix `some` of the issue
```

#### :nail_care: Polishing your code

Don't forget to keep your code nice and tidy. We run `prettier` when you commit your changes, so in terms of formatting, there's not much you need to worry about. However, there are several checks we do when you commit code that you need to take care of.

```sh
# Make sure your code file has proper copyright header.
yarn check:copyright

# Check problems with Typescript project reference.
# See https://www.typescriptlang.org/docs/handbook/project-references.html
yarn check:project-ref

# Check constraints on `package.json` and dependencies.
yarn check:pkg-constraints

# To run all the checks we have in our CI build.
yarn check:ci

# You can also run the auto-fixer for various
# problems mentioned. But not all problem can be fixed
# automatically, especially ones involving code logic.
yarn fix
```

#### :tada: Checking in your code

Make sure to [create a changeset](#changeset) if you make significant code logic changes. Commit your code with messages following our [convention](#commit-convention) where possible. And last but not least, open a PR and follow up on the reviews.

```sh
# Bring up the interactive tool to build changeset.
yarn changeset

# Bring up the interactive tool to build commit message that follow conventional commit.
yarn commit
```

#### :package: Releasing

This section is only for maintainers. See the [release guidelines](./docs/release-guide.md).

### Code Conventions

These are the conventions we hope you can follow to keep our codebase consistent. Note that most styling conventions have auto-fixers.

- 2 spaces for indentation (no tabs).
- 80 character line length strongly preferred.
- Prefer `'` over `"`.
- [Latest stable ES](https://github.com/tc39/proposals) syntax when possible.
- Use [TypeScript](https://www.typescriptlang.org/).
- Use semicolons;
- Trailing commas,
- Avd abbr wrds.

## License

By contributing to this project, you agree that your contributions will be licensed under its Apache-2.0 license.
