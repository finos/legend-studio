# Local Development Assemblage

This guide is meant for deverlopers who needs to work on this project and an external project that relies on their changes in this project. For example: the developer creates a new core extension of `Legend Studio` and plan to use this new extension in their external project `My New DSL`. This guide will cover setup needed to make this workflow smooth.

## Workstation Setup

Take the example above, let's assume this is the directory structure on your machine:

```
projects
  |__ legend-studio   <-- `Legend Studio` project codebase
  |__ my-new-dsl      <-- `My New DSL` project codebase
```

You would need to modify `My New DSL` to have all of its relevant dependencies pointing at the packages from `legend-studio` instead of downloading them from `NPM`. To achieve this, there are 2 approaches:

1. **Using snapshot artifacts:** This approach is easy to follow, its caveat is that it does not dynamically propgate changes made in `legend-studio`: i.e. if you make changes in `legend-studio`, you would need to rerun the steps. Since it's _simpler_, it is the recommended approach in most cases.
2. **Linking packages:** This approach potentially requires more steps, but it allows development in `legend-studio` to go on at the same time: i.e. if you make changes in `legend-studio`, these changes will be automatically propagated to `my-new-dsl`. This approach is particularly useful for development.

### Approach 1: Using snapshot artifacts (recommended)

```sh
# Assume that you have already built `legend-studio`
# Run this script from `legend-studio` root
yarn publish:local-snapshot
yarn dev:assemblage ../my-new-dsl --snapshot
```

### Approach 2: Linking packages

```sh
# Assume that you have already built `legend-studio`
# Run this script from `legend-studio` root
yarn dev:assemblage ../my-new-dsl
```

If you use `webpack` to bundle the app, make sure to add:

```jsonc
{
  "resolve": {
    // See https://webpack.js.org/configuration/resolve/#resolvesymlinks
    "symlinks": false
  }
}
```

to your webpack config to ensure transitive dependencies are resolved properly.

> There is a known [problem](https://github.com/yarnpkg/berry/issues/2265) with `Yarn` and `nodeLinker` where transitive dependencies might not get resolved properly when using `portal` protocol. When used with `webpack`, if not explicitly stated, `webpack` will attempt to resolve `symlinks`, which could cause certain dependencies clashes, for example, `react` being found in 2 places (from `legend-studio/node_modules` and `my-new-dsl/node_modules`); sometimes, this is not an issue, sometimes it could be.

## How to Develop

```sh
# In `my-new-dsl`
yarn install

# then proceed with your development workflow
```
