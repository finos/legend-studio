# @finos/legend-graph

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
