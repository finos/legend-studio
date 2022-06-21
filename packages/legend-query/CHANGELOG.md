# @finos/legend-query

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

### Patch Changes

- [#1170](https://github.com/finos/legend-studio/pull/1170) [`9263d26d`](https://github.com/finos/legend-studio/commit/9263d26d50118bfb4140da25944e2a58cebff456) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Sort query builder explorer nodes by their return types with primitives going first following by enumeration, class and class subtypes.

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Minor Changes

- [#1131](https://github.com/finos/legend-studio/pull/1131) [`d194cce7`](https://github.com/finos/legend-studio/commit/d194cce765ebc68d5494a9a645431a37bb88725e) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support more date/time capabilities in filter.

* [#891](https://github.com/finos/legend-studio/pull/891) [`8192c5fe`](https://github.com/finos/legend-studio/commit/8192c5fe0066523822266155da2024cb4eac9c37) ([@gayathrir11](https://github.com/gayathrir11)) - Support editing of milestoning properties in projection and filter.

### Patch Changes

- [#1103](https://github.com/finos/legend-studio/pull/1103) [`4e2811de`](https://github.com/finos/legend-studio/commit/4e2811de48f803529a2917fe9c020de1eb25f1ba) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add enumeration support for aggregation projection columns.
  Also, aggregation operators dropdown is now disabled when there is no operations compatible with the projection type ([#1079](https://github.com/finos/legend-studio/issues/1079)).

* [#1111](https://github.com/finos/legend-studio/pull/1111) [`4fc532a8`](https://github.com/finos/legend-studio/commit/4fc532a8b6b9956e4470a48f2fac6440c015ee17) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Properly show `value specification editor` for `Date` parameters of derived properties ([#1099](https://github.com/finos/legend-studio/issues/1099)).

- [#1132](https://github.com/finos/legend-studio/pull/1132) [`e1054482`](https://github.com/finos/legend-studio/commit/e1054482794e9c50d310a047c16a06b8bd9acdc9) ([@akphi](https://github.com/akphi)) - Fix a problem where discarding changes in text-mode when there is a grammar parsing errors leaving a `backdrop` rendering the app unusable afterwards.

* [#1107](https://github.com/finos/legend-studio/pull/1107) [`e552f5b1`](https://github.com/finos/legend-studio/commit/e552f5b12737315d7615907ad0fbb76904db0bbf) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Observe `classMilestoningTemporalValues` for milestoning parameter panel.

## 1.3.12

## 1.3.11

### Patch Changes

- [#1065](https://github.com/finos/legend-studio/pull/1065) [`797c9ae4`](https://github.com/finos/legend-studio/commit/797c9ae47a55f4a336f8ec53fa58618be46f5267) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a problem with adjusting (post) filter's RHS value when changing type for LHS

## 1.3.10

## 1.3.9

### Patch Changes

- [`94a9c645`](https://github.com/finos/legend-studio/commit/94a9c6453f5dde92ab383c889f772e46114ceabb) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Remove mobx `computed` on query setup element options.

## 1.3.8

### Patch Changes

- [#1049](https://github.com/finos/legend-studio/pull/1049) [`5de91968`](https://github.com/finos/legend-studio/commit/5de91968ae3ec1c4d42dc1412e452d000dfc8b3e) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Reset post-filter when switching fetch structure.

* [#1049](https://github.com/finos/legend-studio/pull/1049) [`5de91968`](https://github.com/finos/legend-studio/commit/5de91968ae3ec1c4d42dc1412e452d000dfc8b3e) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix boolean value `false` being rendered as empty cell in query builder result panel ([#1008](https://github.com/finos/legend-studio/issues/1008)).

## 1.3.7

### Patch Changes

- [#1058](https://github.com/finos/legend-studio/pull/1058) [`df06ed15`](https://github.com/finos/legend-studio/commit/df06ed1587252592cf9e783fbdcde8e53dc2f9c7) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support result set modifier after post filter.

* [#1061](https://github.com/finos/legend-studio/pull/1061) [`b6628128`](https://github.com/finos/legend-studio/commit/b6628128eafba97c7f12b5f2910b681421b254b6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix property expression compatibility for `isEmpty` and `isNotEmpty` ([#1060](https://github.com/finos/legend-studio/issues/1060)).

## 1.3.6

### Patch Changes

- [#1051](https://github.com/finos/legend-studio/pull/1051) [`c79e8723`](https://github.com/finos/legend-studio/commit/c79e872303ecbd3d13e1b6a4a4f994b7b810142c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Observe `ValueSpecification` when initializing query builder.

## 1.3.5

## 1.3.4

## 1.3.3

## 1.3.2

## 1.3.1

## 1.3.0

### Minor Changes

- [#995](https://github.com/finos/legend-studio/pull/995) [`5b78a3fd`](https://github.com/finos/legend-studio/commit/5b78a3fdb48d28037ba93f7e27cb724d8d02d7a1) ([@akphi](https://github.com/akphi)) - Allow toggling to enable/disable network request payload compression for better debugging experience.

* [#995](https://github.com/finos/legend-studio/pull/995) [`5b78a3fd`](https://github.com/finos/legend-studio/commit/5b78a3fdb48d28037ba93f7e27cb724d8d02d7a1) ([@akphi](https://github.com/akphi)) - Allow toggling network request payload compression to improve debugging experience.

- [#995](https://github.com/finos/legend-studio/pull/995) [`5b78a3fd`](https://github.com/finos/legend-studio/commit/5b78a3fdb48d28037ba93f7e27cb724d8d02d7a1) ([@akphi](https://github.com/akphi)) - Support debugging execution plan generation.

## 1.2.3

### Patch Changes

- [#992](https://github.com/finos/legend-studio/pull/992) [`a8693108`](https://github.com/finos/legend-studio/commit/a869310843265cf10a7595a3f53fb5b11ecf64aa) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `TEMPORARY_skipGraphBuilderPostProcessing` flag to allow skipping post-processing in graph builder to boost performance.

## 1.2.2

## 1.2.1

### Patch Changes

- [#983](https://github.com/finos/legend-studio/pull/983) [`872c37a8`](https://github.com/finos/legend-studio/commit/872c37a804a47c9a86ec646ad3668728c482aeca) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Take included mappings into account when finding compatible runtimes in query setup.

## 1.2.0

### Minor Changes

- [#977](https://github.com/finos/legend-studio/pull/977) [`37490b13`](https://github.com/finos/legend-studio/commit/37490b13d6156ad610bba2799e5621632885163d) ([@akphi](https://github.com/akphi)) - Show progress message and report metrics for graph builder process.

## 1.1.0

### Minor Changes

- [#925](https://github.com/finos/legend-studio/pull/925) [`80de7171`](https://github.com/finos/legend-studio/commit/80de71714c943b577169f336660534f94dba4d6f) ([@akphi](https://github.com/akphi)) - Projections created by DnD from explorer tree will now have names complying with `humanize property name` setting of the explorer tree.

### Patch Changes

- [#930](https://github.com/finos/legend-studio/pull/930) [`f7a792eb`](https://github.com/finos/legend-studio/commit/f7a792eb203804ea51ee1380a84d98c9955ca609) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Sort project versions in descending order in query setup.

* [#926](https://github.com/finos/legend-studio/pull/926) [`080a31d6`](https://github.com/finos/legend-studio/commit/080a31d66fe3ac48ed44d86cf9301af0a78c70fc) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Stop notifying errors for unsupported query in `Legend Query` to avoid confusion during execution/edition.

- [#838](https://github.com/finos/legend-studio/pull/838) [`854d8aa5`](https://github.com/finos/legend-studio/commit/854d8aa58ff31f67f698d99a498e0d51bfd668a2) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Rename `DSL Serializer` to `DSL External Format` and move it to core.

## 1.0.1

### Patch Changes

- [#919](https://github.com/finos/legend-studio/pull/919) [`ae5d88f7`](https://github.com/finos/legend-studio/commit/ae5d88f713f9e98b9e13ea8b8f04d05c900bc3a1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Handle unsupported queries in stand-alone query builder (i.e. `Legend Query`).

* [#923](https://github.com/finos/legend-studio/pull/923) [`966fb26a`](https://github.com/finos/legend-studio/commit/966fb26af90b120272d79389a539099828c74851) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Remove `TDSRow` system class.

## 1.0.0

### Major Changes

- [#899](https://github.com/finos/legend-studio/pull/899) [`d4f0aec5`](https://github.com/finos/legend-studio/commit/d4f0aec5d536b3ad167ac702cc5c2070c265ed51) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename `TEMP__useLegacyDepotServerAPIRoutes` to `TEMPORARY__useLegacyDepotServerAPIRoutes`

### Minor Changes

- [#888](https://github.com/finos/legend-studio/pull/888) [`aab22647`](https://github.com/finos/legend-studio/commit/aab22647524a4da0fd8cd0c7934c1a4a94a17797) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add functions explorer panel to show user-defined functions

* [#902](https://github.com/finos/legend-studio/pull/902) [`81857614`](https://github.com/finos/legend-studio/commit/81857614bcf9d1335b4da1ae08569008f9ef11dd) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add post-filter support for query builder.

### Patch Changes

- [#907](https://github.com/finos/legend-studio/pull/907) [`4efb5909`](https://github.com/finos/legend-studio/commit/4efb59094bfc2e9a79ac0b1ef8fee6b6a1c6c3bc) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Display properties mapped through association mappings for the class defined in the included mapping in query builder explorer tree ([#406](https://github.com/finos/legend-studio/issues/406))

* [#915](https://github.com/finos/legend-studio/pull/915) [`cb0ea76f`](https://github.com/finos/legend-studio/commit/cb0ea76f6b1a623b3d9da3ade4f2c08f9f682fa1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add option to toggle post-filter panel and default to hide panel.

- [#909](https://github.com/finos/legend-studio/pull/909) [`a7cb9f94`](https://github.com/finos/legend-studio/commit/a7cb9f942b16a48810b3a13c9ed91ffe030e9dac) ([@gayathrir11](https://github.com/gayathrir11)) - Add support for `DateTime` valueSpecification editor

## 0.8.1

### Patch Changes

- [#881](https://github.com/finos/legend-studio/pull/881) [`b38d8200`](https://github.com/finos/legend-studio/commit/b38d8200d0c1e32556c51cf2537b3456731a76c9) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Update the display order of query builder explorer tree nodes' children to show `subtype` nodes last.

## 0.8.0

### Minor Changes

- [#874](https://github.com/finos/legend-studio/pull/874) [`12f61a84`](https://github.com/finos/legend-studio/commit/12f61a840df60708ec062bab6397ec5981de33e6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add attestation confirmation before exporting query data.

## 0.7.0

### Minor Changes

- [#836](https://github.com/finos/legend-studio/pull/836) [`4e08df9a`](https://github.com/finos/legend-studio/commit/4e08df9ae59e50cd5400d5d9bdcf43f1c7d2b423) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for exporting query result.

* [#836](https://github.com/finos/legend-studio/pull/836) [`4e08df9a`](https://github.com/finos/legend-studio/commit/4e08df9ae59e50cd5400d5d9bdcf43f1c7d2b423) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Support `RawExecutionResult` in result panel for string result types.

## 0.6.3

## 0.6.2

## 0.6.1

### Patch Changes

- [#831](https://github.com/finos/legend-studio/pull/831) [`2637ad6d`](https://github.com/finos/legend-studio/commit/2637ad6d4b3f62daa065c6a4348796dda3968b6d) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add parameter instance values when executing unsupported queries.

* [#822](https://github.com/finos/legend-studio/pull/822) [`333c846d`](https://github.com/finos/legend-studio/commit/333c846df6f8eb7f0d5c5e7c156458b61955fc47) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Display properties mapped through inheritance mapping in the explorer tree

## 0.6.0

### Minor Changes

- [#787](https://github.com/finos/legend-studio/pull/787) [`cf4be129`](https://github.com/finos/legend-studio/commit/cf4be12998af8931b27f8cbac9e2da57f251dfe0) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support subtype in the filter panel

* [#789](https://github.com/finos/legend-studio/pull/789) [`4cfb5298`](https://github.com/finos/legend-studio/commit/4cfb529843ccee4f0dbbc73777c1d2a1b262733a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Subtype support for graph fetch structure.

## 0.5.0

### Minor Changes

- [#766](https://github.com/finos/legend-studio/pull/766) [`ab7ae357`](https://github.com/finos/legend-studio/commit/ab7ae357be8dbbb8d72a727ccaa18d7d2b140f68) ([@gayathrir11](https://github.com/gayathrir11)) - Allow drag and drop of parameters in Derived Property editor.

## 0.4.1

### Patch Changes

- [#800](https://github.com/finos/legend-studio/pull/800) [`2eba0b37`](https://github.com/finos/legend-studio/commit/2eba0b370ece84968ddde6e236f2f9f9a639f733) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix loading of dependencies for project with version `HEAD` ([#798](https://github.com/finos/legend-studio/issues/798)).

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

- [#620](https://github.com/finos/legend-studio/pull/620) [`efe01d92`](https://github.com/finos/legend-studio/commit/efe01d9218034dc358420b65f20da9715eb55589) ([@akphi](https://github.com/akphi)) - Add a temporary flag `TEMPORARY__useLegacyDepotServerAPIRoutes` in `depot` server config to allow pointing certain APIs at old endpoint. This is expected to be removed soon but provided as a workaround for older infrastructure.

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
