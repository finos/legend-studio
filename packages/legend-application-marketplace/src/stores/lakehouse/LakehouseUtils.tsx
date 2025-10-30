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
  type V1_EntitlementsDataProductDetails,
  type V1_PureGraphManager,
  type V1_DataProduct,
  CORE_PURE_PATH,
  V1_AdHocDeploymentDataProductOrigin,
  V1_dataProductModelSchema,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { resolveVersion } from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';

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
