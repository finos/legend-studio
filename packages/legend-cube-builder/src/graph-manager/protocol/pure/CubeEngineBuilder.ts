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
import {
  EXECUTION_SERIALIZATION_FORMAT,
  V1_EngineServerClient,
} from '@finos/legend-graph';
import type {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import type { MarketplaceServerClient } from '@finos/legend-server-marketplace';
import type { CubeExpressionCodec, IR, JsonObject } from '@finos/legend-cube';
import {
  parseLosslessJSON,
  type PlainObject,
  stringifyLosslessJSON,
  type TracerService,
} from '@finos/legend-shared';
import type { CubeConnectionExplorer } from '../../CubeConnectionExplorer.js';
import type {
  CubeDataProductCatalog,
  CubeDataProductModelSource,
  CubeMarketplaceLinkTarget,
} from '../../CubeDataProductCatalog.js';
import type { CubeEngine } from '../../CubeEngine.js';
import type { CubeEngineClientSettings } from '../../CubeEngineClientSettings.js';
import type {
  CubeIngestCatalog,
  CubeIngestDataSet,
  CubeIngestDefinitionSource,
} from '../../CubeIngestCatalog.js';
import type { CubeLakehouseEnvironment } from '../../CubeLakehouseEnvironment.js';
import type { CubeProjectCatalog } from '../../CubeProjectCatalog.js';
import type { CubeStore } from '../../CubeStore.js';
import type { CubeServiceCatalog } from '../../CubeServiceCatalog.js';
import { V1_CubeLakehouseEnvironmentResolver } from './v1/V1_CubeLakehouseEnvironmentResolver.js';
import { V1_LegendCubeConnectionExplorer } from './v1/V1_LegendCubeConnectionExplorer.js';
import { V1_LegendCubeDataProductCatalog } from './v1/V1_LegendCubeDataProductCatalog.js';
import { V1_LegendCubeIngestCatalog } from './v1/V1_LegendCubeIngestCatalog.js';
import { V1_CUBE_DEPLOYMENT_DIRECTORY_ENVIRONMENT } from './v1/V1_CubeDeploymentName.js';
import { V1_LegendCubeProjectCatalog } from './v1/V1_LegendCubeProjectCatalog.js';
import { V1_LegendCubeStore } from './v1/V1_LegendCubeStore.js';
import { V1_LegendCubeServiceCatalog } from './v1/V1_LegendCubeServiceCatalog.js';
import { V1_readCubeIngestDataSets } from './v1/V1_CubeIngestDefinition.js';
import { V1_serializeCubeLambda } from './v1/V1_CubeLambdaSerializer.js';
import {
  V1_readCubeLambda,
  V1_readCubeValueSpecification,
} from './v1/V1_CubeLambdaReader.js';
import { V1_readCubeExpression } from './v1/V1_CubeExpression.js';
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
    /** Dev Settings' engine URL and compression, shared by the host's engine clients (PLAN §11.16) */
    clientSettings?: CubeEngineClientSettings | undefined;
    /**
     * The definitions ingest cubes read, for a host whose catalog isn't
     * built by `buildCubeIngestCatalog`, e.g. Studio's workspace
     */
    ingestDefinitionSource?: CubeIngestDefinitionSource | undefined;
    /**
     * The model data product cubes read their project from, for a host whose
     * data products aren't deployed, e.g. Studio's workspace; the project's
     * deployed version otherwise
     */
    dataProductModelSource?: CubeDataProductModelSource | undefined;
  },
): CubeEngine =>
  new V1_LegendCubeEngine(config, tracerService, {
    clientSettings: options?.clientSettings,
    lakehouseEnvironment: options?.lakehouseEnvironment,
    getRememberedWarehouse: options?.getRememberedWarehouse,
    dataProductModels: options?.dataProductModelSource,
    // the catalog reads the definitions the engine types and runs on
    ingestDefinitions:
      options?.ingestDefinitionSource ??
      (options?.ingestCatalog instanceof V1_LegendCubeIngestCatalog
        ? options.ingestCatalog
        : undefined),
  });

/**
 * The connection explorer of a host that offers direct connections (PLAN
 * §6.8), over the same engine as its Cube engine
 */
export const buildCubeConnectionExplorer = (
  config: CubeEngineConfig,
  tracerService: TracerService,
  clientSettings?: CubeEngineClientSettings,
): CubeConnectionExplorer =>
  new V1_LegendCubeConnectionExplorer(config, tracerService, clientSettings);

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
  /**
   * The engine path of the Legend user service naming producer deployments,
   * as Marketplace configures it (`dataProductConfig.producer.deploymentLegendServiceUrl`):
   * with it, the Ingest tab shows each producer's name
   */
  readonly deploymentNameServiceUrl?: string | undefined;
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

/**
 * The published projects a cube reads Databases from (PLAN §6.3), through
 * the host's depot. It reads nothing until the source dialog's Project tab
 * asks
 */
