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
  type VariableExpression,
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
} from '@finos/legend-graph';
import { addDays, formatDate, Randomizer } from '@finos/legend-shared';
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
        varType.name === PRIMITIVE_TYPE.DATE
          ? new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE))
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
