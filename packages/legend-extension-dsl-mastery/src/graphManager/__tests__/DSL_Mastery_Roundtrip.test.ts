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
import { DSL_Mastery_GraphManagerPreset } from '../../DSL_Mastery_Extension.js';
import { TEST_DATA__roundtrip } from './TEST_DATA__DSL_Mastery_Roundtrip.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  TEST__checkBuildingElementsRoundtrip,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager
  .usePresets([
    new Core_GraphManagerPreset(),
    new DSL_Mastery_GraphManagerPreset(),
  ])
  .install();

test(unitTest('DSL Mastery roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip as Entity[],
    pluginManager,
  );
});
