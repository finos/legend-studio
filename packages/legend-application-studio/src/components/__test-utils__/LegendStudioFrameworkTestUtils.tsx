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

import { ApplicationStore } from '@finos/legend-application';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';
import {
  LegendStudioBaseStore,
  type LegendStudioApplicationStore,
} from '../../stores/LegendStudioBaseStore.js';
import { TEST__getLegendStudioApplicationConfig } from '../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { createMock } from '@finos/legend-shared/test';

export const TEST__provideMockedLegendStudioBaseStore = (customization?: {
  mock?: LegendStudioBaseStore;
  applicationStore?: LegendStudioApplicationStore;
}): LegendStudioBaseStore => {
  const applicationStore =
    customization?.applicationStore ??
    new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(),
      LegendStudioPluginManager.create(),
    );
  const value =
    customization?.mock ?? new LegendStudioBaseStore(applicationStore);
  const MOCK__BaseStoreProvider = require('../LegendStudioFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  MOCK__BaseStoreProvider.useLegendStudioBaseStore = createMock();
  MOCK__BaseStoreProvider.useLegendStudioBaseStore.mockReturnValue(value);
  return value;
};
