# @finos/legend-graph

## 8.0.1

### Patch Changes

- [#1216](https://github.com/finos/legend-studio/pull/1216) [`16b268f7`](https://github.com/finos/legend-studio/commit/16b268f75ba5b5d0c36223c4e391e5df2ac8220b) ([@gayathrir11](https://github.com/gayathrir11)) - Fix inaccurate change detection for inline mapping ([#1198](https://github.com/finos/legend-studio/issues/1198)).

## 8.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

* [#960](https://github.com/finos/legend-studio/pull/960) [`6ed0fcbc`](https://github.com/finos/legend-studio/commit/6ed0fcbcc0e7b77c84b8eb8442ef05fbdc7d8695) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `hashLambda` to `hashRawLambda`

### Minor Changes

- [#1166](https://github.com/finos/legend-studio/pull/1166) [`41805dba`](https://github.com/finos/legend-studio/commit/41805dbaf92d7dfca14f954d1bc00ff5f5acaa5a) ([@akphi](https://github.com/akphi)) - Expose getters for elements by type in graph, e.g. `classes`, `enumerations`, `associations`, etc.

### Patch Changes

- [#960](https://github.com/finos/legend-studio/pull/960) [`6ed0fcbc`](https://github.com/finos/legend-studio/commit/6ed0fcbcc0e7b77c84b8eb8442ef05fbdc7d8695) ([@akphi](https://github.com/akphi)) - Adopt new `grammar - JSON` transformation API endpoints.

* [#1185](https://github.com/finos/legend-studio/pull/1185) [`44544fc5`](https://github.com/finos/legend-studio/commit/44544fc5afd12bb95fbdde6fa53567bb5349447e) ([@gayathrir11](https://github.com/gayathrir11)) - Fix populating of `extendsClassMappingId` for class mappings ([#1181](https://github.com/finos/legend-studio/issues/1181)).

- [#870](https://github.com/finos/legend-studio/pull/870) [`8334cdcf`](https://github.com/finos/legend-studio/commit/8334cdcff278964f465435413e2b18578ae20b9e) ([@abhishoya-gs](https://github.com/abhishoya-gs)) - Add GCP Workload Identity Federation Authentication Strategy

## 7.0.0

### Major Changes

- [#1159](https://github.com/finos/legend-studio/pull/1159) [`f6abe87a`](https://github.com/finos/legend-studio/commit/f6abe87a27ec3f2604caf25e38df17344b31ef9f) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move logic out of metamodels, such as `Class.getProperty()`, `Database.getSchema()`, etc. and expose them as helper methods.

* [#1153](https://github.com/finos/legend-studio/pull/1153) [`9e3b9b57`](https://github.com/finos/legend-studio/commit/9e3b9b57ae2589a9627911713126a024d0da82ae) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed extra fields added to the metamodels for navigation or other graph management purposes, such as `owner`, `parent`, `uuid`, etc. to `_OWNER`, `_PARENT`, `_UUID`, etc.; these fields are also made `readonly`.

- [#1159](https://github.com/finos/legend-studio/pull/1159) [`f6abe87a`](https://github.com/finos/legend-studio/commit/f6abe87a27ec3f2604caf25e38df17344b31ef9f) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `Stubable` interface and all stub logic in metamodels, such as `createStub()`, `isStub()`, these methods are now cleaned up and organized in `model creater helpers` which will be exported as utilities from this package.

* [#1153](https://github.com/finos/legend-studio/pull/1153) [`9e3b9b57`](https://github.com/finos/legend-studio/commit/9e3b9b57ae2589a9627911713126a024d0da82ae) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move some `enum`s out of metamodels, such as `SET_IMPLEMENTATION_TYPE`, `BASIC_SET_IMPLEMENTATION_TYPE`, `PACKAGEABLE_ELEMENT_POINTER_TYPE`, `CLASS_PROPERTY_TYPE`, etc.

- [#1153](https://github.com/finos/legend-studio/pull/1153) [`9e3b9b57`](https://github.com/finos/legend-studio/commit/9e3b9b57ae2589a9627911713126a024d0da82ae) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `buildState` from `BasicModel` and `DependencyManager` and moved them to `GraphManagerState` since these states don't belong inherently to the graph but the graph manager. As such, methods like `AbstractPureGraphManager.buildSystem()`, `AbstractPureGraphManager.buildGraph()` etc. now require the build state to as a parameter.

* [#1159](https://github.com/finos/legend-studio/pull/1159) [`f6abe87a`](https://github.com/finos/legend-studio/commit/f6abe87a27ec3f2604caf25e38df17344b31ef9f) ([@akphi](https://github.com/akphi)) - Rename `fullPath` to `path` in `Package`. Where this change really makes a difference is for the root package: previously, `path` was the `name` of the root package element, from now on, `path` will be `empty string`, this makes the handling of root package when constructing element path more consistent.

### Minor Changes

- [#1114](https://github.com/finos/legend-studio/pull/1114) [`5e248794`](https://github.com/finos/legend-studio/commit/5e24879419c4116456d58b67702919bc0577eeb6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Deprecate running service Legacy Tests.
  Add `RelationalData` and `EqualToTDS` to support testing on relational queries.
  Support running testable tests.

### Patch Changes

- [#1165](https://github.com/finos/legend-studio/pull/1165) [`5fcd423b`](https://github.com/finos/legend-studio/commit/5fcd423b28c11713a1e39ced193cdfb80ce42119) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Correctly resolve view filter in database by looking in included databases. ([#1160](https://github.com/finos/legend-studio/issues/1160))

* [#1153](https://github.com/finos/legend-studio/pull/1153) [`9e3b9b57`](https://github.com/finos/legend-studio/commit/9e3b9b57ae2589a9627911713126a024d0da82ae) ([@akphi](https://github.com/akphi)) - Update `LocalMappingPropertyInfo` metamodel to have `localMappingPropertyType: PackageableElementReference<Type>`

- [#1010](https://github.com/finos/legend-studio/pull/1010) [`5d8c7c35`](https://github.com/finos/legend-studio/commit/5d8c7c3554369b5b0eee274422a072b383b7b25b) ([@abhishoya-gs](https://github.com/abhishoya-gs)) - Add Proxy Parameters to BigQueryDataSourceSpecification

## 6.0.1

## 6.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Minor Changes

- [#1076](https://github.com/finos/legend-studio/pull/1076) [`c6d0c1da`](https://github.com/finos/legend-studio/commit/c6d0c1dae779973e932f18c70cba503ebcc1d3f3) ([@gayathrir11](https://github.com/gayathrir11)) - Add graph support for strategic test models.

* [#891](https://github.com/finos/legend-studio/pull/891) [`8192c5fe`](https://github.com/finos/legend-studio/commit/8192c5fe0066523822266155da2024cb4eac9c37) ([@gayathrir11](https://github.com/gayathrir11)) - Support processing of milestoning properties in `class` and `association`.

### Patch Changes

- [#1101](https://github.com/finos/legend-studio/pull/1101) [`4222615c`](https://github.com/finos/legend-studio/commit/4222615c051466282f6cc937353b74e4f66c052e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix a problem with generating test data by properly including query parameter. Also, we now make use of the `test-data` generation's feature to `anonymize` sensitive data if needed.

* [#1076](https://github.com/finos/legend-studio/pull/1076) [`c6d0c1da`](https://github.com/finos/legend-studio/commit/c6d0c1dae779973e932f18c70cba503ebcc1d3f3) ([@gayathrir11](https://github.com/gayathrir11)) - Deprecate `ServiceTest` in `Service` and rename to `DEPRECATED__ServiceTest`.

## 5.0.0

### Major Changes

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move `BasicModel.buildPath()` out as the separate utility `V1_buildFullPath()`.

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move `BasicModel.getOrCreatePackage()` to `DomainHelper` as an utility.

* [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename `RawInstanceValue` to `RawPrimitiveInstanceValue` to more accurately reflect what it is.

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `BasicModel.addOwnElement()` and `PureModel.addElement()` will now take the package path for the new element, the creation of the element package chain and setting the element package will be handled here as well, consumer of the function `PureModel.addElement()` will no longer need to manually create the package.

* [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `DependencyManager.allElements` are now renamed to `DependencyManager.allOwnElements` for consistency.

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - Renamed graph builder option `TEMPORARY__keepSectionIndex` to `TEMPORARY__preserveSectionIndex` and remove option `TEMPORARY__disableRawLambdaResolver` as this is now controlled by `TEMPORARY__preserveSectionIndex` flag. Also, renamed to `V1_resolvePathsInRawLambda` to `V1_buildRawLambdaWithResolvedPaths`.

* [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `BasicModel.getOwn{X}()` set of methods will now throw if element is not found, the previous behavior now will manifest via `BasicModel.getOwnNullable{x}()` set of methods.

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `getOrCreatePackage` logic has been moved from `Package` to `DomainHelper`. This method now will also make use of caching to speed up graph building.

* [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename graph manager method prefix `HACKY_` with `HACKY__` to be consistent. Create a new method `HACKY__createDefaultBlankLambda()` to return the raw form of the lambda `x|''` which is used as the default in a lot cases.

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `MappingElementLabel` type and `get label(): MappingElementLabel` on all mapping element metamodels.

* [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move `getRoot()` out of `PackageableElement` and make it an utility instead.

### Patch Changes

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - Fix a problem with deleting non-empty packages.

* [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - Make `observe_Graph` non-blocking so it doesn't jank the main thread during observation.

- [#1068](https://github.com/finos/legend-studio/pull/1068) [`e8ee77dc`](https://github.com/finos/legend-studio/commit/e8ee77dcde909bdffd31fd65eea2cb8577b9c49d) ([@akphi](https://github.com/akphi)) - When building the graphs, raw lambdas' shortened paths will no-longer be auto-resolved when the graph is immutable (i.e. when building `dependencies`, `generation`, and `system` graphs). This would help improve the overall graph building performance.

## 4.0.3

### Patch Changes

- [#1086](https://github.com/finos/legend-studio/pull/1086) [`fdd8a327`](https://github.com/finos/legend-studio/commit/fdd8a3277f7bb8839587856e48daff23e31d4d34) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix the regression where `mobx` fails to observe `EmbeddedRelationalInstanceSetImplementation`.

* [#1082](https://github.com/finos/legend-studio/pull/1082) [`4294e10d`](https://github.com/finos/legend-studio/commit/4294e10d0f0238ad67fa615c7fd955a8cacbae04) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Support Pure `multi-execution` when registering service in `semi-interactive` mode ([#1059](https://github.com/finos/legend-studio/issues/1059))

## 4.0.2

### Patch Changes

- [#1049](https://github.com/finos/legend-studio/pull/1049) [`5de91968`](https://github.com/finos/legend-studio/commit/5de91968ae3ec1c4d42dc1412e452d000dfc8b3e) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Complete `ValueSpecificationObserver`, it will now probably propagate the value specification tree.

## 4.0.1

## 4.0.0

### Major Changes

- [#1054](https://github.com/finos/legend-studio/pull/1054) [`d0f81bc8`](https://github.com/finos/legend-studio/commit/d0f81bc82d56f913f12b720c265d6ca1b0c515af) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** All setters methods are now moved out of metamodels. These are now branded as `graph modifier helpers` and will be put in places where we need to modify them (e.g. in the apps such as `Legend Studio`, `Legend Query`). Also, all `mobx` `makeObservable()` logic inside of metamodels' constructors are now removed. These are now branded as `observer helpers`.

  > As of now, we are putting these in `@finos/legend-graph`, but ideally they should be moved to the app (similar to what we do with the `graph modifier observers`).

## 3.0.0

### Major Changes

- [#1000](https://github.com/finos/legend-studio/pull/1000) [`4f7d04c`](https://github.com/finos/legend-studio/commit/4f7d04c52fc8d52b87251bcf04ec971afe8d3218) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** All graph meta models are no longer observable by default, instead, to activate observability, one would need to call observers specifically.

* [#1000](https://github.com/finos/legend-studio/pull/1000) [`4f7d04c`](https://github.com/finos/legend-studio/commit/4f7d04c52fc8d52b87251bcf04ec971afe8d3218) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved `GraphManagerState.precomputeHashes` to `ChangeDetectionState`.

- [#1000](https://github.com/finos/legend-studio/pull/1000) [`4f7d04c`](https://github.com/finos/legend-studio/commit/4f7d04c52fc8d52b87251bcf04ec971afe8d3218) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `TEMPORARY_skipGraphBuilderPostProcessing` flag. Graph builder nolonger needs post-processing anymore.

## 2.1.3

## 2.1.2

### Patch Changes

- [#1017](https://github.com/finos/legend-studio/pull/1017) [`0dd7cc2e`](https://github.com/finos/legend-studio/commit/0dd7cc2ebf1ee068b394d052003c3442e298ff63) ([@gayathrir11](https://github.com/gayathrir11)) - Fix `Binding` element appearing multiple times in explorer tree.

## 2.1.1

### Patch Changes

- [#980](https://github.com/finos/legend-studio/pull/980) [`f95f5b42`](https://github.com/finos/legend-studio/commit/f95f5b429a017ecdac55f436e974d4f8f53d5f7c) ([@emilia-sokol-gs](https://github.com/emilia-sokol-gs)) - Add extension mechanism for loading models with model loader.

## 2.1.0

### Minor Changes

- [#1004](https://github.com/finos/legend-studio/pull/1004) [`99c19279`](https://github.com/finos/legend-studio/commit/99c19279b19c15fa01cab5cf3389a20c036d62e3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Rework the logic of resolving the generation parent for generated elements

## 2.0.4

## 2.0.3

### Patch Changes

- [#992](https://github.com/finos/legend-studio/pull/992) [`a8693108`](https://github.com/finos/legend-studio/commit/a869310843265cf10a7595a3f53fb5b11ecf64aa) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `TEMPORARY_skipGraphBuilderPostProcessing` flag to allow skipping post-processing in graph builder to boost performance.

## 2.0.2

### Patch Changes

- [#991](https://github.com/finos/legend-studio/pull/991) [`0787fcec`](https://github.com/finos/legend-studio/commit/0787fcec7b074342d26d295623fcbcb863ef9dee) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Initialize `DependencyManager` when creating light query graphs.

## 2.0.1

### Patch Changes

- [#983](https://github.com/finos/legend-studio/pull/983) [`872c37a8`](https://github.com/finos/legend-studio/commit/872c37a804a47c9a86ec646ad3668728c482aeca) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Build light graphs for several exploration workflows to improve load time for `Legend Query`.

## 2.0.0

### Major Changes

- [#981](https://github.com/finos/legend-studio/pull/981) [`e3efb96f`](https://github.com/finos/legend-studio/commit/e3efb96feb2bcd5e0b9578bafd90a586ad65ed7e) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `GRAPH_MANAGER_LOG_EVENT` to `GRAPH_MANAGER_EVENT` and `V1_ENGINE_LOG_EVENT` to `V1_ENGINE_EVENT` which are meant to be used for more than just logging.

* [#981](https://github.com/finos/legend-studio/pull/981) [`e3efb96f`](https://github.com/finos/legend-studio/commit/e3efb96feb2bcd5e0b9578bafd90a586ad65ed7e) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `AbstractPureGraphManager.pureProtocolToEntities()` to `pureProtocolTextToEntities()`.

### Minor Changes

- [#977](https://github.com/finos/legend-studio/pull/977) [`37490b13`](https://github.com/finos/legend-studio/commit/37490b13d6156ad610bba2799e5621632885163d) ([@akphi](https://github.com/akphi)) - Graph builder methods will now output a report when completed.

## 1.3.0

### Minor Changes

- [#885](https://github.com/finos/legend-studio/pull/885) [`b921da54`](https://github.com/finos/legend-studio/commit/b921da548336581e86ec84d8254f252538c7bb8b) ([@AFine-gs](https://github.com/AFine-gs)) - Add support for `Merge` operation class mapping.

* [#889](https://github.com/finos/legend-studio/pull/889) [`de29c049`](https://github.com/finos/legend-studio/commit/de29c0499dfc11480fb7801cfa180d2131e65c00) ([@gayathrir11](https://github.com/gayathrir11)) - Add support for `SemiStructured` relational type.

- [#931](https://github.com/finos/legend-studio/pull/931) [`9b133f6b`](https://github.com/finos/legend-studio/commit/9b133f6bfaf5f845831f8772180ce6c1cc1a07eb) ([@AFine-gs](https://github.com/AFine-gs)) - Add support for `Redshift` connector

### Patch Changes

- [#973](https://github.com/finos/legend-studio/pull/973) [`93fbe86f`](https://github.com/finos/legend-studio/commit/93fbe86fd07eb92e62044ea94236c45b642caa67) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Optimize graph builder indexing.

* [#971](https://github.com/finos/legend-studio/pull/971) [`1fe4f871`](https://github.com/finos/legend-studio/commit/1fe4f871a80ea1a76354665fff153fcfb2e1d58c) ([@akphi](https://github.com/akphi)) - Run duplication check before adding new element to the graph using `PureModel.addElement()`.

- [#838](https://github.com/finos/legend-studio/pull/838) [`854d8aa5`](https://github.com/finos/legend-studio/commit/854d8aa58ff31f67f698d99a498e0d51bfd668a2) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Rename `DSL Serializer` to `DSL External Format` and move it to core.

## 1.2.1

### Patch Changes

- [#923](https://github.com/finos/legend-studio/pull/923) [`966fb26a`](https://github.com/finos/legend-studio/commit/966fb26af90b120272d79389a539099828c74851) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `TDSRow` system classes.

## 1.2.0

### Minor Changes

- [#330](https://github.com/finos/legend-studio/pull/330) [`0b9263c`](https://github.com/finos/legend-studio/commit/0b9263c887753473a217e7b1c4a325dfdc3084aa) ([@aamend](https://github.com/aamend)) - Supporting Delta Lake JDBC connection.

### Patch Changes

- [#888](https://github.com/finos/legend-studio/pull/888) [`aab22647`](https://github.com/finos/legend-studio/commit/aab22647524a4da0fd8cd0c7934c1a4a94a17797) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Added helper to generate function signature in text.

* [#899](https://github.com/finos/legend-studio/pull/899) [`d4f0aec5`](https://github.com/finos/legend-studio/commit/d4f0aec5d536b3ad167ac702cc5c2070c265ed51) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Deprecate and remove `TestDatabase`, and `UserPassword` authentication strategies for relational database connection.

- [#901](https://github.com/finos/legend-studio/pull/901) [`58d25ea1`](https://github.com/finos/legend-studio/commit/58d25ea122ffab5a28b4b36aa93fc0ec44762b46) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Properly list enumeration mappings from dependencies ([#867](https://github.com/finos/legend-studio/issues/867)).

## 1.1.2

### Patch Changes

- [#883](https://github.com/finos/legend-studio/pull/883) [`05e54011`](https://github.com/finos/legend-studio/commit/05e54011d6e4b5e1cc74375e1e73effdd35f695d) ([@akphi](https://github.com/akphi)) - Add a temporary workaround to not fail graph building when there are unresolved class mapping IDs (see [#880](https://github.com/finos/legend-studio/issues/880) for more details).

## 1.1.1

## 1.1.0

### Minor Changes

- [#836](https://github.com/finos/legend-studio/pull/836) [`4e08df9a`](https://github.com/finos/legend-studio/commit/4e08df9ae59e50cd5400d5d9bdcf43f1c7d2b423) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `RawExecutionResult` to support `string` execution results.

## 1.0.6

### Patch Changes

- [#860](https://github.com/finos/legend-studio/pull/860) [`640987ad`](https://github.com/finos/legend-studio/commit/640987adc9938b87208bb5e306a3b0c42c1daa89) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix hashing of self-join of a database view.

## 1.0.5

### Patch Changes

- [#845](https://github.com/finos/legend-studio/pull/845) [`29c12a63`](https://github.com/finos/legend-studio/commit/29c12a637d6d5b4eb08f31e2d79ee4bd2a39977a) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Export `V1_SectionIndex`.

## 1.0.4

### Patch Changes

- [#817](https://github.com/finos/legend-studio/pull/817) [`3da897a2`](https://github.com/finos/legend-studio/commit/3da897a2612420aa70b462f660d87645441d9ada) ([@gayathrir11](https://github.com/gayathrir11)) - Exclude class in property pointer during transformation for local property mapping.

* [#822](https://github.com/finos/legend-studio/pull/822) [`333c846d`](https://github.com/finos/legend-studio/commit/333c846df6f8eb7f0d5c5e7c156458b61955fc47) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Display properties mapped through inheritance mapping in the explorer tree

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#755](https://github.com/finos/legend-studio/pull/755) [`61821cd6`](https://github.com/finos/legend-studio/commit/61821cd62c3b8b1a16124a092038ab963311de17) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename `CORE_ELEMENT_PATH` to `CORE_PURE_PATH`.

### Minor Changes

- [#740](https://github.com/finos/legend-studio/pull/740) [`947e10e4`](https://github.com/finos/legend-studio/commit/947e10e4fabb0a18c31222aa76166c04763f085d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Improve QueryBuilder_PureProtocolProcessorPlugin to handle PropertyExpression type inference

### Patch Changes

- [#775](https://github.com/finos/legend-studio/pull/775) [`4c81f3a6`](https://github.com/finos/legend-studio/commit/4c81f3a6b12cdfc098763b307284d7ea4a9c85b8) ([@akphi](https://github.com/akphi)) - Fix a typo in class relation, `subClass` and `superClass` become `subclass` and `superclass` respectively.

* [#776](https://github.com/finos/legend-studio/pull/776) [`4558db18`](https://github.com/finos/legend-studio/commit/4558db1805311798ed3ec11b6e37a64f25e0d64f) ([@gayathrir11](https://github.com/gayathrir11)) - Support processing of local properties in relational mappings

- [#786](https://github.com/finos/legend-studio/pull/786) [`b401675a`](https://github.com/finos/legend-studio/commit/b401675add9e7f682f16d8063229326e8e5314a9) ([@gayathrir11](https://github.com/gayathrir11)) - Fix processing of `propertyOwner` for local properties in relational mapping and pure mapping

## 0.4.1

## 0.4.0

### Minor Changes

- [#742](https://github.com/finos/legend-studio/pull/742) [`42ea0ed9`](https://github.com/finos/legend-studio/commit/42ea0ed977608804b41fb8272daeb2130a4f6143) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for `UsernamePasswordAuthenticationStrategy`.

### Patch Changes

- [#680](https://github.com/finos/legend-studio/pull/680) [`69c607e6`](https://github.com/finos/legend-studio/commit/69c607e641beb4827b2a9c17baa6b699c9384d14) ([@gayathrir11](https://github.com/gayathrir11)) - Show warning when detecting duplicated attributes in `profile`, `enumeration`, `class`, `association`

## 0.3.1

## 0.3.0

### Minor Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - The abstract plugin now has a default generic `install` method which just registers the plugin to the compatible plugin manager, this saves plugin author some time and code when implementing plugins.

### Patch Changes

- [#710](https://github.com/finos/legend-studio/pull/710) [`9a78d326`](https://github.com/finos/legend-studio/commit/9a78d32649f59ace15c048365211552b7262feef) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Detect `generic type` while processing `collection` value specification ([#564](https://github.com/finos/legend-studio/issues/564)).

* [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - Introduce tagging mechanism for `Query`.

- [#712](https://github.com/finos/legend-studio/pull/712) [`02fbbcf8`](https://github.com/finos/legend-studio/commit/02fbbcf810554addbbc47c1d29b11af00a134db7) ([@gayathrir11](https://github.com/gayathrir11)) - Add support for role in `Snowflake` connection

## 0.2.5

### Patch Changes

- [#693](https://github.com/finos/legend-studio/pull/693) [`3ac22989`](https://github.com/finos/legend-studio/commit/3ac22989fa0ddabac9c9178b5370ea271f7ea844) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix processing of `GraphFetchTree` with derived properties ([#428](https://github.com/finos/legend-studio/issues/428),[#689](https://github.com/finos/legend-studio/issues/689)).

## 0.2.4

### Patch Changes

- [#696](https://github.com/finos/legend-studio/pull/696) [`eb58ca71`](https://github.com/finos/legend-studio/commit/eb58ca71eaf8f72a116f6f6fb9060741788d9428) ([@gayathrir11](https://github.com/gayathrir11)) - Fix transformer for `LatestDate`

## 0.2.3

### Patch Changes

- [#681](https://github.com/finos/legend-studio/pull/681) [`c2de2c30`](https://github.com/finos/legend-studio/commit/c2de2c309fa2f10fb32e59516d68e98e50aa7290) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Change the separator of source ID from `_` to `@` to fix problems with error revealing in the form mode ([#510](https://github.com/finos/legend-studio/issues/510)).

## 0.2.2

### Patch Changes

- [#662](https://github.com/finos/legend-studio/pull/662) [`fb8bd11c`](https://github.com/finos/legend-studio/commit/fb8bd11cb958b2d92e6f68e22db974569832bccf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Properly process enumeration mappings in includes mapping ([#658](https://github.com/finos/legend-studio/issues/658)).

* [#652](https://github.com/finos/legend-studio/pull/652) [`4772cab1`](https://github.com/finos/legend-studio/commit/4772cab17dff94c33a8973c6847be2474248e4ff) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Properly resolve property mappings for `Inline` and `Otherwise` set implementations ([#650](https://github.com/finos/legend-studio/issues/650)).

- [#641](https://github.com/finos/legend-studio/pull/641) [`dd778d23`](https://github.com/finos/legend-studio/commit/dd778d23efa056e5034bdb80f89bcd9cb370b3e7) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix the building of `PropertyReference` in `XStorePropertyMapping` by defining its owner reference to be the association in the `XStore` mapping and the input to be the defined user input ([#524](https://github.com/finos/legend-studio/issues/524)).

## 0.2.1

## 0.2.0

### Minor Changes

- [#580](https://github.com/finos/legend-studio/pull/580) [`7318c222`](https://github.com/finos/legend-studio/commit/7318c2223d5653be18f00a489aa00b3143a600fe) ([@gayathrir11](https://github.com/gayathrir11)) - Add extension mechanism for `class mapping`

* [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Fixed a typo in `GraphPluginManager`, `registerPureGraphPlugins()` is now renamed to `registerPureGraphPlugin()`.

### Patch Changes

- [#580](https://github.com/finos/legend-studio/pull/580) [`7318c222`](https://github.com/finos/legend-studio/commit/7318c2223d5653be18f00a489aa00b3143a600fe) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** Pass Plugins as a parameter for `V1_getExtraElementProtocolSerializers` and `V1_getExtraElementProtocolDeserializers`

* [#591](https://github.com/finos/legend-studio/pull/591) [`d20ae51a`](https://github.com/finos/legend-studio/commit/d20ae51afc12dda90217abe38a2fb91e1c499443) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Display the full error stack trace for the execution error to improve the debugging experience.

- [#580](https://github.com/finos/legend-studio/pull/580) [`7318c222`](https://github.com/finos/legend-studio/commit/7318c2223d5653be18f00a489aa00b3143a600fe) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** Removal of old `Service store` specification

## 0.1.4

### Patch Changes

- [#569](https://github.com/finos/legend-studio/pull/569) [`67a95bd0`](https://github.com/finos/legend-studio/commit/67a95bd0dadd00b486c2f7884e7d9a10cb91b03c) ([@akphi](https://github.com/akphi)) - Improve extension mechanism for connection.

## 0.1.3

### Patch Changes

- [#565](https://github.com/finos/legend-studio/pull/565) [`52396c8f`](https://github.com/finos/legend-studio/commit/52396c8fd9eec484350d4a3e25b88778a61fe083) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Include all elements and service in service full interactive registration.

* [#562](https://github.com/finos/legend-studio/pull/562) [`8c19f46f`](https://github.com/finos/legend-studio/commit/8c19f46f87ed4178c7c27af8e09b3e65cfe3b898) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Support snowflake connection `proxy`.

- [#561](https://github.com/finos/legend-studio/pull/561) [`c04d38d5`](https://github.com/finos/legend-studio/commit/c04d38d56b650e5edb8ec57f8f123fe1ba4fb24e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix serialization issue with `otherwise` embedded mapping.

## 0.1.2

### Patch Changes

- [#553](https://github.com/finos/legend-studio/pull/553) [`cf1f2c07`](https://github.com/finos/legend-studio/commit/cf1f2c07934cf7c243802df381e0ead7fb9fe38f) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix a problem with hash computation and serialization of `inline` relational property mapping

## 0.1.1

## 0.1.0

### Minor Changes

- [#505](https://github.com/finos/legend-studio/pull/505) [`3bc4421f`](https://github.com/finos/legend-studio/commit/3bc4421f0b320a84f78d514a9d0aa5b58cb9f805) ([@gayathrir11](https://github.com/gayathrir11)) - Add extension mechanism for processing connections.

## 0.0.6

### Patch Changes

- [#512](https://github.com/finos/legend-studio/pull/512) [`f22a375a`](https://github.com/finos/legend-studio/commit/f22a375ae14770fe3e62b2ec405fbfe728f0d0e3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Align metamodel of `ExecutionResult` to pure. Build function to extract the `ExecutionResult` based on result type.

* [#506](https://github.com/finos/legend-studio/pull/506) [`4fd0d256`](https://github.com/finos/legend-studio/commit/4fd0d2560ef245d97f1d86a4a6ed227a9c3d2cbe) ([@akphi](https://github.com/akphi)) - Add support for `tagged values` and `stereotypes` in `DataSpace`.

## 0.0.5

## 0.0.4

### Patch Changes

- [#444](https://github.com/finos/legend-studio/pull/444) [`9c6c7386`](https://github.com/finos/legend-studio/commit/9c6c7386bb5c884fdf0077a1dcba6b46dfa840ce) ([@akphi](https://github.com/akphi)) - Move `DSL Diagram` logic to a new separate extension package `@finos/legend-extension-dsl-diagram`.

* [#444](https://github.com/finos/legend-studio/pull/444) [`9c6c7386`](https://github.com/finos/legend-studio/commit/9c6c7386bb5c884fdf0077a1dcba6b46dfa840ce) ([@akphi](https://github.com/akphi)) - Created a new type of plugin `PureGraphPlugin` that only concerns procedures happening inside the graph (i.e. `PureModel`), such as initializing graph extension or cleaning up dead references, etc. Move `getExtraPureGraphExtensionClasses()` from `PureGraphManagerPlugin` to `PureGraphPlugin`.

- [#445](https://github.com/finos/legend-studio/pull/445) [`93ceb015`](https://github.com/finos/legend-studio/commit/93ceb015feda1ca975b2132bf576d36bc7ee5cc8) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `object` for execution activities inside execution result.

* [#444](https://github.com/finos/legend-studio/pull/444) [`9c6c7386`](https://github.com/finos/legend-studio/commit/9c6c7386bb5c884fdf0077a1dcba6b46dfa840ce) ([@akphi](https://github.com/akphi)) - Fix a problem with `PackageableElementImplicitReference` where even the value is modified by users, its value for serialization does not change, hence effectively negating user's modification (see [#449](https://github.com/finos/legend-studio/issues/449) for more details).

- [#443](https://github.com/finos/legend-studio/pull/443) [`c408f16`](https://github.com/finos/legend-studio/commit/c408f16dc60474ef6c28e5e4484053b4928c2afc) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Account for cycles and duplication when resolving all child set implementations and `leaf` set implementations of an `operation set implementation`. Also, since we don't try to _understand_ how each operation works, we will disregard the operation type in this resolution.

* [#450](https://github.com/finos/legend-studio/pull/450) [`b9ae7134`](https://github.com/finos/legend-studio/commit/b9ae71342ed6162c9892ad62790c1471c9d085be) ([@akphi](https://github.com/akphi)) - Since we do not keep the `section index`, we will cause paths inside of the `transform` of `relational property mappings` to be off since we keep the `transform` as raw `relational operation element`. As such, we now mitigate this by always resolving to full paths in this `transform` ([#424](https://github.com/finos/legend-studio/issues/424))

## 0.0.3

### Patch Changes

- [#436](https://github.com/finos/legend-studio/pull/436) [`356eda33`](https://github.com/finos/legend-studio/commit/356eda33c4efd9345ea48ae2e81dda4ad0029a09) ([@akphi](https://github.com/akphi)) - Move `getExtraPureGrammarElementLabelers()` from `StudioPlugin` to `PureGraphManagerPlugin`.

## 0.0.2

### Patch Changes

- [#434](https://github.com/finos/legend-studio/pull/434) [`03b6a3d3`](https://github.com/finos/legend-studio/commit/03b6a3d375965b4dbc850dbaf695dc5400c9ffb2) ([@akphi](https://github.com/akphi)) - Allow configuring a separate base URL for query APIs in engine client via the settings `engine: { queryUrl?: <string> }`

## 0.0.1

### Patch Changes

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Expose `GraphManagerState` context provider and hook `useGraphManagerState()`.

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Move `getExtraPureGrammarParserNames`, `getExtraPureGrammarKeywords`, and `getExtraExposedSystemElementPath` to `PureGraphManagerPlugin`.
