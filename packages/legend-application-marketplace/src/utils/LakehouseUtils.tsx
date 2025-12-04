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
  type V1_DataProduct,
  V1_AdHocDeploymentDataProductOrigin,
  V1_dataProductModelSchema,
  V1_SdlcDeploymentDataProductOrigin,
  CORE_PURE_PATH,
} from '@finos/legend-graph';
import {
  ActionState,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type ProjectVersionEntities,
  resolveVersion,
} from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import { deserialize } from 'serializr';
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
    const entities: Entity[] = (await graphManager.pureCodeToEntities(
      entitlementsDataProductDetails.origin.definition,
    )) as Entity[];
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

export const getDataProductFromDetails = async (
  details: V1_EntitlementsDataProductDetails,
  graphManager: V1_PureGraphManager,
  marketplaceBaseStore: LegendMarketplaceBaseStore,
): Promise<V1_DataProduct | undefined> => {
  if (details.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    const rawEntities =
      (await marketplaceBaseStore.depotServerClient.getVersionEntities(
        details.origin.group,
        details.origin.artifact,
        resolveVersion(details.origin.version),
        CORE_PURE_PATH.DATA_PRODUCT,
      )) as {
        artifactId: string;
        entity: Entity;
        groupId: string;
        versionId: string;
        versionedEntity: boolean;
      }[];
    const entities = rawEntities.map((entity) =>
      deserialize(
        V1_dataProductModelSchema(
          graphManager.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        entity.entity.content,
      ),
    );
    const matchingEntities = entities.filter(
      (entity) => entity.name.toLowerCase() === details.id.toLowerCase(),
    );
    if (matchingEntities.length === 0) {
      throw new Error(
        `No data product found with name ${details.id} in project`,
      );
    } else if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with name ${details.id} in project`,
      );
    }
    return matchingEntities[0];
  } else if (details.origin instanceof V1_AdHocDeploymentDataProductOrigin) {
    const entities: Entity[] = await graphManager.pureCodeToEntities(
      details.origin.definition,
    );
    const elements = entities
      .filter((e) => e.classifierPath === CORE_PURE_PATH.DATA_PRODUCT)
      .map((entity) =>
        deserialize(
          V1_dataProductModelSchema(
            graphManager.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          entity.content,
        ),
      );
    const matchingEntities = elements.filter(
      (element) => element.name.toLowerCase() === details.id.toLowerCase(),
    );
    if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with name ${details.id} in deployed definition`,
      );
    }
    return guaranteeNonNullable(
      matchingEntities[0],
      `No data product found with name ${details.id} in deployed definition`,
    );
  } else {
    return undefined;
  }
};
