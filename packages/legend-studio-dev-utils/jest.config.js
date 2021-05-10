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

import base from '../../scripts/jest/jest.config.base.js';
import { loadJSON } from './DevUtils.js';

const packageJson = loadJSON('./package.json');

export default {
  ...base,
  displayName: packageJson.name,
  name: packageJson.name,
  rootDir: '../..',
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // NOTE: since these packages use ESM exports, we will have till Jest support it, but since we don't really use
    // them in the test, we will just mock them
    // See https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#im-having-problems-with-esm-and-jest
    'strip-ansi': '@finos/legend-studio-dev-utils/mocks/fileMock',
    'wrap-ansi': '@finos/legend-studio-dev-utils/mocks/fileMock',
  },
  testMatch: [
    '<rootDir>/packages/legend-studio-dev-utils/**/__tests__/**/*(*.)test.[jt]s?(x)',
  ],
  // TODO: remove this when `import.meta` is supported by Jest
  // See https://github.com/facebook/jest/issues/9430
  testPathIgnorePatterns: [
    ...base.testPathIgnorePatterns,
    '<rootDir>/packages/legend-studio-dev-utils/__tests__/WebpackConfigUtils.test.js',
  ],
};
