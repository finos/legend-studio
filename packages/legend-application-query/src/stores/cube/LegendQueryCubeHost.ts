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
  buildLegendCubeLakehouseServices,
  LegendCubeHost,
  type CubeConnectionExplorer,
  type CubeEngine,
  type CubeEngineConfig,
  type CubeLakehouseServices,
  type CubeProjectCatalog,
  type LegendCubeHostConfig,
} from '@finos/legend-cube-builder';
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
 * Query's servers, as Cube's host reads them (PLAN §11.18): Query's engine,
 * depot, lakehouse and marketplace, configured as Query's own, and the
 * lakehouse environment Query remembers for the viewer
 */
export const buildLegendQueryCubeHostConfig = (
  applicationStore: LegendQueryApplicationStore,
): LegendCubeHostConfig => {
  const { config } = applicationStore;
  return {
    engine: buildLegendQueryCubeEngineConfig(config),
    depotServerUrl: config.depotServerUrl,
    lakehouseContractUrl: config.lakehouseContractUrl,
    lakehousePlatformUrl: config.lakehousePlatformUrl,
    marketplaceServerUrl: config.marketplaceServerUrl,
    // a data product links to the marketplace of its deployment's class;
    // Query's own links choose by a SNAPSHOT version instead
    marketplaceApplicationUrl: config.marketplaceApplicationUrl,
    marketplaceProductionParallelUrl: config.marketplaceProductionParallelUrl,
    // the stereotype Studio and Marketplace mark groups open to everyone with
    enterpriseStereotype: config.options.dataProductConfig?.publicStereotype
      ? {
          profile: config.options.dataProductConfig.publicStereotype.profile,
          value: config.options.dataProductConfig.publicStereotype.stereotype,
        }
      : undefined,
    // the environment Query remembers for the viewer, as Query's editor uses it
    getPreferredEnvironment: () =>
      LegendQueryUserDataHelper.getLakehouseUserInfo(
        applicationStore.userDataService,
      )?.env,
  };
};

/**
 * What Cube needs to read and run data products (PLAN §6.8), with Query's
 * lakehouse and depot: none when Query has no lakehouse, so an open-source
 * deployment without one offers no data products
 */
export const buildLegendQueryCubeLakehouseServices = (
  applicationStore: LegendQueryApplicationStore,
): CubeLakehouseServices | undefined =>
  buildLegendCubeLakehouseServices(
    applicationStore,
    buildLegendQueryCubeHostConfig(applicationStore),
  );

/**
 * Legend Query as the host of the Cube page (PLAN §3.5): the host a Legend
 * deployment gives Cube (PLAN §11.18), from Query's config. One per visit to
 * the page.
 */
export class LegendQueryCubeHost extends LegendCubeHost {
  /**
   * Tests give an engine, an explorer and a project catalog; otherwise each
   * is built from Query's config
   */
  constructor(
    applicationStore: LegendQueryApplicationStore,
    engine?: CubeEngine,
    connectionExplorer?: CubeConnectionExplorer,
    projectCatalog?: CubeProjectCatalog,
  ) {
    super(applicationStore, buildLegendQueryCubeHostConfig(applicationStore), {
      engine,
      connectionExplorer,
      projectCatalog,
    });
  }
}
