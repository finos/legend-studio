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
  isString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  AbstractPropertyExpression,
  type EnumValueInstanceValue,
  type FunctionExpression,
  type GraphFetchTreeInstanceValue,
  type ValueSpecificationVisitor,
  type LambdaFunction,
  type KeyExpressionInstanceValue,
  type INTERNAL__PropagatedValue,
  type ValueSpecification,
  type CollectionInstanceValue,
  LambdaFunctionInstanceValue,
  type ColSpecArrayInstance,
  InstanceValue,
  INTERNAL__UnknownValueSpecification,
  matchFunctionName,
  Class,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  VariableExpression,
  getMilestoneTemporalStereotype,
  SUPPORTED_FUNCTIONS,
  isSuperType,
  PackageableElementReference,
  Mapping,
  PackageableRuntime,
  RuntimePointer,
  PackageableElementExplicitReference,
  MILESTONING_STEREOTYPE,
} from '@finos/legend-graph';
import { processTDSPostFilterExpression } from './fetch-structure/tds/post-filter/QueryBuilderPostFilterStateBuilder.js';
import { processFilterExpression } from './filter/QueryBuilderFilterStateBuilder.js';
import {
  processTDSAggregateExpression,
  processTDSGroupByExpression,
  processWAVGRowMapperExpression,
} from './fetch-structure/tds/aggregation/QueryBuilderAggregationStateBuilder.js';
import {
  processGraphFetchExpression,
  processGraphFetchExternalizeExpression,
  processGraphFetchSerializeExpression,
  processInternalizeExpression,
} from './fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeStateBuilder.js';
import {
  processTDSColExpression,
  processTDSDistinctExpression,
  processTDSProjectExpression,
  processTDSProjectionColumnPropertyExpression,
  processTDSProjectionDerivationExpression,
  processTDSSliceExpression,
  processTDSSortDirectionExpression,
  processTDSSortExpression,
  processTDSTakeExpression,
} from './fetch-structure/tds/projection/QueryBuilderProjectionStateBuilder.js';
import {
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../graph/QueryBuilderMetaModelConst.js';
import { LambdaParameterState } from './shared/LambdaParameterState.js';
import { processTDS_OLAPGroupByExpression } from './fetch-structure/tds/window/QueryBuilderWindowStateBuilder.js';
import { processWatermarkExpression } from './watermark/QueryBuilderWatermarkStateBuilder.js';
import {
  type QueryBuilderConstantExpressionState,
  QueryBuilderCalculatedConstantExpressionState,
  QueryBuilderSimpleConstantExpressionState,
} from './QueryBuilderConstantsState.js';
import { checkIfEquivalent } from './milestoning/QueryBuilderMilestoningHelper.js';
import type { QueryBuilderParameterValue } from './QueryBuilderParametersState.js';
import { QueryBuilderEmbeddedFromExecutionContextState } from './QueryBuilderExecutionContextState.js';
import {
  isTypedProjectionExpression,
  processTypedTDSProjectExpression,
} from './fetch-structure/tds/projection/QueryBuilderTypedProjectionStateBuilder.js';

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

const processGetAllVersionsExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  const _class = expression.genericType?.value.rawType;
  assertType(
    _class,
    Class,
    `Can't process getAllVersions() expression: getAllVersions() return type is missing`,
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
  assertNonNullable(
    stereotype,
    `Can't process getAllVersions() expression: getAllVersions() expects source class to be milestoned`,
  );

  assertTrue(
    expression.parametersValues.length === acceptedNoOfParameters,
    `Can't process getAllVersions() expression: getAllVersions() expects no arguments`,
  );
  queryBuilderState.setGetAllFunction(
    QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
  );
};

const processGetAllVersionsInRangeExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  const _class = expression.genericType?.value.rawType;
  assertType(
    _class,
    Class,
    `Can't process getAllVersionsInRange() expression: getAllVersionsInRange() return type is missing`,
  );
  queryBuilderState.setClass(_class);
  queryBuilderState.milestoningState.clearMilestoningDates();
  queryBuilderState.explorerState.refreshTreeData();

  // check parameters (milestoning) and build state
  const acceptedNoOfParameters = 3;
  const stereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  assertTrue(
    stereotype !== undefined &&
      stereotype !== MILESTONING_STEREOTYPE.BITEMPORAL,
    `Can't process getAllVersionsInRange() expression: getAllVersionInRange() expects source class to be processing temporal or business temporal milestoned`,
  );

  assertTrue(
    expression.parametersValues.length === acceptedNoOfParameters,
    `Can't process getAllVersionsInRange() expression: getAllVersionsInRange() expects start and end date`,
  );
  queryBuilderState.setGetAllFunction(
    QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
  );
  queryBuilderState.milestoningState.setStartDate(
    guaranteeNonNullable(
      expression.parametersValues[1],
      `Can't process getAllVersionsInRange() expression: getAllVersionsInRange() expects start date to be defined`,
    ),
  );
  queryBuilderState.milestoningState.setEndDate(
    guaranteeNonNullable(
      expression.parametersValues[2],
      `Can't process getAllVersionsInRange() expression: getAllVersionsInRange() expects end date to be defined`,
    ),
  );
};

