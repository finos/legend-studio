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
  V1_AdHocDeploymentDataProductOrigin,
  V1_dataProductModelSchema,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { resolveVersion } from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import { deserialize } from 'serializr';
import type { LegendMarketplaceBaseStore } from '../stores/LegendMarketplaceBaseStore.js';

export const getDataProductFromDetails = async (
  details: V1_EntitlementsDataProductDetails,
  graphManager: V1_PureGraphManager,
  marketplaceBaseStore: LegendMarketplaceBaseStore,
): Promise<V1_DataProduct | undefined> => {
  if (details.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    const rawEntity =
      await marketplaceBaseStore.depotServerClient.getVersionEntity(
        details.origin.group,
        details.origin.artifact,
        resolveVersion(details.origin.version),
        details.fullPath,
      );
    const entity = deserialize(V1_dataProductModelSchema, rawEntity.content);
    return entity;
  } else if (details.origin instanceof V1_AdHocDeploymentDataProductOrigin) {
    const entities: Entity[] = await graphManager.pureCodeToEntities(
      details.origin.definition,
    );
    const matchingEntities = entities
      .filter((e) => e.path === details.fullPath)
      .map((entity) => deserialize(V1_dataProductModelSchema, entity.content));
    if (matchingEntities.length > 1) {
      throw new Error(
        `Multiple data products found with path ${details.fullPath} in deployed definition`,
      );
    }
    return guaranteeNonNullable(
      matchingEntities[0],
      `No data product found with path ${details.fullPath} in deployed definition`,
    );
  } else {
    return undefined;
  }
};
