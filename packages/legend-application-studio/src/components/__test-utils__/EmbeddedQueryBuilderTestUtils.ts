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

import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';
import { TEST__provideMockedEditorStore } from '../editor/__test-utils__/EditorComponentTestUtils.js';
import type { EditorStore } from '../../stores/editor/EditorStore.js';
import { ApplicationStore } from '@finos/legend-application';
import { TEST__getLegendStudioApplicationConfig } from '../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';

export const TEST__buildQueryBuilderMockedEditorStore = (): EditorStore => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();

  return TEST__provideMockedEditorStore({
    applicationStore: new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(),
      pluginManager,
    ),
    pluginManager,
  });
};
