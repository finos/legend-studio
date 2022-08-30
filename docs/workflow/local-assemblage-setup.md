# Local Assemblage

This guide is meant for deverlopers who needs to work on this project and an external project that relies on their changes in this project. For example: the developer creates a new core extension of `Legend Studio` and plan to use this new extension in their external project `My New DSL`. This guide will cover the setup needed to make this workflow smooth.

## Workstation Setup

Take the example above, let's assume this is the directory structure on your machine:

```
projects
  |__ legend-studio   <-- `Legend Studio` project codebase
  |__ my-new-dsl      <-- `My New DSL` project codebase
```

You would need to modify `My New DSL` to have all of its relevant dependencies pointing at the packages from `legend-studio` instead of downloading them from `NPM`. To do this, make use of [Yarn](https://yarnpkg.com/) [portal protocol](https://yarnpkg.com/features/protocols) and [package resolution mechanism](https://yarnpkg.com/configuration/manifest#resolutions). Run the script:

```sh
# in `legend-studio`
yarn generate:package-resolutions ../my-new-dsl
```

From `legend-studio` project to generate the package manifest resolutions to be applied to package manifest of `My New DSL` project. The generated resolution looks something like this:

```json
{
  "resolutions": {
    "@finos/legend-graph": "portal:../studio/packages/legend-graph",
    "@finos/legend-application": "portal:../studio/packages/legend-application",
    ...
  }
}
```

## How to Develop

Assuming you have already developed in `legend-studio` and following the [development guide](../../CONTRIBUTING.md#development-guidelines), you should already have built the packages in `legend-studio` project. Now all you need to do is to install the packages in `my-new-dsl` and proceed with your usual workflow there.

```sh
# in `my-new-dsl`
yarn install

# then proceed with your development workflow
```
