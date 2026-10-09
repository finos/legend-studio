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

import {
  buildCubeConnectionExplorer,
  buildCubeDataProductCatalog,
  buildCubeEngine,
  buildCubeLakehouseEnvironment,
  type CubeConnectionExplorer,
  type CubeDataProductCatalog,
  type CubeEngine,
  type CubeLakehouseServices,
  type CubeEngineConfig,
  type CubeHost,
  LocalModelCatalog,
} from '@finos/legend-cube-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import type { LegendQueryApplicationConfig } from '../../application/LegendQueryApplicationConfig.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';

/** Cube talks to the engine Query's own editor uses, configured the same way */
export const buildLegendQueryCubeEngineConfig = (
  config: LegendQueryApplicationConfig,
): CubeEngineConfig => ({
  baseUrl: config.engineServerUrl,
  queryBaseUrl: config.engineQueryServerUrl,
  queryClientName: config.engineQueryClientName,
  enableCompression: true,
  useCookieAuthOnly: config.engineUseCookieAuthOnly,
});

/**
 * What Cube needs to read and run data products (PLAN §6.8), with Query's
 * lakehouse and depot, configured as Query's own: none when Query has no
 * lakehouse, so an open-source deployment without one offers no data products
 */
export const buildLegendQueryCubeLakehouseServices = (
  applicationStore: LegendQueryApplicationStore,
): CubeLakehouseServices | undefined => {
  const { config, tracerService } = applicationStore;
  if (!config.lakehouseContractUrl || !config.depotServerUrl) {
    return undefined;
  }
  const contractServerClient = new LakehouseContractServerClient({
    baseUrl: config.lakehouseContractUrl,
  });
  contractServerClient.setTracerService(tracerService);
  const depotServerClient = new DepotServerClient({
    serverUrl: config.depotServerUrl,
  });
  depotServerClient.setTracerService(tracerService);
  return {
    contractServerClient,
    depotServerClient,
    getAccessToken: () => applicationStore.getAccessToken(),
    getCurrentUser: () => applicationStore.identityService.currentUser,
  };
};

/**
 * Legend Query as the host of the Cube page (PLAN §3.5): Query's engine and
 * application store, the bundled models, direct database connections read
 * through Query's engine, and, when Query has a lakehouse, its deployed data
 * products (PLAN §6.8). One per visit to the page.
 */
export class LegendQueryCubeHost implements CubeHost {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;
  readonly connectionExplorer: CubeConnectionExplorer;
  readonly dataProductCatalog: CubeDataProductCatalog | undefined;

  /** Tests give an engine and an explorer; otherwise each is built from Query's config */
  constructor(
    applicationStore: LegendQueryApplicationStore,
    engine?: CubeEngine,
    connectionExplorer?: CubeConnectionExplorer,
  ) {
    this.applicationStore = applicationStore;
    const config = buildLegendQueryCubeEngineConfig(applicationStore.config);
    const lakehouse = buildLegendQueryCubeLakehouseServices(applicationStore);
    this.engine =
      engine ??
      buildCubeEngine(config, applicationStore.tracerService, {
        lakehouseEnvironment: lakehouse
          ? buildCubeLakehouseEnvironment(lakehouse)
          : undefined,
      });
    this.dataProductCatalog = lakehouse
      ? buildCubeDataProductCatalog(lakehouse)
      : undefined;
    this.modelCatalog = new LocalModelCatalog(this.engine);
    // its own client, configured as the engine's
    this.connectionExplorer =
      connectionExplorer ??
      buildCubeConnectionExplorer(config, applicationStore.tracerService);
  }
}
