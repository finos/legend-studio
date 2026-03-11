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
  customListWithSchema,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  serialize,
} from 'serializr';
import {
  type V1_EntitlementsDataProductOrigin,
  V1_AccessPointGroupStereotypeMapping,
  V1_AdHocDeploymentDataProductOrigin,
  V1_EntitlementsAccessPoint,
  V1_EntitlementsDataProduct,
  V1_EntitlementsDataProductDetails,
  V1_EntitlementsDataProductDetailsResponse,
  V1_EntitlementsDataProductLite,
  V1_EntitlementsDataProductLiteResponse,
  V1_EntitlementsLakehouseEnvironment,
  V1_SdlcDeploymentDataProductOrigin,
  V1_UnknownDataProductOriginType,
} from '../../../../lakehouse/entitlements/V1_EntitlementsDataProduct.js';
import { V1_AppDirNodeModelSchema } from './V1_CoreEntitlementsSerializationHelper.js';
import { V1_stereotypePtrModelSchema } from '../V1_CoreSerializationHelper.js';

export enum V1_DataProductOriginType {
  AD_HOC_DEPLOYMENT = 'AdHocDeployment',
  SDLC_DEPLOYMENT = 'SdlcDeployment',
}

export const V1_EntitlementsAccessPointModelSchema = createModelSchema(
  V1_EntitlementsAccessPoint,
  {
    name: primitive(),
    groups: list(primitive()),
  },
);

export const V1_AccessPointGroupStereotypeMappingModelSchema =
  createModelSchema(V1_AccessPointGroupStereotypeMapping, {
    accessPointGroup: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema),
  });

export const V1_EntitlementsDataProductModelSchema = createModelSchema(
  V1_EntitlementsDataProduct,
  {
    name: primitive(),
    accessPoints: customListWithSchema(V1_EntitlementsAccessPointModelSchema),
    accessPointGroupStereotypeMappings: customListWithSchema(
      V1_AccessPointGroupStereotypeMappingModelSchema,
    ),
    owner: usingModelSchema(V1_AppDirNodeModelSchema),
  },
);

export const V1_AdHocDeploymentDataProductOriginModelSchema = createModelSchema(
  V1_AdHocDeploymentDataProductOrigin,
  {
    type: usingConstantValueSchema(V1_DataProductOriginType.AD_HOC_DEPLOYMENT),
    definition: primitive(),
  },
);

export const V1_SdlcDeploymentDataProductOriginModelSchema = createModelSchema(
  V1_SdlcDeploymentDataProductOrigin,
  {
    type: usingConstantValueSchema(V1_DataProductOriginType.SDLC_DEPLOYMENT),
    group: primitive(),
    artifact: primitive(),
    version: primitive(),
  },
);

const V1_deserializeDataProductOrigin = (
  json: PlainObject<V1_EntitlementsDataProductOrigin> | null,
): V1_EntitlementsDataProductOrigin | null => {
  if (json === null) {
    return null;
  }
  switch (json.type) {
    case V1_DataProductOriginType.AD_HOC_DEPLOYMENT:
      return deserialize(V1_AdHocDeploymentDataProductOriginModelSchema, json);
    case V1_DataProductOriginType.SDLC_DEPLOYMENT:
      return deserialize(V1_SdlcDeploymentDataProductOriginModelSchema, json);
    default: {
      // Fall back to create unknown stub if not supported
      const origin = new V1_UnknownDataProductOriginType();
      origin.content = json;
      return origin;
    }
  }
};

const V1_serializeDataProductOrigin = (
  origin: V1_EntitlementsDataProductOrigin | null,
): PlainObject<V1_EntitlementsDataProductOrigin> => {
  if (origin instanceof V1_AdHocDeploymentDataProductOrigin) {
    return serialize(V1_AdHocDeploymentDataProductOriginModelSchema, origin);
  }
  if (origin instanceof V1_SdlcDeploymentDataProductOrigin) {
    return serialize(V1_SdlcDeploymentDataProductOriginModelSchema, origin);
  }
  throw new UnsupportedOperationError(
    `Can't serialize unsupported data product origin type: ${origin?.constructor.name}`,
  );
};

export const V1_EntitlementsLakehouseEnvironmentModelSchema = createModelSchema(
  V1_EntitlementsLakehouseEnvironment,
  {
    producerEnvironmentName: primitive(),
    type: primitive(),
  },
);

export const V1_EntitlementsDataProductDetailsModelSchema = createModelSchema(
  V1_EntitlementsDataProductDetails,
  {
    id: primitive(),
    deploymentId: primitive(),
    title: optional(primitive()),
    description: optional(primitive()),
    origin: custom(
      V1_serializeDataProductOrigin,
      V1_deserializeDataProductOrigin,
    ),
    lakehouseEnvironment: usingModelSchema(
      V1_EntitlementsLakehouseEnvironmentModelSchema,
    ),
    dataProduct: usingModelSchema(V1_EntitlementsDataProductModelSchema),
    fullPath: primitive(),
  },
);

export const V1_EntitlementsDataProductLiteModelSchema = createModelSchema(
  V1_EntitlementsDataProductLite,
  {
    id: primitive(),
    deploymentId: primitive(),
    title: optional(primitive()),
    description: optional(primitive()),
    origin: custom(
      V1_serializeDataProductOrigin,
      V1_deserializeDataProductOrigin,
    ),
    fullPath: optional(primitive()),
    lakehouseEnvironment: usingModelSchema(
      V1_EntitlementsLakehouseEnvironmentModelSchema,
    ),
  },
);

export const V1_EntitlementsDataProductDetailsResponseModelSchema =
  createModelSchema(V1_EntitlementsDataProductDetailsResponse, {
    dataProducts: customListWithSchema(
      V1_EntitlementsDataProductDetailsModelSchema,
    ),
  });

export const V1_EntitlementsDataProductLiteResponseModelSchema =
  createModelSchema(V1_EntitlementsDataProductLiteResponse, {
    dataProducts: customListWithSchema(
      V1_EntitlementsDataProductLiteModelSchema,
    ),
  });

export const V1_entitlementsDataProductDetailsResponseToDataProductDetails = (
  json: PlainObject<V1_EntitlementsDataProductDetailsResponse>,
): V1_EntitlementsDataProductDetails[] => {
  const response = deserialize(
    V1_EntitlementsDataProductDetailsResponseModelSchema,
    json,
  );
  return response.dataProducts ?? [];
};

export const V1_entitlementsDataProductLiteResponseToDataProductLite = (
  json: PlainObject<V1_EntitlementsDataProductLiteResponse>,
): V1_EntitlementsDataProductLite[] => {
  const response = deserialize(
    V1_EntitlementsDataProductLiteResponseModelSchema,
    json,
  );
  return response.dataProducts ?? [];
};
