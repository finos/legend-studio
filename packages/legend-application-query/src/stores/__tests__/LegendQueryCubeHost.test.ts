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
import {
  BUNDLED_MODELS,
  type CubeEngine,
  type CubeModelOutline,
} from '@finos/legend-cube-builder';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import {
  buildLegendQueryCubeEngineConfig,
  LegendQueryCubeHost,
} from '../cube/LegendQueryCubeHost.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';

const OUTLINE: CubeModelOutline = { databases: [], runtimes: [] };

const createApplicationStore = (
  extraConfigData = {},
): ConstructorParameters<typeof LegendQueryCubeHost>[0] =>
  new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(extraConfigData),
    LegendQueryPluginManager.create(),
  );

describe('Legend Query as the Cube host', () => {
  test("Configures Cube's engine client as Query's editor does", () => {
    const config = TEST__getTestLegendQueryApplicationConfig({
      engine: {
        url: 'https://testEngineUrl',
        queryUrl: 'https://testEngineQueryUrl',
        queryClientName: 'test-client',
        useCookieAuthOnly: true,
      },
    });
    expect(buildLegendQueryCubeEngineConfig(config)).toEqual({
      baseUrl: 'https://testEngineUrl',
      queryBaseUrl: 'https://testEngineQueryUrl',
      queryClientName: 'test-client',
      enableCompression: true,
      useCookieAuthOnly: true,
    });
    expect(
      buildLegendQueryCubeEngineConfig(
        TEST__getTestLegendQueryApplicationConfig(),
      ),
    ).toMatchObject({ enableCompression: true, useCookieAuthOnly: false });
  });

  test("Gives the page Query's application store, the engine and the bundled models", async () => {
    const applicationStore = createApplicationStore();
    const loadModel = jest.fn<CubeEngine['loadModel']>(async () =>
      Promise.resolve(OUTLINE),
    );
    const engine: CubeEngine = {
      loadModel,
      resolveSchemas: jest.fn<CubeEngine['resolveSchemas']>(),
      typeLambdas: jest.fn<CubeEngine['typeLambdas']>(),
      execute: jest.fn<CubeEngine['execute']>(),
      renderPure: jest.fn<CubeEngine['renderPure']>(),
    };
    const host = new LegendQueryCubeHost(applicationStore, engine);
    expect(host.applicationStore).toBe(applicationStore);
    expect(host.engine).toBe(engine);
    expect(host.modelCatalog.models).toBe(BUNDLED_MODELS);
    expect(host.modelCatalog.models.map((model) => model.label)).toEqual([
      'Northwind (Cube fixture)',
    ]);
    // the catalog reads models through the host's engine
    const [northwind] = host.modelCatalog.models;
    await host.modelCatalog.loadOutline(
      (northwind as (typeof BUNDLED_MODELS)[number]).model,
    );
    expect(loadModel).toHaveBeenCalledTimes(1);
  });

  test("Builds an engine from Query's config when none is given", () => {
    const host = new LegendQueryCubeHost(createApplicationStore());
    expect(Object.keys(host.engine)).not.toHaveLength(0);
    expect(typeof host.engine.execute).toBe('function');
  });
});
