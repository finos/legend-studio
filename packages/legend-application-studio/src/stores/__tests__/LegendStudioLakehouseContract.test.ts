/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, jest, test } from '@jest/globals';
import { ApplicationStore } from '@finos/legend-application';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import { unitTest } from '@finos/legend-shared/test';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';
import { TEST__getLegendStudioApplicationConfig } from '../__test-utils__/LegendStudioApplicationTestUtils.js';
import { EditorStore } from '../editor/EditorStore.js';

const editorStoreOf = (extraConfigData = {}): EditorStore => {
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(extraConfigData),
    LegendStudioPluginManager.create(),
  );
  return new EditorStore(
    applicationStore,
    new SDLCServerClient({
      env: applicationStore.config.env,
      serverUrl: applicationStore.config.sdlcServerUrl,
    }),
    new DepotServerClient({
      serverUrl: applicationStore.config.depotServerUrl,
    }),
  );
};

describe(unitTest('The lakehouse contract server in Studio'), () => {
  test('Is configured as Legend Query configures it, by `lakehouse.url`, and optional', () => {
    expect(
      TEST__getLegendStudioApplicationConfig({
        lakehouse: { url: 'https://lakehouse.test/api' },
      }).lakehouseContractUrl,
    ).toBe('https://lakehouse.test/api');
    expect(
      TEST__getLegendStudioApplicationConfig().lakehouseContractUrl,
    ).toBeUndefined();
  });

  test("Gives the editor a client of the configured server, traced by Studio's tracer, and none without one", () => {
    const traced = jest.spyOn(
      LakehouseContractServerClient.prototype,
      'setTracerService',
    );
    try {
      const editorStore = editorStoreOf({
        lakehouse: { url: 'https://lakehouse.test/api' },
      });
      const client = editorStore.lakehouseContractServerClient;
      expect(client).toBeInstanceOf(LakehouseContractServerClient);
      expect(client?.baseUrl).toBe('https://lakehouse.test/api');
      expect(traced).toHaveBeenCalledWith(
        editorStore.applicationStore.tracerService,
      );
      expect(editorStoreOf().lakehouseContractServerClient).toBeUndefined();
    } finally {
      traced.mockRestore();
    }
  });
});
