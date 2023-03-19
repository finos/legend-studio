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

import { TEST__provideMockedApplicationStore } from '@finos/legend-application';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';
import { TEST__provideMockedEditorStore } from '../EditorComponentTestUtils.js';
import { TEST__getLegendStudioApplicationConfig } from '../../stores/EditorStoreTestUtils.js';
import type { EditorStore } from '../../stores/EditorStore.js';

export const TEST__buildQueryBuilderMockedEditorStore = (): EditorStore => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();

  return TEST__provideMockedEditorStore({
    applicationStore: TEST__provideMockedApplicationStore(
      TEST__getLegendStudioApplicationConfig(),
      pluginManager,
    ),
    pluginManager,
  });
};
