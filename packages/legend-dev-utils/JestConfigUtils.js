/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const getBaseConfig = ({ babelConfigPath }) => ({
  transform: {
    // Since `babel-jest` will not do type checking for the test code.
    // We need to manually run `tsc`. Another option is to use `jest-runner-tsc`
    // which currently has certain performance limitation
    // See https://jestjs.io/docs/en/getting-started#using-typescript
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { configFile: babelConfigPath, root: undefined },
    ],
  },
  transformIgnorePatterns: [
    // Since we already transpiled our project code, we don't need `Jest` to transform/transpile them again
    // See https://jestjs.io/docs/configuration#transformignorepatterns-arraystring
    '/node_modules/(?!(@finos/legend))',
  ],
  // NOTE: due to a problem with `uuid` interaction with `jest@28` resolver, we need this custom resolver
  // See https://github.com/uuidjs/uuid/pull/616
  resolver: '@finos/legend-dev-utils/jest/customResolver',
  // Setup to run immediately after the test framework has been installed in the environment
  // before each test file in the suite is executed
  // See https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    // Mock for non-javascript file as we don't need Jest to transform these
    // NOTE: we should not need this right now, but we leave this here just in case
    '\\.(svg|css|scss)$': '@finos/legend-dev-utils/mocks/fileMock',
  },
  // Since each test should be independent, we automatically restore mock state before every test
  // NOTE: only works for `jest.spyOn` and not `jest.fn()`
  // See https://jestjs.io/docs/en/configuration#restoremocks-boolean
  restoreMocks: true,
  // Use this pattern (instead of the one from the official doc) to make this work across different OS's
  // See https://github.com/facebook/jest/issues/7914#issuecomment-464352069
  testMatch: ['**/__tests__/**/*(*.)test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  collectCoverage: false,
  watchPathIgnorePatterns: ['/node_modules/'],
  // Allow searching for file/test name while running Jest in watch mode
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  reporters: [
    'default',
    // the built-in GitHub Actions Reporter will annotate changed files with test failure messages
    'github-actions',
  ],
});

export const unitTest = (testName) => `[UNIT] ${testName}`;
export const integrationTest = (testName) => `[INTEGRATION] ${testName}`;
