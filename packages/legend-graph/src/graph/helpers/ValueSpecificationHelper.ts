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

import { Randomizer } from '@finos/legend-shared';
import type { PureModel } from '../PureModel.js';
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '../MetaModelConst.js';
import { Enumeration } from '../metamodel/pure/packageableElements/domain/Enumeration.js';
import { EnumValueExplicitReference } from '../metamodel/pure/packageableElements/domain/EnumValueReference.js';
import { GenericType } from '../metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { PrimitiveType } from '../metamodel/pure/packageableElements/domain/PrimitiveType.js';
import {
  type InstanceValue,
  CollectionInstanceValue,
  EnumValueInstanceValue,
  PrimitiveInstanceValue,
} from '../metamodel/pure/valueSpecification/InstanceValue.js';
import type { VariableExpression } from '../metamodel/pure/valueSpecification/VariableExpression.js';
import { getEnumValue } from './DomainHelper.js';
import { format, addDays } from 'date-fns';

export const buildPrimitiveInstanceValue = (
  graph: PureModel,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(type)),
    ),
    multiplicityOne,
  );
  instance.values = [value];
  return instance;
};

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
      return format(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_FORMAT,
      );
    case PRIMITIVE_TYPE.DATETIME:
      return format(
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
      multiplicity,
    );
    primitiveInstanceValue.values = [
      createMockPrimitiveProperty(
        varType,
        parameter.name === '' ? 'myVar' : parameter.name,
      ),
    ];
    return primitiveInstanceValue;
  } else if (varType instanceof Enumeration) {
    const enumValueInstance = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(varType)),
      multiplicity,
    );
    const mock = createMockEnumerationProperty(varType);
    if (mock !== '') {
      enumValueInstance.values = [
        EnumValueExplicitReference.create(getEnumValue(varType, mock)),
      ];
    }
    return enumValueInstance;
  }
  return undefined;
};
