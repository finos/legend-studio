# @finos/legend-query-builder

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
