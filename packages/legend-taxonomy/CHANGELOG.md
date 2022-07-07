# @finos/legend-taxonomy

## 4.0.6

## 4.0.5

## 4.0.4

## 4.0.3

## 4.0.2

## 4.0.1

## 4.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

### Patch Changes

- [#1166](https://github.com/finos/legend-studio/pull/1166) [`41805dba`](https://github.com/finos/legend-studio/commit/41805dbaf92d7dfca14f954d1bc00ff5f5acaa5a) ([@akphi](https://github.com/akphi)) - Remove `maximize/minimize` feature as we are trying to simplify the status bar. This feature could easily be achived for wide-screen users by resizing browser window instead.

## 3.0.4

## 3.0.3

## 3.0.2

## 3.0.1

## 3.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Patch Changes

- [#962](https://github.com/finos/legend-studio/pull/962) [`9ba53bc7`](https://github.com/finos/legend-studio/commit/9ba53bc7f2fead23efb1fe061dff94d4f4c73beb) ([@akphi](https://github.com/akphi)) - Properly reset the current dataspace tab when switching between dataspaces to avoid app freeze/jank.

* [#962](https://github.com/finos/legend-studio/pull/962) [`9ba53bc7`](https://github.com/finos/legend-studio/commit/9ba53bc7f2fead23efb1fe061dff94d4f4c73beb) ([@akphi](https://github.com/akphi)) - Fix a regression where the app does not fetch the right taxonomy data after switching tree.

## 2.0.4

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1041](https://github.com/finos/legend-studio/pull/1041) [`5a76b228`](https://github.com/finos/legend-studio/commit/5a76b2289cb88569e9a1acb2287960de3e593d25) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Change the route pattern for taxonomy tree explorer from `/taxonomy/taxonomy-*/...`. to `/taxonomy/tree/{taxonomyTreeKey}/...`.

## 1.1.11

## 1.1.10

## 1.1.9

## 1.1.8

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

### Patch Changes

- [#992](https://github.com/finos/legend-studio/pull/992) [`a8693108`](https://github.com/finos/legend-studio/commit/a869310843265cf10a7595a3f53fb5b11ecf64aa) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `TEMPORARY_skipGraphBuilderPostProcessing` flag to allow skipping post-processing in graph builder to boost performance.

## 1.1.2

## 1.1.1

## 1.1.0

### Minor Changes

- [#977](https://github.com/finos/legend-studio/pull/977) [`37490b13`](https://github.com/finos/legend-studio/commit/37490b13d6156ad610bba2799e5621632885163d) ([@akphi](https://github.com/akphi)) - Show progress message and report metrics for graph builder process.

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#899](https://github.com/finos/legend-studio/pull/899) [`d4f0aec5`](https://github.com/finos/legend-studio/commit/d4f0aec5d536b3ad167ac702cc5c2070c265ed51) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename `TEMP__useLegacyDepotServerAPIRoutes` to `TEMPORARY__useLegacyDepotServerAPIRoutes`

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- [#821](https://github.com/finos/legend-studio/pull/821) [`9af3076d`](https://github.com/finos/legend-studio/commit/9af3076dee533f55b459cd8698df26f58d7f2309) ([@akphi](https://github.com/akphi)) - Support copying to clipboard taxonomy tree node ID (`guid`) if available.

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#738](https://github.com/finos/legend-studio/pull/738) [`2f239197`](https://github.com/finos/legend-studio/commit/2f23919725f3b103ab2208f26bdbb482ef40186b) ([@akphi](https://github.com/akphi)) - Create a standalone view for a data space; example URL `/dataspace/org.finos.legend.test:legend-query-test:2.7.0/model::SomeDataSpace`.

## 0.0.6

## 0.0.5

## 0.0.4

### Patch Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - Expand taxonomy tree properly when the taxonomy node is opened from search.

## 0.0.3

## 0.0.2

## 0.0.1
