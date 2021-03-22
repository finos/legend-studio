# @finos/legend-studio

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
