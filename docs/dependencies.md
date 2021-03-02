# Dependencies

## Adding a Dependency

There could be [a fair number of downsides](https://github.com/artsy/README/blob/master/playbooks/dependencies.md) to adding a new dependency, such as larger bundle size, upgrade chores, less flexibility, slower migration, and the risk of the dependency becoming vulnerable or abandoned. On the other hand, if we choose to opt out and build the exact implementation that addresses just our needs, there is the cost of development and maintenance.

When consider adding a new dependency, you need to communicate with the team in forms of an RFC (or a detailed explanation in PRs). Following is a list of points to consider - if you answer `yes` to most of these questions, then you probably don’t need to write an RFC:

- Could you fit this codebase in your head after reading the source?
- Is this obviously being used in production by the maintainers, and thus battle-tested?
- Are the dependencies of this dependency already in our projects, or is the dependency itself a transitive dependency of another dependency we already rely on?
- Would this dependency be the first time we’ve needed something of this domain?
- Do you feel well versed in the domain of this dependency and/or could maintain it if that needs to become an option?

Other parameters (no order implied) to consider are:

- **Popularity:** As superficial as it may sound, we care somewhat about `github stars` and `npm downloads`. This is a compound index, which usually implies several metrics below. In general, it implies better community support (issues found and resolved), and adoption
- **Stability:** _Is this library the industry standard, is it battle-tested and used by large and other popular project?_
- **Maintainer/Contribution Activity:** _Is this library still actively maintained?_, _How often bug fixes are released and issues are addressed?_
- **Documentation:** _Does the library have good docs, example, and rich set of API which covers some feature we might be interested in in the future?_
- **Issues:** _Does this library currently have any blockers in terms of security, performance?_, _Does it affect our usage/upgrade/migration for another dependency?_

## Updating a Dependency

We can seem quiet _conservative_ about adding a new dependency, but when we already introduced it, we are very open to keeping it up-to-date. In fact, we encourage our team to check and update dependencies **as soon and as often as possible**. Of course, this applies to only `minor` and `patch` updates; for `major` version bumps, we need to evaluate the risk and effort as it can be considered as arduous as adding new dependencies.

## When To Put Things in Shared?

Throughout the codebase, we have a few different `shared` packages which hold shared utilities, helpers, components, constructs, etc. As such, when a new dependency is added, we should check if it already belonged to one of these `shared` packages, if not, we need to decide whether to add it to these or to the consumer package. This is often harder to decide than it seems, but generally, if a dependency fits in both of these categories, it's very likely that we can move it in `shared` (and re-exported potentially under a different name/alias).

- The dependency offers many utilities which are useful for and potentially have already been used in many packages (e.g. `clsx`, `lodash`).
- The dependency includes many small pieces of which we are only interested in using a limitted subset (and potentially would like to restrict the usage of other pieces for certain reasons - i.e. `lodash`, `@material-ui`, `react-icons`)

A good example here is `lodash` where we don't want to expose all the utilities in `lodash` but still want to reuse common functions, such as `throttle` and `debounce`, we would re-export this in the `shared` package. Another fairly good candidate to consider is `react-icons` where we would want to use a fair number of icons from that library, but we want to formulate our own set of icons and only allow other packages to use these icons as we anticipate that we would potentially create our own set of icons later in the future (similar to [vscode-icons](https://github.com/microsoft/vscode-icons)).

> Note that in any case, since we do not bundle dependencies, there would be no impact on the bundle size of the consumer packages nor the `shared` packages.

## Dependencies to Track

This list keeps track of dependencies which are either unstable or blockers to certain development in our project. Unstable dependencies are usually marked with tag `@next`, or currently in `alpha`, `beta` channels. These dependencies are sometimes ignored by dependency bots or `yarn upgrade` so we must manually keep track of them here to remind us to come back and upgrade them once stable versions are released.

| Package                                                                                        | Why?                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@pmmmwh/react-refresh-webpack-plugin](https://github.com/pmmmwh/react-refresh-webpack-plugin) | Using `beta` version. Part of `webpack@5` upgrade                                                                                                                                                                                                                                                                                                                                                                                                         |
| [babel](https://github.com/babel/babel)                                                        | In `babel@8`, a lot of configurations are to be set to default, we should keep track of these to slim down our babel preset                                                                                                                                                                                                                                                                                                                               |
| [jest](https://github.com/facebook/jest)                                                       | Jest does not [fully support ESM](https://github.com/facebook/jest/issues/9430) so for each package, we need to expose our entry point via the `main` field in `package.json` and let `babel-jest` handle the transform for these ESM modules. With `Jest@27`, we should also be able to get rid of custom logic to handle ESM for `lodash-es`. Also `Jest@27` will use `jest-circus` by default so we don't need to manually specify this like right now |
| [webpack-dev-server](https://github.com/webpack/webpack-dev-server)                            | Using `beta` version. Part of `webpack@5` upgrade ([tracker](https://github.com/webpack/webpack-dev-server/milestone/4))                                                                                                                                                                                                                                                                                                                                  |
| [yarn (v2 - berry)](https://github.com/yarnpkg/berry)                                          | [PnP](https://yarnpkg.com/features/pnp) is nice but [currently does not support ESM](https://github.com/yarnpkg/berry/issues/638) so we have to use `node_modules` as node linker mechanism                                                                                                                                                                                                                                                               |

## Dependencies Features to Try-out

As mentioned, we try to always keep our dependencies up-to-date as it often comes with bug-fixes and optimization, but sometimes, it also comes with new features which are really beneficial to us but might require some effort to migrate over or to make use of them. As such, here we keep track of the list of features to try out but we haven't quite have the time and effort.

| Package                                | What's nice to try?                                                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [mobx](https://github.com/mobxjs/mobx) | Use `generator` and annotate as `flow` instead of using the `flow` function like now, as this makes removing `mobx` easier from code logic. Also consider using `action.bound` instead of `action` with [arrow function](https://github.com/mobxjs/mobx/issues/2756) |
