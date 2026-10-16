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
import type { IngestDefinition } from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import { LegendStudioCubeDataProductCatalog } from './LegendStudioCubeDataProductCatalog.js';
import { LegendStudioCubeIngestCatalog } from './LegendStudioCubeIngestCatalog.js';
import { LegendStudioCubeWorkspace } from './LegendStudioCubeWorkspace.js';

/**
 * Studio as the host of Legend Cube: Studio's engine and application store,
 * and the project's own ingest definitions and data products as the only
 * sources, typed and run on the workspace and the project's lakehouse
 * runtime. No sample data, examples, databases or services. One per opening
 * of the cube.
 */
export class LegendStudioCubeHost implements CubeHost {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;
  readonly project: LegendStudioCubeWorkspace;
  readonly ingestCatalog: LegendStudioCubeIngestCatalog;
  readonly dataProductCatalog: LegendStudioCubeDataProductCatalog;
  readonly offersSampleData = false;

  constructor(
    editorStore: EditorStore,
    /** The ingest definition Cube was opened from (Create MatView), whose owner sets the default class */
    opened?: IngestDefinition,
  ) {
    const { applicationStore } = editorStore;
    const { config } = applicationStore;
    this.applicationStore = applicationStore;
    this.project = new LegendStudioCubeWorkspace(editorStore);
    this.ingestCatalog = new LegendStudioCubeIngestCatalog(
      editorStore,
      this.project,
      opened,
    );
    // the engine Studio's own editor uses, configured the same way; a run
    // reads the workspace, and names the project's lakehouse environment
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
        lakehouseEnvironment: this.project,
        dataProductModelSource: this.project,
      },
    );
    this.dataProductCatalog = new LegendStudioCubeDataProductCatalog(
      editorStore,
      this.project,
      this.engine,
    );
    this.modelCatalog = new LocalModelCatalog(this.engine);
  }
}
