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
  buildCubeEngine,
  type CubeEngine,
  type CubeEngineConfig,
  type CubeHost,
  LocalModelCatalog,
} from '@finos/legend-cube-builder';
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
 * Legend Query as the host of the Cube page (PLAN §3.5): Query's engine and
 * application store, and the bundled models. One per visit to the page.
 */
export class LegendQueryCubeHost implements CubeHost {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;

  /** Tests give an engine; otherwise it is built from Query's config */
  constructor(
    applicationStore: LegendQueryApplicationStore,
    engine?: CubeEngine,
  ) {
    this.applicationStore = applicationStore;
    this.engine =
      engine ??
      buildCubeEngine(
        buildLegendQueryCubeEngineConfig(applicationStore.config),
        applicationStore.tracerService,
      );
    this.modelCatalog = new LocalModelCatalog(this.engine);
  }
}
