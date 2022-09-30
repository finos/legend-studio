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
  custom,
  deserialize,
  list,
  object,
  optional,
  primitive,
  serialize,
  SKIP,
} from 'serializr';
import {
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
  V1_packageableElementPointerDeserializerSchema,
} from '@finos/legend-graph';
import {
  type PlainObject,
  deserializeArray,
  serializeArray,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  optionalCustom,
} from '@finos/legend-shared';
import {
  type V1_DataSpaceSupportInfo,
  V1_DataSpace,
  V1_DataSpaceExecutionContext,
  V1_DataSpaceSupportEmail,
} from '../../model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';

export const V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE = 'dataSpace';
export const V1_DATA_SPACE_SUPPORT_EMAIL_TYPE = 'email';

const V1_dataSpaceExecutionContextModelSchema = createModelSchema(
  V1_DataSpaceExecutionContext,
  {
    defaultRuntime: usingModelSchema(
      V1_packageableElementPointerDeserializerSchema,
    ),
    description: optional(primitive()),
    mapping: usingModelSchema(V1_packageableElementPointerDeserializerSchema),
    name: primitive(),
  },
);

const V1_dataSpaceSupportEmail = createModelSchema(V1_DataSpaceSupportEmail, {
  _type: usingConstantValueSchema(V1_DATA_SPACE_SUPPORT_EMAIL_TYPE),
  address: primitive(),
});

const V1_serializeSupportInfo = (
  protocol: V1_DataSpaceSupportInfo | undefined,
): PlainObject<V1_DataSpaceSupportInfo> | typeof SKIP => {
  if (!protocol) {
    return SKIP;
  }
  if (protocol instanceof V1_DataSpaceSupportEmail) {
    return serialize(V1_dataSpaceSupportEmail, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize support info`, protocol);
};

export const V1_deserializeSupportInfo = (
  json: PlainObject<V1_DataSpaceSupportInfo> | undefined,
): V1_DataSpaceSupportInfo | undefined => {
  if (!json) {
    return undefined;
  }
  switch (json._type) {
    case V1_DATA_SPACE_SUPPORT_EMAIL_TYPE:
      return deserialize(V1_dataSpaceSupportEmail, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize support info of type '${json._type}'`,
      );
    }
  }
};

export const V1_dataSpaceModelSchema = createModelSchema(V1_DataSpace, {
  _type: usingConstantValueSchema(V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE),
  defaultExecutionContext: primitive(),
  description: optional(primitive()),
  executionContexts: list(object(V1_dataSpaceExecutionContextModelSchema)),
  featuredDiagrams: optionalCustom(
    (values) =>
      serializeArray(
        values,
        (value) =>
          serialize(V1_packageableElementPointerDeserializerSchema, value),
        {
          skipIfEmpty: true,
          INTERNAL__forceReturnEmptyInTest: true,
        },
      ),
    (values) =>
      deserializeArray(
        values,
        (value) =>
          deserialize(V1_packageableElementPointerDeserializerSchema, value),
        {
          skipIfEmpty: false,
        },
      ),
  ),
  name: primitive(),
  package: primitive(),
  stereotypes: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_stereotypePtrSchema, value),
        {
          skipIfEmpty: true,
          INTERNAL__forceReturnEmptyInTest: true,
        },
      ),
    (values) =>
      deserializeArray(values, (v) => deserialize(V1_stereotypePtrSchema, v), {
        skipIfEmpty: false,
      }),
  ),
  supportInfo: custom(
    (val) => V1_serializeSupportInfo(val),
    (val) => V1_deserializeSupportInfo(val),
  ),
  taggedValues: custom(
    (values) =>
      serializeArray(
        values,
        (value) => serialize(V1_taggedValueSchema, value),
        {
          skipIfEmpty: true,
          INTERNAL__forceReturnEmptyInTest: true,
        },
      ),
    (values) =>
      deserializeArray(values, (v) => deserialize(V1_taggedValueSchema, v), {
        skipIfEmpty: false,
      }),
  ),
  title: optional(primitive()),
});
