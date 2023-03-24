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
  guaranteeIsString,
  guaranteeNonNullable,
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
  matchFunctionName,
  Class,
  type CollectionInstanceValue,
  type LambdaFunctionInstanceValue,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  type VariableExpression,
  type AbstractPropertyExpression,
  getMilestoneTemporalStereotype,
  type INTERNAL__PropagatedValue,
  type ValueSpecification,
  SUPPORTED_FUNCTIONS,
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
import { processTDS_OLAPGroupByExpression } from './fetch-structure/tds/window/QueryBuilderWindowStateBuilder.js';
import { processWatermarkExpression } from './watermark/QueryBuilderWatermarkStateBuilder.js';
import { QueryBuilderConstantExpressionState } from './QueryBuilderConstantsState.js';
import { checkIfEquivalent } from './milestoning/QueryBuilderMilestoningHelper.js';

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
  queryBuilderState.milestoningState.clearMilestoningDates();
  queryBuilderState.explorerState.refreshTreeData();

  // check parameters (milestoning) and build state
  const acceptedNoOfParameters = 1;
  const stereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  if (stereotype) {
    queryBuilderState.milestoningState
      .getMilestoningImplementation(stereotype)
      .processGetAllParamaters(expression.parametersValues);
  } else {
    assertTrue(
      expression.parametersValues.length === acceptedNoOfParameters,
      `Can't process getAll() expression: getAll() expects no arguments`,
    );
  }
};

const processLetExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  const parameters = expression.parametersValues;
  assertTrue(
    expression.parametersValues.length === 2,
    'Let function expected to have two parameters (left and right side value)',
  );
  // process left side (var)
  const letVariable = guaranteeIsString(
    guaranteeType(
      parameters[0],
      PrimitiveInstanceValue,
      'Can`t process let function: left side should be a primitive instance value',
    ).values[0],
    'Can`t process let function: left side should be a string primitive instance value',
  );
  const varExp = guaranteeNonNullable(
    parentLambda.openVariables.get(letVariable),
    `Unable to find variable ${letVariable} in lambda function`,
  );
  // process right side (value)
  const rightSide = guaranteeNonNullable(parameters[1]);
  // final
  const constantExpression = new QueryBuilderConstantExpressionState(
    queryBuilderState,
    varExp,
    rightSide,
  );
  queryBuilderState.constantState.setShowConstantPanel(true);
  queryBuilderState.constantState.addConstant(constantExpression);
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
  readonly parentLambda: LambdaFunction;

  private constructor(
    queryBuilderState: QueryBuilderState,
    parentLambda: LambdaFunction,
    parentExpression: SimpleFunctionExpression | undefined,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.parentExpression = parentExpression;
    this.parentLambda = parentLambda;
  }

  static process(
    valueSpecification: ValueSpecification,
    parentLambda: LambdaFunction,
    queryBuilderState: QueryBuilderState,
  ): void {
    valueSpecification.accept_ValueSpecificationVisitor(
      new QueryBuilderValueSpecificationProcessor(
        queryBuilderState,
        parentLambda,
        undefined,
      ),
    );
  }

  /**
   * Process value specification with information about parent function expression
   * in order to be used in some validation/assertion
   */
  static processChild(
    valueSpecification: ValueSpecification,
    parentExpression: SimpleFunctionExpression,
    parentLambda: LambdaFunction,
    queryBuilderState: QueryBuilderState,
  ): void {
    valueSpecification.accept_ValueSpecificationVisitor(
      new QueryBuilderValueSpecificationProcessor(
        queryBuilderState,
        parentLambda,
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
        this.parentLambda,
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
      processWatermarkExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      )
    ) {
      processTDSProjectExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
      )
    ) {
      processTDSTakeExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
      )
    ) {
      processTDSDistinctExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
      )
    ) {
      processTDSSortExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
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
      processTDSGroupByExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG)
    ) {
      processTDSAggregateExpression(
        valueSpecification,
        this.parentExpression,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
      )
    ) {
      processTDS_OLAPGroupByExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
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
        this.parentLambda,
      );
      return;
    } else if (
      matchFunctionName(functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
      ])
    ) {
      processGraphFetchExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
      return;
    } else if (matchFunctionName(functionName, [SUPPORTED_FUNCTIONS.LET])) {
      processLetExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
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
            this.parentLambda,
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
  preservedParameters?: Map<VariableExpression, ValueSpecification | undefined>,
): void => {
  const queryParameterState = queryBuilderState.parametersState;
  // Here we won't mock the values for parameters which are present in the previous state
  // because we don't want to lose the parameter value
  parameters.forEach((parameter) => {
    let oldParamterValue: ValueSpecification | undefined;
    if (preservedParameters) {
      Array.from(preservedParameters.entries()).forEach(([key, value]) => {
        if (checkIfEquivalent(key, parameter)) {
          oldParamterValue = value;
        }
      });
    }
    const parameterState = new LambdaParameterState(
      parameter,
      queryBuilderState.observableContext,
      queryBuilderState.graphManagerState.graph,
    );
    if (oldParamterValue) {
      parameterState.setValue(oldParamterValue);
    } else {
      parameterState.mockParameterValue();
    }
    queryParameterState.addParameter(parameterState);
  });
  queryBuilderState.parametersState = queryParameterState;
};

export const processQueryLambdaFunction = (
  lambdaFunction: LambdaFunction,
  queryBuilderState: QueryBuilderState,
  preservedParameters?: Map<VariableExpression, ValueSpecification | undefined>,
): void => {
  if (lambdaFunction.functionType.parameters.length) {
    processParameters(
      lambdaFunction.functionType.parameters,
      queryBuilderState,
      preservedParameters,
    );
  }
  lambdaFunction.expressionSequence.map((expression) =>
    QueryBuilderValueSpecificationProcessor.process(
      expression,
      lambdaFunction,
      queryBuilderState,
    ),
  );
};
