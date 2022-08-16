# @finos/legend-application-query

## 5.2.1

### Patch Changes

- [#1392](https://github.com/finos/legend-studio/pull/1392) [`8be89c97`](https://github.com/finos/legend-studio/commit/8be89c970ac30f551842fc96f901900c7475016c) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where default value of `date` type will throw a cast error ([#1391](https://github.com/finos/legend-studio/issues/1391)).

## 5.2.0

### Minor Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Add basic support for a light-themed mode for query editor. This will be available only to standalone mode (i.e. `Legend Query`) instead of embedded query builder since we want the embedded builder to have consistent look and field with the host app ([#1374](https://github.com/finos/legend-studio/issues/1374)). By the default, this mode will not be available in query editor, to enable it, configure the core option of query builder `extensions: { core: { TEMPORARY__enableThemeSwitcher: true }}` in `Legend Query` application config.

### Patch Changes

- [#1408](https://github.com/finos/legend-studio/pull/1408) [`823d16f8`](https://github.com/finos/legend-studio/commit/823d16f848da1bd90f7d8572762320d6a9a58dd4) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Disable options to hide parameter/post filter panel when they are not empty and deletion of aggregation projection columns if they are used in post filters. ([#1314](https://github.com/finos/legend-studio/pull/1314)).

## 5.1.0

### Minor Changes

- [#1386](https://github.com/finos/legend-studio/pull/1386) [`b73263b9`](https://github.com/finos/legend-studio/commit/b73263b9866624cbf184261603001caeb2d13685) ([@xannem](https://github.com/xannem)) - Warn when there are no projections in query-builder ([#1385](https://github.com/finos/legend-studio/issues/1385)).

* [#1381](https://github.com/finos/legend-studio/pull/1381) [`7a892e6b`](https://github.com/finos/legend-studio/commit/7a892e6b3906b7429ee89ee0fe573e4215553fbf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add typeahead search for filter and post filter string values ([#1382](https://github.com/finos/legend-studio/issues/1382)).

## 5.0.2

### Patch Changes

- [#1350](https://github.com/finos/legend-studio/pull/1350) [`4e50f73c`](https://github.com/finos/legend-studio/commit/4e50f73cd3baa6707e776b833ca3facfff88c31d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Allow DnD columns from projection to filter panel ([#1349](https://github.com/finos/legend-studio/issues/1349)).

* [#1359](https://github.com/finos/legend-studio/pull/1359) [`91274e40`](https://github.com/finos/legend-studio/commit/91274e40ab236f4f3898a30df9f6b817e4119778) ([@gayathrir11](https://github.com/gayathrir11)) - Block certain actions when query is not valid([#1345](https://github.com/finos/legend-studio/issues/1345)).

- [#1336](https://github.com/finos/legend-studio/pull/1336) [`de50c294`](https://github.com/finos/legend-studio/commit/de50c29416214de49b16f208bbc11925b496ea43) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Check type compatibility when dragging and dropping parameters into `filter/post-filter` panel ([#1335](https://github.com/finos/legend-studio/issues/1335)).

* [#1383](https://github.com/finos/legend-studio/pull/1383) [`846953d5`](https://github.com/finos/legend-studio/commit/846953d59c5df8136d4d516be3fba5087936671d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Alert user about changing fetch-structure would cause a query builder state reset ([#1380](https://github.com/finos/legend-studio/issues/1380)).

- [#1358](https://github.com/finos/legend-studio/pull/1358) [`1119c45b`](https://github.com/finos/legend-studio/commit/1119c45bb8616de9d655da4fef62b8b2b7b65445) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Allow cancelling query execution ([#1357](https://github.com/finos/legend-studio/issues/1357)).

* [#1180](https://github.com/finos/legend-studio/pull/1180) [`c2c308a4`](https://github.com/finos/legend-studio/commit/c2c308a470f92bb0dfcce55d823d3da3da25b2ea) ([@gayathrir11](https://github.com/gayathrir11)) - Fix recursive viewing of parent class in explorer tree for associations ([#1172](https://github.com/finos/legend-studio/issues/1172)).

## 5.0.1

### Patch Changes

- [#1327](https://github.com/finos/legend-studio/pull/1327) [`f278124`](https://github.com/finos/legend-studio/commit/f278124133d77345ba06a1d67a664b957a475d6b) ([@gayathrir11](https://github.com/gayathrir11)) - Fix creating new milestoned query from dataspace ([#1315](https://github.com/finos/legend-studio/pull/1325)).

* [#1338](https://github.com/finos/legend-studio/pull/1338) [`72362d50`](https://github.com/finos/legend-studio/commit/72362d500dd62d529b4fd493dd6adb09a729f94e) ([@gayathrir11](https://github.com/gayathrir11)) - Mute node actions for a property node when not hovering over them

- [#1343](https://github.com/finos/legend-studio/pull/1343) [`c7d8f47e`](https://github.com/finos/legend-studio/commit/c7d8f47ed439ee782c32fd1a85f72ab9c08ab81d) ([@akphi](https://github.com/akphi)) - Use `Run Query` instead of `Execute` as button labels to be more user-friendly.

## 5.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed package from `@finos/legend-query` to `@finos/legend-application-query`
