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
  list,
  primitive,
  raw,
  serialize,
  deserialize,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import {
  V1_RawRootGraphFetchTree,
  V1_RawPropertyGraphFetchTree,
} from '../../../model/rawValueSpecification/V1_RawGraphFetchTree';
import { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import type {
  V1_RawValueSpecification,
  V1_RawValueSpecificationVisitor,
} from '../../../model/rawValueSpecification/V1_RawValueSpecification';
import { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable';
import { V1_multiplicitySchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
import { V1_RawBaseExecutionContext } from '../../../model/rawValueSpecification/V1_RawExecutionContext';

enum V1_RawExecutionContextType {
  BASE_EXECUTION_CONTEXT = 'BaseExecutionContext',
}

export enum V1_RawValueSpecificationType {
  LAMBDA = 'lambda',
  VARIABLE = 'var',
  ROOT_GRAPH_FETCH_TREE = 'rootGraphFetchTree',
  PROPERTY_GRAPH_FETCH_TREE = 'propertyGraphFetchTree',
  CLASS = 'class',
  FUNCTION = 'func',
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
  class: primitive(),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  name: primitive(),
});

const V1_rawPropertyGraphFetchTreeModelSchema = createModelSchema(
  V1_RawPropertyGraphFetchTree,
  {
    _type: usingConstantValueSchema(
      V1_RawValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE,
    ),
    alias: primitive(),
    parameters: custom(
      () => [],
      () => [],
    ),
    property: primitive(),
    subType: primitive(),
    subTrees: list(
      custom(
        (value) => V1_serializeRawValueSpecification(value),
        (value) => V1_deserializeRawValueSpecification(value),
      ),
    ),
  },
);

const V1_rawRootGraphFetchTreeModelSchema = createModelSchema(
  V1_RawRootGraphFetchTree,
  {
    _type: usingConstantValueSchema(
      V1_RawValueSpecificationType.ROOT_GRAPH_FETCH_TREE,
    ),
    class: primitive(),
    subTrees: list(
      custom(
        (value) => V1_serializeRawValueSpecification(value),
        (value) => V1_deserializeRawValueSpecification(value),
      ),
    ),
  },
);

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
  visit_RootGraphFetchTree(
    rawValueSpecification: V1_RawRootGraphFetchTree,
  ): PlainObject<V1_RawValueSpecification> {
    return serialize(
      V1_rawRootGraphFetchTreeModelSchema,
      rawValueSpecification,
    );
  }
  visit_PropertyGraphFetchTree(
    rawValueSpecification: V1_RawPropertyGraphFetchTree,
  ): PlainObject<V1_RawValueSpecification> {
    return serialize(
      V1_rawPropertyGraphFetchTreeModelSchema,
      rawValueSpecification,
    );
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
    case V1_RawValueSpecificationType.ROOT_GRAPH_FETCH_TREE:
      return deserialize(V1_rawRootGraphFetchTreeModelSchema, json);
    case V1_RawValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE:
      return deserialize(V1_rawPropertyGraphFetchTreeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize raw value specification of type ${json._type}`,
      );
  }
}
