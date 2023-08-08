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
import { DSL_Persistence_GraphManagerPreset } from '../../graph-manager/DSL_Persistence_GraphManagerPreset.js';
import {
  TEST_DATA__roundtrip_case1,
  TEST_DATA__roundtrip_case2,
  TEST_DATA__cloud__roundtrip,
} from './TEST_DATA__DSL_Persistence_Roundtrip.js';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  TEST__checkBuildingElementsRoundtrip,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  TEST_DATA__roundtrip_append_only_allow_duplicates,
  TEST_DATA__roundtrip_bitemporal_no_del_ind_user_specifies_from,
  TEST_DATA__roundtrip_graph_fetch_basic,
  TEST_DATA__roundtrip_non_temporal_snapshot_date_time_audit,
} from './TEST_DATA_DSL_PersistenceV2_Roundtrip.js';

const pluginManager = new TEST__GraphManagerPluginManager();
pluginManager
  .usePresets([
    new Core_GraphManagerPreset(),
    new DSL_Persistence_GraphManagerPreset(),
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
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__cloud__roundtrip as Entity[],
    pluginManager,
  );
});

test(unitTest('DSL Persistence V2 roundtrip'), async () => {
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip_append_only_allow_duplicates as Entity[],
    pluginManager,
  );
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip_bitemporal_no_del_ind_user_specifies_from as Entity[],
    pluginManager,
  );
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip_non_temporal_snapshot_date_time_audit as Entity[],
    pluginManager,
  );
  await TEST__checkBuildingElementsRoundtrip(
    TEST_DATA__roundtrip_graph_fetch_basic as Entity[],
    pluginManager,
  );
});
