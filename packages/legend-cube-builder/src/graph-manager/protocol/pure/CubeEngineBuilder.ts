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

import type { DepotServerClient } from '@finos/legend-server-depot';
import { V1_EngineServerClient } from '@finos/legend-graph';
import type {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import type { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import type { TracerService } from '@finos/legend-shared';
import type { CubeConnectionExplorer } from '../../CubeConnectionExplorer.js';
import type {
  CubeDataProductCatalog,
  CubeMarketplaceLinkTarget,
} from '../../CubeDataProductCatalog.js';
import type { CubeEngine } from '../../CubeEngine.js';
import type { CubeIngestCatalog } from '../../CubeIngestCatalog.js';
import type { CubeLakehouseEnvironment } from '../../CubeLakehouseEnvironment.js';
import { V1_CubeLakehouseEnvironmentResolver } from './v1/V1_CubeLakehouseEnvironmentResolver.js';
import { V1_LegendCubeConnectionExplorer } from './v1/V1_LegendCubeConnectionExplorer.js';
import { V1_LegendCubeDataProductCatalog } from './v1/V1_LegendCubeDataProductCatalog.js';
import { V1_LegendCubeIngestCatalog } from './v1/V1_LegendCubeIngestCatalog.js';
import {
  type V1_CubeEngineConfig,
  V1_LegendCubeEngine,
} from './v1/V1_LegendCubeEngine.js';

/** The engine client's configuration, as the host gives it (e.g. Legend Query's engine server URL) */
export type CubeEngineConfig = V1_CubeEngineConfig;

/**
 * The Cube engine of a host (PLAN §3.2): the only place that builds the
 * Legend implementation, so hosts never name a V1_* symbol
 */
export const buildCubeEngine = (
  config: CubeEngineConfig,
  tracerService: TracerService,
  options?: {
    /** Data product cubes run only with one */
    lakehouseEnvironment?: CubeLakehouseEnvironment | undefined;
    /** The warehouse the viewer last picked, for a data product cube without its own */
    getRememberedWarehouse?: (() => string | undefined) | undefined;
    /** Ingest cubes run only with one, built by `buildCubeIngestCatalog` */
    ingestCatalog?: CubeIngestCatalog | undefined;
  },
): CubeEngine =>
  new V1_LegendCubeEngine(config, tracerService, {
    lakehouseEnvironment: options?.lakehouseEnvironment,
    getRememberedWarehouse: options?.getRememberedWarehouse,
    // the catalog reads the definitions the engine types and runs on
    ingestDefinitions:
      options?.ingestCatalog instanceof V1_LegendCubeIngestCatalog
        ? options.ingestCatalog
        : undefined,
  });

/**
 * The connection explorer of a host that offers direct connections (PLAN
 * §6.8), over the same engine as its Cube engine
 */
export const buildCubeConnectionExplorer = (
  config: CubeEngineConfig,
  tracerService: TracerService,
): CubeConnectionExplorer =>
  new V1_LegendCubeConnectionExplorer(config, tracerService);

/** What a host gives Cube to read its deployed data products (PLAN §6.8) */
export interface CubeLakehouseServices {
  readonly contractServerClient: LakehouseContractServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly getAccessToken: () => string | undefined;
  /** The viewer, whose lakehouse environment data product runs use */
  readonly getCurrentUser: () => string;
  /** The environment the host remembers for the viewer, used before their entitlements' first one */
  readonly getPreferredEnvironment?: (() => string | undefined) | undefined;
  /** The marketplace's search API: with it, the source dialog searches there, never reading the lakehouse's whole list */
  readonly marketplaceServerClient?: MarketplaceServerClient | undefined;
  /** A deployed data product's page in the host's marketplace; none when the host has no marketplace */
  readonly getMarketplaceLink?:
    | ((target: CubeMarketplaceLinkTarget) => string | undefined)
    | undefined;
  /**
   * The stereotype the host's marketplace marks access point groups open to
   * everyone with; without it, a group with no contract shows no access
   */
  readonly enterpriseStereotype?:
    | { readonly profile: string; readonly value: string }
    | undefined;
  /** The lakehouse platform, whose ingest environments the Ingest tab reads (PLAN §6.7) */
  readonly platformServerClient?: LakehousePlatformServerClient | undefined;
  /** A client for the ingest servers the platform names: each call names its server */
  readonly ingestServerClient?: LakehouseIngestServerClient | undefined;
}

/** The deployed data products of a host with a lakehouse and a depot */
export const buildCubeDataProductCatalog = (
  services: CubeLakehouseServices,
): CubeDataProductCatalog =>
  new V1_LegendCubeDataProductCatalog(
    services.contractServerClient,
    services.depotServerClient,
    services.getAccessToken,
    {
      marketplaceServerClient: services.marketplaceServerClient,
      marketplaceLink: services.getMarketplaceLink,
      getCurrentUser: services.getCurrentUser,
      enterpriseStereotype: services.enterpriseStereotype,
    },
  );

/** The viewer's lakehouse environment, which the engine needs to run data product cubes */
export const buildCubeLakehouseEnvironment = (
  services: CubeLakehouseServices,
): CubeLakehouseEnvironment =>
  new V1_CubeLakehouseEnvironmentResolver(
    services.contractServerClient,
    services.getAccessToken,
    services.getCurrentUser,
    services.getPreferredEnvironment,
  );

/**
 * The deployed ingest definitions of a host with a lakehouse platform (PLAN
 * §6.7), or none without one. It parses definitions with the engine Cube
 * uses; pass it to `buildCubeEngine` too, so ingest cubes run
 */
export const buildCubeIngestCatalog = (
  config: CubeEngineConfig,
  tracerService: TracerService,
  services: CubeLakehouseServices,
): CubeIngestCatalog | undefined => {
  const { platformServerClient, ingestServerClient } = services;
  if (!platformServerClient || !ingestServerClient) {
    return undefined;
  }
  const engineClient = new V1_EngineServerClient(config);
  // every call throws without one
  engineClient.setTracerService(tracerService);
  const environment = new V1_CubeLakehouseEnvironmentResolver(
    services.contractServerClient,
    services.getAccessToken,
    services.getCurrentUser,
    services.getPreferredEnvironment,
  );
  return new V1_LegendCubeIngestCatalog(
    platformServerClient,
    ingestServerClient,
    () => environment.resolveBaseEnvironment(),
    (code) => engineClient.grammarToJSON_model(code),
    services.getAccessToken,
  );
};
