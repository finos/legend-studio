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

import { test, describe } from '@jest/globals';
import {
  TEST__GraphPluginManager,
  TEST__checkBuildingElementsRoundtrip,
} from '@finos/legend-graph';
import { unitTest } from '@finos/legend-shared';
import { ESFlatData_GraphPreset } from '../../ESFlatData_Extension.js';
import {
  TEST_DATA__FlatDataRoundtrip,
  TEST_DATA__FlatDataRoundtrip2,
  TEST_DATA__FlatDataMappingRoundtrip,
  TEST_DATA__EmbeddedFlatDataMappingRoundtrip,
  TEST_DATA__FlatDataConnectionRoundtrip,
  TEST_DATA__FlatDataInputDataRoundtrip,
} from './TEST_DATA__ESFlatData_Roundtrip.js';

const pluginManager = new TEST__GraphPluginManager();
pluginManager.usePresets([new ESFlatData_GraphPreset()]).install();

describe(unitTest('Flat-data import resolution roundtrip'), () => {
  test.each([
    ['Simple flat-data store', TEST_DATA__FlatDataRoundtrip],
    ['Complex flat-data store', TEST_DATA__FlatDataRoundtrip2],
    ['Flat-data mapping', TEST_DATA__FlatDataMappingRoundtrip],
    ['Flat-data embedded mapping', TEST_DATA__EmbeddedFlatDataMappingRoundtrip],
    ['Flat-data connection', TEST_DATA__FlatDataConnectionRoundtrip],
    [
      'Flat-data mapping test input data',
      TEST_DATA__FlatDataInputDataRoundtrip,
    ],
  ])('%s', async (testName, entities) => {
    await TEST__checkBuildingElementsRoundtrip(entities, pluginManager);
  });
});
