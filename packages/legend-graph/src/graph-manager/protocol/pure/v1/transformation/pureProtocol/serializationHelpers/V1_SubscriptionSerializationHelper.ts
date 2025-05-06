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
  serialize,
} from 'serializr';
import {
  type V1_DataSubscriptionTarget,
  V1_CreateSubscriptionInput,
  V1_DataSubscription,
  V1_DataSubscriptionResponse,
  V1_DataSubscriptionTargetType,
  V1_SnowflakeTarget,
} from '../../../subscriptions/V1_ConsumerSubscriptions.js';

export const V1_SnowflakeTargetModelSchema = createModelSchema(
  V1_SnowflakeTarget,
  {
    _type: usingConstantValueSchema(V1_DataSubscriptionTargetType.Snowflake),
    snowflakeAccountId: primitive(),
    snowflakeRegion: primitive(),
    snowflakeNetwork: primitive(),
  },
);

const V1_deseralizeDataSubscriptionTarget = (
  json: PlainObject<V1_DataSubscriptionTarget>,
): V1_DataSubscriptionTarget => {
  switch (json._type) {
    case V1_DataSubscriptionTargetType.Snowflake:
      return deserialize(V1_SnowflakeTargetModelSchema, json);
    default:
      throw new UnsupportedOperationError();
  }
};

const V1_seralizeDataSubscriptionTarget = (
  json: V1_DataSubscriptionTarget,
): PlainObject<V1_DataSubscriptionTarget> => {
  if (json instanceof V1_SnowflakeTarget) {
    return serialize(V1_SnowflakeTargetModelSchema, json);
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
