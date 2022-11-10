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
import { DSL_Persistence_GraphManagerPreset } from '../../DSL_Persistence_Extension.js';
import {
  TEST_DATA__roundtrip_case1,
  TEST_DATA__roundtrip_case2,
} from './TEST_DATA__DSL_Persistence_Roundtrip.js';
import {
  DSL_ExternalFormat_GraphPreset,
  TEST__checkBuildingElementsRoundtrip,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph';
import { unitTest } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager
  .usePresets([
    new DSL_Persistence_GraphManagerPreset(),
    new DSL_ExternalFormat_GraphPreset(),
  ])
  .install();

test(unitTest('DSL Persistence roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip_case1 as Entity[],
    pluginManager,
  );
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip_case2 as Entity[],
    pluginManager,
  );
});
