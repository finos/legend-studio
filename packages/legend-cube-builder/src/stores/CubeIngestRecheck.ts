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

import type {
  IngestDatasetSource,
  ModelContext,
  Schema,
} from '@finos/legend-cube';
import { CUBE_INGEST_RECHECK_MESSAGE } from '../__lib__/LegendCubeIngestLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../graph-manager/CubeEngine.js';
import {
  checkCubeIngestModel,
  getCubeIngestSettings,
} from '../graph-manager/CubeIngest.js';
import type { CubeIngestCatalog } from '../graph-manager/CubeIngestCatalog.js';

/**
 * Reads an ingest cube's data sets again (PLAN §6.7): their columns as their
 * deployed definitions declare them, through the catalog, with no engine
 * call; `fresh` reads the definitions again rather than what this page visit
 * read. One answer per source, failures included; never rejects.
 */
export const recheckCubeIngestSources = async (
  catalog: CubeIngestCatalog | undefined,
  model: ModelContext,
  sources: readonly IngestDatasetSource[],
  fresh = false,
): Promise<Map<NodeId, Schema | CubeEngineError>> => {
  const failAll = (
    kind: CubeEngineErrorKind,
    detail: string,
  ): Map<NodeId, Schema | CubeEngineError> =>
    new Map(
      sources.map((source) => [
        source.id,
        new CubeEngineError(kind, detail, source.id),
      ]),
    );
  if (!catalog) {
    return failAll(
      CubeEngineErrorKind.UNSUPPORTED_MODEL,
      CUBE_INGEST_RECHECK_MESSAGE.NO_CATALOG,
    );
  }
  const settings = getCubeIngestSettings(model);
  if (!settings) {
    return failAll(
      CubeEngineErrorKind.UNSUPPORTED_MODEL,
      checkCubeIngestModel(model).join('\n'),
    );
  }
  try {
    return await catalog.resolveSchemas(
      settings.environmentType,
      new Map(
        sources.map((source) => [
          source.id,
          {
            ingestDefinitionUrn: source.ingestDefinitionUrn,
            ingestDefinition: source.ingestDefinition,
            dataSet: source.dataSet,
          },
        ]),
      ),
      { fresh },
    );
  } catch (error) {
    return error instanceof CubeEngineError
      ? failAll(error.kind, error.detail)
      : failAll(
          CubeEngineErrorKind.NETWORK,
          error instanceof Error ? error.message : String(error),
        );
  }
};
