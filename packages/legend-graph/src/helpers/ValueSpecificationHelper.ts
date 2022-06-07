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

import { guaranteeType } from '@finos/legend-shared';
import type { PureModel } from '../graph/PureModel.js';
import {
  type GraphManagerState,
  type LambdaFunction,
  type ValueSpecification,
  LambdaFunctionInstanceValue,
  RawLambda,
} from '../index.js';
import {
  type PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '../MetaModelConst.js';
import { GenericType } from '../models/metamodels/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../models/metamodels/pure/packageableElements/domain/GenericTypeReference.js';
import { PrimitiveInstanceValue } from '../models/metamodels/pure/valueSpecification/InstanceValue.js';

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
