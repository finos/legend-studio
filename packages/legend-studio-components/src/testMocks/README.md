# A note on test mocks

At first, we tried [Jest manual mocks for Node modules](https://jestjs.io/docs/en/manual-mocks) by using `__mocks__` directory. However, for this approach to work we have to duplicated the mock files over different projects in the monorepo. This, in turn will cause Jest to warn [rather](https://github.com/facebook/jest/issues/6801) [noisily](https://github.com/facebook/jest/issues/2070) about `duplicate manual mocks` detected when running at root directory.

As such, we decide to just do mocks via `moduleNameMapper`, and the most suitable place to put these mocks right now is `@finos/legend-studio-components` because most of the things we need to mocks have to do with the rendering of the app, not logic. However other use cases might come up in the future and if we can potentially dedicate a separate module for mocks, i.e. `@finos/legend-studio-test-mocks`.
