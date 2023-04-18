# @finos/legend-query-builder

## 3.0.1

## 3.0.0

### Major Changes

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved all test utils to a separate export path `@finos/legend-query-builder/test`;

## 2.1.7

### Patch Changes

- [#2096](https://github.com/finos/legend-studio/pull/2096) [`f3ce8259a`](https://github.com/finos/legend-studio/commit/f3ce8259a1a307becc7f6f866173ddd59c27e32d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add form support for graphfetch with externalize ([#2095](https://github.com/finos/legend-studio/issues/2095))

- [#2120](https://github.com/finos/legend-studio/pull/2120) [`6950c021b`](https://github.com/finos/legend-studio/commit/6950c021bbadb4ad2cf9e980fe1b13d39f3335b4) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where QueryBuilderResultPanel column's width gets auto-resized if hovering over the mouse on cells.

## 2.1.6

## 2.1.5

## 2.1.4

## 2.1.3

## 2.1.2

## 2.1.1

## 2.1.0

### Minor Changes

- [#2076](https://github.com/finos/legend-studio/pull/2076) [`fba8785a4`](https://github.com/finos/legend-studio/commit/fba8785a4353716ec11248c347f41eb5ec69a740) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add export data support for graph fetch including with `externalize()`.

### Patch Changes

- [#1993](https://github.com/finos/legend-studio/pull/1993) [`65dffc460`](https://github.com/finos/legend-studio/commit/65dffc460e64fe89045ea766755bfde3bfff5b91) ([@xannem](https://github.com/xannem)) - Enable drag-and-drop only when the handler is grabbed

## 2.0.1

### Patch Changes

- [#2056](https://github.com/finos/legend-studio/pull/2056) [`7c73a8385`](https://github.com/finos/legend-studio/commit/7c73a83851416279351444f60d546a00425daf5f) ([@xannem](https://github.com/xannem)) - Validation for query window function duplicate column names

## 2.0.0

### Major Changes

- [#2063](https://github.com/finos/legend-studio/pull/2063) [`7bd0dc79d`](https://github.com/finos/legend-studio/commit/7bd0dc79d5e803c0eb677b884f2f1ac48fb32b77) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed query builder events:

  - `editor.execution.run-query.launch` -> `query-builder.run-query.launch`
  - `editor.execution.generate-plan.launch` -> `query-builder.generate-plan.launch`
  - `editor.execution.debug-plan.launch` -> `query-builder.debug-plan.launch`
  - `editor.execution.run-query.success` -> `query-builder.run-query.success`
  - `editor.execution.generate-plan.success` -> `query-builder.generate-plan.success`
  - `editor.execution.debug-plan.success` -> `query-builder.debug-plan.success`
  - `graph-manager.execution.build-plan.success` -> `query-builder.build-plan.success`

### Minor Changes

- [#2062](https://github.com/finos/legend-studio/pull/2062) [`9543da9e5`](https://github.com/finos/legend-studio/commit/9543da9e5bb86e48f99d277243e6423173494ac7) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for editing pure serialization config of type `AlloySerializationConfig`.
  Add processing support for graph fetch with `externalize()` serialization.

## 1.0.6

## 1.0.5

## 1.0.4

## 1.0.3

### Patch Changes

- [#1968](https://github.com/finos/legend-studio/pull/1968) [`eca4beca2`](https://github.com/finos/legend-studio/commit/eca4beca2519db2266ffabfe7fbb7f1f6a2ca863) ([@xannem](https://github.com/xannem)) - Add tests for expected behavior for entry of negative numbers

- [#1984](https://github.com/finos/legend-studio/pull/1984) [`c9bcf3d44`](https://github.com/finos/legend-studio/commit/c9bcf3d44c2a36f1564aa9ad331d70a2f6fd6a3b) ([@gayathrir11](https://github.com/gayathrir11)) - Save query execution results when you switch to text mode and back in query builder.

- [#1968](https://github.com/finos/legend-studio/pull/1968) [`eca4beca2`](https://github.com/finos/legend-studio/commit/eca4beca2519db2266ffabfe7fbb7f1f6a2ca863) ([@xannem](https://github.com/xannem)) - Make entry of negative numbers in inputs easier for user.

## 1.0.2

### Patch Changes

- [#2037](https://github.com/finos/legend-studio/pull/2037) [`765f50cb5`](https://github.com/finos/legend-studio/commit/765f50cb580cb2edf094fbf80a612cb3c78ff2aa) ([@xannem](https://github.com/xannem)) - Fix for allowing column names that include '.' to render data

- [#2005](https://github.com/finos/legend-studio/pull/2005) [`eceebdc42`](https://github.com/finos/legend-studio/commit/eceebdc42556abe802154e5b42fc40b84bf98abd) ([@gayathrir11](https://github.com/gayathrir11)) - Save parameter value state when you switch to text mode and back in query builder

## 1.0.1

## 1.0.0

### Major Changes

- [#2019](https://github.com/finos/legend-studio/pull/2019) [`e31cc1bcb`](https://github.com/finos/legend-studio/commit/e31cc1bcbb61306b4b127788854775a8325bfa57) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*Telemetry` and `*EventService` wrappers around `TelemetryService` and `EventService` respectively to `*TelemetryHelper` and `*EventHelper` respectively.

## 0.6.33

### Patch Changes

- [#1990](https://github.com/finos/legend-studio/pull/1990) [`da47de951`](https://github.com/finos/legend-studio/commit/da47de9510525a8714692786c187c4e7fd838f83) ([@xannem](https://github.com/xannem)) - Restore source information of errors in query builder text editor.

- [#1997](https://github.com/finos/legend-studio/pull/1997) [`a56ca9065`](https://github.com/finos/legend-studio/commit/a56ca906553ace05f1c2bb1bb74ec5b3784e18b0) ([@gayathrir11](https://github.com/gayathrir11)) - Persist user preferences for `editorTheme` and `showPostFilterPanel`.

## 0.6.32

## 0.6.31

### Patch Changes

- [#1974](https://github.com/finos/legend-studio/pull/1974) [`fc7281c0b`](https://github.com/finos/legend-studio/commit/fc7281c0b83a06c7ebaa875ba1b521c8029840f6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - default parameter of type `DATE` and `DATETIME` to the function `now()` and `StrictDate` to `today()`

## 0.6.30

## 0.6.29

## 0.6.28

### Patch Changes

- [#1942](https://github.com/finos/legend-studio/pull/1942) [`868774e24`](https://github.com/finos/legend-studio/commit/868774e2445d4e644bc735c3bf5e0ea29419ca9d) ([@xannem](https://github.com/xannem)) - Fixes re-rendering of query builder results data table.

## 0.6.27

### Patch Changes

- [#1934](https://github.com/finos/legend-studio/pull/1934) [`e22a6db89`](https://github.com/finos/legend-studio/commit/e22a6db89875bcad7302839ac02a047f9b9f20d0) ([@xannem](https://github.com/xannem)) - Add tests for expected query builder behavior.

- [#1916](https://github.com/finos/legend-studio/pull/1916) [`66aebc576`](https://github.com/finos/legend-studio/commit/66aebc57678dd65024ade037932dc9b0fd3b402a) ([@xannem](https://github.com/xannem)) - Only show parameter types that match derived property types, and show humanized version of date::adjust functions.

## 0.6.26

## 0.6.25

### Patch Changes

- [#1911](https://github.com/finos/legend-studio/pull/1911) [`418d96ab7`](https://github.com/finos/legend-studio/commit/418d96ab772f2fab5ffd89ed8c34b96a7593e1b9) ([@xannem](https://github.com/xannem)) - Clarify status of sorting column in query.

- [#1909](https://github.com/finos/legend-studio/pull/1909) [`130d068d0`](https://github.com/finos/legend-studio/commit/130d068d0932dde5786ecf8de6dacf2bffcc6143) ([@xannem](https://github.com/xannem)) - Do not add properties with existing same name/path when user right clicks 'add properties to fetch structure'.

## 0.6.24

### Patch Changes

- [#1896](https://github.com/finos/legend-studio/pull/1896) [`c5d19c222`](https://github.com/finos/legend-studio/commit/c5d19c22252fbca2ba902b048726964e7a1d3971) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Minor improvements for checking entitlements.

## 0.6.23

### Patch Changes

- [#1885](https://github.com/finos/legend-studio/pull/1885) [`652450d2c`](https://github.com/finos/legend-studio/commit/652450d2c4ca38e4c20f037fcbf989c0660993d0) ([@gayathrir11](https://github.com/gayathrir11)) - Fix showing preview data for milestoned proeprties.

- [#1882](https://github.com/finos/legend-studio/pull/1882) [`87c71c559`](https://github.com/finos/legend-studio/commit/87c71c5592e4d1cbcc04ef9d915d7ac2f072ad1f) ([@xannem](https://github.com/xannem)) - Styling feedbacks for query upon closing and running.

## 0.6.22

## 0.6.21

### Patch Changes

- [#1873](https://github.com/finos/legend-studio/pull/1873) [`1a5080f89`](https://github.com/finos/legend-studio/commit/1a5080f8914b1827e2f360379f5170f5683453e3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Display execution time using `prettyDuration`.

## 0.6.20

### Patch Changes

- [#1867](https://github.com/finos/legend-studio/pull/1867) [`df98cc531`](https://github.com/finos/legend-studio/commit/df98cc5318d4ece60c6694866ac0304a61b3fd2a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support check entitlements in query builder.

## 0.6.19

### Patch Changes

- [#1863](https://github.com/finos/legend-studio/pull/1863) [`8cc899318`](https://github.com/finos/legend-studio/commit/8cc899318374df074cf934cd09a72c3c2bea312c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Support TDS sort for any tds column not just projection columns.

- [#1859](https://github.com/finos/legend-studio/pull/1859) [`d8b85ff06`](https://github.com/finos/legend-studio/commit/d8b85ff066d8743d96c9f9edbf2875a062847e00) ([@xannem](https://github.com/xannem)) - Add loading indicator for when user closes text-mode query and fixes flickering blank panels [#1853](https://github.com/finos/legend-studio/issues/1853)

- [#1860](https://github.com/finos/legend-studio/pull/1860) [`d096134b2`](https://github.com/finos/legend-studio/commit/d096134b2f1a290aa0bd7f3b35a264c37abdb686) ([@xannem](https://github.com/xannem)) - Add button icon to clear all projection columns in query builder.

## 0.6.18

### Patch Changes

- [#1856](https://github.com/finos/legend-studio/pull/1856) [`707a7a622`](https://github.com/finos/legend-studio/commit/707a7a6223e2d65b471dca9efb967da6fd125739) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add text/protocol and documentation options to advanced dropdown in query builder.

## 0.6.17

## 0.6.16

### Patch Changes

- [#1730](https://github.com/finos/legend-studio/pull/1730) [`0026b7986`](https://github.com/finos/legend-studio/commit/0026b79867b8783fc507618e8a0131c7021b018e) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Improve query execution test flow.

- [#1669](https://github.com/finos/legend-studio/pull/1669) [`04bec8146`](https://github.com/finos/legend-studio/commit/04bec8146730311355d9debe77f28db79d4b800c) ([@xannem](https://github.com/xannem)) - Light mode styling fixes in query builder and allow new line delimiter for query filter value spec.

## 0.6.15

## 0.6.14

## 0.6.13

## 0.6.12

## 0.6.11

## 0.6.10

## 0.6.9

## 0.6.8

### Patch Changes

- [#1570](https://github.com/finos/legend-studio/pull/1570) [`324ef980b`](https://github.com/finos/legend-studio/commit/324ef980be7258f28508f14d46cdccde4c303610) ([@gs-gunjan](https://github.com/gs-gunjan)) - Support service queries with optional mapping and runtime.

## 0.6.7

## 0.6.6

## 0.6.5

## 0.6.4

## 0.6.3

### Patch Changes

- [#1708](https://github.com/finos/legend-studio/pull/1708) [`56e287e57`](https://github.com/finos/legend-studio/commit/56e287e57bc98c37c813c5d924c01955cec38d68) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support DnD from `fetch structure` to `fitler` panel to create a new logical group.

## 0.6.2

### Patch Changes

- [#1700](https://github.com/finos/legend-studio/pull/1700) [`9b2e9b698`](https://github.com/finos/legend-studio/commit/9b2e9b69860246faae068c219d936f68bb242302) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where datetime values are not provided with seconds.

- [#1705](https://github.com/finos/legend-studio/pull/1705) [`048271628`](https://github.com/finos/legend-studio/commit/0482716286d64f6305e0a6836037751c65fcfe8f) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug with the cursor when editing `filter` and `post filter` text input value ([#1594](https://github.com/finos/legend-studio/issues/1594)).

## 0.6.1

## 0.6.0

### Minor Changes

- [#1691](https://github.com/finos/legend-studio/pull/1691) [`85aef2dfe`](https://github.com/finos/legend-studio/commit/85aef2dfe531188a87687352541e52f97d6018ec) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Disable deleting variables if used in query.

## 0.5.0

### Minor Changes

- [#1627](https://github.com/finos/legend-studio/pull/1627) [`fac6a9cc8`](https://github.com/finos/legend-studio/commit/fac6a9cc842cb6ed7a60b65e900dc33015f5f5e9) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for constants in query builder.

### Patch Changes

- [#1680](https://github.com/finos/legend-studio/pull/1680) [`ff01c821a`](https://github.com/finos/legend-studio/commit/ff01c821a249d87af943941e9fbb2a528016a334) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix incorrectly creating parameters for milestone date values when not required

- [#1682](https://github.com/finos/legend-studio/pull/1682) [`aa6665463`](https://github.com/finos/legend-studio/commit/aa6665463c710b2e9e4f8f80aa929aa8b6a15fb1) ([@xannem](https://github.com/xannem)) - fix: keeping query states when switching service execution contexts

## 0.4.4

### Patch Changes

- [#1673](https://github.com/finos/legend-studio/pull/1673) [`8f2ad24a`](https://github.com/finos/legend-studio/commit/8f2ad24a458365a55f69b6189de304c9a3107f50) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Move building execution lambdas and parameter values to `legend-query-builder`.

- [#1668](https://github.com/finos/legend-studio/pull/1668) [`e63ee326`](https://github.com/finos/legend-studio/commit/e63ee3268aab39cb123b4c16d6e3d43320695b5d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fixed a regression introduced by #1572 where query execution with parameters of type `SimpleFunctionExpression` failed.
  Fixed a regression introduced by #1628 where failed to update mocked value after parameter's multiplicity is changed.

## 0.4.3

### Patch Changes

- [#1628](https://github.com/finos/legend-studio/pull/1628) [`e4db6a45`](https://github.com/finos/legend-studio/commit/e4db6a45a79e76bf6d28277cc924b3dfbd5f1730) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Improve editing of multiplicity for parameters in query builder ([#1617](https://github.com/finos/legend-studio/issues/1617)).

- [#1623](https://github.com/finos/legend-studio/pull/1623) [`207919a2`](https://github.com/finos/legend-studio/commit/207919a2d3217bb6129d3c70b22e9dcf5fef0fdc) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Update sequent lambda names once the filter root lambda parameter name is changed ([#1622](https://github.com/finos/legend-studio/issues/1622)).

## 0.4.2

### Patch Changes

- [#1572](https://github.com/finos/legend-studio/pull/1572) [`cb6451c3`](https://github.com/finos/legend-studio/commit/cb6451c33e0e747ced31b631c6f5e3ba0ac6c53a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Leverage engine to execute queries with parameters ([#1535](https://github.com/finos/legend-studio/issues/1535)).

## 0.4.1

## 0.4.0

### Minor Changes

- [#1587](https://github.com/finos/legend-studio/pull/1587) [`086b3bcc`](https://github.com/finos/legend-studio/commit/086b3bcc528c86c835434cca21cb7a97ce7c8673) ([@xannem](https://github.com/xannem)) - Add support for function `forWatermark()` ([#1564](https://github.com/finos/legend-studio/issues/1564))

- [#1596](https://github.com/finos/legend-studio/pull/1596) [`55d83b7f`](https://github.com/finos/legend-studio/commit/55d83b7fa5edb060cecaea3f6020435c3be662a9) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support copy cell and row value in the result grid ([#1595](https://github.com/finos/legend-studio/issues/1595)).

## 0.3.1

## 0.3.0

### Minor Changes

- [#1530](https://github.com/finos/legend-studio/pull/1530) [`fb50367a`](https://github.com/finos/legend-studio/commit/fb50367a32a06c3ecb73a685c73875bc586b80ed) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add OLAP groupBy support in query builder ([#1527](https://github.com/finos/legend-studio/issues/1527)).

### Patch Changes

- [#1573](https://github.com/finos/legend-studio/pull/1573) [`6689b219`](https://github.com/finos/legend-studio/commit/6689b219d04cabd48a5ef59b8b52767737a9bde7) ([@akphi](https://github.com/akphi)) - Fix a bug where milestoning editor modal cannot be closed ([#1589](https://github.com/finos/legend-studio/issues/1589)).

- [#1573](https://github.com/finos/legend-studio/pull/1573) [`6689b219`](https://github.com/finos/legend-studio/commit/6689b219d04cabd48a5ef59b8b52767737a9bde7) ([@akphi](https://github.com/akphi)) - Fix a problem where query builder setup panels do not allow selection when there is only one option and no selected option ([#1590](https://github.com/finos/legend-studio/issues/1590)).

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- [#1520](https://github.com/finos/legend-studio/pull/1520) [`240875e8`](https://github.com/finos/legend-studio/commit/240875e869c95d7d228756a66eec1e82a45b8884) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move `value specification` logic like `LambdaEditor`, `BasicValueSpecificationEditor` from `@finos/legend-application` to `@finos/legend-query-builder`

- [#1520](https://github.com/finos/legend-studio/pull/1520) [`240875e8`](https://github.com/finos/legend-studio/commit/240875e869c95d7d228756a66eec1e82a45b8884) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move `value specification` helpers from `@finos/legend-graph` to `@finos/legend-query-builder`

### Patch Changes

- [#1553](https://github.com/finos/legend-studio/pull/1553) [`f8e745c1`](https://github.com/finos/legend-studio/commit/f8e745c11fe1708fea0f8f2f90a7d24fe8345ca5) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a regression introduced in ([#1543](https://github.com/finos/legend-studio/pull/1543)): Avoid updating multiplicity in place, create a new instance instead.

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#1456](https://github.com/finos/legend-studio/pull/1456) [`5b692ece`](https://github.com/finos/legend-studio/commit/5b692ece6844e84c5d7f71df8edfe9a86aaefd55) ([@gayathrir11](https://github.com/gayathrir11)) - Add change detection support for `query builder`

- [#1486](https://github.com/finos/legend-studio/pull/1486) [`4eb73868`](https://github.com/finos/legend-studio/commit/4eb73868a6f6041967252ec27b65ec15cdcc7edf) ([@xannem](https://github.com/xannem)) - Improve search algorithm for property search to enhance user experience [#1294](https://github.com/finos/legend-studio/issues/1294)

### Patch Changes

- [#1456](https://github.com/finos/legend-studio/pull/1456) [`5b692ece`](https://github.com/finos/legend-studio/commit/5b692ece6844e84c5d7f71df8edfe9a86aaefd55) ([@gayathrir11](https://github.com/gayathrir11)) - Warn users about stale query results

- [#1501](https://github.com/finos/legend-studio/pull/1501) [`e27092af`](https://github.com/finos/legend-studio/commit/e27092afe49227c860dbf07c191203cc1ba29e02) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where query-builder crash when right-clicking the result panel row/cell if the current query is not supported in form mode. ([#1490](https://github.com/finos/legend-studio/issues/1490)).

## 0.0.2

## 0.0.1
