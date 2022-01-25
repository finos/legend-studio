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

import { EditorStore } from './EditorStore';
import { LegendStudioPluginManager } from '../application/LegendStudioPluginManager';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph';
import { TEST__getTestSDLCServerClient } from '@finos/legend-server-sdlc';
import { TEST__getTestDepotServerClient } from '@finos/legend-server-depot';
import {
  TEST_DATA__applicationVersion,
  TEST__getTestApplicationStore,
} from '@finos/legend-application';
import { LegendStudioConfig } from '../application/LegendStudioConfig';

export const TEST_DATA__studioConfig = {
  appName: 'test-studio-app',
  env: 'test-env',
  sdlc: {
    url: 'https://testSdlcUrl',
  },
  engine: {
    url: 'https://testEngineUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
  documentation: {
    url: 'https://testDocUrl',
  },
};

export const TEST__getTestStudioConfig = (
  extraConfigData = {},
): LegendStudioConfig => {
  const config = new LegendStudioConfig(
    {
      ...TEST_DATA__studioConfig,
      ...extraConfigData,
    },
    TEST_DATA__applicationVersion,
    '/studio/',
  );
  return config;
};

export const TEST__getTestEditorStore = (
  pluginManager = LegendStudioPluginManager.create(),
): EditorStore => {
  const applicationStore = TEST__getTestApplicationStore(
    TEST__getTestStudioConfig(),
    pluginManager,
  );
  return new EditorStore(
    applicationStore,
    TEST__getTestSDLCServerClient(),
    TEST__getTestDepotServerClient(),
    TEST__getTestGraphManagerState(pluginManager),
    pluginManager,
  );
};
