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

import { EditorStore } from '../EditorStore.js';
import { LegendStudioPluginManager } from '../../../application/LegendStudioPluginManager.js';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import { DepotServerClient } from '@finos/legend-server-depot';
import { ApplicationStore } from '@finos/legend-application';
import { TEST__getLegendStudioApplicationConfig } from '../../__test-utils__/LegendStudioApplicationTestUtils.js';
import { MockedMonacoEditorAPI } from '@finos/legend-lego/code-editor/test';

export const TEST__getTestEditorStore = (
  pluginManager = LegendStudioPluginManager.create(),
): EditorStore => {
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(),
    pluginManager,
  );
  MockedMonacoEditorAPI.createModel.mockReturnValue({
    setValue(): void {},
  });
  return new EditorStore(
    applicationStore,
    new SDLCServerClient({
      env: applicationStore.config.env,
      serverUrl: applicationStore.config.sdlcServerUrl,
      baseHeaders: applicationStore.config.sdlcServerBaseHeaders,
    }),
    new DepotServerClient({
      serverUrl: applicationStore.config.depotServerUrl,
    }),
  );
};
