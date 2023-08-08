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

import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import type { GraphManagerState } from '../GraphManagerState.js';
import { RawLambda } from '../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import {
  type LambdaFunction,
  LambdaFunctionInstanceValue,
} from '../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import type { ValueSpecification } from '../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';

export const buildLambdaVariableExpressions = (
  rawLambda: RawLambda,
  graphManagerState: GraphManagerState,
): ValueSpecification[] =>
  ((rawLambda.parameters ?? []) as object[]).map((param) =>
    graphManagerState.graphManager.buildValueSpecification(
      param as PlainObject,
      graphManagerState.graph,
    ),
  );

export const buildRawLambdaFromLambdaFunction = (
  lambdaFunction: LambdaFunction,
  graphManagerState: GraphManagerState,
): RawLambda => {
  const lambdaFunctionInstanceValue = new LambdaFunctionInstanceValue();
  lambdaFunctionInstanceValue.values = [lambdaFunction];
  return guaranteeType(
    graphManagerState.graphManager.transformValueSpecToRawValueSpec(
      lambdaFunctionInstanceValue,
      graphManagerState.graph,
    ),
    RawLambda,
  );
};