// a recursive function to check if there are some date functions
// unsupported in the custom date picker dropdown.
// For now, it's just QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR and QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH.
export const isUsedDateFunctionSupportedInFormMode = (
  valueSpec: ValueSpecification,
): boolean => {
  if (valueSpec instanceof SimpleFunctionExpression) {
    if (
      matchFunctionName(
        valueSpec.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR,
      ) ||
      matchFunctionName(
        valueSpec.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH,
      )
    ) {
      return false;
    }
    return !valueSpec.parametersValues
      .map((value) => isUsedDateFunctionSupportedInFormMode(value))
      .includes(false);
  } else {
    return true;
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
  let constantExpression: QueryBuilderConstantExpressionState;
  if (rightSide instanceof INTERNAL__UnknownValueSpecification) {
    constantExpression = new QueryBuilderCalculatedConstantExpressionState(
      queryBuilderState,
      varExp,
      rightSide.content,
    );
  } else {
    // Even if a valueSpecification is successfully built, it might contain some date functions
    // unsupported in the custom date picker dropdown, e.g., QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR
    // or QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH.
    // If it doesn't contain any unsupported date functions, a QueryBuilderSimpleConstantExpressionState should be created.
    // Otherwise, a QueryBuilderCalculatedConstantExpressionState should be created.
    if (isUsedDateFunctionSupportedInFormMode(rightSide)) {
      constantExpression = new QueryBuilderSimpleConstantExpressionState(
        queryBuilderState,
        varExp,
        rightSide,
      );
    } else {
      constantExpression = new QueryBuilderCalculatedConstantExpressionState(
        queryBuilderState,
        varExp,
        queryBuilderState.graphManagerState.graphManager.serializeValueSpecification(
          rightSide,
        ),
      );
    }
  }
  queryBuilderState.constantState.setShowConstantPanel(true);
  queryBuilderState.constantState.addConstant(constantExpression);
};

const processFromFunction = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  // mapping
  const mappingInstanceExpression = guaranteeType(
    expression.parametersValues[1],
    InstanceValue,
    `Can't process from() expression: only support from() with 1st parameter as instance value`,
  );
  const mapping = guaranteeType(
    guaranteeType(
      mappingInstanceExpression.values[0],
      PackageableElementReference,
      `Can't process from() expression: only support from() with 1st parameter as packagableElement value`,
    ).value,
    Mapping,
    `Can't process from() expression: only support from() with 1st parameter as mapping value`,
  );
  // runtime
  const runtimeInstanceExpression = guaranteeType(
    expression.parametersValues[2],
    InstanceValue,
    `Can't process from() expression: only support from() with 2nd parameter as instance value`,
  );
  const runtimeVal = guaranteeType(
    guaranteeType(
      runtimeInstanceExpression.values[0],
      PackageableElementReference,
      `Can't process from() expression: only support from() with 2nd parameter as packagableElement value`,
    ).value,
    PackageableRuntime,
    `Can't process from() expression: only support from() with 2nd parameter as runtime value`,
  );
  const fromContext = new QueryBuilderEmbeddedFromExecutionContextState(
    queryBuilderState,
  );
  fromContext.setMapping(mapping);
  fromContext.setRuntimeValue(
    new RuntimePointer(PackageableElementExplicitReference.create(runtimeVal)),
  );
  queryBuilderState.setExecutionContextState(fromContext);
  return;
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
        ...Object.values(
          QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS,
        ),
      ])
    ) {
      processTDSProjectionDerivationExpression(
        valueSpecification,
        undefined,
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
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      )
    ) {
      processGetAllExpression(valueSpecification, this.queryBuilderState);
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      )
    ) {
      processGetAllVersionsExpression(
        valueSpecification,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
      )
    ) {
      processGetAllVersionsInRangeExpression(
        valueSpecification,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.INTERNALIZE,
      )
    ) {
      processInternalizeExpression(
        valueSpecification,
        this.queryBuilderState,
        this.parentLambda,
      );
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
        matchFunctionName(precedingExpression.functionName, [
          QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
          QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
          QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
        ])
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
      matchFunctionName(functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
      ])
    ) {
      if (isTypedProjectionExpression(valueSpecification)) {
        processTypedTDSProjectExpression(
          valueSpecification,
          this.queryBuilderState,
          this.parentLambda,
        );
      } else {
        processTDSProjectExpression(
          valueSpecification,
          this.queryBuilderState,
          this.parentLambda,
        );
      }
      return;
    } else if (
      matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_COL)
    ) {
      processTDSColExpression(valueSpecification, this.queryBuilderState);
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
      matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.SLICE)
    ) {
      processTDSSliceExpression(
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
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXTERNALIZE,
      )
    ) {
      processGraphFetchExternalizeExpression(
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
    } else if (matchFunctionName(functionName, [SUPPORTED_FUNCTIONS.FROM])) {
      const parameters = valueSpecification.parametersValues;
      assertTrue(
        parameters.length === 3,
        'From function expects 2 parameters (mapping and runtime)',
      );
      processFromFunction(valueSpecification, this.queryBuilderState);
      QueryBuilderValueSpecificationProcessor.processChild(
        guaranteeNonNullable(parameters[0]),
        valueSpecification,
        this.parentLambda,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        Object.values(QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS),
      )
    ) {
      this.queryBuilderState.isCalendarEnabled = true;
      assertTrue(
        valueSpecification.parametersValues.length === 4,
        'Calendar function expected to have four parameters',
      );
      QueryBuilderValueSpecificationProcessor.processChild(
        guaranteeNonNullable(valueSpecification.parametersValues[3]),
        valueSpecification,
        this.parentLambda,
        this.queryBuilderState,
      );
      return;
    } else if (
      matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.WAVG_ROW_MAPPER,
      )
    ) {
      processWAVGRowMapperExpression(
        valueSpecification,
        this.parentExpression,
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
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.WAVG_ROW_MAPPER,
        ...Object.values(
          QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS,
        ),
      ])
    ) {
      processTDSProjectionColumnPropertyExpression(
        valueSpecification,
        undefined,
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

  visit_KeyExpressionInstanceValue(
    valueSpecification: KeyExpressionInstanceValue,
  ): void {
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

  visit_ColSpecArrayInstance(valueSpecification: ColSpecArrayInstance): void {
    assertNonNullable(
      this.parentExpression,
      `Can't process col spec aray instance: parent expression cannot be retrieved`,
    );

    if (
      matchFunctionName(this.parentExpression.functionName, [
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
      ])
    ) {
      const spec = valueSpecification.values;
      assertTrue(
        spec.length === 1,
        `Can't process col spec array instance: value expected to be of size 1`,
      );
      guaranteeNonNullable(spec[0]).colSpecs.forEach((col) => {
        const _function1 = guaranteeType(
          col.function1,
          LambdaFunctionInstanceValue,
          `Can't process col spec: function1 not a lambda function instance value`,
        );
        assertTrue(_function1.values.length === 1);
        const lambdaVal = guaranteeNonNullable(_function1.values[0]);
        assertTrue(lambdaVal.expressionSequence.length === 1);
        const expression = guaranteeNonNullable(
          lambdaVal.expressionSequence[0],
        );

        if (expression instanceof AbstractPropertyExpression) {
          processTDSProjectionColumnPropertyExpression(
            expression,
            col.name,
            this.queryBuilderState,
          );
        } else if (expression instanceof INTERNAL__UnknownValueSpecification) {
          assertNonNullable(
            this.parentExpression,
            `Can't process unknown value: parent expression cannot be retrieved`,
          );
          processTDSProjectionDerivationExpression(
            expression,
            col.name,
            this.parentExpression,
            this.queryBuilderState,
          );
        }
      });

      return;
    }
    throw new UnsupportedOperationError(
      `Can't process col spec array expression with parent expression of function ${this.parentExpression.functionName}()`,
    );
  }
}

export const processParameters = (
  parameters: VariableExpression[],
  queryBuilderState: QueryBuilderState,
  options?: {
    parameterValues?: Map<string, QueryBuilderParameterValue> | undefined;
  },
): void => {
  const queryParameterState = queryBuilderState.parametersState;
  parameters.forEach((parameter) => {
    let matchingParameterValue: ValueSpecification | undefined;
    if (options?.parameterValues) {
      Array.from(options.parameterValues.entries()).forEach(([key, value]) => {
        const variable = value.variable;
        if (
          variable instanceof VariableExpression &&
          checkIfEquivalent(variable, parameter)
        ) {
          matchingParameterValue = value.value;
        } else if (isString(variable) && variable === parameter.name) {
          // TODO: we may want to do further checks here like multiplicity checks
          const instanceType = value.value?.genericType?.value.rawType;
          const paramType = parameter.genericType?.value.rawType;
          if (
            instanceType &&
            paramType &&
            isSuperType(paramType, instanceType)
          ) {
            matchingParameterValue = value.value;
          }
        }
      });
    }
    const parameterState = new LambdaParameterState(
      parameter,
      queryBuilderState.observerContext,
      queryBuilderState.graphManagerState.graph,
    );
    if (matchingParameterValue) {
      parameterState.setValue(matchingParameterValue);
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
  parameterOptions?: {
    parameterValues?: Map<string, QueryBuilderParameterValue> | undefined;
  },
): void => {
  if (lambdaFunction.functionType.parameters.length) {
    processParameters(
      lambdaFunction.functionType.parameters,
      queryBuilderState,
      parameterOptions,
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
