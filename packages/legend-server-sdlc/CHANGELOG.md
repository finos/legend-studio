# @finos/legend-server-sdlc

## 4.0.0

### Major Changes

- [#1252](https://github.com/finos/legend-studio/pull/1252) [`790665dd`](https://github.com/finos/legend-studio/commit/790665dd1b34b3f06c96ab4b7afd3425f70ca73d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Change `versionId` in `ProjectDependency` to be of string format.

## 3.0.4

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

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 1.0.1

## 1.0.0

### Major Changes

- [#1041](https://github.com/finos/legend-studio/pull/1041) [`5a76b228`](https://github.com/finos/legend-studio/commit/5a76b2289cb88569e9a1acb2287960de3e593d25) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Allow fetching `SDLC` server features configuration. Also, remove `project type` from `Project` model.

## 0.2.8

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- [#910](https://github.com/finos/legend-studio/pull/910) [`86424505`](https://github.com/finos/legend-studio/commit/864245057273c69d8d056df69bddfc9b1c7eeb1d) ([@akphi](https://github.com/akphi)) - Add `webUrl` attribute to `Project` model.

## 0.1.4

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#778](https://github.com/finos/legend-studio/pull/778) [`b8ee4134`](https://github.com/finos/legend-studio/commit/b8ee4134b62ddfde08993b9d4a327f2f2c5e0d8e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add workflow APIs for project versions.

## 0.0.17

## 0.0.16

## 0.0.15

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

## 0.0.10

## 0.0.9

### Patch Changes

- [#632](https://github.com/finos/legend-studio/pull/632) [`a7ade917`](https://github.com/finos/legend-studio/commit/a7ade917da293d4efe062a2a8e569c6f8d4c54d7) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add workflow jobs APIs to retry/cancel/run jobs as well as to view job logs.

## 0.0.8

## 0.0.7

### Patch Changes

- [#568](https://github.com/finos/legend-studio/pull/568) [`46ccd87d`](https://github.com/finos/legend-studio/commit/46ccd87d3bd7c65ab26cb5b1c58d9ed007e5cc78) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `Workflow API` instead of the _deprecated_ `Build API`.

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

## 0.0.2

### Patch Changes

- [#451](https://github.com/finos/legend-studio/pull/451) [`e696205c`](https://github.com/finos/legend-studio/commit/e696205c2d09722ea5d9d1d75daac24e6c279c4e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `workspaceType` to create review command and default to `USER` type.

## 0.0.1

### Patch Changes

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Expose `SDLCServerClient` context provider and hook `useSDLCServerClient()`.
