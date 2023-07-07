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

import { test, expect } from '@jest/globals';
import { resolve } from 'path';
import { buildShowcaseRegistryData } from '../ShowcaseRegistryData.js';
import { unitTest } from '@finos/legend-dev-utils/jest/testUtils';
import { readFileSync } from 'fs';

test(unitTest('Showcase registry data is properly built'), () => {
  expect(
    buildShowcaseRegistryData(resolve(__dirname, '../../data/showcases')),
  ).toEqual(
    JSON.parse(
      readFileSync(resolve(__dirname, '../../data/metadata.json'), {
        encoding: 'utf-8',
      }),
    ),
  );
});
