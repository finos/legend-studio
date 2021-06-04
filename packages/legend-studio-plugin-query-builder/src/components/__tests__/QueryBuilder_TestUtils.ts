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
  getMockedApplicationStore,
  getMockedEditorStore,
  getTestApplicationConfig,
  PluginManager,
} from '@finos/legend-studio';
import { QueryBuilderPlugin } from '../../QueryBuilderPlugin';

export const buildQueryBuilderMockedEditorStore = (): EditorStore => {
  const pluginManager = PluginManager.create();
  pluginManager.usePlugins([new QueryBuilderPlugin()]).install();
  const mockedApplicationStore = getMockedApplicationStore(
    getTestApplicationConfig(),
    pluginManager,
  );
  return getMockedEditorStore(mockedApplicationStore);
};
