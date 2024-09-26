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

import { getBaseJestDOMProjectConfig } from '../../scripts/test/jest.config.base.js';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = loadJSON(resolve(__dirname, './package.json'));

export default getBaseJestDOMProjectConfig(
  packageJson.name,
  'packages/legend-data-cube',
);
