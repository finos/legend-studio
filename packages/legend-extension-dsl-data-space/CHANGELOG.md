# @finos/legend-extension-dsl-data-space

## 9.0.10

## 9.0.9

## 9.0.8

## 9.0.7

## 9.0.6

## 9.0.5

## 9.0.4

## 9.0.3

### Patch Changes

- [#1597](https://github.com/finos/legend-studio/pull/1597) [`5b61c844`](https://github.com/finos/legend-studio/commit/5b61c844362b1ff60c4025ab9b93220e938399b0) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Disable fetching project dependencies if dataspace cache analysis is found

## 9.0.2

## 9.0.1

## 9.0.0

### Major Changes

- [#1565](https://github.com/finos/legend-studio/pull/1565) [`ebe9acf9`](https://github.com/finos/legend-studio/commit/ebe9acf9bc01234849e64df792693e493c95cb8f) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Reworked routing for data space query builder: `/create-from-dataspace/...` is now `/dataspace/...`; also, the basic route `/dataspace/` now will show an empty query builder page

## 8.0.1

## 8.0.0

### Major Changes

- [#1520](https://github.com/finos/legend-studio/pull/1520) [`240875e8`](https://github.com/finos/legend-studio/commit/240875e869c95d7d228756a66eec1e82a45b8884) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `getDSLDataSpaceGraphManagerExtension()` to `DSL_DataSpace_getGraphManagerExtension()`

## 7.0.1

## 7.0.0

### Major Changes

- [#1519](https://github.com/finos/legend-studio/pull/1519) [`b2e14b15`](https://github.com/finos/legend-studio/commit/b2e14b15379eef36e39d906d315fd4fb96472cd6) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** Renamed plugins and presets to use the prefix `DSL_DataSpace` instead of `DSLDataSpace`

### Minor Changes

- [#1509](https://github.com/finos/legend-studio/pull/1509) [`8cbd17f0`](https://github.com/finos/legend-studio/commit/8cbd17f0d6b4854525adcdbb974d0c7a0fe4a564) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use data space analytics result cached in `Depot` server whenever possible to speed up loading of data spaces

## 6.1.16

## 6.1.15

## 6.1.14

## 6.1.13

## 6.1.12

### Patch Changes

- [#1457](https://github.com/finos/legend-studio/pull/1457) [`ddc2a034`](https://github.com/finos/legend-studio/commit/ddc2a034d8fe25d1eaf52058353d644f29c3da23) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Update route patterns for query editor: `/query/dataspace/...` -> `/query/create-from-dataspace/...`

## 6.1.11

## 6.1.10

## 6.1.9

## 6.1.8

## 6.1.7

## 6.1.6

## 6.1.5

## 6.1.4

## 6.1.3

## 6.1.2

## 6.1.1

## 6.1.0

### Minor Changes

- [#1343](https://github.com/finos/legend-studio/pull/1343) [`c7d8f47e`](https://github.com/finos/legend-studio/commit/c7d8f47ed439ee782c32fd1a85f72ab9c08ab81d) ([@akphi](https://github.com/akphi)) - Support `title` field in data space. Show title when possible in data space viewer.

### Patch Changes

- [#1327](https://github.com/finos/legend-studio/pull/1327) [`f278124`](https://github.com/finos/legend-studio/commit/f278124133d77345ba06a1d67a664b957a475d6b) ([@gayathrir11](https://github.com/gayathrir11)) - Fix creating new milestoned query from dataspace ([#1315](https://github.com/finos/legend-studio/pull/1325)).

## 6.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*_GraphPreset` to `*_GraphManagerPreset`

## 5.0.0

### Major Changes

- [#1295](https://github.com/finos/legend-studio/pull/1295) [`8b17cfa3`](https://github.com/finos/legend-studio/commit/8b17cfa3902686d539b819532c75666f80419648) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Change `DataSpaceViewer` to read from data space `analysis result` instead of a data space `metamodel`. Reading from the analysis result is an optimization we do to not have to build the full graph to view the data space ([#936](https://github.com/finos/legend-studio/issues/936)).

### Minor Changes

- [#1295](https://github.com/finos/legend-studio/pull/1295) [`8b17cfa3`](https://github.com/finos/legend-studio/commit/8b17cfa3902686d539b819532c75666f80419648) ([@akphi](https://github.com/akphi)) - Added a new query creation mode from data space, this will mode can be accessed from `Legend Query` using the `url pattern`

  ```
  /query/extensions/{groupId}:{artifactId}:{versionId}/{dataSpacePath}/{executionContext}/{runtimePath}?
  e.g. /query/extensions/org.finos.legend:test-project:1.0.0/model::MyDataSpace/context1
  ```

  Data space viewer and query setup will also point at this new URL when users try to create a query from there.

## 4.0.5

## 4.0.4

## 4.0.3

## 4.0.2

## 4.0.1

## 4.0.0

### Major Changes

- [#1248](https://github.com/finos/legend-studio/pull/1248) [`fa4734e0`](https://github.com/finos/legend-studio/commit/fa4734e07b1b25d102b8012e776bba2661ba55c7) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Previously, `data space` allows specifying a `Maven coordinates` (GAV - groupId, artifactId, version) to point at a project to get the models from. This may have given users a great deal of flexibility, but it sacrifices compilability of dataspaces, also, in soem case, it ends up confusing users even more. As such, we have decided to [remove these coordinates altogether](https://github.com/finos/legend-engine/pull/742). As a result, we will start building data space when building the graph.

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

## 2.0.4

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 1.1.16

## 1.1.15

## 1.1.14

## 1.1.13

## 1.1.12

## 1.1.11

## 1.1.10

## 1.1.9

## 1.1.8

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

## 1.1.2

## 1.1.1

## 1.1.0

### Minor Changes

- [#977](https://github.com/finos/legend-studio/pull/977) [`37490b13`](https://github.com/finos/legend-studio/commit/37490b13d6156ad610bba2799e5621632885163d) ([@akphi](https://github.com/akphi)) - Show progress message and report metrics for graph builder process.

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

### Patch Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - Add information about the dataspace where a query is created from using query tagged value.

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move enterprise model explorer out to `@finos/legend-application-taxonomy` and create a new application `Legend Taxonomy`.

* [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `LegendStudioPreset` and `LegendQueryPreset` and expose `LegendStudioPlugin` and `LegendQueryPlugin` respectively as we now prefer the usage of `@finos/legend-graph-extension-collection` to better manage graph presets.

## 0.2.0

### Minor Changes

- [#653](https://github.com/finos/legend-studio/pull/653) [`397aab2c`](https://github.com/finos/legend-studio/commit/397aab2c4f99e4c92ee60cdd84efa76d3d8126ce) ([@akphi](https://github.com/akphi)) - Create `Enterprise` model explorer view with taxonomy tree to organize data spaces using `meta::pure::profiles::enterprise` tag (see [#617](https://github.com/finos/legend-studio/issues/617)] for more details).

* [#659](https://github.com/finos/legend-studio/pull/659) [`caf3d4aa`](https://github.com/finos/legend-studio/commit/caf3d4aa3a98ca109cabb525eeb7d8615def7343) ([@akphi](https://github.com/akphi)) - Add new panels to data space viewer: a placeholder for test coverage (`WIP`) and a panel to view tagged values and stereotypes.

### Patch Changes

- [#639](https://github.com/finos/legend-studio/pull/639) [`62985e59`](https://github.com/finos/legend-studio/commit/62985e59627b5be2cb75e15f30c13d029014c030) ([@akphi](https://github.com/akphi)) - Allow viewing more informations about a data space when creating a new query in `Legend Query`, such as entitlement, project links (the project that the data space resides as well as the project that the data space refers to), test data, etc.

* [#659](https://github.com/finos/legend-studio/pull/659) [`caf3d4aa`](https://github.com/finos/legend-studio/commit/caf3d4aa3a98ca109cabb525eeb7d8615def7343) ([@akphi](https://github.com/akphi)) - Allow setting query using dataspaces coming from latest `snapshot` releases.

## 0.1.1

## 0.1.0

### Minor Changes

- [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - Add extension for `Legend Query` which allows creating query from data space.

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

## 0.0.2

## 0.0.1

### Patch Changes

- [#506](https://github.com/finos/legend-studio/pull/506) [`4fd0d256`](https://github.com/finos/legend-studio/commit/4fd0d2560ef245d97f1d86a4a6ed227a9c3d2cbe) ([@akphi](https://github.com/akphi)) - Add support for `tagged values` and `stereotypes` in `DataSpace`.

- [#495](https://github.com/finos/legend-studio/pull/495) [`4a38807e`](https://github.com/finos/legend-studio/commit/4a38807e8afc286e0234521ab0e3053e4010e24a) ([@akphi](https://github.com/akphi)) - Add support for `DSL Data Space`, a way to add `Query` configuration preset and some metadata around the project.
