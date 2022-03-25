# @finos/legend-graph

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
