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
  type InstanceValue,
  VariableExpression,
  type ValueSpecification,
  type Type,
  type Enum,
  CollectionInstanceValue,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
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
} from '@finos/legend-graph';
import {
  addDays,
  formatDate,
  Randomizer,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationHelper.js';
import { instanceValue_setValues } from './ValueSpecificationModifierHelper.js';

const createMockPrimitiveProperty = (
  primitiveType: PrimitiveType,
  propertyName: string,
): string | number | boolean => {
  const randomizer = new Randomizer();
  switch (primitiveType.name) {
    case PRIMITIVE_TYPE.BOOLEAN:
      return randomizer.getRandomItemInCollection([true, false]) ?? true;
    case PRIMITIVE_TYPE.FLOAT:
      return randomizer.getRandomFloat();
    case PRIMITIVE_TYPE.DECIMAL:
      return randomizer.getRandomDouble();
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
      return randomizer.getRandomWholeNumber(100);
    // NOTE that `Date` is the umbrella type that comprises `StrictDate` and `DateTime`, but for simplicity, we will generate `Date` as `StrictDate`
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return formatDate(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_FORMAT,
      );
    case PRIMITIVE_TYPE.DATETIME:
      return formatDate(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_TIME_FORMAT,
      );
    case PRIMITIVE_TYPE.STRING:
    default:
      return `${propertyName} ${randomizer.getRandomWholeNumber(100)}`;
  }
};

export const createMockEnumerationProperty = (
  enumeration: Enumeration,
): string =>
  new Randomizer().getRandomItemInCollection(enumeration.values)?.name ?? '';

export const buildPrimitiveInstanceValue = (
  graph: PureModel,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(type)),
    ),
  );
  instanceValue_setValues(instance, [value]);
  return instance;
};

export const buildDefaultInstanceValue = (
  graph: PureModel,
  type: Type,
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
      );
    }
    case PRIMITIVE_TYPE.DATE: {
      return buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.STRICTDATE,
        generateDefaultValueForPrimitiveType(path),
      );
    }
    default:
      if (type instanceof Enumeration) {
        if (type.values.length > 0) {
          const enumValueInstanceValue = new EnumValueInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(type)),
          );
          instanceValue_setValues(enumValueInstanceValue, [
            EnumValueExplicitReference.create(type.values[0] as Enum),
          ]);
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
): InstanceValue | undefined => {
  const varType = parameter.genericType?.value.rawType;
  const multiplicity = parameter.multiplicity;
  if ((!multiplicity.upperBound || multiplicity.upperBound > 1) && varType) {
    return new CollectionInstanceValue(
      multiplicity,
      GenericTypeExplicitReference.create(new GenericType(varType)),
    );
  }
  if (varType instanceof PrimitiveType) {
    const primitiveInstanceValue = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        varType === PrimitiveType.DATE
          ? new GenericType(PrimitiveType.STRICTDATE)
          : new GenericType(varType),
      ),
    );
    instanceValue_setValues(primitiveInstanceValue, [
      createMockPrimitiveProperty(
        varType,
        parameter.name === '' ? 'myVar' : parameter.name,
      ),
    ]);
    return primitiveInstanceValue;
  } else if (varType instanceof Enumeration) {
    const enumValueInstance = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(varType)),
    );
    const mock = createMockEnumerationProperty(varType);
    if (mock !== '') {
      instanceValue_setValues(enumValueInstance, [
        EnumValueExplicitReference.create(getEnumValue(varType, mock)),
      ]);
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
