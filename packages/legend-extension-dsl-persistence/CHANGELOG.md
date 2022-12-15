# @finos/legend-extension-dsl-persistence

## 4.0.30

## 4.0.29

## 4.0.28

## 4.0.27

## 4.0.26

## 4.0.25

## 4.0.24

## 4.0.23

## 4.0.22

## 4.0.21

## 4.0.20

## 4.0.19

## 4.0.18

## 4.0.17

## 4.0.16

## 4.0.15

## 4.0.14

## 4.0.13

## 4.0.12

## 4.0.11

## 4.0.10

## 4.0.9

## 4.0.8

## 4.0.7

## 4.0.6

## 4.0.5

## 4.0.4

## 4.0.3

## 4.0.2

## 4.0.1

## 4.0.0

### Major Changes

- [#1519](https://github.com/finos/legend-studio/pull/1519) [`b2e14b15`](https://github.com/finos/legend-studio/commit/b2e14b15379eef36e39d906d315fd4fb96472cd6) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** Renamed plugins and presets to use the prefix `DSL_Persistence` instead of `DSLPersistence`

### Minor Changes

- [#1508](https://github.com/finos/legend-studio/pull/1508) [`10b9bc4e`](https://github.com/finos/legend-studio/commit/10b9bc4e617e1f48dfad7571523394b9103dc7f6) ([@chloeminkyung](https://github.com/chloeminkyung)) - Add persistance test graph support.

## 3.0.15

## 3.0.14

## 3.0.13

## 3.0.12

## 3.0.11

## 3.0.10

## 3.0.9

## 3.0.8

## 3.0.7

## 3.0.6

## 3.0.5

## 3.0.4

## 3.0.3

## 3.0.2

## 3.0.1

## 3.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*_GraphPreset` to `*_GraphManagerPreset`

## 2.0.11

## 2.0.10

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

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 0.0.3

## 0.0.2

## 0.0.1
