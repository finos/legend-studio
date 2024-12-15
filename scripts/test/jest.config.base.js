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

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getBaseConfig } from '@finos/legend-dev-utils/JestConfigUtils';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getBaseJestConfig = (isGlobal) => {
  const baseConfig = getBaseConfig({
    isGlobal,
    babelConfigPath: resolve(__dirname, '../../babel.config.cjs'),
    TEMPORARY__esmPackagesToTransform: [
      // These packages went full ESM so we would need to transpile them until we can switch to run Jest in ESM mode

      // react-dnd
      // See https://github.com/react-dnd/react-dnd/issues/3443
      'react-dnd',
      'dnd-core',
      '@react-dnd',

      // query-string
      // See https://github.com/sindresorhus/query-string/releases/tag/v8.0.0
      'query-string',
      'filter-obj',
      'decode-uri-component',
      'split-on-first',

      // yaml
      'yaml',

      // ag-grid
      'ag-grid-community',
      'ag-grid-enterprise',

      // react-resize-detector
      'react-resize-detector',

      // color-parse
      'color-parse',
      'color-name',

      // MUI
      // TODO: we might be able to remove this when the following issue is resolved
      // See https://github.com/mui/mui-x/issues/11568
      '@mui/x-date-pickers',
      '@babel/runtime',
    ],
  });

  /** @type {import('jest').Config} */
  const config = {
    ...baseConfig,
    setupFiles: [
      '@finos/legend-dev-utils/jest/disallowConsoleError',
      '@finos/legend-dev-utils/jest/handleUnhandledRejection',
      // TODO: remove this when we no longer need to mock `Window.fetch()` for tests
      // See https://github.com/finos/legend-studio/issues/758
      '@finos/legend-dev-utils/jest/blockFetch',
    ],
    // Setup to run immediately after the test framework has been installed in the environment
    // before each test file in the suite is executed
    // See https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
    setupFilesAfterEnv: [
      ...baseConfig.setupFilesAfterEnv,
      '@finos/legend-dev-utils/jest/setupTestEnvironment',
      '@finos/legend-dev-utils/jest/setupJestExpectExtension',
    ],
    moduleNameMapper: {
      ...baseConfig.moduleNameMapper,
      // TODO: problem with ESM - remove this and `lodash` dependency when `lodash`
      // natively support ESM and hence, work well with `jest-resolve`
      // See https://github.com/lodash/lodash/issues/5107
      // See https://github.com/finos/legend-studio/issues/502
      '^lodash-es$': 'lodash',
    },
    modulePathIgnorePatterns: [
      'packages/.*/lib/',
      'packages/.*/build/',
      'packages/.*/build/publishContent/',
    ],
    testPathIgnorePatterns: [
      ...baseConfig.testPathIgnorePatterns,
      '/packages/.*/lib/',
    ],
  };
  return isGlobal
    ? {
        ...config,
        collectCoverageFrom: [
          '<rootDir>/packages/*/**/*.[jt]s?(x)',
          '!<rootDir>/packages/*/*.js',
          '!<rootDir>/packages/*/build/**',
          '!<rootDir>/packages/*/lib/**',
          '!<rootDir>/packages/*/dev/**',
          '!<rootDir>/build/**',
          '!**/node_modules/**',
          '!**/__mocks__/**',
          '!**/__tests__/**',
          '!**/vendor/**',
          '!**/scripts/**',
          '!**/fixtures/**',
          '!<rootDir>/packages/legend-dev-utils/WebpackConfigUtils.js', // TODO: remove this when Jest supports `import.meta.url`
        ],
        // Do not use `babel` when generating coverage report to avoid various errors
        // See https://jestjs.io/docs/configuration#coverageprovider-string
        // See https://github.com/jestjs/jest/issues/13186
        coverageProvider: 'v8',
        coverageReporters: ['clover', 'json', 'lcov', 'text-summary'],
        coverageDirectory: '<rootDir>/build/coverage',
        watchPathIgnorePatterns: [
          ...baseConfig.watchPathIgnorePatterns,
          '<rootDir>/packages/.*/build',
          '<rootDir>/packages/.*/lib',
          '<rootDir>/packages/.*/dist',
          '<rootDir>/packages/.*/dev',
          '<rootDir>/build/',
          '<rootDir>/docs/',
          '<rootDir>/temp/',
        ],
      }
    : config;
};

export const getBaseJestProjectConfig = (projectName, packageDir) => {
  const testMatch = [
    (!process.env.TEST_GROUP || process.env.TEST_GROUP === 'core') &&
      `<rootDir>/${packageDir}/**/__tests__/**/*(*.)test.[jt]s?(x)`,
    process.env.TEST_GROUP === 'engine-roundtrip' &&
      `<rootDir>/${packageDir}/**/__tests__/**/*(*.)engine-roundtrip-test.[jt]s?(x)`,
    process.env.TEST_GROUP === 'profiling' &&
      `<rootDir>/${packageDir}/**/__tests__/**/*(*.)profiling-test.[jt]s?(x)`,
    process.env.TEST_GROUP === 'repl' &&
      `<rootDir>/${packageDir}/**/__tests__/**/*(*.)repl-test.[jt]s?(x)`,
  ].filter(Boolean);

  if (testMatch.length === 0) {
    throw new Error(
      `Can't configure to run tests for group '${process.env.TEST_GROUP}'`,
    );
  }

  return {
    ...getBaseJestConfig(false),
    displayName: projectName,
    rootDir: '../..',
    testMatch,
  };
};

export const getBaseJestDOMProjectConfig = (projectName, packageDir) => {
  const baseConfig = getBaseJestProjectConfig(projectName, packageDir);

  /** @type {import('jest').Config} */
  const config = {
    ...baseConfig,
    testEnvironment: 'jsdom',
    setupFiles: [
      ...baseConfig.setupFiles,
      '@finos/legend-dev-utils/jest/setupDOMPolyfills',
      'jest-canvas-mock',
    ],
    setupFilesAfterEnv: [
      ...baseConfig.setupFilesAfterEnv,
      // NOTE: we need to call this before each test since there's an issue
      // with jest-canvas-mock and jest.resetAllMocks(), which is called when we set `restoreMocks: true`
      // See https://github.com/hustcc/jest-canvas-mock/issues/103
      '@finos/legend-dev-utils/jest/mockCanvas',
    ],
    moduleNameMapper: {
      ...baseConfig.moduleNameMapper,
      '^monaco-editor$':
        '@finos/legend-lego/code-editor/test/MockedMonacoEditor.js',
      /**
       * Here, we mock pure ESM modules so we don't have to transform them while running test
       *
       * NOTE: we could do what we do with `react-dnd` which is to include these packages
       * (e.g. `react-markdown`, `remark-gfm`, etc.)
       * and some of their dependencies to the list of packages to be transformed by `babel-jest`,
       * but mocking them like this is much faster, more direct and improve test run time by skipping
       * transform for these packages.
       *
       * We will remove these when we run test with ESM
       * See https://github.com/finos/legend-studio/issues/502
       */
      '^react-markdown$':
        '@finos/legend-art/markdown/test/MockedReactMarkdown.js',
      '^remark-gfm$': '@finos/legend-art/markdown/test/MockedRemarkGFM.js',
      '^mermaid$': '@finos/legend-art/markdown/test/MockedMermaid.js',
    },
    globals: {
      AG_GRID_LICENSE: null,
    },
  };
  return config;
};
