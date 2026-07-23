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
  type PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  primitive,
  raw,
  serialize,
} from 'serializr';
import {
  type V1_DataSubscriptionTarget,
  V1_BigQueryTarget,
  V1_CreateSubscriptionInput,
  V1_DatabricksTarget,
  V1_DataSubscription,
  V1_DataSubscriptionResponse,
  V1_DataSubscriptionsPaginatedResponse,
  V1_DataSubscriptionTargetType,
  V1_SnowflakeTarget,
  V1_UnknownDataSubscriptionTarget,
} from '../../../../lakehouse/subscriptions/V1_ConsumerSubscriptions.js';
import { V1_paginationMetadataRecordModelSchema } from './V1_CoreEntitlementsSerializationHelper.js';

export const V1_SnowflakeTargetModelSchema = createModelSchema(
  V1_SnowflakeTarget,
  {
    _type: usingConstantValueSchema(V1_DataSubscriptionTargetType.Snowflake),
    snowflakeAccountId: primitive(),
    snowflakeRegion: primitive(),
    snowflakeNetwork: primitive(),
  },
);

export const V1_BigQueryTargetModelSchema = createModelSchema(
  V1_BigQueryTarget,
  {
    _type: usingConstantValueSchema(V1_DataSubscriptionTargetType.BigQuery),
    gcpProjectId: primitive(),
  },
);

export const V1_DatabricksTargetModelSchema = createModelSchema(
  V1_DatabricksTarget,
  {
    _type: usingConstantValueSchema(V1_DataSubscriptionTargetType.Databricks),
    accountId: primitive(),
    workspaceName: primitive(),
  },
);

export const V1_UnknownDataSubscriptionTargetModelSchema = createModelSchema(
  V1_UnknownDataSubscriptionTarget,
  {
    content: raw(),
  },
);

const V1_deseralizeDataSubscriptionTarget = (
  json: PlainObject<V1_DataSubscriptionTarget>,
): V1_DataSubscriptionTarget => {
  switch (json._type) {
    case V1_DataSubscriptionTargetType.Snowflake:
      return deserialize(V1_SnowflakeTargetModelSchema, json);
    case V1_DataSubscriptionTargetType.BigQuery:
      return deserialize(V1_BigQueryTargetModelSchema, json);
    case V1_DataSubscriptionTargetType.Databricks:
      return deserialize(V1_DatabricksTargetModelSchema, json);
    default: {
      const unknownTarget = new V1_UnknownDataSubscriptionTarget();
      unknownTarget.content = json;
      return unknownTarget;
    }
  }
};

const V1_seralizeDataSubscriptionTarget = (
  json: V1_DataSubscriptionTarget,
): PlainObject<V1_DataSubscriptionTarget> => {
  if (json instanceof V1_SnowflakeTarget) {
    return serialize(V1_SnowflakeTargetModelSchema, json);
  }
  if (json instanceof V1_BigQueryTarget) {
    return serialize(V1_BigQueryTargetModelSchema, json);
  }
  if (json instanceof V1_DatabricksTarget) {
    return serialize(V1_DatabricksTargetModelSchema, json);
  }
  if (json instanceof V1_UnknownDataSubscriptionTarget) {
    return serialize(V1_UnknownDataSubscriptionTargetModelSchema, json);
  }
  throw new UnsupportedOperationError();
};

export const V1_dataSubscriptionModelSchema = createModelSchema(
  V1_DataSubscription,
  {
    guid: primitive(),
    dataContractId: primitive(),
    target: custom(
      V1_seralizeDataSubscriptionTarget,
      V1_deseralizeDataSubscriptionTarget,
    ),
    createdBy: primitive(),
  },
);

export const V1_DataSubscriptionResponseModelSchema = createModelSchema(
  V1_DataSubscriptionResponse,
  {
    subscriptions: usingModelSchema(V1_dataSubscriptionModelSchema),
  },
);

export const V1_dataSubscriptionsPaginatedResponseModelSchema =
  createModelSchema(V1_DataSubscriptionsPaginatedResponse, {
    dataContractSubscriptions: usingModelSchema(V1_dataSubscriptionModelSchema),
    paginationMetadataRecord: usingModelSchema(
      V1_paginationMetadataRecordModelSchema,
    ),
  });

export const V1_CreateSubscriptionInputModelSchema = createModelSchema(
  V1_CreateSubscriptionInput,
  {
    contractId: primitive(),
    target: custom(
      V1_seralizeDataSubscriptionTarget,
      V1_deseralizeDataSubscriptionTarget,
    ),
  },
);
