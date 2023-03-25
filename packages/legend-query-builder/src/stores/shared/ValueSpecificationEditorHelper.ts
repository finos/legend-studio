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
  type PureModel,
  VariableExpression,
  type ValueSpecification,
  type Type,
  type Enum,
  CollectionInstanceValue,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  getEnumValue,
  PrimitiveInstanceValue,
  PrimitiveType,
  PRIMITIVE_TYPE,
  INTERNAL__PropagatedValue,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  ObserverContext,
} from '@finos/legend-graph';
import { Randomizer, UnsupportedOperationError } from '@finos/legend-shared';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationHelper.js';
import {
  instanceValue_setValues,
  valueSpecification_setGenericType,
} from './ValueSpecificationModifierHelper.js';

const VAR_DEFAULT_NAME = 'var';

export const createSupportedFunctionExpression = (
  supportedFuncName: SUPPORTED_FUNCTIONS,
  expectedReturnType: Type,
): SimpleFunctionExpression => {
  const funcExpression = new SimpleFunctionExpression(supportedFuncName);
  valueSpecification_setGenericType(
    funcExpression,
    GenericTypeExplicitReference.create(new GenericType(expectedReturnType)),
  );
  return funcExpression;
};

const createMockPrimitiveValueSpecification = (
  primitiveType: PrimitiveType,
  propertyName: string,
  observerContext: ObserverContext,
): ValueSpecification => {
  const primitiveTypeName = primitiveType.name;
  if (
    primitiveTypeName === PRIMITIVE_TYPE.DATE ||
    primitiveTypeName === PRIMITIVE_TYPE.DATETIME
  ) {
    return createSupportedFunctionExpression(
      SUPPORTED_FUNCTIONS.NOW,
      PrimitiveType.DATETIME,
    );
  } else if (primitiveTypeName === PRIMITIVE_TYPE.STRICTDATE) {
    return createSupportedFunctionExpression(
      SUPPORTED_FUNCTIONS.TODAY,
      PrimitiveType.STRICTDATE,
    );
  }
  const primitiveInstanceValue = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(primitiveType)),
  );
  const randomizer = new Randomizer();
  let value: string | boolean | number;
  switch (primitiveType.name) {
    case PRIMITIVE_TYPE.BOOLEAN:
      value = randomizer.getRandomItemInCollection([true, false]) ?? true;
      break;
    case PRIMITIVE_TYPE.FLOAT:
      value = randomizer.getRandomFloat();
      break;
    case PRIMITIVE_TYPE.DECIMAL:
      value = randomizer.getRandomDouble();
      break;
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
      value = randomizer.getRandomWholeNumber(100);
      break;
    case PRIMITIVE_TYPE.STRING:
    default:
      value = `${propertyName} ${randomizer.getRandomWholeNumber(100)}`;
  }
  instanceValue_setValues(primitiveInstanceValue, [value], observerContext);
  return primitiveInstanceValue;
};

export const createMockEnumerationProperty = (
  enumeration: Enumeration,
): string =>
  new Randomizer().getRandomItemInCollection(enumeration.values)?.name ?? '';

export const buildPrimitiveInstanceValue = (
  graph: PureModel,
  type: PRIMITIVE_TYPE,
  value: unknown,
  observerContext: ObserverContext,
): PrimitiveInstanceValue => {
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(type)),
    ),
  );
  instanceValue_setValues(instance, [value], observerContext);
  return instance;
};

export const buildDefaultInstanceValue = (
  graph: PureModel,
  type: Type,
  observerContext: ObserverContext,
): ValueSpecification => {
  const path = type.path;
  switch (path) {
    case PRIMITIVE_TYPE.STRING:
    case PRIMITIVE_TYPE.BOOLEAN:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.BINARY:
    case PRIMITIVE_TYPE.INTEGER: {
      return buildPrimitiveInstanceValue(
        graph,
        path,
        generateDefaultValueForPrimitiveType(path),
        observerContext,
      );
    }
    case PRIMITIVE_TYPE.DATE: {
      return buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.STRICTDATE,
        generateDefaultValueForPrimitiveType(path),
        observerContext,
      );
    }
    default:
      if (type instanceof Enumeration) {
        if (type.values.length > 0) {
          const enumValueInstanceValue = new EnumValueInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(type)),
          );
          instanceValue_setValues(
            enumValueInstanceValue,
            [EnumValueExplicitReference.create(type.values[0] as Enum)],
            observerContext,
          );
          return enumValueInstanceValue;
        }
        throw new UnsupportedOperationError(
          `Can't get default value for enumeration since enumeration '${path}' has no value`,
        );
      }
      throw new UnsupportedOperationError(
        `Can't get default value for type'${path}'`,
      );
  }
};

export const generateVariableExpressionMockValue = (
  parameter: VariableExpression,
  graph: PureModel,
  observerContext: ObserverContext,
): ValueSpecification | undefined => {
  const varType = parameter.genericType?.value.rawType;
  const multiplicity = parameter.multiplicity;
  if ((!multiplicity.upperBound || multiplicity.upperBound > 1) && varType) {
    return new CollectionInstanceValue(
      multiplicity,
      GenericTypeExplicitReference.create(new GenericType(varType)),
    );
  }
  if (varType instanceof PrimitiveType) {
    return createMockPrimitiveValueSpecification(
      varType,
      VAR_DEFAULT_NAME,
      observerContext,
    );
  } else if (varType instanceof Enumeration) {
    const enumValueInstance = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(varType)),
    );
    const mock = createMockEnumerationProperty(varType);
    if (mock !== '') {
      instanceValue_setValues(
        enumValueInstance,
        [EnumValueExplicitReference.create(getEnumValue(varType, mock))],
        observerContext,
      );
    }
    return enumValueInstance;
  }
  return undefined;
};

export const getValueSpecificationStringValue = (
  valueSpecification: ValueSpecification,
): string | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return valueSpecification.values[0]?.toString();
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    const _enum = valueSpecification.values[0];
    return `${_enum?.ownerReference.value.name}.${_enum?.value.name}`;
  } else if (valueSpecification instanceof VariableExpression) {
    return valueSpecification.name;
  } else if (valueSpecification instanceof INTERNAL__PropagatedValue) {
    return getValueSpecificationStringValue(valueSpecification.getValue());
  } else if (valueSpecification instanceof SimpleFunctionExpression) {
    return valueSpecification.functionName;
  } else if (valueSpecification instanceof CollectionInstanceValue) {
    return valueSpecification.values
      .map(getValueSpecificationStringValue)
      .join(',');
  }
  return undefined;
};
