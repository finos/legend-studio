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
  type GraphManagerState,
  type V1_EntitlementsDataProductDetails,
  type V1_PureGraphManager,
  V1_AdHocDeploymentDataProductOrigin,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { ActionState, type PlainObject } from '@finos/legend-shared';
import {
  type ProjectVersionEntities,
  resolveVersion,
} from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import type { LegendMarketplaceBaseStore } from '../stores/LegendMarketplaceBaseStore.js';

export const buildGraphForDataProduct = async (
  entitlementsDataProductDetails: V1_EntitlementsDataProductDetails,
  graphManagerState: GraphManagerState,
  graphManager: V1_PureGraphManager,
  marketplaceBaseStore: LegendMarketplaceBaseStore,
): Promise<void> => {
  if (
    entitlementsDataProductDetails.origin instanceof
    V1_AdHocDeploymentDataProductOrigin
  ) {
    const entities: Entity[] = await graphManager.pureCodeToEntities(
      entitlementsDataProductDetails.origin.definition,
    );
    await graphManager.buildGraph(
      graphManagerState.graph,
      entities,
      ActionState.create(),
    );
  } else if (
    entitlementsDataProductDetails.origin instanceof
    V1_SdlcDeploymentDataProductOrigin
  ) {
    const entitiesResponse: PlainObject<ProjectVersionEntities>[] =
      await marketplaceBaseStore.depotServerClient.getDependencyEntities(
        entitlementsDataProductDetails.origin.group,
        entitlementsDataProductDetails.origin.artifact,
        resolveVersion(entitlementsDataProductDetails.origin.version),
        true,
        true,
      );
    const entities = entitiesResponse.flatMap(
      (versionEntity) => versionEntity.entities as Entity[],
    );
    await graphManager.buildGraph(
      graphManagerState.graph,
      entities,
      ActionState.create(),
    );
  }
};
