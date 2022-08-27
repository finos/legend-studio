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
  assertNonNullable,
  assertTrue,
  assertType,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  type AlloySerializationConfigInstanceValue,
  type EnumValueInstanceValue,
  type FunctionExpression,
  type MappingInstanceValue,
  type PairInstanceValue,
  type PropertyGraphFetchTreeInstanceValue,
  type PureListInstanceValue,
  type RootGraphFetchTreeInstanceValue,
  type RuntimeInstanceValue,
  type ValueSpecificationVisitor,
  type InstanceValue,
  type INTERNAL__UnknownValueSpecification,
  type LambdaFunction,
  MILESTONING_STEREOTYPE,
  matchFunctionName,
  Class,
  type CollectionInstanceValue,
  type LambdaFunctionInstanceValue,
  type PrimitiveInstanceValue,
  SimpleFunctionExpression,
  type VariableExpression,
  type AbstractPropertyExpression,
  getMilestoneTemporalStereotype,
  type INTERNAL__PropagatedValue,
} from '@finos/legend-graph';
import { processTDSPostFilterExpression } from './fetch-structure/projection/post-filter/QueryBuilderPostFilterStateBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const.js';
import { LambdaParameterState } from '@finos/legend-application';
import { processFilterExpression } from './filter/QueryBuilderFilterStateBuilder.js';
import {
  processTDSAggregateExpression,
  processTDSGroupByExpression,
} from './fetch-structure/projection/aggregation/QueryBuilderAggregationStateBuilder.js';
import {
  processGraphFetchExpression,
  processGraphFetchSerializeExpression,
} from './fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeStateBuilder.js';
import {
  processTDSDistinctExpression,
  processTDSProjectExpression,
  processTDSProjectionColumnPropertyExpression,
  processTDSProjectionDerivationExpression,
  processTDSSortDirectionExpression,
  processTDSSortExpression,
  processTDSTakeExpression,
} from './fetch-structure/projection/QueryBuilderProjectionStateBuilder.js';

const processGetAllExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  const _class = expression.genericType?.value.rawType;
  assertType(
    _class,
    Class,
    `Can't process getAll() expression: getAll() return type is missing`,
  );
  queryBuilderState.querySetupState.setClass(_class, true);
  queryBuilderState.explorerState.refreshTreeData();

  // check milestoning
  let acceptedNoOfParameters = 1;
  const stereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  switch (stereotype) {
    case MILESTONING_STEREOTYPE.BITEMPORAL:
      acceptedNoOfParameters = 3;
      assertTrue(
        expression.parametersValues.length === acceptedNoOfParameters,
        `Can't process getAll() expression: when used with a bitemporal milestoned class getAll() expects two parameters`,
      );
      queryBuilderState.querySetupState.setProcessingDate(
        expression.parametersValues[1],
      );
      queryBuilderState.querySetupState.setBusinessDate(
        expression.parametersValues[2],
      );
      break;
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
      acceptedNoOfParameters = 2;
      assertTrue(
        expression.parametersValues.length === acceptedNoOfParameters,
        `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
      );
      queryBuilderState.querySetupState.setBusinessDate(
        expression.parametersValues[1],
      );
      break;
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
      acceptedNoOfParameters = 2;
      assertTrue(
        expression.parametersValues.length === acceptedNoOfParameters,
        `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
      );
      queryBuilderState.querySetupState.setProcessingDate(
        expression.parametersValues[1],
      );
      break;
    default:
      assertTrue(
        expression.parametersValues.length === acceptedNoOfParameters,
        `Can't process getAll() expression: getAll() expects no arguments`,
      );
  }
};

/**
 * This is the expression processor for query builder.
 * Unlike expression builder which takes care of transforming the value specification
 * from `protocol` to `metamodel`, and type-inferencing, this takes care
 * of traversing the expression to populate the query builder UI state.
 *
 * NOTE: While traversing the expression, this processor also does a fair amount of
 * validations and assertsions but just so enough to populate the UI state.
 *
 * Validation and assertion should be done by both the builder and processor, but the builder
 * will do more structural checks to build the proper metamodel. The processor should never
 * modify the metamodel, just traversing it.
 */
