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
  createModelSchema,
  deserialize,
  optional,
  primitive,
  serialize,
} from 'serializr';
import {
  type V1_AccessPoint,
  V1_AccessPointGroup,
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  V1_DataProduct,
  V1_LakehouseAccessPoint,
  V1_UnknownAccessPoint,
} from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import {
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  customList,
  type PlainObject,
  customListWithSchema,
} from '@finos/legend-shared';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper.js';

export enum V1_AccessPointType {
  LAKEHOUSE = 'lakehouseAccessPoint',
  EQUAL_TO_JSON = 'equalToJson',
  EQUAL_TO_TDS = 'equalToTDS',
}

export const V1_lakehouseAccessPointModelSchema = createModelSchema(
  V1_LakehouseAccessPoint,
  {
    _type: usingConstantValueSchema(V1_AccessPointType.LAKEHOUSE),
    id: primitive(),
    description: optional(primitive()),
    targetEnvironment: primitive(),
    func: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

const V1_serializeAccessPoint = (
  protocol: V1_AccessPoint,
): PlainObject<V1_AccessPoint> => {
  if (protocol instanceof V1_LakehouseAccessPoint) {
    return serialize(V1_lakehouseAccessPointModelSchema, protocol);
  } else if (protocol instanceof V1_UnknownAccessPoint) {
    return protocol.content;
  }
  throw new UnsupportedOperationError(
    `Can't serialize access point type`,
    protocol,
  );
};

const V1_deserializeAccessPoint = (
  json: PlainObject<V1_AccessPoint>,
): V1_AccessPoint => {
  switch (json._type) {
    case V1_AccessPointType.LAKEHOUSE:
      return deserialize(V1_lakehouseAccessPointModelSchema, json);
    default: {
      const unknown = new V1_UnknownAccessPoint();
      unknown.content = json;
      unknown.id = json.id as string;
      return unknown;
    }
  }
};

export const V1_AccessPointGroupModelSchema = createModelSchema(
  V1_AccessPointGroup,
  {
    id: primitive(),
    description: optional(primitive()),
    accessPoints: customList(
      V1_serializeAccessPoint,
      V1_deserializeAccessPoint,
    ),
  },
);

export const V1_dataProductModelSchema = createModelSchema(V1_DataProduct, {
  _type: usingConstantValueSchema(V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE),
  name: primitive(),
  package: primitive(),
  title: optional(primitive()),
  description: optional(primitive()),
  accessPointGroups: customListWithSchema(V1_AccessPointGroupModelSchema),
});
