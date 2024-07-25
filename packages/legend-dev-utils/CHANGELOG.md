# @finos/legend-dev-utils

## 2.1.16

## 2.1.15

## 2.1.14

## 2.1.13

## 2.1.12

## 2.1.11

## 2.1.10

## 2.1.9

## 2.1.8

## 2.1.7

## 2.1.6

## 2.1.5

## 2.1.4

### Patch Changes

- [#3130](https://github.com/finos/legend-studio/pull/3130) [`97838e392`](https://github.com/finos/legend-studio/commit/97838e392d1f37ca958528b7c3269c28f6d5dcfb) ([@gayathrir11](https://github.com/gayathrir11)) - Support relative path resolution for `baseUrl` during production bundling

## 2.1.3

## 2.1.2

## 2.1.1

## 2.1.0

### Minor Changes

- [#2923](https://github.com/finos/legend-studio/pull/2923) [`f557af7b1`](https://github.com/finos/legend-studio/commit/f557af7b1ce0bfe879703c0ada0bd038bbec86c5) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add ability to register [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) in `LegendApplication` and configure it during start up of application.

### Patch Changes

- [#2918](https://github.com/finos/legend-studio/pull/2918) [`2c3a9b624`](https://github.com/finos/legend-studio/commit/2c3a9b624ff700190792f92996374a44c9489cbe) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Update webpack config to reduce bundle size

## 2.0.82

## 2.0.81

## 2.0.80

## 2.0.79

## 2.0.78

## 2.0.77

## 2.0.76

## 2.0.75

## 2.0.74

## 2.0.73

## 2.0.72

## 2.0.71

## 2.0.70

## 2.0.69

## 2.0.68

## 2.0.67

## 2.0.66

## 2.0.65

## 2.0.64

## 2.0.63

## 2.0.62

## 2.0.61

## 2.0.60

## 2.0.59

## 2.0.58

## 2.0.57

## 2.0.56

## 2.0.55

## 2.0.54

## 2.0.53

## 2.0.52

## 2.0.51

## 2.0.50

## 2.0.49

## 2.0.48

## 2.0.47

## 2.0.46

## 2.0.45

## 2.0.44

## 2.0.43

## 2.0.42

## 2.0.41

## 2.0.40

## 2.0.39

## 2.0.38

## 2.0.37

## 2.0.36

## 2.0.35

## 2.0.34

## 2.0.33

## 2.0.32

## 2.0.31

## 2.0.30

## 2.0.29

## 2.0.28

## 2.0.27

## 2.0.26

## 2.0.25

## 2.0.24

## 2.0.23

## 2.0.22

## 2.0.21

## 2.0.20

## 2.0.19

## 2.0.18

## 2.0.17

## 2.0.16

## 2.0.15

## 2.0.14

## 2.0.13

## 2.0.12

## 2.0.11

## 2.0.10

### Patch Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Update the `changesets` generator and checker to not account for private packages without a version.

## 2.0.9

## 2.0.8

## 2.0.7

## 2.0.6

## 2.0.5

## 2.0.4

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

* [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `@jest/globals` to import `jest` constructs, such as, `expect`, `test`, etc. We bumped into some problem when trying to disable `injectGlobals` in `Jest` config, so that would be left on as default for now, but at least with this change, we restrict usage of `jest` globals in the codebase.

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Cleanup `Webpack` configuration utility: removed field `extraBabelLoaderIncludePatterns`.

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
