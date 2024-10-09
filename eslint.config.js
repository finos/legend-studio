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

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import legend_plugin from '@finos/eslint-plugin-legend-studio';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * We need to detect environment for ESLint CLI because there are rules
 * which are computationally expensive to perform during development.
 * Therefore, for each environments, we will enable/disable these rules according:
 *  - For `development` mode (when watching for changes and re-compile): DISABLE
 *  - For `IDE` ESLint process (to keep the IDE snappy): DISABLE
 *  - For `production` mode (to produce bundled code): ENABLE
 *  - For `linting` process (to check code quality in CI): ENABLE
 */
const isIDE = process.env.NODE_ENV === undefined;

/** @type {import('eslint').Linter.Config} */
const ignores = {
  ignores: [
    // Dependencies
    '**/node_modules',

    // Build
    '/build/',
    '/packages/*/build/',
    '/packages/*/dist/',
    '/packages/*/lib/',
    '/fixtures/*/build/',
    '/fixtures/*/dist/',
    '/fixtures/*/lib/',
    '/scripts/*/build/',
    '/scripts/*/lib/',

    // Yarn
    '.yarn/*',
    '.pnp.*',

    // Exceptions
    '/packages/legend-dev-utils/__tests__/fixtures/src/dummy.ts',
  ],
};

export default [
  ignores,
  legend_plugin.configs.recommended,
  legend_plugin.configs.scripts,
  // turn off computationally expensive rules (checking dependencies graph, types, etc.) when running in the IDE for better performance
  !isIDE && legend_plugin.configs.computationally_expensive(__dirname),
  // turn on the stylistic checks only when running in the IDE to speed up pipeline performance
  // the formatting checks are done by Prettier in the pipeline separately and gated by lint-staged when comitting code
  isIDE && legend_plugin.configs.stylistic,
].filter(Boolean);
