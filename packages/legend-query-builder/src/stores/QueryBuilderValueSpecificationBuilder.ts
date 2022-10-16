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

import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type Class,
  Multiplicity,
  getMilestoneTemporalStereotype,
  extractElementNameFromPath,
  InstanceValue,
  PackageableElementExplicitReference,
  CORE_PURE_PATH,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  LambdaFunction,
  SimpleFunctionExpression,
} from '@finos/legend-graph';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { buildFilterExpression } from './filter/QueryBuilderFilterValueSpecificationBuilder.js';
import type { LambdaFunctionBuilderOption } from './QueryBuilderValueSpecificationBuilderHelper.js';
import type { QueryBuilderFetchStructureState } from './fetch-structure/QueryBuilderFetchStructureState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graphManager/QueryBuilderSupportedFunctions.js';
import { buildParametersLetLambdaFunc } from './shared/LambdaParameterState.js';
import { buildWatermarkExpression } from './watermark/QueryBuilderWatermarkValueSpecificationBuilder.js';

const buildGetAllFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL),
  );
  const classInstance = new InstanceValue(
    multiplicity,
    GenericTypeExplicitReference.create(new GenericType(_class)),
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
};

const buildFetchStructure = (
  fetchStructureState: QueryBuilderFetchStructureState,
  lambdaFunction: LambdaFunction,
  options?: LambdaFunctionBuilderOption,
): void => {
  fetchStructureState.implementation.appendFetchStructure(
    lambdaFunction,
    options,
  );
};

export const buildLambdaFunction = (
  queryBuilderState: QueryBuilderState,
  options?: LambdaFunctionBuilderOption,
): LambdaFunction => {
  const _class = guaranteeNonNullable(
    queryBuilderState.class,
    'Class is required to build query',
  );
  const lambdaFunction = new LambdaFunction(
    new FunctionType(
      PackageableElementExplicitReference.create(
        queryBuilderState.graphManagerState.graph.getType(CORE_PURE_PATH.ANY),
      ),
      Multiplicity.ONE,
    ),
  );

  // build getAll()
  const getAllFunction = buildGetAllFunction(_class, Multiplicity.ONE);

  // build milestoning parameter(s) for getAll()
  const milestoningStereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  if (milestoningStereotype) {
    queryBuilderState.milestoningState
      .getMilestoningBuilderHelper(milestoningStereotype)
      .buildGetAllParameters(getAllFunction);
  }
  lambdaFunction.expressionSequence[0] = getAllFunction;

  // build watermark
  const watermarkFunction = buildWatermarkExpression(
    queryBuilderState.watermarkState,
    getAllFunction,
  );
  if (watermarkFunction) {
    lambdaFunction.expressionSequence[0] = watermarkFunction;
  }

  // build filter
  const filterFunction = buildFilterExpression(
    queryBuilderState.filterState,
    watermarkFunction ?? getAllFunction,
  );
  if (filterFunction) {
    lambdaFunction.expressionSequence[0] = filterFunction;
  }

  // build fetch-structure
  buildFetchStructure(
    queryBuilderState.fetchStructureState,
    lambdaFunction,
    options,
  );

  // build parameters
  if (
    !queryBuilderState.isParameterSupportDisabled &&
    queryBuilderState.parametersState.parameterStates.length
  ) {
    // NOTE: if we are executing:
    // 1. set the parameters to empty
    // 2. add let statements for each parameter
    if (options?.isBuildingExecutionQuery) {
      lambdaFunction.functionType.parameters = [];
      const letsFuncs = buildParametersLetLambdaFunc(
        queryBuilderState.graphManagerState.graph,
        queryBuilderState.parametersState.parameterStates,
      );
      lambdaFunction.expressionSequence = [
        ...letsFuncs.expressionSequence,
        ...lambdaFunction.expressionSequence,
      ];
    } else {
      lambdaFunction.functionType.parameters =
        queryBuilderState.parametersState.parameterStates.map(
          (e) => e.parameter,
        );
    }
  }

  return lambdaFunction;
};
