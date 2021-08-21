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

import type { EditorStore } from '@finos/legend-studio';
import {
  TEST__getTestApplicationStore,
  TEST__provideMockedEditorStore,
  StudioPluginManager,
} from '@finos/legend-studio';
import { QueryBuilder_Preset } from '../../QueryBuilder_Preset';

export const buildQueryBuilderMockedEditorStore = (): EditorStore => {
  const pluginManager = StudioPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_Preset()]).install();
  return TEST__provideMockedEditorStore(
    TEST__getTestApplicationStore(),
    pluginManager,
  );
};
