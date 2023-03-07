# Dependencies

This details considerations to take when introducing or updating dependencies in the project.

## Adding a dependency

There could be [a fair number of downsides](https://github.com/artsy/README/blob/master/playbooks/dependencies.md) to adding a new dependency, such as larger bundle size, upgrade chores, less flexibility, slower migration, and the risk of the dependency becoming vulnerable or abandoned. On the other hand, if we choose to opt out and build the exact implementation that addresses just our needs, there is the cost of development and maintenance.

When consider adding a new dependency, please communicate with the team and provide detailed explanation in the PR. Following is a list of points to consider - if you answer `yes` to most of these questions, then you probably don’t need much explanation:

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

## Updating a dependency

We can seem quiet _conservative_ about adding a new dependency, but when we already introduced it, we are very open to keeping it up-to-date. In fact, we encourage our team to check and update dependencies **as soon and as often as possible**. Of course, this applies to only `minor` and `patch` updates; for `major` version bumps, we need to evaluate the risk and effort as it can be considered as arduous as adding new dependencies

> See this [guide](./upgrade-dependencies.md) for more details on dependencies upgrade procedure.

## When to move things to shared?

Throughout the codebase, we have a few different `shared` packages which hold shared utilities, helpers, components, constructs, etc. As such, when a new dependency is added, we should check if it already belonged to one of these `shared` packages, if not, we need to decide whether to add it to these or to the consumer package. This is often harder to decide than it seems, but generally, if a dependency fits in both of these categories, it's very likely that we can move it in `shared` (and re-exported potentially under a different name/alias).

- The dependency offers many utilities which are useful for and potentially have already been used in many packages (e.g. `clsx`, `lodash`).
- The dependency includes many small pieces of which we are only interested in using a limitted subset (and potentially would like to restrict the usage of other pieces for certain reasons - i.e. `lodash`, `@mui`, `react-icons`)

A good example here is `lodash` where we don't want to expose all the utilities in `lodash` but still want to reuse common functions, such as `throttle` and `debounce`, we would re-export this in the `shared` package. Another fairly good candidate to consider is `react-icons` where we would want to use a fair number of icons from that library, but we want to formulate our own set of icons and only allow other packages to use these icons as we anticipate that we would potentially create our own set of icons later in the future (similar to [vscode-icons](https://github.com/microsoft/vscode-icons)).
