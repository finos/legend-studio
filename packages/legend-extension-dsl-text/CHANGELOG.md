# @finos/legend-extension-dsl-text

## 3.0.6

## 3.0.5

## 3.0.4

### Patch Changes

- [#1236](https://github.com/finos/legend-studio/pull/1236) [`ed3da137`](https://github.com/finos/legend-studio/commit/ed3da13775cb37560dea814fc665bd1ff16c998d) ([@akphi](https://github.com/akphi)) - `Test.type` is now optional, when not provided, we will render the content as plain text.

## 3.0.3

## 3.0.2

## 3.0.1

## 3.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 1.0.36

## 1.0.35

## 1.0.34

## 1.0.33

## 1.0.32

## 1.0.31

## 1.0.30

## 1.0.29

## 1.0.28

## 1.0.27

## 1.0.26

## 1.0.25

## 1.0.24

## 1.0.23

## 1.0.22

## 1.0.21

## 1.0.20

## 1.0.19

## 1.0.18

## 1.0.17

## 1.0.16

## 1.0.15

## 1.0.14

## 1.0.13

## 1.0.12

## 1.0.11

## 1.0.10

## 1.0.9

## 1.0.8

## 1.0.7

## 1.0.6

## 1.0.5

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `LegendStudioPreset` and `LegendQueryPreset` and expose `LegendStudioPlugin` and `LegendQueryPlugin` respectively as we now prefer the usage of `@finos/legend-graph-extension-collection` to better manage graph presets.

## 0.0.17

## 0.0.16

## 0.0.15

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

## 0.0.10

## 0.0.9

## 0.0.8

## 0.0.7

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

## 0.0.2

## 0.0.1

### Patch Changes

- [#436](https://github.com/finos/legend-studio/pull/436) [`356eda33`](https://github.com/finos/legend-studio/commit/356eda33c4efd9345ea48ae2e81dda4ad0029a09) ([@akphi](https://github.com/akphi)) - Merge `@finos/legend-graph-preset-dsl-text` and `@finos/legend-studio-preset-dsl-text` to become `@finos/legend-extension-dsl-text`.
