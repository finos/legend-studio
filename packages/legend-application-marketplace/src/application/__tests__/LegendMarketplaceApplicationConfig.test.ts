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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../__test-utils__/LegendMarketplaceApplicationTestUtils.js';

const CLIENT_NAME = 'test-client';

describe(
  unitTest('LegendMarketplaceApplicationConfig - engine client name'),
  () => {
    test('a configured client name is read as-is', () => {
      expect(
        TEST__getTestLegendMarketplaceApplicationConfig({
          engineClientName: CLIENT_NAME,
        }).engineClientName,
      ).toBe(CLIENT_NAME);
    });

    test('no client name is defaulted when none is configured', () => {
      expect(
        TEST__getTestLegendMarketplaceApplicationConfig().engineClientName,
      ).toBeUndefined();
    });
  },
);
