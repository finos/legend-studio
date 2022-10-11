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
  type Multiplicity,
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
  TYPICAL_MULTIPLICITY_TYPE,
  MILESTONING_STEREOTYPE,
} from '@finos/legend-graph';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { buildFilterExpression } from './filter/QueryBuilderFilterValueSpecificationBuilder.js';
import type { LambdaFunctionBuilderOption } from './QueryBuilderValueSpecificationBuilderHelper.js';
import type { QueryBuilderFetchStructureState } from './fetch-structure/QueryBuilderFetchStructureState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graphManager/QueryBuilderSupportedFunctions.js';
import { buildParametersLetLambdaFunc } from './shared/LambdaParameterState.js';

const buildGetAllFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL),
    multiplicity,
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
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const typeAny = queryBuilderState.graphManagerState.graph.getType(
    CORE_PURE_PATH.ANY,
  );
  const lambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );

  // build getAll()
  const getAllFunction = buildGetAllFunction(_class, multiplicityOne);

  // build milestoning parameter(s) for getAll()
  const milestoningStereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  if (milestoningStereotype) {
    switch (milestoningStereotype) {
      case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.milestoningState.businessDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.milestoningState.processingDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      case MILESTONING_STEREOTYPE.BITEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.milestoningState.processingDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.milestoningState.businessDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      default:
    }
  }
  lambdaFunction.expressionSequence[0] = getAllFunction;

  // build filter
  const filterFunction = buildFilterExpression(
    queryBuilderState.filterState,
    getAllFunction,
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
