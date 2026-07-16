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
  createModelSchema,
  custom,
  deserialize,
  optional,
  primitive,
  serialize,
  type ModelSchema,
} from 'serializr';
import {
  customListWithSchema,
  optionalCustomUsingModelSchema,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  V1_AppDirComputeOwner,
  V1_Compute,
  V1_COMPUTE_ELEMENT_PROTOCOL_TYPE,
  V1_COMPUTE_OWNER_APP_DIR_TYPE,
  V1_ComputeSpecificationType,
  V1_DatabricksComputeSpecification,
  V1_DatabricksTag,
  V1_SnowflakeComputeSpecification,
  V1_UnknownComputeSpecification,
  type V1_ComputeSpecification,
} from '../../../model/packageableElements/compute/V1_Compute.js';
import { V1_AppDirNodeModelSchema } from './lakehouse/V1_CoreEntitlementsSerializationHelper.js';

const V1_appDirComputeOwnerModelSchema = createModelSchema(
  V1_AppDirComputeOwner,
  {
    _type: usingConstantValueSchema(V1_COMPUTE_OWNER_APP_DIR_TYPE),
    prodParallel: optionalCustomUsingModelSchema(V1_AppDirNodeModelSchema),
    production: optionalCustomUsingModelSchema(V1_AppDirNodeModelSchema),
  },
);

const V1_snowflakeComputeSpecificationModelSchema = createModelSchema(
  V1_SnowflakeComputeSpecification,
  {
    _type: usingConstantValueSchema(V1_ComputeSpecificationType.SNOWFLAKE),
    autoResume: optional(primitive()),
    autoSuspend: optional(primitive()),
    comment: optional(primitive()),
    enableQueryAcceleration: optional(primitive()),
    maxClusterCount: optional(primitive()),
    minClusterCount: optional(primitive()),
    queryAccelerationMaxScaleFactor: optional(primitive()),
    resourceConstraint: optional(primitive()),
    resourceMonitor: optional(primitive()),
    scalingPolicy: optional(primitive()),
    warehouseSize: optional(primitive()),
    warehouseType: optional(primitive()),
  },
);

const V1_databricksTagModelSchema = createModelSchema(V1_DatabricksTag, {
  key: primitive(),
  value: primitive(),
});

const V1_databricksComputeSpecificationModelSchema = createModelSchema(
  V1_DatabricksComputeSpecification,
  {
    _type: usingConstantValueSchema(V1_ComputeSpecificationType.DATABRICKS),
    autoStopMins: optional(primitive()),
    clusterSize: optional(primitive()),
    enablePhoton: optional(primitive()),
    maxNumClusters: optional(primitive()),
    minNumClusters: optional(primitive()),
    spotInstancePolicy: optional(primitive()),
    tags: customListWithSchema(V1_databricksTagModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  },
);

const V1_serializeComputeSpecification = (
  value: V1_ComputeSpecification,
): PlainObject<V1_ComputeSpecification> => {
  if (value instanceof V1_SnowflakeComputeSpecification) {
    return serialize(V1_snowflakeComputeSpecificationModelSchema, value);
  } else if (value instanceof V1_DatabricksComputeSpecification) {
    return serialize(V1_databricksComputeSpecificationModelSchema, value);
  } else if (value instanceof V1_UnknownComputeSpecification) {
    return value.content;
  }
  throw new UnsupportedOperationError(
    `Can't serialize compute specification: no compatible serializer available`,
    value,
  );
};

const V1_deserializeComputeSpecification = (
  json: PlainObject<V1_ComputeSpecification>,
): V1_ComputeSpecification => {
  switch (json._type) {
    case V1_ComputeSpecificationType.SNOWFLAKE:
      return deserialize(V1_snowflakeComputeSpecificationModelSchema, json);
    case V1_ComputeSpecificationType.DATABRICKS:
      return deserialize(V1_databricksComputeSpecificationModelSchema, json);
    default: {
      // forward-compat: preserve any unknown spec subtype
      const unknown = new V1_UnknownComputeSpecification();
      unknown.content = json;
      return unknown;
    }
  }
};

export const V1_computeModelSchema: ModelSchema<V1_Compute> = createModelSchema(
  V1_Compute,
  {
    _type: usingConstantValueSchema(V1_COMPUTE_ELEMENT_PROTOCOL_TYPE),
    name: primitive(),
    owner: usingModelSchema(V1_appDirComputeOwnerModelSchema),
    package: primitive(),
    specification: custom(
      V1_serializeComputeSpecification,
      V1_deserializeComputeSpecification,
    ),
  },
);
