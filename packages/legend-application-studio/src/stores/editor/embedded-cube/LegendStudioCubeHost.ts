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
  LocalModelCatalog,
  type CubeEngine,
  type CubeHost,
} from '@finos/legend-cube-builder';
import type { LegendStudioApplicationStore } from '../../LegendStudioBaseStore.js';
import type { EditorStore } from '../EditorStore.js';
import { LegendStudioCubeIngestCatalog } from './LegendStudioCubeIngestCatalog.js';

/**
 * Studio as the host of Legend Cube: Studio's engine and application store,
 * and the project's own ingest definitions as the only sources, run on the
 * project's lakehouse runtime. No sample data, examples, databases, data
 * products or services. One per opening of the cube.
 */
export class LegendStudioCubeHost implements CubeHost {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;
  readonly ingestCatalog: LegendStudioCubeIngestCatalog;
  readonly offersSampleData = false;

  constructor(editorStore: EditorStore) {
    const { applicationStore } = editorStore;
    const { config } = applicationStore;
    this.applicationStore = applicationStore;
    this.ingestCatalog = new LegendStudioCubeIngestCatalog(editorStore);
    // the engine Studio's own editor uses, configured the same way
    this.engine = buildCubeEngine(
      {
        baseUrl:
          editorStore.editorConfig?.engineServerUrl ?? config.engineServerUrl,
        queryBaseUrl:
          editorStore.editorConfig?.engineQueryServerUrl ??
          config.engineQueryServerUrl,
        queryClientName: config.engineQueryClientName,
        enableCompression: true,
        useCookieAuthOnly: config.engineUseCookieAuthOnly,
      },
      applicationStore.tracerService,
      {
        ingestCatalog: this.ingestCatalog,
        ingestDefinitionSource: this.ingestCatalog,
      },
    );
    this.modelCatalog = new LocalModelCatalog(this.engine);
  }
}
