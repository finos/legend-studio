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
  LegendCubeHost,
  type LegendCubeHostConfig,
  type LegendCubeHostParts,
} from '@finos/legend-cube-builder';
import type { LegendAnalyticsApplicationConfig } from '../application/LegendAnalyticsApplicationConfig.js';
import type { LegendAnalyticsApplicationStore } from './LegendAnalyticsBaseStore.js';

/**
 * Analytics' servers, as Cube's host reads them (PLAN §11.18): the engine,
 * compressed as Legend Query's is, and the depot, lakehouse and marketplace
 * where the deployment has them. Analytics remembers no lakehouse
 * environment of its own.
 */
export const buildLegendAnalyticsCubeHostConfig = (
  config: LegendAnalyticsApplicationConfig,
): LegendCubeHostConfig => {
  const publicStereotype = config.options.dataProductConfig?.publicStereotype;
  return {
    engine: {
      baseUrl: config.engineServerUrl,
      queryBaseUrl: config.engineQueryServerUrl,
      queryClientName: config.engineQueryClientName,
      enableCompression: true,
      useCookieAuthOnly: config.engineUseCookieAuthOnly,
    },
    depotServerUrl: config.depotServerUrl,
    lakehouseContractUrl: config.lakehouseContractUrl,
    lakehousePlatformUrl: config.lakehousePlatformUrl,
    marketplaceServerUrl: config.marketplaceServerUrl,
    marketplaceApplicationUrl: config.marketplaceApplicationUrl,
    marketplaceProductionParallelUrl: config.marketplaceProductionParallelUrl,
    enterpriseStereotype: publicStereotype
      ? {
          profile: publicStereotype.profile,
          value: publicStereotype.stereotype,
        }
      : undefined,
  };
};

/** Legend Analytics as the host of the Cube page: one per visit to the page */
export const createLegendAnalyticsCubeHost = (
  applicationStore: LegendAnalyticsApplicationStore,
  parts?: LegendCubeHostParts,
): LegendCubeHost =>
  new LegendCubeHost(
    applicationStore,
    buildLegendAnalyticsCubeHostConfig(applicationStore.config),
    parts,
  );
