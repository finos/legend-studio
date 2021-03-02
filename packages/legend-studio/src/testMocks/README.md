# Test mocks

At first, we tried [Jest manual mocks for Node modules](https://jestjs.io/docs/en/manual-mocks) by using `__mocks__` directory. However, for this approach to work we have to duplicated the mock files over different projects in the monorepo. This, in turn will cause Jest to warn [rather](https://github.com/facebook/jest/issues/6801) [noisily](https://github.com/facebook/jest/issues/2070) about `duplicate manual mocks` detected when running at root directory.

As such, we decide to just doing mocks via `moduleNameMapper`. However, with this, we are still debating on the location of the mocks: either it should be here in `@finos/legend-studio` or `@finos/legend-studio-components` (very likely) or `@finos/legend-studio-test-mocks`.
