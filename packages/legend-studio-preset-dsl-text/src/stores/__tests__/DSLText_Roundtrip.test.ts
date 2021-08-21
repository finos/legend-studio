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

import type { Entity } from '@finos/legend-model-storage';
import {
  getTestApplicationConfig,
  StudioPluginManager,
  getTestEditorStore,
  checkBuildingElementsRoundtrip,
} from '@finos/legend-studio';
import { unitTest } from '@finos/legend-shared';
import { DSLText_Preset } from '../../DSLText_Preset';
import { roundtripTestData } from './DSLText_RoundtripTestData';

const pluginManager = StudioPluginManager.create();
pluginManager.usePresets([new DSLText_Preset()]).install();

test(unitTest('Text import resolution roundtrip'), async () => {
  await checkBuildingElementsRoundtrip(
    roundtripTestData as Entity[],
    getTestEditorStore(getTestApplicationConfig(), pluginManager),
  );
});
