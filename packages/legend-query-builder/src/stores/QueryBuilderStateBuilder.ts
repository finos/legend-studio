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
  type EnumValueInstanceValue,
  type FunctionExpression,
  type GraphFetchTreeInstanceValue,
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
  type ValueSpecification,
} from '@finos/legend-graph';
import { processTDSPostFilterExpression } from './fetch-structure/tds/post-filter/QueryBuilderPostFilterStateBuilder.js';
import { processFilterExpression } from './filter/QueryBuilderFilterStateBuilder.js';
import {
  processTDSAggregateExpression,
  processTDSGroupByExpression,
} from './fetch-structure/tds/aggregation/QueryBuilderAggregationStateBuilder.js';
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
} from './fetch-structure/tds/projection/QueryBuilderProjectionStateBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graphManager/QueryBuilderSupportedFunctions.js';
import { LambdaParameterState } from './shared/LambdaParameterState.js';
import { processTDSOlapGroupByExpression } from './fetch-structure/tds/olapGroupBy/QueryBuilderOlapGroupByStateBuilder.js';
import { processWatermarkExpression } from './watermark/QueryBuilderWatermarkStateBuilder.js';

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
  queryBuilderState.setClass(_class);
  queryBuilderState.milestoningState.updateMilestoningConfiguration();
  queryBuilderState.explorerState.refreshTreeData();

  // check parameters (milestoning) and build state
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
      queryBuilderState.milestoningState.setProcessingDate(
        expression.parametersValues[1],
      );
      queryBuilderState.milestoningState.setBusinessDate(
        expression.parametersValues[2],
      );
      break;
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
      acceptedNoOfParameters = 2;
      assertTrue(
        expression.parametersValues.length === acceptedNoOfParameters,
        `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
      );
      queryBuilderState.milestoningState.setBusinessDate(
        expression.parametersValues[1],
      );
      break;
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
      acceptedNoOfParameters = 2;
      assertTrue(
        expression.parametersValues.length === acceptedNoOfParameters,
        `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
      );
      queryBuilderState.milestoningState.setProcessingDate(
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
 * This is the value specification processor (a.k.a state builder) for query builder.
 *
 * Unlike value specification builder which takes care of transforming the value specification
 * from `protocol` to `metamodel`, and doing some (naive) type-inferencing, the processor takes care
 * of traversing the query, analyzing it to build the query builder state. The processor represents
 * a particular way we want to look at the query, if the query is not like what the processor
 * expects, or understands, query builder state could not be built, i.e. the query will be deemed
 * unsupported by query builder
 *
 * NOTE: While traversing the expression, this processor also does a fair amount of
 * validations and assertions--enough to properly build the state. Unlike the builder,
 * the processor should NEVER modify the metamodel, just traversing it.
 */
export class QueryBuilderValueSpecificationProcessor
  implements ValueSpecificationVisitor<void>
{
  readonly queryBuilderState: QueryBuilderState;
  /**
   * A value specification is a tree of value specifications.
   *
   * This structure may not intuitively correspond to how we write it in Pure
   * For example, consider the following expression in Pure:
   *
   * | Person.all()->filter(x|$x.age > 0)->project([x|$x.name], ['Name'])->sort([desc('Name')]);
   *
   * which is equivalent to the more cryptic version:
   *
   * | sort(project(filter(all(Person), x|$x.age > 0), [x|$x.name], ['Name']), [desc('Name')]);
   *
   * Hence, the metamodel looks something like this (with some parts redacted)
   * {
   *   "function": "sort",
   *   "parameters": [
   *     {
   *       "function": "project",
   *       "parameters": [
   *         {
   *           "function": "filter",
   *           "parameters": [
   *             {
   *               "function": "getAll",
   *               ...
   *             },
   *             ... // filter() expression
   *           ]
   *         },
   *         ... // project() expression column and alias
   *       ]
   *     },
   *     {
   *       "_type": "collection",
   *       "values": [
   *         {
   *           "function": "desc",
   *           ... // desc() expression
   *         }
   *       ]
   *     }
   *   ]
   * }
   *
   * The first grammar form is farily declarative in nature and perhaps more intuitive.
   * We tend to think, in terms of order of running:
   * all() --> filter() --> project() --> sort()
   *
   * However, in reality, when the expression is used or read, the order of traversal is reversed:
   * sort() --> project() --> filter() --> all()
   *
   * Now, in the context of the value specification processor, we need information about preceding
   * expression in order to validate the usage context of functions, (for example, we want to only
   * support project() after all() or filter()). In the case of function expression chain,
   * we have to look at the function expression first parameter. There are some other context,
   * such as what happens within the second parameter of the sort() expression
   * in this case, we have the desc() expression, but it's not part of the main expression chain;
   * however, we need to verify desc() is used within sort(), in this case, we have to record
   * the parent expression. This is when the following attribute comes into use when processing
   * value specification.
   */
  readonly parentExpression?: SimpleFunctionExpression | undefined;

  private constructor(
    queryBuilderState: QueryBuilderState,
    parentExpression: SimpleFunctionExpression | undefined,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.parentExpression = parentExpression;
  }

  static process(
    valueSpecification: ValueSpecification,
    queryBuilderState: QueryBuilderState,
  ): void {
    valueSpecification.accept_ValueSpecificationVisitor(
      new QueryBuilderValueSpecificationProcessor(queryBuilderState, undefined),
    );
  }

  /**
   * Process value specification with information about parent function expression
   * in order to be used in some validation/assertion
   */
  static processChild(
    valueSpecification: ValueSpecification,
    parentExpression: SimpleFunctionExpression,
    queryBuilderState: QueryBuilderState,
  ): void {
    valueSpecification.accept_ValueSpecificationVisitor(
      new QueryBuilderValueSpecificationProcessor(
        queryBuilderState,
        parentExpression,
      ),
    );
  }

  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): void {
    assertNonNullable(
      this.parentExpression,
      `Can't process unknown value: parent expression cannot be retrieved`,
    );

    if (
      matchFunctionName(this.parentExpression.functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
      ])
    ) {
      processTDSProjectionDerivationExpression(
        valueSpecification,
        this.parentExpression,
        this.queryBuilderState,
      );
      return;
    }

    throw new UnsupportedOperationError(
      `Can't process unknown value with parent expression of function ${this.parentExpression.functionName}()`,
    );
  }

  visit_INTERNAL__PropagatedValue(
    valueSpecification: INTERNAL__PropagatedValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_FunctionExpression(valueSpecification: FunctionExpression): void {
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
      matchFunctionName(functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      ])
    ) {
      // NOTE: for filter, since it sometimes can be ambiguous
      // whether meta::pure::functions::collection::filter() was used
      // or meta::pure::tds::filter() was used, we have to have custom logic
      // to determine

      // check parameters
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process filter() expression: filter() expects 1 argument`,
      );

      // check preceding expression
      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process filter() expression: only support filter() immediately following an expression`,
      );
      QueryBuilderValueSpecificationProcessor.process(
        precedingExpression,
        this.queryBuilderState,
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
        matchFunctionName(precedingExpression.functionName, [
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
        ])
      ) {
        assertTrue(
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
          ),
          `Can't process post-filter expression: only supports ${QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER}() immediately following project()/groupBy() (got '${functionName}')`,
        );
        processTDSPostFilterExpression(
          valueSpecification,
          this.queryBuilderState,
        );
        return;
      } else if (
        matchFunctionName(precedingExpression.functionName, [
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK,
        ])
      ) {
        processFilterExpression(valueSpecification, this.queryBuilderState);
        return;
      } else {
        throw new UnsupportedOperationError(
          `Can't process filter() expression: only support filter() immediately following getAll() or project()/forWatermark()/groupBy()/olapGroupBy()`,
        );
      }
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK,
      )
    ) {
      processWatermarkExpression(valueSpecification, this.queryBuilderState);
      return;
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
      matchFunctionName(functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
      ])
    ) {
      processTDSSortDirectionExpression(
        valueSpecification,
        this.parentExpression,
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
        this.parentExpression,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
      )
    ) {
      processTDSOlapGroupByExpression(
        valueSpecification,
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
      matchFunctionName(functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
      ])
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

  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): void {
    assertNonNullable(
      this.parentExpression,
      `Can't process property expression: parent expression cannot be retrieved`,
    );

    if (
      matchFunctionName(this.parentExpression.functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
      ])
    ) {
      processTDSProjectionColumnPropertyExpression(
        valueSpecification,
        this.queryBuilderState,
      );
      return;
    }

    throw new UnsupportedOperationError(
      `Can't process property expression with parent expression of function ${this.parentExpression.functionName}()`,
    );
  }

  visit_InstanceValue(valueSpecification: InstanceValue): void {
    throw new UnsupportedOperationError();
  }

  visit_CollectionInstanceValue(
    valueSpecification: CollectionInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }

  visit_PrimitiveInstanceValue(
    valueSpecification: PrimitiveInstanceValue,
  ): void {
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
            this.parentExpression,
          ),
        ),
      ),
    );
  }

  visit_GraphFetchTreeInstanceValue(
    valueSpecification: GraphFetchTreeInstanceValue,
  ): void {
    throw new UnsupportedOperationError();
  }
}

export const processParameters = (
  parameters: VariableExpression[],
  queryBuilderState: QueryBuilderState,
): void => {
  const queryParameterState = queryBuilderState.parametersState;
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
    QueryBuilderValueSpecificationProcessor.process(
      expression,
      queryBuilderState,
    ),
  );
};
