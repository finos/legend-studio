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

import { loadJSON } from '@finos/legend-studio-dev-utils/DevUtils';
import base from '../../scripts/jest/jest.config.base.js';

const packageJson = loadJSON('./package.json');

export default {
  ...base,
  displayName: packageJson.name,
  name: packageJson.name,
  rootDir: '../..',
  setupFiles: [...base.setupFiles, 'jest-canvas-mock'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    // Mock for testing `react-dnd`
    // See http://react-dnd.github.io/react-dnd/docs/testing
    '^dnd-core$': 'dnd-core/dist/cjs',
    '^react-dnd$': 'react-dnd/dist/cjs',
    '^react-dnd-html5-backend$': 'react-dnd-html5-backend/dist/cjs',
    // manual mocks - TODO: we might eventually want to move these to `@finos/legend-studio-components` or `@finos/legend-studio-test-mocks`, etc.
    '^monaco-editor$':
      '@finos/legend-studio/lib/testMocks/MockedMonacoEditor.js',
    '^react-reflex$': '@finos/legend-studio/lib/testMocks/MockedReactReflex.js',
  },
  testMatch: [
    '<rootDir>/packages/legend-studio/src/**/__tests__/**/*(*.)test.[jt]s?(x)',
  ],
};