export const buildCubeProjectCatalog = (
  depotServerClient: DepotServerClient,
): CubeProjectCatalog => new V1_LegendCubeProjectCatalog(depotServerClient);

/**
 * The services in the engine's registry (PLAN §6.4), read through their own
 * client, configured as the engine's. The registry isn't in every engine: a
 * host whose engine has none offers no catalog.
 */
export const buildCubeServiceCatalog = (
  config: CubeEngineConfig,
  tracerService: TracerService,
  clientSettings?: CubeEngineClientSettings,
): CubeServiceCatalog => {
  const engineClient = new V1_EngineServerClient(config);
  // every call throws without one
  engineClient.setTracerService(tracerService);
  clientSettings?.register(engineClient);
  return new V1_LegendCubeServiceCatalog(() => engineClient.getServicesInfo());
};

/**
 * The saved cubes of a host (PLAN §11.13): the engine's Cube store, on the
 * server the host keeps its queries on (`queryBaseUrl`, else `baseUrl`)
 */
export const buildCubeStore = (
  config: CubeEngineConfig,
  tracerService: TracerService,
  clientSettings?: CubeEngineClientSettings,
): CubeStore => new V1_LegendCubeStore(config, tracerService, clientSettings);

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
  clientSettings?: CubeEngineClientSettings,
): CubeIngestCatalog | undefined => {
  const { platformServerClient, ingestServerClient } = services;
  if (!platformServerClient || !ingestServerClient) {
    return undefined;
  }
  const engineClient = new V1_EngineServerClient(config);
  // every call throws without one
  engineClient.setTracerService(tracerService);
  clientSettings?.register(engineClient);
  const environment = new V1_CubeLakehouseEnvironmentResolver(
    services.contractServerClient,
    services.getAccessToken,
    services.getCurrentUser,
    services.getPreferredEnvironment,
  );
  const { deploymentNameServiceUrl } = services;
  return new V1_LegendCubeIngestCatalog(
    platformServerClient,
    ingestServerClient,
    () => environment.resolveBaseEnvironment(),
    (code) => engineClient.grammarToJSON_model(code),
    services.getAccessToken,
    {
      readDeploymentNames: deploymentNameServiceUrl
        ? (deploymentIds) =>
            // the parameters Marketplace's producer info sends, several ids at once
            engineClient.executeLegendUserService(
              deploymentNameServiceUrl,
              {
                env: V1_CUBE_DEPLOYMENT_DIRECTORY_ENVIRONMENT,
                deploymentIds: deploymentIds.map(Number),
              },
              EXECUTION_SERIALIZATION_FORMAT.PURE_TDSOBJECT,
            )
        : undefined,
    },
  );
};

/** The JSON without any `sourceInformation`, at any depth */
const withoutSourceInformation = (json: unknown): unknown =>
  Array.isArray(json)
    ? json.map(withoutSourceInformation)
    : json !== null && typeof json === 'object'
      ? Object.fromEntries(
          Object.entries(json)
            .filter(([key]) => key !== 'sourceInformation')
            .map(([key, value]) => [key, withoutSourceInformation(value)]),
        )
      : json;

/**
 * A lambda Cube emitted, as protocol JSON for a host to keep, e.g. in a
 * Studio ingest definition: plain JSON numbers, and none of the source
 * information Cube stamps on a lambda to place the engine's errors
 */
export const serializeCubeLambdaForHost = (lambda: IR): PlainObject =>
  withoutSourceInformation(
    JSON.parse(stringifyLosslessJSON(V1_serializeCubeLambda(lambda))),
  ) as PlainObject;

/**
 * The data sets of an ingest definition's content, its protocol JSON, in
 * order, typed from what it declares; for a host that lists definitions of
 * its own, e.g. Studio's workspace. Throws when the content can't be read.
 */
export const readCubeIngestDataSets = (
  content: PlainObject,
): CubeIngestDataSet[] => V1_readCubeIngestDataSets(content);

/**
 * The IR of a lambda's protocol JSON, Cube's or the engine's grammar's, for
 * Import Pure (PLAN §11.18): a host's matview, or a pasted lambda. Throws a
 * `CubeLambdaReadError` naming what Cube can't read.
 */
export const readCubeLambdaJson = (json: unknown): IR =>
  V1_readCubeLambda(json);

/**
 * How Import Pure stores an expression it reads into a step, and reads one a
 * step stores (PLAN §11.18): as the Extend and Filter by Expression editors
 * store the engine's JSON, with no source information and number literals as
 * their digit strings
 */
export const CUBE_EXPRESSION_CODEC: CubeExpressionCodec = {
  write: (lambda: IR): JsonObject =>
    V1_readCubeExpression(
      parseLosslessJSON(stringifyLosslessJSON(V1_serializeCubeLambda(lambda))),
    ).lambda,
  read: (json: JsonObject): IR => V1_readCubeValueSpecification(json),
};
