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
import { createRequire } from 'module';
import { getBaseConfig } from '@finos/legend-dev-utils/JestConfigUtils';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const baseConfig = getBaseConfig({
  babelConfigPath: resolve(__dirname, '../../babel.config.cjs'),
  // `react-dnd` went full ESM so we would need to transpile them
  // https://github.com/react-dnd/react-dnd/issues/3443
  TEMPORARY__esmPackagesToTransform: ['react-dnd', 'dnd-core', '@react-dnd'],
});

export const baseJestConfig = {
  ...baseConfig,
  setupFiles: [
    // TODO: problem with ESM - remove when we run Jest with ESM
    // See https://github.com/finos/legend-studio/issues/502
    '@finos/legend-art/jest/mockESM.jsx',
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
    // TODO: problem with ESM - due to a conflict between `uuid` and `jest-resolve@28` we need this workaround
    // See https://github.com/uuidjs/uuid/pull/616
    // See https://github.com/finos/legend-studio/issues/502
    '^uuid$': require.resolve('uuid'),
  },
  modulePathIgnorePatterns: ['packages/.*/lib'],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    '/packages/.*/lib',
  ],
  collectCoverageFrom: [
    '<rootDir>/packages/*/**/*.[jt]s?(x)',
    '!<rootDir>/packages/*/webpack.config.js',
    '!<rootDir>/packages/*/jest.config.js',
    '!<rootDir>/packages/*/_package.config.js',
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
    '!<rootDir>/packages/legend-manual-tests/cypress/**', // TODO: update this when restructure `e2e` test suite
  ],
  coverageDirectory: '<rootDir>/build/coverage',
  watchPathIgnorePatterns: [
    ...baseConfig.watchPathIgnorePatterns,
    '<rootDir>/packages/.*/build',
    '<rootDir>/packages/.*/lib',
    '<rootDir>/packages/.*/dist',
    '<rootDir>/packages/.*/dev',
    '<rootDir>/build',
    '<rootDir>/docs',
    '<rootDir>/temp',
  ],
};

export const getBaseJestProjectConfig = (projectName, packageDir) => ({
  ...baseJestConfig,
  displayName: projectName,
  rootDir: '../..',
  testMatch: [`<rootDir>/${packageDir}/**/__tests__/**/*(*.)test.[jt]s?(x)`],
});

export const getBaseJestDOMProjectConfig = (projectName, packageDir) => {
  const base = getBaseJestProjectConfig(projectName, packageDir);

  return {
    ...base,
    testEnvironment: 'jsdom',
    setupFiles: [
      ...base.setupFiles,
      '@finos/legend-dev-utils/jest/setupDOMPolyfills',
    ],
    moduleNameMapper: {
      ...base.moduleNameMapper,
      '^monaco-editor$':
        '@finos/legend-art/lib/testMocks/MockedMonacoEditor.js',
    },
  };
};
