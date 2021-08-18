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

import type { PlainObject } from '@finos/legend-shared';
import {
  usingConstantValueSchema,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  primitive,
  serialize,
  SKIP,
} from 'serializr';
import { V1_BusinessMilestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessMilestoning';
import { V1_BusinessSnapshotMilestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessSnapshotMilestoning';
import type { V1_Milestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_Milestoning';
import { V1_ProcessingMilestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_ProcessingMilestoning';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';
import {
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './V1_RawValueSpecificationSerializationHelper';

enum V1_MilestoningType {
  BUSINESS_MILESTONING = 'businessMilestoning',
  BUSINESS_SNAPSHOT_MILESTONING = 'businessSnapshotMilestoning',
  PROCESSING_MILESTONING = 'processingMilestoning',
}

const businessMilestoningModelSchema = createModelSchema(
  V1_BusinessMilestoning,
  {
    _type: usingConstantValueSchema(V1_MilestoningType.BUSINESS_MILESTONING),
    from: primitive(),
    infinityDate: custom(
      (val) => (val ? V1_serializeRawValueSpecification(val) : SKIP),
      (val) => (val ? V1_deserializeRawValueSpecification(val) : SKIP),
    ),
    thru: primitive(),
    thruIsInclusive: primitive(),
  },
);

const businessSnapshotMilestoningModelSchema = createModelSchema(
  V1_BusinessSnapshotMilestoning,
  {
    _type: usingConstantValueSchema(
      V1_MilestoningType.BUSINESS_SNAPSHOT_MILESTONING,
    ),
    infinityDate: custom(
      (val) => (val ? V1_serializeRawValueSpecification(val) : SKIP),
      (val) => (val ? V1_deserializeRawValueSpecification(val) : SKIP),
    ),
    snapshotDate: primitive(),
  },
);

const processingMilestoningModelSchema = createModelSchema(
  V1_ProcessingMilestoning,
  {
    _type: usingConstantValueSchema(V1_MilestoningType.PROCESSING_MILESTONING),
    in: primitive(),
    infinityDate: custom(
      (val) => (val ? V1_serializeRawValueSpecification(val) : SKIP),
      (val) => (val ? V1_deserializeRawValueSpecification(val) : SKIP),
    ),
    out: primitive(),
    outIsInclusive: primitive(),
  },
);

export const V1_serializeMilestoning = (
  protocol: V1_Milestoning,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_Milestoning> => {
  if (protocol instanceof V1_BusinessMilestoning) {
    return serialize(businessMilestoningModelSchema, protocol);
  } else if (protocol instanceof V1_BusinessSnapshotMilestoning) {
    return serialize(businessSnapshotMilestoningModelSchema, protocol);
  } else if (protocol instanceof V1_ProcessingMilestoning) {
    return serialize(processingMilestoningModelSchema, protocol);
  }
  const extraMilestoningProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMilestoningProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraMilestoningProtocolSerializers) {
    const milestoningProtocolJson = serializer(protocol);
    if (milestoningProtocolJson) {
      return milestoningProtocolJson;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize milestoning: no compatible serializer available from plugins`,
    protocol,
  );
};

export const V1_deserializeMilestoning = (
  json: PlainObject<V1_Milestoning>,
  plugins: PureProtocolProcessorPlugin[],
): V1_Milestoning => {
  switch (json._type) {
    case V1_MilestoningType.BUSINESS_MILESTONING:
      return deserialize(businessMilestoningModelSchema, json);
    case V1_MilestoningType.BUSINESS_SNAPSHOT_MILESTONING:
      return deserialize(businessSnapshotMilestoningModelSchema, json);
    case V1_MilestoningType.PROCESSING_MILESTONING:
      return deserialize(processingMilestoningModelSchema, json);
    default: {
      const extraMilestoningProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraMilestoningProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraMilestoningProtocolDeserializers) {
        const milestoningProtocol = deserializer(json);
        if (milestoningProtocol) {
          return milestoningProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize milestoning of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};
