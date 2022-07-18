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

import { guaranteeType, Randomizer } from '@finos/legend-shared';
import type { PureModel } from '../graph/PureModel.js';
import type { GraphManagerState } from '../GraphManagerState.js';
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '../MetaModelConst.js';
import { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration.js';
import { EnumValueExplicitReference } from '../models/metamodels/pure/packageableElements/domain/EnumValueReference.js';
import { GenericType } from '../models/metamodels/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../models/metamodels/pure/packageableElements/domain/GenericTypeReference.js';
import { PrimitiveType } from '../models/metamodels/pure/packageableElements/domain/PrimitiveType.js';
import { RawLambda } from '../models/metamodels/pure/rawValueSpecification/RawLambda.js';
import {
  type InstanceValue,
  CollectionInstanceValue,
  EnumValueInstanceValue,
  PrimitiveInstanceValue,
} from '../models/metamodels/pure/valueSpecification/InstanceValue.js';
import {
  type LambdaFunction,
  LambdaFunctionInstanceValue,
} from '../models/metamodels/pure/valueSpecification/LambdaFunction.js';
import type { ValueSpecification } from '../models/metamodels/pure/valueSpecification/ValueSpecification.js';
import type { VariableExpression } from '../models/metamodels/pure/valueSpecification/VariableExpression.js';
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

export const buildLambdaVariableExpressions = (
  rawLambda: RawLambda,
  graphManagerState: GraphManagerState,
): ValueSpecification[] =>
  ((rawLambda.parameters ?? []) as object[]).map((param) =>
    graphManagerState.graphManager.buildValueSpecification(
      param as Record<PropertyKey, unknown>,
      graphManagerState.graph,
    ),
  );

export const buildRawLambdaFromLambdaFunction = (
  lambdaFunction: LambdaFunction,
  graphManagerState: GraphManagerState,
): RawLambda => {
  const lambdaFunctionInstanceValue = new LambdaFunctionInstanceValue(
    graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    ),
    undefined,
  );
  lambdaFunctionInstanceValue.values = [lambdaFunction];
  return guaranteeType(
    graphManagerState.graphManager.buildRawValueSpecification(
      lambdaFunctionInstanceValue,
      graphManagerState.graph,
    ),
    RawLambda,
  );
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
    const primitiveInst = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(varType)),
      multiplicity,
    );
    primitiveInst.values = [
      createMockPrimitiveProperty(
        varType,
        parameter.name === '' ? 'myVar' : parameter.name,
      ),
    ];
    return primitiveInst;
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
