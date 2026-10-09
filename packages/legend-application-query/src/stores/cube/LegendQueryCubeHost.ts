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
  CubeDataProductEnvironmentType,
  getCubeRememberedWarehouse,
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
import { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import { EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl } from '../../__lib__/LegendQueryNavigation.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
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
 * lakehouse, so an open-source deployment without one offers no data
 * products. With a marketplace server too, its search is used
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
  let marketplaceServerClient: MarketplaceServerClient | undefined;
  if (config.marketplaceServerUrl) {
    marketplaceServerClient = new MarketplaceServerClient({
      serverUrl: config.marketplaceServerUrl,
      // the client only stores it, never reading it, and Cube calls no subscription route
      subscriptionUrl: '',
    });
    marketplaceServerClient.setTracerService(tracerService);
  }
  return {
    contractServerClient,
    depotServerClient,
    marketplaceServerClient,
    getAccessToken: () => applicationStore.getAccessToken(),
    getCurrentUser: () => applicationStore.identityService.currentUser,
    // the environment Query remembers for the viewer, as Query's editor uses it
    getPreferredEnvironment: () =>
      LegendQueryUserDataHelper.getLakehouseUserInfo(
        applicationStore.userDataService,
      )?.env,
    // the marketplace of the deployment's class, where its deployment is;
    // Query's own links choose by a SNAPSHOT version instead
    getMarketplaceLink: (target) => {
      const marketplaceUrl =
        target.environmentType ===
        CubeDataProductEnvironmentType.PRODUCTION_PARALLEL
          ? config.marketplaceProductionParallelUrl
          : config.marketplaceApplicationUrl;
      return marketplaceUrl
        ? EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl(
            marketplaceUrl,
            target.dataProductId,
            target.deploymentId,
            target.accessPointGroup,
          )
        : undefined;
    },
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
        getRememberedWarehouse: () =>
          getCubeRememberedWarehouse(applicationStore.userDataService),
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
