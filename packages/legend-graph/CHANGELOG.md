# @finos/legend-graph

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
