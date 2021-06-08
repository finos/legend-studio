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
import { loadJSON } from '@finos/legend-studio-dev-utils/DevUtils';

const packageJson = loadJSON('./package.json');

export default {
  ...base,
  displayName: packageJson.name,
  name: packageJson.name,
  rootDir: '../..',
  testEnvironment: 'jsdom',
  setupFiles: [
    ...base.setupFiles,
    '<rootDir>/scripts/jest/setupTests/setupPolyfills.js',
  ],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^monaco-editor$':
      '@finos/legend-studio/lib/testMocks/MockedMonacoEditor.js',
  },
  testMatch: [
    '<rootDir>/packages/legend-studio-app/src/**/__tests__/**/*(*.)test.[jt]s?(x)',
  ],
};
