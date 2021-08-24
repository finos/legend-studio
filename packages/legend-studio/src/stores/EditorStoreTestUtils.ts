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

/// <reference types="jest-extended" />
import { EditorStore } from './EditorStore';
import { StudioPluginManager } from '../application/StudioPluginManager';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph';
import { TEST__getTestSDLCServerClient } from '@finos/legend-server-sdlc';
import { TEST__getTestDepotServerClient } from '@finos/legend-server-depot';
import { TEST__getTestApplicationStore } from '@finos/legend-application';

export const TEST__getTestEditorStore = (
  pluginManager = StudioPluginManager.create(),
): EditorStore => {
  const applicationStore = TEST__getTestApplicationStore();
  return new EditorStore(
    applicationStore,
    TEST__getTestSDLCServerClient(),
    TEST__getTestDepotServerClient(),
    TEST__getTestGraphManagerState(pluginManager),
    pluginManager,
  );
};
