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
  primitive,
  raw,
  serialize,
  deserialize,
  custom,
  alias,
  optional,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda.js';
import type {
  V1_RawValueSpecification,
  V1_RawValueSpecificationVisitor,
} from '../../../model/rawValueSpecification/V1_RawValueSpecification.js';
import { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable.js';
import { V1_multiplicityModelSchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_RawBaseExecutionContext } from '../../../model/rawValueSpecification/V1_RawExecutionContext.js';
import { V1_RawPrimitiveInstanceValue } from '../../../model/rawValueSpecification/V1_RawPrimitiveInstanceValue.js';
import { PRIMITIVE_TYPE } from '../../../../../../../graph/MetaModelConst.js';
import {
  V1_deserializeRawGenericType,
  V1_RawGenricTypeSchemaModel,
} from './V1_TypeSerializationHelper.js';

enum V1_RawExecutionContextType {
  BASE_EXECUTION_CONTEXT = 'BaseExecutionContext',
}

export enum V1_RawValueSpecificationType {
  LAMBDA = 'lambda',
  VARIABLE = 'var',

  CINTEGER = 'integer',
  CDECIMAL = 'decimal',
  CSTRING = 'string',
  CBOOLEAN = 'boolean',
  CFLOAT = 'float',
  CDATETIME = 'dateTime',
  CSTRICTDATE = 'strictDate',
  CSTRICTTIME = 'strictTime',
  CLATESTDATE = 'latestDate',
}

export const V1_rawBaseExecutionContextModelSchema = createModelSchema(
  V1_RawBaseExecutionContext,
  {
    _type: usingConstantValueSchema(
      V1_RawExecutionContextType.BASE_EXECUTION_CONTEXT,
    ),
    queryTimeOutInSeconds: primitive(),
    enableConstraints: primitive(),
  },
);

export const V1_rawLambdaModelSchema = createModelSchema(V1_RawLambda, {
  _type: usingConstantValueSchema(V1_RawValueSpecificationType.LAMBDA),
  body: raw(),
  parameters: raw(),
});

export const V1_rawVariableModelSchema = createModelSchema(V1_RawVariable, {
  _type: usingConstantValueSchema(V1_RawValueSpecificationType.VARIABLE),
  multiplicity: usingModelSchema(V1_multiplicityModelSchema),
  name: primitive(),
  genericType: custom(
    (val) => serialize(V1_RawGenricTypeSchemaModel, val),
    (val) => V1_deserializeRawGenericType(val),
    {
      beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
        const parentVal = jsonParentValue as {
          class: string | undefined;
          genericType: string | undefined;
        };
        if (parentVal.class && !parentVal.genericType) {
          callback(null, parentVal.class);
        } else {
          callback(null, jsonValue);
        }
      },
    },
  ),
});

