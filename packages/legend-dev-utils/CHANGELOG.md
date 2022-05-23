# @finos/legend-dev-utils

## 1.0.1

## 1.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Patch Changes

- [#962](https://github.com/finos/legend-studio/pull/962) [`9ba53bc7`](https://github.com/finos/legend-studio/commit/9ba53bc7f2fead23efb1fe061dff94d4f4c73beb) ([@akphi](https://github.com/akphi)) - Add `codelens` feature to `monaco-editor` Webpack config.

## 0.3.21

## 0.3.20

## 0.3.19

## 0.3.18

## 0.3.17

## 0.3.16

## 0.3.15

## 0.3.14

## 0.3.13

## 0.3.12

## 0.3.11

## 0.3.10

## 0.3.9

## 0.3.8

## 0.3.7

## 0.3.6

## 0.3.5

## 0.3.4

## 0.3.3

## 0.3.2

## 0.3.1

## 0.3.0

### Minor Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - Turn off source-mapping for Webpack development build for better performance; to have source-mapping enabled in development mode, use `debug` mode. `advanced` mode is now renamed to `debug` mode for Webpack configuration generator.

## 0.2.1

## 0.2.0

### Minor Changes

- [#636](https://github.com/finos/legend-studio/pull/636) [`65bd91ee`](https://github.com/finos/legend-studio/commit/65bd91ee5840626097948d88179d2aa692be6440) ([@akphi](https://github.com/akphi)) - Export base `Typescript` config file: to use this in other projects, in their respective `tsconfig.json`, use `{ "extends": "@finos/legend-dev-utils/tsconfig.base.json", ... }`.

* [#636](https://github.com/finos/legend-studio/pull/636) [`65bd91ee`](https://github.com/finos/legend-studio/commit/65bd91ee5840626097948d88179d2aa692be6440) ([@akphi](https://github.com/akphi)) - Add test mocks, polyfills and test setup scripts for Jest.

## 0.1.1

## 0.1.0

### Minor Changes

- [#594](https://github.com/finos/legend-studio/pull/594) [`c1249af7`](https://github.com/finos/legend-studio/commit/c1249af76c0d8f8df0978c1a4be5e54685e22982) ([@akphi](https://github.com/akphi)) - Remove usage of `fork-ts-checker-webpack-plugin` and unused utitlities for `Typescript` path mappings.

* [#594](https://github.com/finos/legend-studio/pull/594) [`c1249af7`](https://github.com/finos/legend-studio/commit/c1249af76c0d8f8df0978c1a4be5e54685e22982) ([@akphi](https://github.com/akphi)) - Remove `cosmiconfig` config loader.

### Patch Changes

- [#596](https://github.com/finos/legend-studio/pull/596) [`adaa112a`](https://github.com/finos/legend-studio/commit/adaa112a637e8fcee894a1c5c706181faa349f0e) ([@akphi](https://github.com/akphi)) - Report `webpack` warnings and errors in development mode after we remove usage of `fork-ts-checker-webpack-plugin` in [#594](https://github.com/finos/legend-studio/pull/594).

## 0.0.13

### Patch Changes

- [#569](https://github.com/finos/legend-studio/pull/569) [`67a95bd0`](https://github.com/finos/legend-studio/commit/67a95bd0dadd00b486c2f7884e7d9a10cb91b03c) ([@akphi](https://github.com/akphi)) - Upgrade to `jest-extended@1.0.0` and export the script `jest/setupJestExpectExtension` for the narrowed-down set of extensions for `Jest.expect`.

## 0.0.12

## 0.0.11

## 0.0.10

## 0.0.9

## 0.0.8

## 0.0.7

### Patch Changes

- [#473](https://github.com/finos/legend-studio/pull/473) [`f967957c`](https://github.com/finos/legend-studio/commit/f967957c8ca1a74632d36b793d7560c44315bc5a) ([@akphi](https://github.com/akphi)) - Add support for release branches in `changeset` utils.

## 0.0.6

## 0.0.5

## 0.0.4

### Patch Changes

- [#439](https://github.com/finos/legend-studio/pull/439) [`4bcb2af5`](https://github.com/finos/legend-studio/commit/4bcb2af5ea2ddc0bfa77b24582b8cf504456ee97) ([@akphi](https://github.com/akphi)) - Add a small modification to the changelog generator tool. The generated changelog will nolonger include `updated dependencies` section and be slightly more succinct in the author info part.

## 0.0.3

## 0.0.2

### Patch Changes

- [#431](https://github.com/finos/legend-studio/pull/431) [`aaab6874`](https://github.com/finos/legend-studio/commit/aaab68749d7d89bab16ad747b5b1c547c30ca1a3) ([@akphi](https://github.com/akphi)) - Fix problem with Webpack build and scripts using dynamic imports not working with `Windows`.

## 0.0.1

### Patch Changes

- [#421](https://github.com/finos/legend-studio/pull/421) [`b83c2553`](https://github.com/finos/legend-studio/commit/b83c25538b157109cc0730c9e9da5da5f2b50590) ([@akphi](https://github.com/akphi)) - Update Webpack resolution config to include workspace starting with `legend-` and `@finos/legend-` instead of `legend-studio` as we start having more non-Studio support in the codebase.

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - Rename package from `@finos/legend-studio-dev-utils` to `@finos/legend-dev-utils`.
