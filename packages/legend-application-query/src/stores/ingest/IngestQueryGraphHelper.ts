/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  type DepotServerClient,
  resolveVersion,
} from '@finos/legend-server-depot';
import type { Entity, EntityWithOrigin } from '@finos/legend-storage';
import {
  type GraphManagerState,
  CORE_PURE_PATH,
  createGraphBuilderReport,
  IngestDefinition,
  LegendSDLC,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';

/**
 * Shared helpers for ingest-backed query flows (creator + existing-query
 * loader). Centralizes how we list / cache / swap ingest definitions in the
 * graph so both flows stay in lockstep.
 *
 * Why these live outside the stores: both
 * {@link IngestQueryCreatorStore} (deep-link flow) and
 * {@link ExistingQueryEditorStore} (saved-query flow) need to:
 *   1. fetch every ingest entity in a project version (cheap, classifier-
 *      scoped depot call) so the source dropdown can list them all, and
 *   2. build only the active ingest into the graph, swapping it out when the
 *      user picks a different one.
 * Keeping the logic in one module avoids the two stores drifting apart.
 */

/**
 * Fetch every {@link IngestDefinition} entity for a project version via the
 * classifier-scoped variant of `getVersionEntities`. The endpoint returns
 * {@link EntityWithOrigin}-shaped payloads (entity wrapped with GAV) rather
 * than raw entities, so we unwrap explicitly.
 *
 * Filters by `classifierPath` defensively in case the server returns extras.
 */
export const fetchIngestEntitiesByClassifier = async (
  depotServerClient: DepotServerClient,
  groupId: string,
  artifactId: string,
  versionId: string,
): Promise<Map<string, Entity>> => {
  const wrapped = (await depotServerClient.getVersionEntities(
    groupId,
    artifactId,
    resolveVersion(versionId),
    CORE_PURE_PATH.INGEST_DEFINITION,
  )) as unknown as EntityWithOrigin[];
  const entities = wrapped
    .map((w) => w.entity)
    .filter((e) => e.classifierPath === CORE_PURE_PATH.INGEST_DEFINITION);
  return new Map(entities.map((e) => [e.path, e]));
};

/**
 * Build the given ingest entity into `graph`. If `currentPath` is provided
 * and resolves to an existing ingest on the graph, that ingest is removed
 * first — this is the swap path used when the user picks a different ingest
 * from the source dropdown.
 *
 * The SDLC origin is only set when the graph has none yet, so subsequent
 * swaps (which run after the initial graph build set the origin) don't
 * clobber it.
 */
export const swapIngestInGraph = async (
  graphManagerState: GraphManagerState,
  entity: Entity,
  options: {
    currentPath?: string | undefined;
    groupId: string;
    artifactId: string;
    versionId: string;
  },
): Promise<IngestDefinition> => {
  if (options.currentPath !== undefined) {
    const current = graphManagerState.graph.ingests.find(
      (i) => i.path === options.currentPath,
    );
    if (current) {
      graphManagerState.graph.deleteElement(current);
    }
  }
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    [entity],
    graphManagerState.graphBuildState,
    graphManagerState.graph.origin === undefined
      ? {
          origin: new LegendSDLC(
            options.groupId,
            options.artifactId,
            resolveVersion(options.versionId),
          ),
        }
      : undefined,
    createGraphBuilderReport(),
  );
  return guaranteeType(
    graphManagerState.graph.getElement(entity.path),
    IngestDefinition,
    `Can't find ingest definition '${entity.path}' after build`,
  );
};