const V1_rawPrimitiveInstanceValueSchema = createModelSchema(
  V1_RawPrimitiveInstanceValue,
  {
    type: alias(
      '_type',
      custom(
        (val) => {
          switch (val) {
            case PRIMITIVE_TYPE.INTEGER:
              return V1_RawValueSpecificationType.CINTEGER;
            case PRIMITIVE_TYPE.DECIMAL:
              return V1_RawValueSpecificationType.CDECIMAL;
            case PRIMITIVE_TYPE.STRING:
              return V1_RawValueSpecificationType.CSTRING;
            case PRIMITIVE_TYPE.BOOLEAN:
              return V1_RawValueSpecificationType.CBOOLEAN;
            case PRIMITIVE_TYPE.FLOAT:
              return V1_RawValueSpecificationType.CFLOAT;
            case PRIMITIVE_TYPE.DATETIME:
              return V1_RawValueSpecificationType.CDATETIME;
            case PRIMITIVE_TYPE.STRICTDATE:
              return V1_RawValueSpecificationType.CSTRICTDATE;
            case PRIMITIVE_TYPE.STRICTTIME:
              return V1_RawValueSpecificationType.CSTRICTTIME;
            case PRIMITIVE_TYPE.LATESTDATE:
              return V1_RawValueSpecificationType.CLATESTDATE;
            default:
              throw new UnsupportedOperationError(
                `Can't serialize raw instance value type '${val}'`,
              );
          }
        },
        (val) => {
          switch (val) {
            case V1_RawValueSpecificationType.CINTEGER:
              return PRIMITIVE_TYPE.INTEGER;
            case V1_RawValueSpecificationType.CDECIMAL:
              return PRIMITIVE_TYPE.DECIMAL;
            case V1_RawValueSpecificationType.CSTRING:
              return PRIMITIVE_TYPE.STRING;
            case V1_RawValueSpecificationType.CBOOLEAN:
              return PRIMITIVE_TYPE.BOOLEAN;
            case V1_RawValueSpecificationType.CFLOAT:
              return PRIMITIVE_TYPE.FLOAT;
            case V1_RawValueSpecificationType.CDATETIME:
              return PRIMITIVE_TYPE.DATETIME;
            case V1_RawValueSpecificationType.CSTRICTDATE:
              return PRIMITIVE_TYPE.STRICTDATE;
            case V1_RawValueSpecificationType.CSTRICTTIME:
              return PRIMITIVE_TYPE.STRICTTIME;
            case V1_RawValueSpecificationType.CLATESTDATE:
              return PRIMITIVE_TYPE.LATESTDATE;
            default:
              throw new UnsupportedOperationError(
                `Can't deserialize raw value instance value type '${val}'`,
              );
          }
        },
      ),
    ),
    value: optional(primitive()),
  },
);

/**
 * @backwardCompatibility
 */
const deserializePrimitiveInstanceValue = (
  json: PlainObject<V1_RawValueSpecification>,
): V1_RawValueSpecification =>
  deserialize(V1_rawPrimitiveInstanceValueSchema, {
    ...json,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    value:
      Array.isArray(json.values) && json.values.length === 1
        ? json.values[0]
        : json.value,
  });

class V1_RawValueSpecificationSerializer
  implements
    V1_RawValueSpecificationVisitor<PlainObject<V1_RawValueSpecification>>
{
  visit_Lambda(
    rawValueSpecification: V1_RawLambda,
  ): PlainObject<V1_RawValueSpecification> {
    return serialize(V1_rawLambdaModelSchema, rawValueSpecification);
  }

  visit_Variable(
    rawValueSpecification: V1_RawVariable,
  ): PlainObject<V1_RawValueSpecification> {
    return serialize(V1_rawVariableModelSchema, rawValueSpecification);
  }

  visit_PrimitiveInstanceValue(
    rawValueSpecification: V1_RawPrimitiveInstanceValue,
  ): PlainObject<V1_RawValueSpecification> {
    return serialize(V1_rawPrimitiveInstanceValueSchema, rawValueSpecification);
  }
}

export function V1_serializeRawValueSpecification(
  protocol: V1_RawValueSpecification,
): PlainObject<V1_RawValueSpecification> {
  return protocol.accept_RawValueSpecificationVisitor(
    new V1_RawValueSpecificationSerializer(),
  );
}

export function V1_deserializeRawValueSpecification(
  json: PlainObject<V1_RawValueSpecification>,
): V1_RawValueSpecification {
  switch (json._type) {
    case V1_RawValueSpecificationType.LAMBDA:
      return deserialize(V1_rawLambdaModelSchema, json);
    case V1_RawValueSpecificationType.VARIABLE:
      return deserialize(V1_rawVariableModelSchema, json);
    case V1_RawValueSpecificationType.CINTEGER:
    case V1_RawValueSpecificationType.CDECIMAL:
    case V1_RawValueSpecificationType.CSTRING:
    case V1_RawValueSpecificationType.CBOOLEAN:
    case V1_RawValueSpecificationType.CFLOAT:
    case V1_RawValueSpecificationType.CDATETIME:
    case V1_RawValueSpecificationType.CSTRICTDATE:
    case V1_RawValueSpecificationType.CSTRICTTIME:
    case V1_RawValueSpecificationType.CLATESTDATE:
      return deserializePrimitiveInstanceValue(json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize raw value specification of type '${json._type}'`,
      );
  }
}
