# @finos/legend-studio

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
