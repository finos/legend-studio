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
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import type { TracerService } from '@finos/legend-shared';
import type { CubeConnectionExplorer } from '../../CubeConnectionExplorer.js';
import type { CubeDataProductCatalog } from '../../CubeDataProductCatalog.js';
import type { CubeEngine } from '../../CubeEngine.js';
import type { CubeLakehouseEnvironment } from '../../CubeLakehouseEnvironment.js';
import { V1_CubeLakehouseEnvironmentResolver } from './v1/V1_CubeLakehouseEnvironmentResolver.js';
import { V1_LegendCubeConnectionExplorer } from './v1/V1_LegendCubeConnectionExplorer.js';
import { V1_LegendCubeDataProductCatalog } from './v1/V1_LegendCubeDataProductCatalog.js';
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
  },
): CubeEngine => new V1_LegendCubeEngine(config, tracerService, options);

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
}

/** The deployed data products of a host with a lakehouse and a depot */
export const buildCubeDataProductCatalog = (
  services: CubeLakehouseServices,
): CubeDataProductCatalog =>
  new V1_LegendCubeDataProductCatalog(
    services.contractServerClient,
    services.depotServerClient,
    services.getAccessToken,
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
