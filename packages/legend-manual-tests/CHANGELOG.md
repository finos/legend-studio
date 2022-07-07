# @finos/legend-manual-tests

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

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 0.1.17

## 0.1.16

## 0.1.15

## 0.1.14

## 0.1.13

## 0.1.12

## 0.1.11

## 0.1.10

## 0.1.9

## 0.1.8

## 0.1.7

## 0.1.6

## 0.1.5

## 0.1.4

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#963](https://github.com/finos/legend-studio/pull/963) [`b138cf17`](https://github.com/finos/legend-studio/commit/b138cf17e5d761d570a64453d3a0c4911edbcbe0) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Enable logging in grammar roundtrip tests.

### Patch Changes

- [#974](https://github.com/finos/legend-studio/pull/974) [`75214a77`](https://github.com/finos/legend-studio/commit/75214a7796faa97b5e430bb943f8db89a57f4ac7) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add profiling graph building test. Default to skip as currently we run in dev mode for specific profiling of graph building steps.

## 0.0.37

## 0.0.36

## 0.0.35

## 0.0.34

## 0.0.33

## 0.0.32

## 0.0.31

## 0.0.30

## 0.0.29

## 0.0.28

## 0.0.27

## 0.0.26

## 0.0.25

## 0.0.24

## 0.0.23

## 0.0.22

## 0.0.21

## 0.0.20

## 0.0.19

## 0.0.18

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

- [#429](https://github.com/finos/legend-studio/pull/429) [`cf0afba6`](https://github.com/finos/legend-studio/commit/cf0afba6c2328b50d0ba9ebc7af312f737e88c0e) ([@akphi](https://github.com/akphi)) - Rename `@finos/legend-studio-manual-tests` to `@finos/legend-manual-tests`.

- [#419](https://github.com/finos/legend-studio/pull/419) [`3df5241`](https://github.com/finos/legend-studio/commit/3df52415c091610474a3e6fb9473e092a73038f1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add compilation check and phase logging/skipping in manual tests.
