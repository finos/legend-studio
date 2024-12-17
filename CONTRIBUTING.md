# Contributing

Thank you so much for being interested in contributing to our project! Before submitting your contribution, please read the following guidelines:

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Guidelines](#development-guidelines)
- [Codebase Documentation](#codebase-documentation)
- [License](#license)

We welcome any type of contribution, not only code. You can help with

- **:bug: QA**: file bug reports, (see [issue guidelines](#issue-reporting-guidelines)). Don't hesitate to try out new features and give us feedback :raised_hands:, ...
- **:memo: Documentation**: improving documentation (by sending pull requests to [this repository](https://github.com/finos/legend)), add code comments, add demos and examples, ...
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

We highly recommend you to write commit messages following [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/) where applicable.

```md
<type>[optional scope][optional '!']: <description>

<!-- Examples
feat: allow provided config object to extend other configs
refactor!: drop support for Node 6
docs: correct spelling of CHANGELOG
fix: correct minor typos in code
-->
```

> Structuring commit messages this way has many advantages. It's parsable by changelog generation tools. Also, we hope that this convention encourages contributors to break their work down into smaller logical units, making it easier to understand and review PRs.

### Changeset

A `changeset` is used to express the intent to release a set of packages at particular [semver bump types](https://semver.org/) with a summary of the changes made. Therefore, we expect the author to create `changeset` files to indicate which packages should be re-released due to their changes and a brief summary of the changes to be added to release note/changelog.

> No matter how big is your change, you should **always at least bump a `patch` release for the packages being modified**. We enforce this to avoid missing changes during release and also to lessen the cognitive load for reviewers. If your change is not substantial (for example, you are fixing code format, bumping low-risk dependencies or adding tests), you can leave the summary blank. Sometimes, you would make changes in core packages, leading to further modifications in other packages, in these cases, what we find to be the most common workflow is to create an empty changeset listing out all changed packages, and then to create a separate changeset targeting just the modified core packages with detailed changelogs.

We use [changesets](https://github.com/atlassian/changesets) to manage this process. See below for the format of the changeset.

```md
---
'pkg1': minor <!-- this signals us to release a minor version for pkg1 -->
'pkg2': patch <!-- this signals us to release a patch for pkg2 -->
---

<!--
Capitalize the first character of your message and end it with a period.
To document breaking changes, prefix the message with `**BREAKING CHANGE:**`
-->

An example description of the major changes.

<!--
For bug fixes and filed issues, please include the issue in the message if possible
as it often gives better context than just the changeset itself
-->

Fix a bug with core editor ([#300](https://github.com/finos/legend-studio))

<!--
Please check the format we have in our `CHANGELOG.md` files and adhere to that style
-->
```

To create the changeset, you can use the following commands:

```sh
# To quickly generate a changeset
# NOTE: you can provide an optional message. If no message is provided,
# the summary part of your changeset will be left blank.
yarn changeset -m "e.g. some message ..."

# To open an interactive prompt to build more advanced changeset
yarn changeset:cli
```

> Note that the changeset generated using the command above uses **local default branch** as the reference point. This aligns with our [recommended Git workflow](./docs/workflow/working-with-github.md) where contributors work on feature branch rather than directly on default branch. Also remember to keep your origin and local default branch in sync; this will help ensure the generated changeset is more accurate and compact, as well as avoid getting your PR blocked by the changeset validation gate.

> Also, if you made a mistake in a changeset and want to create a PR to rectify that, to avoid the changeset being attributed to the wrong PR or author, you can add `pr` and `author` fields to the [front-matter part of the changelog](https://github.com/atlassian/changesets/blob/main/packages/changelog-github/CHANGELOG.md#030).

## Development Guidelines

> Don't forget to check out the `scripts` section in the root and each workspace `package.json` to explore many more useful development utilities that we use in our daily development workflow.

#### :zap: Setting up your workstation

Make sure to install [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/). For IDE, we highly recommend [Visual Studio Code](https://code.visualstudio.com/). Also, to assist development, don't forget to install [ESLint](https://eslint.org/) and [Stylelint](https://stylelint.io/) plugins to help you catch problems while writing code; and install [Prettier](https://prettier.io/) plugin to help you auto-format code. Last but not least, run the `setup` script.

Studio relies _minimumly_ on SDLC and Engine servers as its backend. To quickly set these up, use our development [Docker compose](https://github.com/finos/legend/tree/master/installers/docker-compose/legend-studio-dev). If you need to debug and code on the backend at the same time, follow [this guide](./fixtures/legend-docker-setup/studio-dev-setup/README.md) to set them up using `maven`.

```sh
# Install dependencies, link and set up the workspaces, and build the workspaces to make sure your project is in good shape.
yarn install
yarn setup
```

After setting up, visit http://localhost:9000/studio and the application should be up :tada:

> If you get `Unauthorized` error, visit SDLC server at http://localhost:6100/api/auth/authorize in your browser, you will get redirected to the Gitlab login page or a Gitlab page asking you to authorize Legend OAuth application. After you completing these steps, you will be redirected back to SDLC. Now refresh Studio and the problem should be gone.

> 🧑‍💻 If you work on an external project, which relies on _unmerged/released_ changes in this project, you will need to do more setup, please follow [this guide](./docs/workflow/local-development-assemblage.md).

#### :pencil2: Writing code

Before writing any code, you need to [setup your branch properly](./docs/workflow/working-with-github.md#standard-contribution-workflow), this is a fairly common workflow in any OSS project. But if you are working on bug fixes for a recent release, the workflow will be slightly different, find out more about that [here](./docs/workflow/working-with-github.md#working-on-bug-fixes-for-a-release).

Now, you're good to start. After the setup step, you can start the application you are working on in development mode.

```sh
# Run the main web application (top-level workspace) in development mode.
yarn dev # alias: `yarn start` - this by default will start Studio
```

Each workspace in the monorepo should have a `dev` script. Run these (in separate terminal tabs) when you are making changes in these workspaces to rebuild on change. However, this requires building packages following the dependency order. As such, we recommend the following workflow using multiple terminal tabs:

```sh
# keep one terminal tab for auto-building and serving the web application using Webpack
yarn dev

# have other terminal tabs for auto-building code and style
yarn dev:ts
yarn dev:sass
```

> Note that `dev:ts` is convenient as it watches for changes in the whole project, but sometimes, it might take long time or cause Webpack recompilation to take a long time. So there are times when it's better to focus the watcher in a particular workspace using the command `yarn workspace <workspace-name> <workspace-script>`, e.g. to call `dev` script of workspace `lib1`, use the command `yarn workspace lib1 dev`.

#### :construction: Testing your code

Read our [guide on testing](./docs/technical/test-strategy.md) to understand our approach to testing.

```sh
# Use this on root directory or workspace directory to run unit
# and integration test suites.
yarn test

# Rerun tests on changes.
# NOTE: you can also install `watchman` if the startup time seems slow.
yarn test:watch
```

For ergonomics, tests are further divided into groups. Followings are a few useful commands to run test from respective group(s) you're working on.

```sh
yarn test:group data-cube # this will run test in the group 'data-cube'
yarn test:watch:group data-cube

# Alternatively, the following syntax can be used can will come in handy when you
# need to specify extra test params
TEST_GROUP=data-cube yarn test

# this will run tests in the test file whose name matches 'DataCubeResultPanel'
# and belongs to the 'data-cube' group
TEST_GROUP=data-cube yarn test DataCubeResultPanel
```

To add a new test for a group, make sure the test is suffixed with that group's extension. For example, to add a new test to the group `data-cube`, name your test with suffix `data-cube-test`, i.e. `DataCubeSomeTest.data-cube-test.ts`. Use the following command to see the list of all available test group(s)-_you can also find out by looking at the test setup files_.

```sh
yarn test:list-groups
```

Last but not least, you should run linting to let static analyzer catch issues with your code.

```sh
yarn lint
yarn lint:fix # this can help you fix `some` of the issue
```

#### :nail_care: Polishing your code

Don't forget to keep your code nice and tidy. We run `prettier` when you commit your changes, so in terms of formatting, there's not much you need to worry about. However, there are several checks we do when you commit code that you need to take care of.

```sh
# Make sure your code file has proper copyright header.
yarn check:copyright

# Check problems with typings and Typescript project reference setup.
# See https://www.typescriptlang.org/docs/handbook/project-references.html
yarn check:ts

# Check package manifests
yarn check:pkg

# To run all the checks we have in our CI build.
yarn check:ci

# You can also run the auto-fixer for various
# problems mentioned. But not all problem can be fixed
# automatically, especially ones involving code logic.
yarn fix
```

#### :tada: Checking in your code

Make sure to [create a changeset](#changeset) if you make significant code logic changes.

```sh
# create changeset for your uncommited changes
yarn changeset

# create changeset for your changes on a specific branch
yarn changeset:branch
```

If you make change to the interface, please kindly include the screenshots, screen captures or `GIFs` in the description of the PR to make it easier for us to review this change :pray:

Also please try to commit your code with messages following our [convention](#commit-convention) where possible. And last but not least, open a PR and follow up on the reviews.

#### :scroll: Writing application documentation/guide/contextual-support

In many occasions, you would like to provide users with help/guidance (even contextual support) as they are using the application. Follow this [guide](./docs/workflow/writing-application-documentation.md) to learn how to do so.

#### :package: Releasing

This section is only for maintainers, or whoever has [write access and above](https://docs.github.com/en/organizations/managing-access-to-your-organizations-repositories/repository-permission-levels-for-an-organization#repository-access-for-each-permission-level) permission in this repository. Only this group of people should have the permission to trigger the release. For details of the release process, please read this [guide](./docs/workflow/release-process.md).

#### :woman_technologist: Code contributor guide `[advanced]`

To keep this guide succinct, we have a separate [guide](./docs/workflow/code-contributor-guide.md) for more advanced and miscellaneous topics regarding the development process: e.g. debugging, troubleshooting, etc.

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

## Codebase Documentation

To help new developers gain deeper understanding of Studio, we highly recommend checking out the following resources:

1. Our [codebase documentation](https://github.com/finos/legend-studio/tree/master/docs) where we documented various aspects of the codebase such as testing strategy, UX guidelines, and [design decision](https://github.com/finos/legend-studio/tree/master/docs/design), which we believe to be essential for exploring Studio core and Legend stack in general.
2. Our [API documentation](https://finos.github.io/legend-studio/): most of the content are auto-generated from code comments and documentation.

## License

By contributing to this project, you agree that your contributions will be licensed under its Apache-2.0 license.
