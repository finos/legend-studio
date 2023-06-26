# @finos/legend-application-studio

## 27.1.2

### Patch Changes

- [#2365](https://github.com/finos/legend-studio/pull/2365) [`f1dc0d520`](https://github.com/finos/legend-studio/commit/f1dc0d520ae2fc380659221961f319a1524527b3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Enhance function editor to run function other than execution results.

- [#2369](https://github.com/finos/legend-studio/pull/2369) [`5540660e8`](https://github.com/finos/legend-studio/commit/5540660e8fbc4e7a3b0fe9370629f83548bb33c1) ([@gs-gunjan](https://github.com/gs-gunjan)) - Implementing trigger to run manual jobs in a workflow

## 27.1.1

### Patch Changes

- [#2323](https://github.com/finos/legend-studio/pull/2323) [`7730ad3ed`](https://github.com/finos/legend-studio/commit/7730ad3ed1fe21f6ae2ef04052ed6f85baada568) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Revamp mapping suites to be driven by query with multiple tests each with its own test data.

## 27.1.0

### Minor Changes

- [#2354](https://github.com/finos/legend-studio/pull/2354) [`7b1d19977`](https://github.com/finos/legend-studio/commit/7b1d19977cc39371413a2fd1af1bbc0528673b9f) ([@akphi](https://github.com/akphi)) - Add temporary support for creating local connection, right now this is a PoC aim to demonstrate the support for `SnowflakeApp`, this can be enabled by setting the config flag `TEMPORARY__enableLocalConnectionBuilder=true`.

## 27.0.0

### Major Changes

- [#2329](https://github.com/finos/legend-studio/pull/2329) [`131a8f06d`](https://github.com/finos/legend-studio/commit/131a8f06d7c1f3a5519f7d98bce46cd241970278) ([@xannem](https://github.com/xannem)) - **BREAKING CHANGE:** Removed `getExtraTestRunnerTabClassifiers` and renamed to `getExtraTestRunnerTabEditorRenderer` to `getExtraTestRunnerTabConfigurations` and put tab name directly in `TestRunnerTabConfiguration`

### Patch Changes

- [#2333](https://github.com/finos/legend-studio/pull/2333) [`f00a00823`](https://github.com/finos/legend-studio/commit/f00a00823753bc54fa945ceb8939ab543d01b0bf) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add support for using the new external format biding service test parameter UI for type Byte

- [#2344](https://github.com/finos/legend-studio/pull/2344) [`09556cbfb`](https://github.com/finos/legend-studio/commit/09556cbfb084404fe81d93257ccb5cfabff07560) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use northWind proc as default relational connection to provide sample data for users.

## 26.1.11

## 26.1.10

### Patch Changes

- [#2327](https://github.com/finos/legend-studio/pull/2327) [`448d4ba4f`](https://github.com/finos/legend-studio/commit/448d4ba4fcb1de3c46dd1c1bf62ecf4d3b92e61c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show generated artifacts triggered by artifact extensions in engine. Include flag to enable this as part of generation flow.

## 26.1.9

### Patch Changes

- [#2319](https://github.com/finos/legend-studio/pull/2319) [`660f96c39`](https://github.com/finos/legend-studio/commit/660f96c392d86344b58676a7217aabd0ef6a7940) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Minor improvements in service test editor for services with one connection and date parameters. Add Import CSV option for relational csv data.

- [#2317](https://github.com/finos/legend-studio/pull/2317) [`ba835606f`](https://github.com/finos/legend-studio/commit/ba835606fd6883651b9f4055f79bff884757b3bf) ([@abhishoya-gs](https://github.com/abhishoya-gs)) - Add field enableQueryTags to SnowflakeDatasourceSpec

## 26.1.8

## 26.1.7

### Patch Changes

- [#2269](https://github.com/finos/legend-studio/pull/2269) [`95d55d317`](https://github.com/finos/legend-studio/commit/95d55d317d8f55f6337ffb7730aba63fc27c8dbb) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where fail to open tree node in the explorer tree for elements from dependencies when seaching using shortcuts(ctr + p)

## 26.1.6

### Patch Changes

- [#2288](https://github.com/finos/legend-studio/pull/2288) [`b70aac127`](https://github.com/finos/legend-studio/commit/b70aac127471cbf250f870e9bdee745f13dc9d67) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Uplift editor for specifying parameter data in service tests ([#2255](https://github.com/finos/legend-studio/issues/2255)).

## 26.1.5

### Patch Changes

- [#2289](https://github.com/finos/legend-studio/pull/2289) [`f8e54ebdb`](https://github.com/finos/legend-studio/commit/f8e54ebdb206b743fd576dea5267ce24a340e0cd) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `showcaseUrl` to documentation config.

- [#2293](https://github.com/finos/legend-studio/pull/2293) [`96220509d`](https://github.com/finos/legend-studio/commit/96220509d1c90a99ac6d4919ab547d5e2c377693) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add documentation link entries to support linking to application info links.

## 26.1.4

## 26.1.3

## 26.1.2

## 26.1.1

### Patch Changes

- [#2268](https://github.com/finos/legend-studio/pull/2268) [`666276d0e`](https://github.com/finos/legend-studio/commit/666276d0e857f61568b6478c5f2b5165fd096ec7) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Remove `TEMPORARY__enableTestDataGenerationNewFlow` to enable new flow (parameterValue) for service test data auto generation.

## 26.1.0

### Minor Changes

- [#2237](https://github.com/finos/legend-studio/pull/2237) [`85c8e5ad3`](https://github.com/finos/legend-studio/commit/85c8e5ad39112e9b87e1c984008b7567061dacae) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support test data generation for services with parameters.

## 26.0.4

## 26.0.3

## 26.0.2

## 26.0.1

## 26.0.0

### Major Changes

- [#2226](https://github.com/finos/legend-studio/pull/2226) [`58f3818ad`](https://github.com/finos/legend-studio/commit/58f3818ada62b957ec569652a7aa84583b70c7c6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `LegendStudioApplicationPlugin.getExtraPureGrammarParserNames()` and `LegendStudioApplicationPlugin.getExtraPureGrammarElementLabelers()`.

### Patch Changes

- [#2227](https://github.com/finos/legend-studio/pull/2227) [`6f047730d`](https://github.com/finos/legend-studio/commit/6f047730d20db8deea796a5a42f38b325344b3a6) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Utilize the `cancelUserExecution` API to cancel query execution both on the server's and client's side.

## 25.0.7

## 25.0.6

## 25.0.5

## 25.0.4

### Patch Changes

- [#2199](https://github.com/finos/legend-studio/pull/2199) [`9c6a8bfe5`](https://github.com/finos/legend-studio/commit/9c6a8bfe53936a56c9813b302c3591e371242e35) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support service registration on branch snapshots published to metadata

## 25.0.3

## 25.0.2

### Patch Changes

- [#2185](https://github.com/finos/legend-studio/pull/2185) [`918152f6b`](https://github.com/finos/legend-studio/commit/918152f6bb2912f4ddc676411920cd384a88df56) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where fail to view SDLC project of master-snapshot

## 25.0.1

## 25.0.0

### Major Changes

- [#2165](https://github.com/finos/legend-studio/pull/2165) [`d932f709e`](https://github.com/finos/legend-studio/commit/d932f709e88eef5f7b2423273908718171894a4a) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Merged `STO_ProjectOverview_LegendStudioApplicationPlugin_Extension` into `LegendStudioApplicationPlugin`

### Minor Changes

- [#2186](https://github.com/finos/legend-studio/pull/2186) [`204cd4fb1`](https://github.com/finos/legend-studio/commit/204cd4fb161982db8b680c64092613857fd18edc) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add promote query to function support for embedded query builder.

## 24.2.0

### Minor Changes

- [#2177](https://github.com/finos/legend-studio/pull/2177) [`64532adc5`](https://github.com/finos/legend-studio/commit/64532adc53428ca254fd1f322508a05764f5e982) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add post validation editor to service editor.

### Patch Changes

- [#2058](https://github.com/finos/legend-studio/pull/2058) [`b407f6d66`](https://github.com/finos/legend-studio/commit/b407f6d66aff1a38f3f31df122101ad9d753b3cf) ([@gayathrir11](https://github.com/gayathrir11)) - Make query loader interface consistent for various query workflows

## 24.1.4

## 24.1.3

## 24.1.2

### Patch Changes

- [#2097](https://github.com/finos/legend-studio/pull/2097) [`931cb2882`](https://github.com/finos/legend-studio/commit/931cb2882eaf9ae1a5298a581e70bd05190e3357) ([@janeenyamak1](https://github.com/janeenyamak1)) - Add cherry picking for bulk service registration

- [#2166](https://github.com/finos/legend-studio/pull/2166) [`becbe1d71`](https://github.com/finos/legend-studio/commit/becbe1d716f7473f9485bfc70a63703ea8e13538) ([@janeenyamak1](https://github.com/janeenyamak1)) - Reverting previous Optional Lineage Feature In Service Registration

## 24.1.1

## 24.1.0

### Minor Changes

- [#2149](https://github.com/finos/legend-studio/pull/2149) [`e050727dc`](https://github.com/finos/legend-studio/commit/e050727dc7a2ffb6f1676e780b8b7f72f86038b7) ([@horbe](https://github.com/horbe)) - Add support for `JSON` relational type.

## 24.0.5

## 24.0.4

## 24.0.3

## 24.0.2

## 24.0.1

## 24.0.0

### Major Changes

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved `CodeDiffView`, `JSONDiffView`, and `getClassPropertyIcon()` to `@finos/legend-lego/graph-editor`.

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE**: Adapted to use new `LegendApplication` platform injection mechanism; testing utilities have been adjusted accordingly.

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved all test utils to a separate export path `@finos/legend-application-studio/test`;

## 23.1.12

## 23.1.11

### Patch Changes

- [#2111](https://github.com/finos/legend-studio/pull/2111) [`3743dcdf3`](https://github.com/finos/legend-studio/commit/3743dcdf3ddabdffb38a2b6056cbbad9f74ffdb0) ([@sprisha](https://github.com/sprisha)) - Revert "adding Optional Service Lineage Feature to Registration (#2100)"

## 23.1.10

## 23.1.9

## 23.1.8

## 23.1.7

### Patch Changes

- [#2059](https://github.com/finos/legend-studio/pull/2059) [`c92fcefee`](https://github.com/finos/legend-studio/commit/c92fcefee837e33c0dabbf185e1f790a422e479f) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Default service panel to execution tab.

## 23.1.6

## 23.1.5

### Patch Changes

- [#1993](https://github.com/finos/legend-studio/pull/1993) [`65dffc460`](https://github.com/finos/legend-studio/commit/65dffc460e64fe89045ea766755bfde3bfff5b91) ([@xannem](https://github.com/xannem)) - Enable drag-and-drop only when the handler is grabbed

## 23.1.4

## 23.1.3

### Patch Changes

- [#2063](https://github.com/finos/legend-studio/pull/2063) [`7bd0dc79d`](https://github.com/finos/legend-studio/commit/7bd0dc79d5e803c0eb677b884f2f1ac48fb32b77) ([@akphi](https://github.com/akphi)) - Support relative URLs in application configuration.

## 23.1.2

## 23.1.1

## 23.1.0

### Minor Changes

- [#2032](https://github.com/finos/legend-studio/pull/2032) [`08afbd705`](https://github.com/finos/legend-studio/commit/08afbd705fee75b20ba52bdc62a7e1a32fdb85d2) ([@janeenyamak1](https://github.com/janeenyamak1)) - Enhance servie bulk registration modal

## 23.0.3

### Patch Changes

- [#1992](https://github.com/finos/legend-studio/pull/1992) [`247dd6c1f`](https://github.com/finos/legend-studio/commit/247dd6c1f8c778fe5d5e30e795b1801762979469) ([@jinanisha](https://github.com/jinanisha)) - Add support for Trino connector

## 23.0.2

## 23.0.1

## 23.0.0

### Major Changes

- [#2019](https://github.com/finos/legend-studio/pull/2019) [`e31cc1bcb`](https://github.com/finos/legend-studio/commit/e31cc1bcbb61306b4b127788854775a8325bfa57) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*Telemetry` and `*EventService` wrappers around `TelemetryService` and `EventService` respectively to `*TelemetryHelper` and `*EventHelper` respectively.

### Patch Changes

- [#2019](https://github.com/finos/legend-studio/pull/2019) [`e31cc1bcb`](https://github.com/finos/legend-studio/commit/e31cc1bcbb61306b4b127788854775a8325bfa57) ([@akphi](https://github.com/akphi)) - Fix a bug where selecting a relational database store when trying to create a new connection crashes the app ([#2015](https://github.com/finos/legend-studio/issues/2015)).

## 22.6.0

### Minor Changes

- [#2010](https://github.com/finos/legend-studio/pull/2010) [`cf33b0229`](https://github.com/finos/legend-studio/commit/cf33b0229922932be2502ad8ea5b9b27b7bc6fe7) ([@janeenyamak1](https://github.com/janeenyamak1)) - Enable Global Bulk Service Registration

## 22.5.0

### Minor Changes

- [#1987](https://github.com/finos/legend-studio/pull/1987) [`28ca8adae`](https://github.com/finos/legend-studio/commit/28ca8adaec6eb5e2cd850d247685489b21a5bfbb) ([@akphi](https://github.com/akphi)) - Add support for generating sample data (i.e. mock data) for classes (can be triggered via explorer context menu).

### Patch Changes

- [#1941](https://github.com/finos/legend-studio/pull/1941) [`cda3e0bcb`](https://github.com/finos/legend-studio/commit/cda3e0bcb94464d52ac88d59ce6c725c9a8b1e27) ([@xannem](https://github.com/xannem)) - Add warning for users changing project's group ID or artifact ID

- [#1874](https://github.com/finos/legend-studio/pull/1874) [`04a31ba2f`](https://github.com/finos/legend-studio/commit/04a31ba2f2790937cc2289b29fc89f4e59e351d2) ([@gayathrir11](https://github.com/gayathrir11)) - Persist user preferences for `wrapText` and `enableStrictMode`.

## 22.4.8

### Patch Changes

- [#1950](https://github.com/finos/legend-studio/pull/1950) [`0958b5eda`](https://github.com/finos/legend-studio/commit/0958b5edaafdbc043365e0391348760ecd4a32dd) ([@xannem](https://github.com/xannem)) - Add tab plugin extension for test runner tab.

## 22.4.7

## 22.4.6

### Patch Changes

- [#1946](https://github.com/finos/legend-studio/pull/1946) [`90230b9d9`](https://github.com/finos/legend-studio/commit/90230b9d9446c94badfc6825d38c0a00bd7c6028) ([@xannem](https://github.com/xannem)) - Add option to edit text of H2 database table in expanded modal.

## 22.4.5

### Patch Changes

- [#1939](https://github.com/finos/legend-studio/pull/1939) [`a6cb0d1c7`](https://github.com/finos/legend-studio/commit/a6cb0d1c7b35ac0b71fd29473d3e84d0bf2161e6) ([@xannem](https://github.com/xannem)) - Increase readability of query builder icon option buttons

## 22.4.4

### Patch Changes

- [#1935](https://github.com/finos/legend-studio/pull/1935) [`03b78099b`](https://github.com/finos/legend-studio/commit/03b78099bfa4abacc4140145735125f81132f7a6) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Use strategic test suite for service code snippets.

## 22.4.3

## 22.4.2

### Patch Changes

- [#1909](https://github.com/finos/legend-studio/pull/1909) [`130d068d0`](https://github.com/finos/legend-studio/commit/130d068d0932dde5786ecf8de6dacf2bffcc6143) ([@xannem](https://github.com/xannem)) - Replace brush icon with trash icon

## 22.4.1

### Patch Changes

- [#1849](https://github.com/finos/legend-studio/pull/1849) [`725d21e90`](https://github.com/finos/legend-studio/commit/725d21e9031dc41935a2a623e93f4b32dc6d913a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where fail to navigate to function element in text mode after clicking on the explorer tree ([#1848](https://github.com/finos/legend-studio/issues/1848)).

- [#1899](https://github.com/finos/legend-studio/pull/1899) [`23f0b763c`](https://github.com/finos/legend-studio/commit/23f0b763c2c1fb3603ac74a4fb40dc66f8c68243) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - fix: toogle text mode shortcut in view/archive mode

## 22.4.0

### Minor Changes

- [#1876](https://github.com/finos/legend-studio/pull/1876) [`27aec4ed0`](https://github.com/finos/legend-studio/commit/27aec4ed06e99701c5b4e080312417af4d2b8899) ([@xannem](https://github.com/xannem)) - Add project dependants tab for project config

### Patch Changes

- [#1882](https://github.com/finos/legend-studio/pull/1882) [`87c71c559`](https://github.com/finos/legend-studio/commit/87c71c5592e4d1cbcc04ef9d915d7ac2f072ad1f) ([@xannem](https://github.com/xannem)) - Minor modal and panel styling edits.

- [#1847](https://github.com/finos/legend-studio/pull/1847) [`6d34797a0`](https://github.com/finos/legend-studio/commit/6d34797a02e86da3c3022e48ca3adb61da1463bd) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where packageableElement in the explorer tree can't be renamed ([#1846](https://github.com/finos/legend-studio/issues/1846)).

## 22.3.8

## 22.3.7

### Patch Changes

- [#1833](https://github.com/finos/legend-studio/pull/1833) [`ef7e8fa6d`](https://github.com/finos/legend-studio/commit/ef7e8fa6d693848ac71a5a2f54db421f9d45fde3) ([@gayathrir11](https://github.com/gayathrir11)) - Add warnings when associations reference system elements. ([#282](https://github.com/finos/legend-studio/issues/282))

## 22.3.6

### Patch Changes

- [#1865](https://github.com/finos/legend-studio/pull/1865) [`1ceda36e8`](https://github.com/finos/legend-studio/commit/1ceda36e80d74c381a7124bf0af99a1c3c04e869) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix rendering of service editor on archive mode.

## 22.3.5

## 22.3.4

## 22.3.3

### Patch Changes

- [#1819](https://github.com/finos/legend-studio/pull/1819) [`675d88bb1`](https://github.com/finos/legend-studio/commit/675d88bb120e8c6015afcfd08f3847b6dfe8c2df) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Group actions in the service execution tab and support opening current service query in `Legend Query`.

## 22.3.2

### Patch Changes

- [#1823](https://github.com/finos/legend-studio/pull/1823) [`798ab319e`](https://github.com/finos/legend-studio/commit/798ab319ea6c1b8819f7f361891bb52475183451) ([@gayathrir11](https://github.com/gayathrir11)) - Modify the label and fix the copy link functionality for dependependency tree elements

## 22.3.1

### Patch Changes

- [#1825](https://github.com/finos/legend-studio/pull/1825) [`1b128c0c7`](https://github.com/finos/legend-studio/commit/1b128c0c768637665b1043cb3e6b797292650e71) ([@gayathrir11](https://github.com/gayathrir11)) - Fix creating default custom runtime for services with nested M2M mapping. ([#1824](https://github.com/finos/legend-studio/issues/1824)).

## 22.3.0

### Minor Changes

- [#1803](https://github.com/finos/legend-studio/pull/1803) [`713a04ce0`](https://github.com/finos/legend-studio/commit/713a04ce07e1d7adb6de4da08f3f8d5d0059445e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Enable testing and execution via service editor for inline queries.

### Patch Changes

- [#1801](https://github.com/finos/legend-studio/pull/1801) [`6921fd220`](https://github.com/finos/legend-studio/commit/6921fd220c69aee176d6eb8bef524b1864074eba) ([@gayathrir11](https://github.com/gayathrir11)) - Fix global test runner not showing status of test run for services with multi execution.

- [#1809](https://github.com/finos/legend-studio/pull/1809) [`06c85020b`](https://github.com/finos/legend-studio/commit/06c85020bb18d390607540bfd5fa556f34c67d8e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add external format schema generation to element generation dropdowns.

- [#1685](https://github.com/finos/legend-studio/pull/1685) [`50120dbef`](https://github.com/finos/legend-studio/commit/50120dbef670a71010726f44dfb03b8a65b9b5ff) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support a searchable dropdown for adding service owners ([#1683](https://github.com/finos/legend-studio/issues/1683)).

- [#1785](https://github.com/finos/legend-studio/pull/1785) [`4b50e4cb0`](https://github.com/finos/legend-studio/commit/4b50e4cb0f9e39efc8ed17ac966f279c67d65a19) ([@gayathrir11](https://github.com/gayathrir11)) - Show dependency project information in explorer panel.

- [#1808](https://github.com/finos/legend-studio/pull/1808) [`7552ac698`](https://github.com/finos/legend-studio/commit/7552ac698a91c2ab1fca753d19b26ce889f91aff) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support opening query builder by double-clicking the read-only query in the service execution tab.

## 22.2.1

## 22.2.0

### Minor Changes

- [#1693](https://github.com/finos/legend-studio/pull/1693) [`bf2487fbb`](https://github.com/finos/legend-studio/commit/bf2487fbb590bc2c025f746d2393785762b71434) ([@gayathrir11](https://github.com/gayathrir11)) - Remove graph building from text mode ([#966](https://github.com/finos/legend-studio/issues/966)).

### Patch Changes

- [#1789](https://github.com/finos/legend-studio/pull/1789) [`47ced9dd2`](https://github.com/finos/legend-studio/commit/47ced9dd2278dc8e3bbd527b9f77356b4e1a6cd6) ([@gayathrir11](https://github.com/gayathrir11)) - Fix a bug with unable to open file generation tree data after hitting F10

- [#1791](https://github.com/finos/legend-studio/pull/1791) [`70c785e5b`](https://github.com/finos/legend-studio/commit/70c785e5bb2011b6b71d4b70e6291464466933d0) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add tree view for dependency conflicts in dependency editor.

## 22.1.6

### Patch Changes

- [#1766](https://github.com/finos/legend-studio/pull/1766) [`dc9ed1590`](https://github.com/finos/legend-studio/commit/dc9ed1590cbcdefe23d1c4f166bad9db55d2fbf8) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Fix `NewPackageableConnectionEditor`.

## 22.1.5

### Patch Changes

- [#1775](https://github.com/finos/legend-studio/pull/1775) [`0c8443b7b`](https://github.com/finos/legend-studio/commit/0c8443b7b8eb05a6a3cb1327899e4ca7e7bb5812) ([@xannem](https://github.com/xannem)) - fix: model importer tab behavior

## 22.1.4

### Patch Changes

- [`a68882116`](https://github.com/finos/legend-studio/commit/a68882116104914fb1f0edfe45d818d0b35f350a) ([@gayathrir11](https://github.com/gayathrir11)) - Fix bug when opening dependency element does not open corresponding element tree node in the dependency explorer

## 22.1.3

## 22.1.2

## 22.1.1

## 22.1.0

### Minor Changes

- [#1755](https://github.com/finos/legend-studio/pull/1755) [`58e35aae8`](https://github.com/finos/legend-studio/commit/58e35aae8c126e700407db368efaa6c7975c6d6b) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Introduce dependency explorer to lazily explore dependency through tree or flatten view.

## 22.0.0

### Major Changes

- [#1747](https://github.com/finos/legend-studio/pull/1747) [`65cae8687`](https://github.com/finos/legend-studio/commit/65cae8687c5a35371438d372f18a41f4c7df549f) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved `getInlineSnippetSuggestions()`, `PureGrammarTextSuggestion` and `ElementEmbeddedContentSnippetSuggestion` types to `@finos/legend-application`.

### Minor Changes

- [#1570](https://github.com/finos/legend-studio/pull/1570) [`324ef980b`](https://github.com/finos/legend-studio/commit/324ef980be7258f28508f14d46cdccde4c303610) ([@gs-gunjan](https://github.com/gs-gunjan)) - Support service queries with optional runtime and mapping.

### Patch Changes

- [#1736](https://github.com/finos/legend-studio/pull/1736) [`a2ff10b0d`](https://github.com/finos/legend-studio/commit/a2ff10b0d09b9ac84e057208f64673cf4ecf4f5a) ([@gayathrir11](https://github.com/gayathrir11)) - Add default serialization format for service tests.

## 21.0.1

### Patch Changes

- [#1740](https://github.com/finos/legend-studio/pull/1740) [`510f517df`](https://github.com/finos/legend-studio/commit/510f517df4b0979887a8bb2c4b8a122b292e66bf) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - View dependency SDLC project with selected version.

## 21.0.0

### Major Changes

- [#1455](https://github.com/finos/legend-studio/pull/1455) [`b9a3a0ea9`](https://github.com/finos/legend-studio/commit/b9a3a0ea9aa7ba09cd58a3b52f5d3238a53544e5) ([@gs-gunjan](https://github.com/gs-gunjan)) - Extending testing framework for mapping

### Patch Changes

- [#1735](https://github.com/finos/legend-studio/pull/1735) [`44fe24048`](https://github.com/finos/legend-studio/commit/44fe240486b32de01cf17aeb80969f9aaae9a576) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where the `keys` dropdown is not updated correctly when switching tests.

## 20.2.0

### Minor Changes

- [#1711](https://github.com/finos/legend-studio/pull/1711) [`b0c0e5053`](https://github.com/finos/legend-studio/commit/b0c0e50534162f23ac1430c707226ad4d9bddbb5) ([@xannem](https://github.com/xannem)) - Allow re-arranging editor tabs by drag-and-drop and opening last closed editor tab #130 ([#1474](https://github.com/finos/legend-studio/pull/1474)).

## 20.1.2

## 20.1.1

### Patch Changes

- [#1717](https://github.com/finos/legend-studio/pull/1717) [`c641e0781`](https://github.com/finos/legend-studio/commit/c641e0781eb76100ee2ce6cac4b0bd16736ab20e) ([@gayathrir11](https://github.com/gayathrir11)) - Fix with `Studio` not closing editor tabs for deleted elements

- [#1719](https://github.com/finos/legend-studio/pull/1719) [`52c69421f`](https://github.com/finos/legend-studio/commit/52c69421f39e9677da261200ba226bd95a93b8fe) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support env keys selection for each test in multiexec services([#1718](https://github.com/finos/legend-studio/issues/1718)).

## 20.1.0

### Minor Changes

- [#1511](https://github.com/finos/legend-studio/pull/1511) [`9311cd4ba`](https://github.com/finos/legend-studio/commit/9311cd4bab703c65e590f1b1eed6cd89a5387d4d) ([@gayathrir11](https://github.com/gayathrir11)) - Improve user experience when they import gitlab projects in studio

## 20.0.10

## 20.0.9

### Patch Changes

- [#1697](https://github.com/finos/legend-studio/pull/1697) [`44b5ff5ab`](https://github.com/finos/legend-studio/commit/44b5ff5ab1a187176f2dd8991b05241c40429361) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Remove Service's parameter icon and added the prompt below the header.

- [#1679](https://github.com/finos/legend-studio/pull/1679) [`478092e7c`](https://github.com/finos/legend-studio/commit/478092e7c55da1a96380d2c7815958d5310898e8) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support contextual documentation for service test and data element editor, and add a doc icon for connection test data.

## 20.0.8

## 20.0.7

### Patch Changes

- [#1658](https://github.com/finos/legend-studio/pull/1658) [`b4bbdb774`](https://github.com/finos/legend-studio/commit/b4bbdb7742d3ae3b7952cecedeee4694840c4345) ([@xannem](https://github.com/xannem)) - fix: toggle text mode shortcut in viewer mode

- [#1676](https://github.com/finos/legend-studio/pull/1676) [`eb12c94ae`](https://github.com/finos/legend-studio/commit/eb12c94ae243c01c9ee86d563caa081349c3a771) ([@gayathrir11](https://github.com/gayathrir11)) - Add project configuration panel shortcut to project explorer action panel.

## 20.0.6

### Patch Changes

- [#1673](https://github.com/finos/legend-studio/pull/1673) [`8f2ad24a`](https://github.com/finos/legend-studio/commit/8f2ad24a458365a55f69b6189de304c9a3107f50) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Move building execution lambdas and parameter values to `legend-query-builder`.

- [#1668](https://github.com/finos/legend-studio/pull/1668) [`e63ee326`](https://github.com/finos/legend-studio/commit/e63ee3268aab39cb123b4c16d6e3d43320695b5d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fixed a regression introduced by #1572 where query execution with parameters of type `SimpleFunctionExpression` failed.
  Fixed a regression introduced by #1628 where failed to update mocked value after parameter's multiplicity is changed.

- [#1662](https://github.com/finos/legend-studio/pull/1662) [`8e084dd0`](https://github.com/finos/legend-studio/commit/8e084dd0b98c9fad7c9b6f8591df16ec4081b462) ([@xannem](https://github.com/xannem)) - Add field descriptions and element paths to create model connection modal

- [#1663](https://github.com/finos/legend-studio/pull/1663) [`e50a97ae`](https://github.com/finos/legend-studio/commit/e50a97aea214c4e5153c157c6e6269eec45286f3) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add an icon to open service test doc ([#1621](https://github.com/finos/legend-studio/issues/1621)).

## 20.0.5

## 20.0.4

### Patch Changes

- [#1572](https://github.com/finos/legend-studio/pull/1572) [`cb6451c3`](https://github.com/finos/legend-studio/commit/cb6451c33e0e747ced31b631c6f5e3ba0ac6c53a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Leverage engine to execute queries with parameters ([#1535](https://github.com/finos/legend-studio/issues/1535)).

## 20.0.3

## 20.0.2

## 20.0.1

## 20.0.0

### Major Changes

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - **BREAKING CHANGE:** Removed `ElementEditorState.hasCompilationError()`, we now have the graph compilation error at a single place in `EditorGraphState.error`.

### Minor Changes

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - Show compilation warnings in the auxiliary panel ([#941](https://github.com/finos/legend-studio/issues/941)).

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - Add a new core config option `enableGraphBuilderStrictMode` to enable strict-mode in graph builder ([#941](https://github.com/finos/legend-studio/issues/941)).

### Patch Changes

- [#1573](https://github.com/finos/legend-studio/pull/1573) [`6689b219`](https://github.com/finos/legend-studio/commit/6689b219d04cabd48a5ef59b8b52767737a9bde7) ([@akphi](https://github.com/akphi)) - Service editor: the default lambda created is now the basic lambda `|''` instead of the stubbed empty lambda ([#1588](https://github.com/finos/legend-studio/issues/1588)).

## 19.1.0

### Minor Changes

- [#1339](https://github.com/finos/legend-studio/pull/1339) [`a7b1479b`](https://github.com/finos/legend-studio/commit/a7b1479b615d65af273f3e08aefadf3be24dc1c5) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support function overloading ([#1211](https://github.com/finos/legend-studio/issues/1211)).

## 19.0.0

### Major Changes

- [#1552](https://github.com/finos/legend-studio/pull/1552) [`683800ab`](https://github.com/finos/legend-studio/commit/683800ab3ca1752c4382f22bcf8dede42518449d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `StudioLambdaEditor` and `StudioCodeEditor` since there is no longer need to have these components as we have generalized our keyboard handling in the parent components. Migrate to `LambaEditor` and `CodeEditor` instead.

### Patch Changes

- [#1552](https://github.com/finos/legend-studio/pull/1552) [`683800ab`](https://github.com/finos/legend-studio/commit/683800ab3ca1752c4382f22bcf8dede42518449d) ([@akphi](https://github.com/akphi)) - Fix a problem with element renamer where we mistakenly disallow users to rename the package to have the same name as a package from another spaces (system, dependencies, generation, etc.)

- [#1567](https://github.com/finos/legend-studio/pull/1567) [`6ff83758`](https://github.com/finos/legend-studio/commit/6ff8375811246defd3ce811bf4e22e313d16d642) ([@akphi](https://github.com/akphi)) - Fix a regression introduced by #1552 where the `Edit Workspace` button in setup screen does not result in proper navigation.

## 18.1.0

### Minor Changes

- [#1514](https://github.com/finos/legend-studio/pull/1514) [`34c29c4e`](https://github.com/finos/legend-studio/commit/34c29c4e6d0f04d3f57c42528a8cb16d05261434) ([@xannem](https://github.com/xannem)) - Support configuring project platforms [#1505](https://github.com/finos/legend-studio/issues/1505)

## 18.0.2

## 18.0.1

### Patch Changes

- [#1504](https://github.com/finos/legend-studio/pull/1504) [`02703feb`](https://github.com/finos/legend-studio/commit/02703febd5f0f1f44174baf984162a305444c546) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support showing duplicated property mappings for properties of type other than `class` (i.e. `primitive`, `enumeration`, etc.) ([#1461](https://github.com/finos/legend-studio/issues/1461)).

- [#1538](https://github.com/finos/legend-studio/pull/1538) [`34d6f9dd`](https://github.com/finos/legend-studio/commit/34d6f9dd933db20056f2e1b6ec483aafc13eb8aa) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add service parameter multiplicity validation during service registration ([#1539](https://github.com/finos/legend-studio/issues/1539)).

## 18.0.0

### Major Changes

- [#1502](https://github.com/finos/legend-studio/pull/1502) [`81757c5c`](https://github.com/finos/legend-studio/commit/81757c5c3ff514adcc532d118ec58e830938109b) ([@xannem](https://github.com/xannem)) - **BREAKING CHANGE:** Renamed `ConnectionEditor_BooleanEditor` to `PanelFormBooleanEditor`, `PanelTextEditor` to `PanelFormTextEditor`

### Minor Changes

- [#1508](https://github.com/finos/legend-studio/pull/1508) [`10b9bc4e`](https://github.com/finos/legend-studio/commit/10b9bc4e617e1f48dfad7571523394b9103dc7f6) ([@chloeminkyung](https://github.com/chloeminkyung)) - Add `TestBatch` to Testable model and incorporate into GlobalTestRunner.

- [#1506](https://github.com/finos/legend-studio/pull/1506) [`6b299d55`](https://github.com/finos/legend-studio/commit/6b299d55c603521ffdd61d9bd17d6fa58589beb7) ([@akphi](https://github.com/akphi)) - Add a new screen to support productionizing `query` into `service`.

## 17.0.0

### Major Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** No longer export `WorkspaceSetup` component and store-provider.

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Renamed `DSLGenerationSpecification_*` plugin extension to `DSLGeneration_*`

### Minor Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Rework `workspace setup` screen to use `typeahead` instead of loading all available projects, which can be expensive to load. Also remove project selector from workspace creator modal dialog.

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Allow configuring the suggested `group ID` during projection creation via the config field `extensions.core.projectCreationGroupIdSuggestion`.

### Patch Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Fix a bug where `Measure` element cannot be created from explorer panel dropdown action and context-menu.

## 16.0.2

## 16.0.1

### Patch Changes

- [#1485](https://github.com/finos/legend-studio/pull/1485) [`b2d2281c`](https://github.com/finos/legend-studio/commit/b2d2281c40ef04724951ebac78eae940eddc290c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add viewer for dependency tree and dependency conflict in configuration editor.

## 16.0.0

### Major Changes

- [#1476](https://github.com/finos/legend-studio/pull/1476) [`293f2345`](https://github.com/finos/legend-studio/commit/293f2345cd7dcc7e97fc4b6b21c7d274a1407176) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** For `LegendStudioApplicationPlugin`, renamed `getExtraElementProjectExplorerDnDTypeGetters()` to `getExtraDragElementClassifiers()` and `getExtraPureGrammarTextEditorDnDTypes()` to `getExtraPureGrammarTextEditorDragElementTypes()`. For `StoreRelational_LegendStudioApplicationPlugin_Extension`, renamed `getExtraDatasourceSpecificationTypeGetters()` to `getExtraDatasourceSpecificationClassifiers()` and `getExtraAuthenticationStrategyTypeGetters()` to `getExtraAuthenticationStrategyClassifiers()`.

- [#1476](https://github.com/finos/legend-studio/pull/1476) [`293f2345`](https://github.com/finos/legend-studio/commit/293f2345cd7dcc7e97fc4b6b21c7d274a1407176) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `getExtraMappingExecutionQueryEditorActionConfigurations()`, `getExtraMappingTestQueryEditorActionConfigurations()`, and `getExtraServiceQueryEditorActionConfigurations()`;

### Minor Changes

- [#1481](https://github.com/finos/legend-studio/pull/1481) [`4fd88c58`](https://github.com/finos/legend-studio/commit/4fd88c58b66dd3033db1f2f45e4cbedd0420b57e) ([@xannem](https://github.com/xannem)) - Add suggestion code snippet for relational database connection post-processor.

## 15.2.0

### Minor Changes

- [#1434](https://github.com/finos/legend-studio/pull/1434) [`138d9989`](https://github.com/finos/legend-studio/commit/138d9989b59ae3e816e19a149f842f24754ec9d9) ([@xannem](https://github.com/xannem)) - Add form editor for post-processor ([#945](https://github.com/finos/legend-studio/issues/945)).

## 15.1.0

### Minor Changes

- [#1464](https://github.com/finos/legend-studio/pull/1464) [`c8208ca6`](https://github.com/finos/legend-studio/commit/c8208ca63e3c4fefb5fc744e58d42c1715a51245) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add use `TEMPORARY__storeModel` option to `FULL_INTERACTIVE` service execution mode.

- [#1454](https://github.com/finos/legend-studio/pull/1454) [`579ab722`](https://github.com/finos/legend-studio/commit/579ab722b80baf8f59725bd42eb97302fd2663cf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `FULL_INTERACTIVE_LIGHT` as a service registration mode.

## 15.0.1

## 15.0.0

### Major Changes

- [#1445](https://github.com/finos/legend-studio/pull/1445) [`a66230e9`](https://github.com/finos/legend-studio/commit/a66230e9ce6e391572e0224cfe48ad4f411baf17) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - **BREAKING CHANGE:** Add `ExtensionModelImportRendererState` to `ModelImporterExtensionConfiguration`

## 14.0.0

### Major Changes

- [#1432](https://github.com/finos/legend-studio/pull/1432) [`10475f94`](https://github.com/finos/legend-studio/commit/10475f94fceddb4c70d370f1ea7a3e02fc67efd2) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - **BREAKING CHANGE:** Rename `ModelLoaderExtensionConfiguration` to `ModelImporterExtensionConfiguration`

### Minor Changes

- [#1432](https://github.com/finos/legend-studio/pull/1432) [`10475f94`](https://github.com/finos/legend-studio/commit/10475f94fceddb4c70d370f1ea7a3e02fc67efd2) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Leverage external format apis for model importing.

## 13.1.2

### Patch Changes

- [#1238](https://github.com/finos/legend-studio/pull/1238) [`650f85bd`](https://github.com/finos/legend-studio/commit/650f85bd22010b07d95d46648a5d9e2802e2f5c5) ([@jinanisha](https://github.com/jinanisha)) - Add support for middle Tier Authentication Strategy

* [#1425](https://github.com/finos/legend-studio/pull/1425) [`3fc5ab8f`](https://github.com/finos/legend-studio/commit/3fc5ab8f4b28529e096000337691c1cafb98c38f) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support creation of self-referenced associations in form mode ([#1398](https://github.com/finos/legend-studio/issues/1398)).

## 13.1.1

## 13.1.0

### Minor Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Improve project search command to show full element package path; we also allow searching for elements from dependencies and generated elements.

* [#1395](https://github.com/finos/legend-studio/pull/1395) [`4c81ab5a`](https://github.com/finos/legend-studio/commit/4c81ab5aba69220fb5c2a4ac1ea97e05492ea110) ([@xannem](https://github.com/xannem)) - Allow re-arranging sub-elements (class properties, tagged values, etc.) in UML editors ([#303](https://github.com/finos/legend-studio/pull/303)).

## 13.0.3

## 13.0.2

### Patch Changes

- [#1377](https://github.com/finos/legend-studio/pull/1377) [`4c7169e3`](https://github.com/finos/legend-studio/commit/4c7169e348887bf462830cb64812ef4b1792875c) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support execution cancellation for `mapping editor` and `service editor` ([#1376](https://github.com/finos/legend-studio/issues/1376)).

## 13.0.1

### Patch Changes

- [#1343](https://github.com/finos/legend-studio/pull/1343) [`c7d8f47e`](https://github.com/finos/legend-studio/commit/c7d8f47ed439ee782c32fd1a85f72ab9c08ab81d) ([@akphi](https://github.com/akphi)) - Use `Run Query` instead of `Execute` as button labels to be more user-friendly.

## 13.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed package from `@finos/legend-studio` to `@finos/legend-application-studio`