export class QueryBuilderValueSpecificationProcessor
  implements ValueSpecificationVisitor<void>
{
  queryBuilderState: QueryBuilderState;
  precedingExpression?: SimpleFunctionExpression | undefined;

  constructor(
    queryBuilderState: QueryBuilderState,
    precedingExpression: SimpleFunctionExpression | undefined,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.precedingExpression = precedingExpression;
  }

  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): void {
    assertNonNullable(
      this.precedingExpression,
      `Can't process unknown value: unknown value preceding expression cannot be retrieved`,
    );
    const precedingExpressionFunctionName =
      this.precedingExpression.functionName;
    if (
      [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
      ].some((fn) => matchFunctionName(precedingExpressionFunctionName, fn))
    ) {
      processTDSProjectionDerivationExpression(
        valueSpecification,
        this.precedingExpression,
        this.queryBuilderState,
      );
      return;
    }
    throw new UnsupportedOperationError(
      `Can't process unknown value with preceding expression of function ${this.precedingExpression.functionName}()`,
    );
  }

  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_PropertyGraphFetchTreeInstanceValue(
    valueSpecification: PropertyGraphFetchTreeInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_AlloySerializationConfigInstanceValue(
    valueSpecification: AlloySerializationConfigInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_PrimitiveInstanceValue(
    valueSpecification: PrimitiveInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_RuntimeInstanceValue(valueSpecification: RuntimeInstanceValue): void {
    throw new UnsupportedOperationError();
  }

  visit_PairInstanceValue(valueSpecification: PairInstanceValue): void {
    throw new UnsupportedOperationError();
  }

  visit_MappingInstanceValue(valueSpecification: MappingInstanceValue): void {
    throw new UnsupportedOperationError();
  }

  visit_PureListInstanceValue(valueSpecification: PureListInstanceValue): void {
    throw new UnsupportedOperationError();
  }

  visit_CollectionInstanceValue(
    valueSpecification: CollectionInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_FunctionExpression(valueSpecification: FunctionExpression): void {
    throw new UnsupportedOperationError();
  }

  visit_INTERNAL__PropagatedValue(
    valueSpecification: INTERNAL__PropagatedValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_SimpleFunctionExpression(
    valueSpecification: SimpleFunctionExpression,
  ): void {
    const functionName = valueSpecification.functionName;
    if (
      matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL)
    ) {
      processGetAllExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
      ) ||
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      )
    ) {
      // NOTE: for filter, since it sometimes can be ambiguous
      // whether meta::pure::functions::collection::filter() was used
      // or meta::pure::tds::filter() was used, we have to have custom logic
      // to determine

      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process filter() expression: filter() expects 1 argument`,
      );

      // check caller
      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process filter() expression: only support filter() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderValueSpecificationProcessor(
          this.queryBuilderState,
          undefined,
        ),
      );

      if (
        matchFunctionName(
          precedingExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL,
        )
      ) {
        assertTrue(
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
          ),
          `Can't process filter() expression: only supports ${QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER}() immediately following getAll() (got '${functionName}')`,
        );
        processFilterExpression(valueSpecification, this.queryBuilderState);
        return;
      } else if (
        matchFunctionName(
          precedingExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        ) ||
        matchFunctionName(
          precedingExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        )
      ) {
        assertTrue(
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
          ),
          `Can't process post-filter expression: only supports ${QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER}() immediately following TDS project()/groupBy() (got '${functionName}')`,
        );
        processTDSPostFilterExpression(
          valueSpecification,
          this.queryBuilderState,
        );
        return;
      } else {
        throw new UnsupportedOperationError(
          `Can't process filter() expression: only support filter() immediately following getAll() or TDS project()/groupBy()`,
        );
      }
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      )
    ) {
      processTDSProjectExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
      )
    ) {
      processTDSTakeExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
      )
    ) {
      processTDSDistinctExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
      )
    ) {
      processTDSSortExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC,
      ) ||
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
      )
    ) {
      processTDSSortDirectionExpression(
        valueSpecification,
        this.precedingExpression,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      )
    ) {
      processTDSGroupByExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG)
    ) {
      processTDSAggregateExpression(
        valueSpecification,
        this.precedingExpression,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
      )
    ) {
      processGraphFetchSerializeExpression(
        valueSpecification,
        this.queryBuilderState,
      );
      return;
    } else if (
      (matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
      ) ||
        matchFunctionName(
          functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
        )) &&
      this.precedingExpression &&
      matchFunctionName(
        this.precedingExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
      )
    ) {
      processGraphFetchExpression(valueSpecification, this.queryBuilderState);
      return;
    }
    throw new UnsupportedOperationError(
      `Can't process expression of function ${functionName}()`,
    );
  }

  visit_VariableExpression(valueSpecification: VariableExpression): void {
    throw new UnsupportedOperationError();
  }

  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): void {
    valueSpecification.values.forEach((value) =>
      value.expressionSequence.forEach((expression) =>
        expression.accept_ValueSpecificationVisitor(
          new QueryBuilderValueSpecificationProcessor(
            this.queryBuilderState,
            this.precedingExpression,
          ),
        ),
      ),
    );
  }

  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): void {
    assertNonNullable(
      this.precedingExpression,
      `Can't process property expression: property expression preceding expression cannot be retrieved`,
    );

    const precedingExpressionFunctionName =
      this.precedingExpression.functionName;
    if (
      [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
      ].some((fn) => matchFunctionName(precedingExpressionFunctionName, fn))
    ) {
      processTDSProjectionColumnPropertyExpression(
        valueSpecification,
        this.queryBuilderState,
      );
      return;
    }
    throw new UnsupportedOperationError(
      `Can't process property expression with preceding expression of function ${this.precedingExpression.functionName}()`,
    );
  }

  visit_InstanceValue(valueSpecification: InstanceValue): void {
    throw new UnsupportedOperationError();
  }
}

export const processParameters = (
  parameters: VariableExpression[],
  queryBuilderState: QueryBuilderState,
): void => {
  const queryParameterState = queryBuilderState.queryParametersState;
  parameters.forEach((parameter) => {
    const parameterState = new LambdaParameterState(
      parameter,
      queryBuilderState.observableContext,
      queryBuilderState.graphManagerState.graph,
    );
    parameterState.mockParameterValue();
    queryParameterState.addParameter(parameterState);
  });
};

export const processQueryLambdaFunction = (
  lambdaFunction: LambdaFunction,
  queryBuilderState: QueryBuilderState,
): void => {
  if (lambdaFunction.functionType.parameters.length) {
    processParameters(
      lambdaFunction.functionType.parameters,
      queryBuilderState,
    );
  }
  lambdaFunction.expressionSequence.map((expression) =>
    expression.accept_ValueSpecificationVisitor(
      new QueryBuilderValueSpecificationProcessor(queryBuilderState, undefined),
    ),
  );
};
