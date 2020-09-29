/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  // Allow mocking canvas behavior for testing
  // NOTE: we just throw this in here to make Jest tests happen but haven't fully
  // evaluate the usefullness of this package, we can remove this if Jest natively supports canvas API
  // See https://github.com/hustcc/jest-canvas-mock
  setupFiles: ['jest-canvas-mock'],
  // Setup to run immediately after the test framework has been installed in the environment
  // before each test file in the suite is executed
  // See https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
  setupFilesAfterEnv: ['jest-extended', '<rootDir>/../dev/test/testSetup.ts'],
  // Since each test should be independent, we automatically restore mock state before every test
  // NOTE: only works for `jest.spyOn` and not `jest.fn()`
  // See https://jestjs.io/docs/en/configuration#restoremocks-boolean
  restoreMocks: true,
  testMatch: [
    '**/__tests__/**/?(*.)+(test).[jt]s?(x)'
  ],
  moduleNameMapper: {
    '^Const$': '<rootDir>/const',
    '^MetaModelConst$': '<rootDir>/models/MetaModelConst',
    '^MetaModelUtility$': '<rootDir>/models/MetaModelUtility',
    '^ApplicationConfig$': '<rootDir>/ApplicationConfig',
    '^PureModelLoader$': '<rootDir>/models/protocols/pure/PureModelLoader',
    '^Utilities(.*)$': '<rootDir>/utils$1',
    '^Components(.*)$': '<rootDir>/components$1',
    '^Stores(.*)$': '<rootDir>/stores$1',
    '^SDLC(.*)$': '<rootDir>/models/sdlc$1',
    '^EXEC(.*)$': '<rootDir>/models/exec$1',
    '^MM(.*)$': '<rootDir>/models/metamodels/pure$1',
    '^V1(.*)$': '<rootDir>/models/protocols/pure/v1$1',
    '^Worker(.*)$': '<rootDir>/workers$1',
    '^API(.*)$': '<rootDir>/api$1',
    '^Style(.*)$': '<rootDir>/../style$1',
    '^Dev(.*)$': '<rootDir>/../dev$1',
    '^Mocks(.*)$': '<rootDir>/__mocks__$1',
    // Mock for testing `react-dnd`
    // See http://react-dnd.github.io/react-dnd/docs/testing
    '^dnd-core$': 'dnd-core/dist/cjs',
    '^react-dnd$': 'react-dnd/dist/cjs',
    '^node-fetch$': 'noop2',
    '^react-dnd-html5-backend$': 'react-dnd-html5-backend/dist/cjs',
    // Mock for non-javascript file as we don't need Jest to transform these
    // NOTE: we should not need this right now, but we leave this here just in case
    '\\.(svg|css)$': '<rootDir>/../dev/test/fileMock.js'
  },
  testEnvironment: 'jsdom',
  rootDir: 'app',
  collectCoverage: false,
  collectCoverageFrom: [
    '<rootDir>/**/*.[jt]s?(x)',
    '!<rootDir>/**/__tests__/**/*.[jt]s?(x)',
  ],
  coverageDirectory: '<rootDir>/../target/coverage',
  coverageReporters: [
    'text-summary',
    'html',
    'lcov'
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/../target/test-results',
      outputName: 'test-results.xml'
    }]
  ],
  // Allow searching for file/test name while running Jest in watch mode
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
