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

import type { StoreProjectData } from './models/StoreProjectData.js';
import type { EntitiesWithOrigin, Entity } from '@finos/legend-storage';
import type { DepotServerClient } from './DepotServerClient.js';
import type { PlainObject } from '@finos/legend-shared';

export const retrieveProjectEntitiesWithDependencies = async (
  project: StoreProjectData,
  versionId: string,
  depotServerClient: DepotServerClient,
): Promise<Entity[]> => {
  const [entities, dependencyEntitiesIndex]: [
    PlainObject<Entity>[],
    Map<string, EntitiesWithOrigin>,
  ] = await Promise.all([
    depotServerClient.getEntities(project, versionId),
    depotServerClient.getIndexedDependencyEntities(project, versionId),
  ]);
  return Array.from(dependencyEntitiesIndex.values())
    .map((e) => e.entities)
    .flat()
    .concat(entities as unknown as Entity[]);
};

export const retrieveProjectEntitiesWithClassifier = async (
  project: StoreProjectData,
  versionId: string,
  classifier: string,
  depotServerClient: DepotServerClient,
): Promise<[PlainObject<Entity>[], PlainObject<Entity>[]]> => {
  const [entities, dependencyEntities]: [
    PlainObject<Entity>[],
    PlainObject<Entity>[],
  ] = await Promise.all([
    depotServerClient.getEntities(project, versionId, classifier),
    depotServerClient.getDependencyEntities(
      project.groupId,
      project.artifactId,
      versionId,
      false,
      false,
      classifier,
    ),
  ]);
  return [entities, dependencyEntities];
};
