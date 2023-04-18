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

import { test } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
import { unitTest } from '@finos/legend-shared/test';
import { roundtripTestData } from './TEST_DATA__STO_ServiceStore_Roundtrip.js';
import { STO_ServiceStore_GraphManagerPreset } from '../STO_ServiceStore_GraphManagerPreset.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  TEST__checkBuildingElementsRoundtrip,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager
  .usePresets([
    new Core_GraphManagerPreset(),
    new STO_ServiceStore_GraphManagerPreset(),
  ])
  .install();

test(unitTest('Service store import resolution roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    roundtripTestData as Entity[],
    pluginManager,
  );
});
