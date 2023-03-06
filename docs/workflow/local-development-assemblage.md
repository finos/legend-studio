# Local Development Assemblage

This guide is meant for developers who needs to work on this project and an external project that relies on their changes in this project. For example: the developer creates a new core extension of `legend-studio` and plan to use this new extension in their external project `my-new-dsl`. This guide will cover setup needed to make this workflow smooth.

## Workstation Setup

Take the example above, let's assume this is the directory structure on your machine:

```
projects
  |__ legend-studio   <-- `Legend Studio` project codebase
  |__ my-new-dsl      <-- `My New DSL` project codebase
```

You would need to modify `my-new-dsl` to have all of its relevant dependencies pointing at the packages from `legend-studio` instead of downloading them from `NPM`. To achieve this, there are 2 approaches:

1. **Linking packages:** This approach is fast, and particularly useful for development, its caveat is that it might require minor temporary code changes in the consumer project `my-new-dsl`. It allows development in `legend-studio` to go on at the same time: i.e. if you make changes in `legend-studio`, these changes will be automatically propagated to `my-new-dsl`. As such, this is the recommended approach.
2. **Using snapshot artifacts:** This approach is fairly straight-forward and requires no code-change in consumer project `my-new-dsl`, its caveat is that it does not dynamically propagate changes made in `legend-studio`: i.e. if you make changes in `legend-studio`, you would need to rerun the steps.

### Approach 1: Linking packages (recommended)

```sh
# Assume that you have already built `legend-studio`
# Run this script from `legend-studio` root
yarn dev:assemblage ../my-new-dsl
```

If you use `webpack` to bundle the app, make sure to add:

```jsonc
{
  "resolve": {
    ...
    // See https://webpack.js.org/configuration/resolve/#resolvesymlinks
    "symlinks": false
  }
}
```

to your webpack config to ensure transitive dependencies are resolved properly.

> There is a known [problem](https://github.com/yarnpkg/berry/issues/2265) with `Yarn` and `nodeLinker` where transitive dependencies might not get resolved properly when using `portal` protocol. When used with `webpack`, if not explicitly stated, `webpack` will attempt to resolve `symlinks`, which could cause certain dependencies clashes, for example, `react` being found in 2 places (from `legend-studio/node_modules` and `my-new-dsl/node_modules`); sometimes, this is not an issue, sometimes it could be.

### Approach 2: Using snapshot artifacts

```sh
# Assume that you have already built `legend-studio`
# Run this script from `legend-studio` root
yarn publish:local-snapshot
yarn dev:assemblage ../my-new-dsl --snapshot

# In `my-new-dsl`
yarn cache clean # clean Yarn cache to avoid reusing older published snapshots
rm -rf ./node_modules # remove ./node_modules directory
rm \"yarn.lock\" && touch \"yarn.lock\" # clear the content of yarn.lock
```

> Cleaning `Yarn` cache, blowing away the `node_modules`, and clearing the content of `yarn.lock` are the necessary step to ensure `my-new-dsl` does not pick up an outdated published snapshots from `legend-studio`, this is a [limitation with Yarn `file:` protocol](https://github.com/yarnpkg/berry/issues/1337).

## How to Develop

```sh
# In `legend-studio`
yarn dev:ts

# then proceed with your development workflow
```

```sh
# In `my-new-dsl`
yarn install

yarn setup

yarn dev

yarn dev:ts

# then proceed with your development workflow
```
