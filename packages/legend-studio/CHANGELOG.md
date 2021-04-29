# @finos/legend-studio

## 0.1.1

### Patch Changes

- Updated dependencies [[`2f0991a`](https://github.com/finos/legend-studio/commit/2f0991a15e50cb3c5ecbe3a4ca46c7ec26d09415), [`6592e02`](https://github.com/finos/legend-studio/commit/6592e02f8a8b00d5150aabf6160d98dd20b5a80d)]:
  - @finos/legend-studio-components@0.0.10
  - @finos/legend-studio-network@0.0.10
  - @finos/legend-studio-shared@0.0.8

## 0.1.0

### Minor Changes

- [#173](https://github.com/finos/legend-studio/pull/173) [`7709ab3`](https://github.com/finos/legend-studio/commit/7709ab3b2a3e66a5d44864e1ce694e696dddba69) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - A RawLambda resolver is added to resolve element paths inside lambdas that leverage imports. This allow successful compilation of graph that contain lambdas using imports.

* [#171](https://github.com/finos/legend-studio/pull/171) [`2d1f8a7`](https://github.com/finos/legend-studio/commit/2d1f8a78c38121e96b745939b23ba5cc46c7a53c) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE** Studio router is reorganized to be more consistent and to accomondate more use cases.

  - All routes now are to be prefixed with the SDLC server key, if there is only one SDLC server specified in the config file (with legacy SDLC field config form: `sdlc: { url: string }`), then the server key is `-`, i.e. `/studio/-/...`, else the server key is the key to the SDLC instance, i.e. `/studio/sdlc1/...`.
  - If the server key specified in the URL is not recognised, the user will be redirected to the setup page if there is only one SDLC server in the config or the SDLC server configuration page if there are multiple SDLC servers in the config.
  - Some basic routes are now renamed to be more consistent with others: e.g. setup page route is `/studio/-/setup/...`, editor page route is `/studio/-/edit/...`, and viewer page route is `/studio/-/view/...`

### Patch Changes

- [#172](https://github.com/finos/legend-studio/pull/172) [`e9c97c4`](https://github.com/finos/legend-studio/commit/e9c97c41b18d79d2676e48e12ae4e92d528b1819) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Fetch project versions in view mode, enabling features such as service registration in view mode.

- Updated dependencies [[`b04b0f9`](https://github.com/finos/legend-studio/commit/b04b0f9abbecf886d0c864a8484717bf26ff22dc), [`4167a8b`](https://github.com/finos/legend-studio/commit/4167a8b68766beab60b98d5b3a6b23fbbce4847b)]:
  - @finos/legend-studio-components@0.0.9
  - @finos/legend-studio-network@0.0.9
  - @finos/legend-studio-shared@0.0.7

## 0.0.17

### Patch Changes

- [#163](https://github.com/finos/legend-studio/pull/163) [`7db0623`](https://github.com/finos/legend-studio/commit/7db0623da87c55256d440744e41bd1e2f8327e08) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - fix change detection for self-join definition

## 0.0.16

### Patch Changes

- [#158](https://github.com/finos/legend-studio/pull/158) [`5f28d8e`](https://github.com/finos/legend-studio/commit/5f28d8e653993369efb41ff91e4f7d6b7fcd76e0) Thanks [@emilia-sokol-gs](https://github.com/emilia-sokol-gs)! - Fix setting source for PurePropertyMapping

* [#156](https://github.com/finos/legend-studio/pull/156) [`2aa9425`](https://github.com/finos/legend-studio/commit/2aa942562310702003da859d1222612fcac38a19) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - fix authentication typo

## 0.0.15

### Patch Changes

- [#153](https://github.com/finos/legend-studio/pull/153) [`09634da`](https://github.com/finos/legend-studio/commit/09634da8795744557c097725a42089384d0bafaa) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - fix studio change detection for self-join

## 0.0.14

### Patch Changes

- [#150](https://github.com/finos/legend-studio/pull/150) [`58433f5`](https://github.com/finos/legend-studio/commit/58433f5e9f65571a6ca57da60dfb264fb7ef051a) Thanks [@emilia-sokol-gs](https://github.com/emilia-sokol-gs)! - Add support for aggregartion aware mapping in studio. Done by adding missing implementation e.g. in V1_ProtocolToMetaModel visitor for class mapping and property mapping. Added roundtrip test to test flow.

## 0.0.13

### Patch Changes

- [#147](https://github.com/finos/legend-studio/pull/147) [`c1e3047`](https://github.com/finos/legend-studio/commit/c1e3047300b1be93c27059b8bf570a76698c5970) Thanks [@akphi](https://github.com/akphi)! - Allow configuring SDLC server when multiple SDLC servers are available in Studio config file.

## 0.0.12

### Patch Changes

- [#144](https://github.com/finos/legend-studio/pull/144) [`288523d`](https://github.com/finos/legend-studio/commit/288523ddf3d37b146f6229189b7174f9e4bd6da8) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Initialize engine in review and viewer store

## 0.0.11

### Patch Changes

- [#140](https://github.com/finos/legend-studio/pull/140) [`3b5fb01`](https://github.com/finos/legend-studio/commit/3b5fb01dce4ffa2081c016369f6b8ee715fb5245) Thanks [@akphi](https://github.com/akphi)! - Make sure expected test result JSON for mapping test does not store with formatting to not break text mode.

* [#140](https://github.com/finos/legend-studio/pull/140) [`3b5fb01`](https://github.com/finos/legend-studio/commit/3b5fb01dce4ffa2081c016369f6b8ee715fb5245) Thanks [@akphi](https://github.com/akphi)! - Make JSON property field sort consistent with Java Jackson

## 0.0.10

### Patch Changes

- [#134](https://github.com/finos/legend-studio/pull/134) [`c3b31f7`](https://github.com/finos/legend-studio/commit/c3b31f7d385ada299be92b3716d6a2a64c179eed) Thanks [@aziemchawdhary-gs](https://github.com/aziemchawdhary-gs)! - Ensure that test data is stored with no formatting

## 0.0.9

### Patch Changes

- Updated dependencies []:
  - @finos/legend-studio-components@0.0.8
  - @finos/legend-studio-network@0.0.8
  - @finos/legend-studio-shared@0.0.6

## 0.0.8

### Patch Changes

- [#124](https://github.com/finos/legend-studio/pull/124) [`2ea6867`](https://github.com/finos/legend-studio/commit/2ea6867695a0a00e02b08eadd5ec7db3d384ec6f) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Change label for enum options in file generation editor: for element-path-like values we will show only the element name.

* [#123](https://github.com/finos/legend-studio/pull/123) [`2a2acce`](https://github.com/finos/legend-studio/commit/2a2acced59e9dea97706dd6dcb25332862231f40) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add support for cross store (xStore) association mapping in studio. Done by adding a new type of AssociationImplementation called 'XStoreAssociationImplementation' and a new type of PropertyMapping called 'XStorePropertyMapping'. Add roundtrip tests to test flow.

- [#114](https://github.com/finos/legend-studio/pull/114) [`e01d74f`](https://github.com/finos/legend-studio/commit/e01d74fac0a0befd01621c285244cf5732bb3a39) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Change schemaMapper to schema in tableNameMapper to be align with protocol

- Updated dependencies [[`5e4e97c`](https://github.com/finos/legend-studio/commit/5e4e97c8f704b529cbfed3109a24bef30ebb98a8)]:
  - @finos/legend-studio-components@0.0.7
  - @finos/legend-studio-network@0.0.7
  - @finos/legend-studio-shared@0.0.6

## 0.0.7

### Patch Changes

- [#108](https://github.com/finos/legend-studio/pull/108) [`35119b3`](https://github.com/finos/legend-studio/commit/35119b3421f949da32be5884ace73ab94b010a54) Thanks [@akphi](https://github.com/akphi)! - Move @types/\* dependencies from devDependencies in order to ensure NPM consumers properly install these typings

- Updated dependencies [[`35119b3`](https://github.com/finos/legend-studio/commit/35119b3421f949da32be5884ace73ab94b010a54)]:
  - @finos/legend-studio-components@0.0.6
  - @finos/legend-studio-shared@0.0.5
  - @finos/legend-studio-network@0.0.6

## 0.0.6

### Patch Changes

- [#106](https://github.com/finos/legend-studio/pull/106) [`ce630c7`](https://github.com/finos/legend-studio/commit/ce630c7c13b7b52a67d14189d42400cabfd13868) Thanks [@akphi](https://github.com/akphi)! - Fix dev-utils for Webpack and Jest to make consumer projects work with published packages from NPM

- Updated dependencies []:
  - @finos/legend-studio-components@0.0.5
  - @finos/legend-studio-network@0.0.5
  - @finos/legend-studio-shared@0.0.4

## 0.0.5

### Patch Changes

- [#104](https://github.com/finos/legend-studio/pull/104) [`10e8f9f`](https://github.com/finos/legend-studio/commit/10e8f9f714d9376600ae8c4260405573372a24b4) Thanks [@akphi](https://github.com/akphi)! - Add `@testing-library/react` as dependencies for @finos/legend-studio

## 0.0.4

### Patch Changes

- [#102](https://github.com/finos/legend-studio/pull/102) [`492e022`](https://github.com/finos/legend-studio/commit/492e02229d27fc5ef0e1bafbbd8672de0449081f) Thanks [@akphi](https://github.com/akphi)! - Update publish content avoid list

- Updated dependencies [[`492e022`](https://github.com/finos/legend-studio/commit/492e02229d27fc5ef0e1bafbbd8672de0449081f)]:
  - @finos/legend-studio-components@0.0.4
  - @finos/legend-studio-network@0.0.4
  - @finos/legend-studio-shared@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies [[`94afef1`](https://github.com/finos/legend-studio/commit/94afef1c22d1c3426d9eb5aff055e581fb76c241)]:
  - @finos/legend-studio-components@0.0.3
  - @finos/legend-studio-network@0.0.3
  - @finos/legend-studio-shared@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [[`f467ab8`](https://github.com/finos/legend-studio/commit/f467ab8a2efb9a283429c0997428269d3595a17a)]:
  - @finos/legend-studio-components@0.0.2
  - @finos/legend-studio-network@0.0.2
  - @finos/legend-studio-shared@0.0.2

## 0.0.1

### Patch Changes

- [`050b4ba`](https://github.com/finos/legend-studio/commit/050b4ba205d63abbc0c92d01e7538817c2ad4e42) [#50](https://github.com/finos/legend-studio/pull/50) Thanks [@aziemchawdhary-gs](https://github.com/aziemchawdhary-gs)! - Minify test data when creating JSON model connection data URL for test to reduce traffic load.

* [`b030ce6`](https://github.com/finos/legend-studio/commit/b030ce6d789bd564709c9d0d8d88e41fc7d3060a) [#73](https://github.com/finos/legend-studio/pull/73) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Scanned extra authenication strategy builders when building authenication strategy in relational connection.

- [`9fc7d5c`](https://github.com/finos/legend-studio/commit/9fc7d5c26ddb441b2c6d1f9759132cb7d33f0c8d) [#59](https://github.com/finos/legend-studio/pull/59) Thanks [@akphi](https://github.com/akphi)! - Change V1 engine client to not prefix the urls with `/api`, that should be moved to the config.

* [`68d35b5`](https://github.com/finos/legend-studio/commit/68d35b5a03797dabc7ef3315952cc38d0b55ad25) [#72](https://github.com/finos/legend-studio/pull/72) Thanks [@akphi](https://github.com/akphi)! - Change how setupEngine() is being called: now, it initializes the engine instance of graph manager instead of just configuring it.

- [`68d35b5`](https://github.com/finos/legend-studio/commit/68d35b5a03797dabc7ef3315952cc38d0b55ad25) [#72](https://github.com/finos/legend-studio/pull/72) Thanks [@akphi](https://github.com/akphi)! - Use a workaround when handling JSON test data and expected result to not break grammar in text mode (see https://github.com/finos/legend-studio/issues/68) .

* [`2bbf5ba`](https://github.com/finos/legend-studio/commit/2bbf5baf337350d4deae7c28032cc4d473ffc600) [#82](https://github.com/finos/legend-studio/pull/82) Thanks [@akphi](https://github.com/akphi)! - Cleanup codesmells

* Updated dependencies [[`9fc7d5c`](https://github.com/finos/legend-studio/commit/9fc7d5c26ddb441b2c6d1f9759132cb7d33f0c8d), [`2bbf5ba`](https://github.com/finos/legend-studio/commit/2bbf5baf337350d4deae7c28032cc4d473ffc600)]:
  - @finos/legend-studio-components@0.0.1
  - @finos/legend-studio-network@0.0.1
  - @finos/legend-studio-shared@0.0.1
