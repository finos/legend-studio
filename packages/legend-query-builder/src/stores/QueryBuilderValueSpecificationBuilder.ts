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
  UnsupportedOperationError,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
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
  SUPPORTED_FUNCTIONS,
  RuntimePointer,
} from '@finos/legend-graph';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { buildFilterExpression } from './filter/QueryBuilderFilterValueSpecificationBuilder.js';
import type { LambdaFunctionBuilderOption } from './QueryBuilderValueSpecificationBuilderHelper.js';
import type { QueryBuilderFetchStructureState } from './fetch-structure/QueryBuilderFetchStructureState.js';
import { QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS } from '../graph/QueryBuilderMetaModelConst.js';
import { buildWatermarkExpression } from './watermark/QueryBuilderWatermarkValueSpecificationBuilder.js';
import { buildExecutionQueryFromLambdaFunction } from './shared/LambdaParameterState.js';
import {
  QueryBuilderEmbeddedFromExecutionContextState,
  type QueryBuilderExecutionContextState,
} from './QueryBuilderExecutionContextState.js';

export const buildGetAllFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
    ),
  );
  const classInstance = new InstanceValue(
    multiplicity,
    GenericTypeExplicitReference.create(new GenericType(_class)),
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
};

export const buildGetAllVersionsInRangeFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
    ),
  );
  const classInstance = new InstanceValue(
    multiplicity,
    GenericTypeExplicitReference.create(new GenericType(_class)),
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
};

const buildGetAllVersionsFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
    ),
  );
  const classInstance = new InstanceValue(
    multiplicity,
    GenericTypeExplicitReference.create(new GenericType(_class)),
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
};

const buildExecutionContextState = (
  executionState: QueryBuilderExecutionContextState,
  lambdaFunction: LambdaFunction,
): LambdaFunction => {
  if (executionState instanceof QueryBuilderEmbeddedFromExecutionContextState) {
    const precedingExpression = guaranteeNonNullable(
      lambdaFunction.expressionSequence[0],
      `Can't build from() expression: preceding expression is not defined`,
    );
    const fromFunc = new SimpleFunctionExpression(
      extractElementNameFromPath(SUPPORTED_FUNCTIONS.FROM),
    );
    // 1st param
    const mapping = executionState.mapping;
    let mappingInstance: InstanceValue | undefined;
    if (mapping) {
      mappingInstance = new InstanceValue(Multiplicity.ONE, undefined);
      mappingInstance.values = [
        PackageableElementExplicitReference.create(mapping),
      ];
    }
    // 2nd parameter
    const runtime = executionState.runtimeValue;
    let runtimeInstance: InstanceValue | undefined;
    if (runtime instanceof RuntimePointer) {
      runtimeInstance = new InstanceValue(Multiplicity.ONE, undefined);
      runtimeInstance.values = [runtime.packageableRuntime];
    }
    fromFunc.parametersValues = [
      precedingExpression,
      mappingInstance,
      runtimeInstance,
    ].filter(isNonNullable);
    lambdaFunction.expressionSequence[0] = fromFunc;
  }
  return lambdaFunction;
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

  const milestoningStereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );

  if (milestoningStereotype && options?.useAllVersionsForMilestoning) {
    // build getAllVersions() when we preview data for milestoned classes
    // because if we use getAll() we need to pass in data to execute the query
    // but we don't give user that option in this flow.
    const getAllVersionsFunction = buildGetAllVersionsFunction(
      _class,
      Multiplicity.ONE,
    );
    lambdaFunction.expressionSequence[0] = getAllVersionsFunction;
  } else {
    switch (queryBuilderState.getAllFunction) {
      case QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS: {
        if (milestoningStereotype) {
          const getAllVersionsFunction = buildGetAllVersionsFunction(
            _class,
            Multiplicity.ONE,
          );
          lambdaFunction.expressionSequence[0] = getAllVersionsFunction;
        } else {
          throw new UnsupportedOperationError(
            `Unable to build query lamdba: getAllVersions() expects source class to be milestoned`,
          );
        }
        break;
      }
      case QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE: {
        if (milestoningStereotype) {
          const getAllVersionsInRangeFunction =
            buildGetAllVersionsInRangeFunction(_class, Multiplicity.ONE);
          queryBuilderState.milestoningState
            .getMilestoningImplementation(milestoningStereotype)
            .buildGetAllVersionsInRangeParameters(
              getAllVersionsInRangeFunction,
            );
          lambdaFunction.expressionSequence[0] = getAllVersionsInRangeFunction;
        } else {
          throw new UnsupportedOperationError(
            `Unable to build query lamdba: getAllVersionsInRange() expects source class to be milestoned`,
          );
        }
        break;
      }
      case QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL: {
        // build getAll()
        const getAllFunction = buildGetAllFunction(_class, Multiplicity.ONE);
        if (milestoningStereotype) {
          // build milestoning parameter(s) for getAll()
          queryBuilderState.milestoningState
            .getMilestoningImplementation(milestoningStereotype)
            .buildGetAllParameters(getAllFunction);
        }
        lambdaFunction.expressionSequence[0] = getAllFunction;
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Unable to build query lambda: unknown ${queryBuilderState.getAllFunction} function`,
        );
    }
  }

  // build watermark
  buildWatermarkExpression(queryBuilderState.watermarkState, lambdaFunction);

  // build filter
  buildFilterExpression(queryBuilderState.filterState, lambdaFunction);

  // build fetch-structure
  buildFetchStructure(
    queryBuilderState.fetchStructureState,
    lambdaFunction,
    options,
  );
  // build execution-state
  buildExecutionContextState(
    queryBuilderState.executionContextState,
    lambdaFunction,
  );

  // build variable expressions
  if (queryBuilderState.constantState.constants.length) {
    const letExpressions = queryBuilderState.constantState.constants.map((e) =>
      e.buildLetExpression(),
    );
    lambdaFunction.expressionSequence = [
      ...letExpressions,
      ...lambdaFunction.expressionSequence,
    ];
  }
  // build parameters
  if (
    queryBuilderState.parametersState.parameterStates.length &&
    !options?.useAllVersionsForMilestoning
  ) {
    if (options?.isBuildingExecutionQuery) {
      buildExecutionQueryFromLambdaFunction(
        lambdaFunction,
        queryBuilderState.parametersState.parameterStates,
        queryBuilderState.graphManagerState,
      );
    } else {
      lambdaFunction.functionType.parameters =
        queryBuilderState.parametersState.parameterStates.map(
          (e) => e.parameter,
        );
    }
  }
  return lambdaFunction;
};
