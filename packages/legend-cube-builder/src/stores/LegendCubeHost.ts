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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { DepotServerClient } from '@finos/legend-server-depot';
import {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import { EXTERNAL_APPLICATION_NAVIGATION__generateCubeMarketplaceDataProductUrl } from '../__lib__/LegendCubeNavigation.js';
import type { CubeConnectionExplorer } from '../graph-manager/CubeConnectionExplorer.js';
import { CubeDataProductEnvironmentType } from '../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCatalog } from '../graph-manager/CubeDataProductCatalog.js';
import type { CubeEngine } from '../graph-manager/CubeEngine.js';
import { CubeEngineClientSettings } from '../graph-manager/CubeEngineClientSettings.js';
import type { CubeIngestCatalog } from '../graph-manager/CubeIngestCatalog.js';
import type { CubeProjectCatalog } from '../graph-manager/CubeProjectCatalog.js';
import type { CubeServiceCatalog } from '../graph-manager/CubeServiceCatalog.js';
import type { CubeStore } from '../graph-manager/CubeStore.js';
import {
  buildCubeConnectionExplorer,
  buildCubeDataProductCatalog,
  buildCubeEngine,
  buildCubeIngestCatalog,
  buildCubeLakehouseEnvironment,
  buildCubeProjectCatalog,
  buildCubeServiceCatalog,
  buildCubeStore,
  type CubeEngineConfig,
  type CubeLakehouseServices,
} from '../graph-manager/protocol/pure/CubeEngineBuilder.js';
import { getCubeRememberedWarehouse } from './CubeDataProductWarehouse.js';
import type { CubeHost } from './CubeHost.js';
import { LocalModelCatalog } from './LocalModelCatalog.js';

/**
 * The servers of a Legend deployment hosting the Cube page, as its config
 * names them (PLAN §11.18): the engine, and each of the others only where the
 * deployment has one. Legend Analytics reads them from its config.
 */
export interface LegendCubeHostConfig {
  readonly engine: CubeEngineConfig;
  /** Published projects (PLAN §6.3) and, with a lakehouse, the data products' models */
  readonly depotServerUrl?: string | undefined;
  /** The lakehouse's contracts: data products need it, and a depot (PLAN §6.8) */
  readonly lakehouseContractUrl?: string | undefined;
  /** The lakehouse platform, which names the ingest servers: ingest data sets need it (PLAN §6.7) */
  readonly lakehousePlatformUrl?: string | undefined;
  /** The marketplace server, whose search the data product tab uses */
  readonly marketplaceServerUrl?: string | undefined;
  /** Legend Marketplace, which a production data product links to */
  readonly marketplaceApplicationUrl?: string | undefined;
  /** Legend Marketplace's production-parallel deployment, which a production-parallel data product links to */
  readonly marketplaceProductionParallelUrl?: string | undefined;
  /** The stereotype marking access point groups open to everyone, as Studio and Marketplace configure it */
  readonly enterpriseStereotype?: CubeLakehouseServices['enterpriseStereotype'];
  /** The lakehouse environment the host remembers for the viewer */
  readonly getPreferredEnvironment?: (() => string | undefined) | undefined;
  /** The engine path of the Legend user service naming producer deployments, as Marketplace configures it */
  readonly deploymentNameServiceUrl?: string | undefined;
}

/**
 * What Cube needs to read and run data products (PLAN §6.8), with the
 * deployment's lakehouse and depot: none without both, so a deployment
 * without them offers no data products. With a marketplace server too, its
 * search is used; with the lakehouse platform, ingest data sets are offered.
 */
export const buildLegendCubeLakehouseServices = (
  applicationStore: GenericLegendApplicationStore,
  config: LegendCubeHostConfig,
): CubeLakehouseServices | undefined => {
  const { tracerService } = applicationStore;
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
  // ingest data sets need the platform, which names the ingest servers; the
  // ingest client has no server of its own: each call names one
  let platformServerClient: LakehousePlatformServerClient | undefined;
  let ingestServerClient: LakehouseIngestServerClient | undefined;
  if (config.lakehousePlatformUrl) {
    platformServerClient = new LakehousePlatformServerClient(
      config.lakehousePlatformUrl,
    );
    platformServerClient.setTracerService(tracerService);
    ingestServerClient = new LakehouseIngestServerClient(undefined);
    ingestServerClient.setTracerService(tracerService);
  }
  return {
    platformServerClient,
    ingestServerClient,
    contractServerClient,
    depotServerClient,
    marketplaceServerClient,
    getAccessToken: () => applicationStore.getAccessToken(),
    getCurrentUser: () => applicationStore.identityService.currentUser,
    getPreferredEnvironment: config.getPreferredEnvironment,
    enterpriseStereotype: config.enterpriseStereotype,
    deploymentNameServiceUrl: config.deploymentNameServiceUrl,
    // the marketplace of the deployment's class, where its deployment is
    getMarketplaceLink: (target) => {
      const marketplaceUrl =
        target.environmentType ===
        CubeDataProductEnvironmentType.PRODUCTION_PARALLEL
          ? config.marketplaceProductionParallelUrl
          : config.marketplaceApplicationUrl;
      return marketplaceUrl
        ? EXTERNAL_APPLICATION_NAVIGATION__generateCubeMarketplaceDataProductUrl(
            marketplaceUrl,
            target.dataProductId,
            target.deploymentId,
            target.accessPointGroup,
          )
        : undefined;
    },
  };
};

/** The published projects in the deployment's depot, or none without a depot */
export const buildLegendCubeProjectCatalog = (
  applicationStore: GenericLegendApplicationStore,
  config: LegendCubeHostConfig,
): CubeProjectCatalog | undefined => {
  if (!config.depotServerUrl) {
    return undefined;
  }
  const depotServerClient = new DepotServerClient({
    serverUrl: config.depotServerUrl,
  });
  depotServerClient.setTracerService(applicationStore.tracerService);
  return buildCubeProjectCatalog(depotServerClient);
};

/** What tests give the host in place of what it would build */
export interface LegendCubeHostParts {
  readonly engine?: CubeEngine | undefined;
  readonly connectionExplorer?: CubeConnectionExplorer | undefined;
  readonly projectCatalog?: CubeProjectCatalog | undefined;
  readonly store?: CubeStore | undefined;
}

/**
 * A Legend deployment as the host of the Cube page (PLAN §3.5, §11.18): the
 * application's store, the engine and the bundled models, direct database
 * connections read through the engine, the services in its registry, and
 * the deployment's projects, data products and ingest data sets where it has
 * the servers for them. Legend Analytics builds one from its config.
 */
export class LegendCubeHost implements CubeHost {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;
  readonly connectionExplorer: CubeConnectionExplorer;
  readonly dataProductCatalog: CubeDataProductCatalog | undefined;
  readonly ingestCatalog: CubeIngestCatalog | undefined;
  readonly projectCatalog: CubeProjectCatalog | undefined;
  readonly serviceCatalog: CubeServiceCatalog;
  /** Saved cubes: the engine's Cube store, on the host's query server (PLAN §11.13) */
  readonly store: CubeStore;
  /** The engine URL and compression Cube's engine clients share, which Dev Settings changes */
  readonly engineClientSettings: CubeEngineClientSettings;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    config: LegendCubeHostConfig,
    parts?: LegendCubeHostParts,
  ) {
    this.applicationStore = applicationStore;
    const { tracerService } = applicationStore;
    this.engineClientSettings = new CubeEngineClientSettings(config.engine);
    const lakehouse = buildLegendCubeLakehouseServices(
      applicationStore,
      config,
    );
    this.ingestCatalog = lakehouse
      ? buildCubeIngestCatalog(
          config.engine,
          tracerService,
          lakehouse,
          this.engineClientSettings,
        )
      : undefined;
    this.engine =
      parts?.engine ??
      buildCubeEngine(config.engine, tracerService, {
        ingestCatalog: this.ingestCatalog,
        lakehouseEnvironment: lakehouse
          ? buildCubeLakehouseEnvironment(lakehouse)
          : undefined,
        getRememberedWarehouse: () =>
          getCubeRememberedWarehouse(applicationStore.userDataService),
        clientSettings: this.engineClientSettings,
      });
    this.dataProductCatalog = lakehouse
      ? buildCubeDataProductCatalog(lakehouse)
      : undefined;
    this.modelCatalog = new LocalModelCatalog(this.engine);
    // its own client, configured as the engine's
    this.connectionExplorer =
      parts?.connectionExplorer ??
      buildCubeConnectionExplorer(
        config.engine,
        tracerService,
        this.engineClientSettings,
      );
    // it reads nothing until the source dialog's Project tab opens
    this.projectCatalog =
      parts?.projectCatalog ??
      buildLegendCubeProjectCatalog(applicationStore, config);
    // in progress (PLAN §6.4); it reads nothing until the Service tab opens
    this.serviceCatalog = buildCubeServiceCatalog(
      config.engine,
      tracerService,
      this.engineClientSettings,
    );
    // an engine without the store, or its Mongo, says so on the first call
    this.store =
      parts?.store ??
      buildCubeStore(config.engine, tracerService, this.engineClientSettings);
  }
}
