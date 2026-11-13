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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import { InMemoryGraphData, type GraphManagerState } from '@finos/legend-graph';
import type { ActionState } from '@finos/legend-shared';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { EntitiesWithOrigin, Entity } from '@finos/legend-storage';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { DSL_DataSpace_getGraphManagerExtension } from '../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { DataSpaceViewerState } from './DataSpaceViewerState.js';

export type DataSpaceViewerActions = Omit<
  ConstructorParameters<typeof DataSpaceViewerState>[7],
  'retrieveGraphData'
>;

export interface DataSpacePreviewOrigin {
  groupId: string;
  artifactId: string;
  versionId: string;
}

/**
 * The DataSpace to preview among *entities*: *preferredPath* when given -- and only
 * that one, never another in its place -- else the only one the model has.
 */
export const findDataSpaceEntity = (
  entities: Entity[],
  preferredPath?: string,
): Entity => {
  const dataSpaces = entities.filter(
    (entity) => entity.classifierPath === DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  );
  const has = `the model has: ${
    dataSpaces.map((entity) => entity.path).join(', ') || 'none'
  }`;
  if (preferredPath !== undefined) {
    const preferred = dataSpaces.find(
      (entity) => entity.path === preferredPath,
    );
    if (!preferred) {
      throw new Error(`No data product ${preferredPath} to preview; ${has}`);
    }
    return preferred;
  }
  if (dataSpaces.length !== 1) {
    throw new Error(
      dataSpaces.length
        ? `More than one data product to preview; ${has}`
        : 'No data product to preview',
    );
  }
  return dataSpaces[0] as Entity;
};

/**
 * A viewer for the DataSpace *dataSpacePath* of the model *graphManagerState*
 * has built: the DataSpace analysed over *entities* (the model's own and its
 * dependencies'), then viewed over that graph. Studio's editor preview passes
 * the graph it already has; `previewDataSpaceFromEntities` builds one first.
 */
export const previewDataSpace = async (
  applicationStore: GenericLegendApplicationStore,
  graphManagerState: GraphManagerState,
  dataSpacePath: string,
  entities: () => Promise<Entity[]>,
  origin: DataSpacePreviewOrigin,
  depotServerClient: DepotServerClient | undefined,
  actions: DataSpaceViewerActions,
  actionState?: ActionState,
): Promise<DataSpaceViewerState> => {
  const analysisResult = await DSL_DataSpace_getGraphManagerExtension(
    graphManagerState.graphManager,
  ).analyzeDataSpace(dataSpacePath, entities, undefined, actionState);
  return new DataSpaceViewerState(
    applicationStore,
    graphManagerState,
    origin.groupId,
    origin.artifactId,
    origin.versionId,
    analysisResult,
    depotServerClient,
    {
      ...actions,
      retrieveGraphData: () => new InMemoryGraphData(graphManagerState.graph),
    },
  );
};

/**
 * A viewer for the DataSpace *dataSpacePath* of a model that exists only as
 * entities -- unsaved or unreleased, as Studio previews one in its editor --
 * with its dependencies' entities by project (as
 * `collectIndexedDependencyEntities` gives them). The graph is built, not just
 * handed to the analysis: the viewer reads graph data as soon as the DataSpace
 * has a default execution context.
 */
export const previewDataSpaceFromEntities = async (
  applicationStore: GenericLegendApplicationStore,
  graphManagerState: GraphManagerState,
  ownEntities: Entity[],
  dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  dataSpacePath: string,
  origin: DataSpacePreviewOrigin,
  depotServerClient: DepotServerClient | undefined,
  actions: DataSpaceViewerActions,
): Promise<DataSpaceViewerState> => {
  await graphManagerState.initializeSystem();
  const dependencyManager =
    graphManagerState.graphManager.createDependencyManager();
  graphManagerState.graph.dependencyManager = dependencyManager;
  await graphManagerState.graphManager.buildDependencies(
    graphManagerState.coreModel,
    graphManagerState.systemModel,
    dependencyManager,
    dependencyEntitiesIndex,
    graphManagerState.dependenciesBuildState,
  );
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    ownEntities,
    graphManagerState.graphBuildState,
  );
  const dependencyEntities = Array.from(
    dependencyEntitiesIndex.values(),
  ).flatMap((project) => project.entities);
  return previewDataSpace(
    applicationStore,
    graphManagerState,
    dataSpacePath,
    () => Promise.resolve(ownEntities.concat(dependencyEntities)),
    origin,
    depotServerClient,
    actions,
  );
};
