# @finos/legend-query

## 0.4.0

### Minor Changes

- [#740](https://github.com/finos/legend-studio/pull/740) [`947e10e4`](https://github.com/finos/legend-studio/commit/947e10e4fabb0a18c31222aa76166c04763f085d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add processing support for subtype in projection fetch structure.

* [#784](https://github.com/finos/legend-studio/pull/784) [`18b60b42`](https://github.com/finos/legend-studio/commit/18b60b42d2a9b2d2c195e80bb6d80be192e7a605) ([@gayathrir11](https://github.com/gayathrir11)) - Support relational operations in filter panel for properties of type `Date`.

- [#737](https://github.com/finos/legend-studio/pull/737) [`81f87eb3`](https://github.com/finos/legend-studio/commit/81f87eb38083981bce556b4c5a3a143beb59e9f6) ([@gayathrir11](https://github.com/gayathrir11)) - Allow configuring query parameters in `unsupported` mode.

* [#741](https://github.com/finos/legend-studio/pull/741) [`eaa1650b`](https://github.com/finos/legend-studio/commit/eaa1650bc33d9d5283502d4e5bfb514c2272854a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Display subclasses in explorer tree and add DnD support for these nodes to help build fetch structure.

### Patch Changes

- [#768](https://github.com/finos/legend-studio/pull/768) [`f2927570`](https://github.com/finos/legend-studio/commit/f2927570b2afdc2954912bdbb20058606d2cf8bc) ([@gayathrir11](https://github.com/gayathrir11)) - Handle empty error messages from Engine.

## 0.3.0

### Minor Changes

- [#738](https://github.com/finos/legend-studio/pull/738) [`2f239197`](https://github.com/finos/legend-studio/commit/2f23919725f3b103ab2208f26bdbb482ef40186b) ([@akphi](https://github.com/akphi)) - Allow configuring via url the class to initialize the query lambda with in create new query mode. e.g. `/query/create/org.finos.legend.test/legend-query-test/latest/model::dummyMapping/model::dummyRuntime/model::dummyClass`.

## 0.2.2

### Patch Changes

- [#729](https://github.com/finos/legend-studio/pull/729) [`bed72461`](https://github.com/finos/legend-studio/commit/bed724618f61c14cef8e56f39c2f0ff9240f04ea) ([@gayathrir11](https://github.com/gayathrir11)) - Fix processing of `bitemporal` milestoning stereotype.

## 0.2.1

## 0.2.0

### Minor Changes

- [#679](https://github.com/finos/legend-studio/pull/679) [`e2fe3ba8`](https://github.com/finos/legend-studio/commit/e2fe3ba87a8e8ea1484d8f8dd4cf1dbc0f1cb40e) ([@gayathrir11](https://github.com/gayathrir11)) - Support milestoned class in `.all()` ([#679](https://github.com/finos/legend-studio/issues/679)).

* [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - The abstract plugin now has a default generic `install` method which just registers the plugin to the compatible plugin manager, this saves plugin author some time and code when implementing plugins.

### Patch Changes

- [#695](https://github.com/finos/legend-studio/pull/695) [`67612764`](https://github.com/finos/legend-studio/commit/676127644cac0c451a89e57e4f07c8da544a6c98) ([@gayathrir11](https://github.com/gayathrir11)) - Make resetting behaviour in query builder more consistent and systematic.

## 0.1.5

## 0.1.4

## 0.1.3

### Patch Changes

- [#685](https://github.com/finos/legend-studio/pull/685) [`1ae0553b`](https://github.com/finos/legend-studio/commit/1ae0553b7af88217a8642492cab2252a589ab091) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Change `QueryPlugin` to `LegendQueryPlugin`. This change applies for other extension-related classes as well, e.g. `LegendQueryPluginManager`, `*_LegendQueryPreset`, `*_LegendQueryPlugin`, etc.

## 0.1.2

### Patch Changes

- [#646](https://github.com/finos/legend-studio/pull/646) [`51dfc555`](https://github.com/finos/legend-studio/commit/51dfc55599c25650f4d17587cf87b180271be676) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix class explorer not showing properties from a class mapped using an operational set implementation ([#647](https://github.com/finos/legend-studio/issues/647)).

* [#639](https://github.com/finos/legend-studio/pull/639) [`62985e5`](https://github.com/finos/legend-studio/commit/62985e59627b5be2cb75e15f30c13d029014c030) ([@akphi](https://github.com/akphi)) - Allow viewing the project of a query in Studio.

## 0.1.1

### Patch Changes

- [#620](https://github.com/finos/legend-studio/pull/620) [`efe01d92`](https://github.com/finos/legend-studio/commit/efe01d9218034dc358420b65f20da9715eb55589) ([@akphi](https://github.com/akphi)) - Add a temporary flag `TEMP__useLegacyDepotServerAPIRoutes` in `depot` server config to allow pointing certain APIs at old endpoint. This is expected to be removed soon but provided as a workaround for older infrastructure.

## 0.1.0

### Minor Changes

- [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - Created an extension mechanism for query setup.

### Patch Changes

- [#588](https://github.com/finos/legend-studio/pull/588) [`83c05ada`](https://github.com/finos/legend-studio/commit/83c05ada3f309766cc7e4ec59f2ef0cba02d9ee6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - List possible `mappings` and `runtimes` from dependency projects in query setup.

## 0.0.15

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

### Patch Changes

- [#532](https://github.com/finos/legend-studio/pull/532) [`0ec098d2`](https://github.com/finos/legend-studio/commit/0ec098d20f607fd1fc848a1ce51432791e7ec717) ([@akphi](https://github.com/akphi)) - Fix a problem where recursive removal of graph fetch tree node leaves orphan nodes ([#476](https://github.com/finos/legend-studio/issues/476)).

* [#508](https://github.com/finos/legend-studio/pull/508) [`f30e5046`](https://github.com/finos/legend-studio/commit/f30e504623d53f5234a6a5290c95f01099afa672) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Allow specifying and editing `parameters` in query builder.

- [#535](https://github.com/finos/legend-studio/pull/535) [`ebe69b6a`](https://github.com/finos/legend-studio/commit/ebe69b6a8c33237fd11c3522e20130d9c4aa2026) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Initializes query builder properly when pre-compilation fails ([#477](https://github.com/finos/legend-studio/issues/477))

* [#532](https://github.com/finos/legend-studio/pull/532) [`0ec098d2`](https://github.com/finos/legend-studio/commit/0ec098d20f607fd1fc848a1ce51432791e7ec717) ([@akphi](https://github.com/akphi)) - Allow adding properties of unopened nodes to fetch structure ([#471](https://github.com/finos/legend-studio/issues/471))

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

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Move `@finos/legend-studio-extension-query-builder` core logic into `@finos/legend-query`, hence sever the dependency of `Legend Query` core on `@finos/legend-studio`.
