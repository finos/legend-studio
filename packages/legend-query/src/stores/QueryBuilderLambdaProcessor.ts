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
  type PlainObject,
  assertNonNullable,
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  isNumber,
  isString,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import {
  COLUMN_SORT_TYPE,
  SortColumnState,
} from './QueryResultSetModifierState';
import {
  type QueryBuilderFilterState,
  QueryBuilderFilterTreeGroupNodeData,
  QueryBuilderFilterTreeConditionNodeData,
} from './QueryBuilderFilterState';
import { FETCH_STRUCTURE_MODE } from './QueryBuilderFetchStructureState';
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
  type ValueSpecification,
  type ValueSpecificationVisitor,
  type InstanceValue,
  type INTERNAL__UnknownValueSpecification,
  type LambdaFunction,
  MILESTONING_STEREOTYPE,
  DerivedProperty,
  RawLambda,
  matchFunctionName,
  Class,
  CollectionInstanceValue,
  GraphFetchTreeInstanceValue,
  LambdaFunctionInstanceValue,
  PrimitiveInstanceValue,
  RootGraphFetchTree,
  SimpleFunctionExpression,
  VariableExpression,
  AbstractPropertyExpression,
  V1_deserializeRawValueSpecification,
  V1_RawLambda,
  getMilestoneTemporalStereotype,
  type INTERNAL__PropagatedValue,
} from '@finos/legend-graph';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionState';
import { SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const';
import type { QueryBuilderAggregationState } from './QueryBuilderAggregationState';
import { QueryParameterState } from './QueryParametersState';
import { validateMilestoningPropertyExpression } from './QueryBuilderMilestoningHelper';
import { toGroupOperation } from './QueryBuilderOperatorsHelper';
import { processPostFilterLambda } from './QueryBuilderPostFilterProcessor';

const getNullableStringValueFromValueSpec = (
  valueSpec: ValueSpecification,
): string | undefined => {
  if (
    valueSpec instanceof PrimitiveInstanceValue &&
    isString(valueSpec.values[0])
  ) {
    return valueSpec.values[0];
  }
  return undefined;
};

const getNullableNumberValueFromValueSpec = (
  valueSpec: ValueSpecification,
): number | undefined => {
  if (
    valueSpec instanceof PrimitiveInstanceValue &&
    isNumber(valueSpec.values[0])
  ) {
    return valueSpec.values[0];
  }
  return undefined;
};

const processFilterExpression = (
  expression: SimpleFunctionExpression,
  filterState: QueryBuilderFilterState,
  parentFilterNodeId: string | undefined,
): void => {
  const parentNode = parentFilterNodeId
    ? filterState.getNode(parentFilterNodeId)
    : undefined;
  if (
    [SUPPORTED_FUNCTIONS.AND, SUPPORTED_FUNCTIONS.OR].some((fn) =>
      matchFunctionName(expression.functionName, fn),
    )
  ) {
    const groupNode = new QueryBuilderFilterTreeGroupNodeData(
      parentFilterNodeId,
      toGroupOperation(expression.functionName),
    );
    filterState.nodes.set(groupNode.id, groupNode);
    expression.parametersValues.forEach((filterExpression) =>
      processFilterExpression(
        guaranteeType(
          filterExpression,
          SimpleFunctionExpression,
          `Can't process filter group expression: each child expression must be a function expression`,
        ),
        filterState,
        groupNode.id,
      ),
    );
    filterState.addNodeFromNode(groupNode, parentNode);
  } else {
    const propertyExpression = expression.parametersValues[0];
    if (propertyExpression instanceof AbstractPropertyExpression) {
      const currentPropertyExpression = propertyExpression.parametersValues[0];
      if (currentPropertyExpression instanceof AbstractPropertyExpression) {
        validateMilestoningPropertyExpression(
          currentPropertyExpression,
          filterState.queryBuilderState.graphManagerState.graph,
        );
      }
    }
    for (const operator of filterState.operators) {
      // NOTE: this allow plugin author to either return `undefined` or throw error
      // if there is a problem with building the lambda. Either case, the plugin is
      // considered as not supporting the lambda.
      const filterConditionState = returnUndefOnError(() =>
        operator.buildFilterConditionState(filterState, expression),
      );
      if (filterConditionState) {
        filterState.addNodeFromNode(
          new QueryBuilderFilterTreeConditionNodeData(
            undefined,
            filterConditionState,
          ),
          parentNode,
        );
        return;
      }
    }
    throw new UnsupportedOperationError(
      `Can't process filter() expression: no compatible filter operator processer available from plugins`,
    );
  }
};

const processFilterLambda = (
  filterLambda: LambdaFunctionInstanceValue,
  filterState: QueryBuilderFilterState,
): void => {
  const lambdaFunc = guaranteeNonNullable(
    filterLambda.values[0],
    `Can't process filter() lambda: filter() lambda function is missing`,
  );
  assertTrue(
    lambdaFunc.expressionSequence.length === 1,
    `Can't process filter() lambda: only support filter() lambda body with 1 expression`,
  );
  const rootExpression = guaranteeType(
    lambdaFunc.expressionSequence[0],
    SimpleFunctionExpression,
    `Can't process filter() lambda: only support filter() lambda body with 1 expression`,
  );

  assertTrue(
    lambdaFunc.functionType.parameters.length === 1,
    `Can't process filter() lambda: only support filter() lambda with 1 parameter`,
  );
  filterState.setLambdaParameterName(
    guaranteeType(
      lambdaFunc.functionType.parameters[0],
      VariableExpression,
      `Can't process filter() lambda: only support filter() lambda with 1 parameter`,
    ).name,
  );
  processFilterExpression(rootExpression, filterState, undefined);
};

const processAggregateLambda = (
  aggregateLambda: LambdaFunctionInstanceValue,
  projectionColumnState: QueryBuilderProjectionColumnState,
  aggregationState: QueryBuilderAggregationState,
): void => {
  const lambdaFunc = guaranteeNonNullable(
    aggregateLambda.values[0],
    `Can't process agg() lambda: agg() lambda function is missing`,
  );
  assertTrue(
    lambdaFunc.expressionSequence.length === 1,
    `Can't process agg() lambda: only support agg() lambda body with 1 expression`,
  );
  const expression = guaranteeType(
    lambdaFunc.expressionSequence[0],
    SimpleFunctionExpression,
    `Can't process agg() lambda: only support agg() lambda body with 1 expression`,
  );

  assertTrue(
    lambdaFunc.functionType.parameters.length === 1,
    `Can't process agg() lambda: only support agg() lambda with 1 parameter`,
  );

  const lambdaParam = guaranteeType(
    lambdaFunc.functionType.parameters[0],
    VariableExpression,
    `Can't process agg() lambda: only support agg() lambda with 1 parameter`,
  );

  for (const operator of aggregationState.operators) {
    // NOTE: this allow plugin author to either return `undefined` or throw error
    // if there is a problem with building the lambda. Either case, the plugin is
    // considered as not supporting the lambda.
    const aggregateColumnState = returnUndefOnError(() =>
      operator.buildAggregateColumnState(
        expression,
        lambdaParam,
        projectionColumnState,
      ),
    );
    if (aggregateColumnState) {
      aggregationState.addColumn(aggregateColumnState);
      return;
    }
  }
  throw new UnsupportedOperationError(
    `Can't process aggregate expression function: no compatible aggregate operator processer available from plugins`,
  );
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
export class QueryBuilderLambdaProcessor
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
    const precedingExpressionName = this.precedingExpression.functionName;
    if (
      [
        SUPPORTED_FUNCTIONS.TDS_PROJECT,
        SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        SUPPORTED_FUNCTIONS.TDS_AGG,
      ].some((fn) => matchFunctionName(precedingExpressionName, fn))
    ) {
      const projectionState =
        this.queryBuilderState.fetchStructureState.projectionState;
      const rawLambdaProtocol = returnUndefOnError(() =>
        guaranteeType(
          V1_deserializeRawValueSpecification(
            valueSpecification.content as PlainObject<V1_RawLambda>,
          ),
          V1_RawLambda,
        ),
      );
      assertNonNullable(
        rawLambdaProtocol,
        `Can't process unknown value: only support ${precedingExpressionName}() column expression as a lambda`,
      );

      const columnState = new QueryBuilderDerivationProjectionColumnState(
        projectionState,
        new RawLambda(rawLambdaProtocol.parameters, rawLambdaProtocol.body),
      );
      projectionState.addColumn(columnState, { skipSorting: true });
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
    if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.GET_ALL)) {
      const _class = valueSpecification.genericType?.value.rawType;
      assertType(
        _class,
        Class,
        `Can't process getAll() expression: getAll() return type is missing`,
      );
      this.queryBuilderState.querySetupState.setClass(_class, true);
      this.queryBuilderState.explorerState.refreshTreeData();
      let acceptedNoOfParameters = 1;
      const stereotype = getMilestoneTemporalStereotype(
        _class,
        this.queryBuilderState.graphManagerState.graph,
      );
      if (stereotype) {
        if (stereotype === MILESTONING_STEREOTYPE.BITEMPORAL) {
          acceptedNoOfParameters = 3;
          assertTrue(
            valueSpecification.parametersValues.length ===
              acceptedNoOfParameters,
            `Can't process getAll() expression: when used with a bitemporal milestoned class getAll() expects two parameters`,
          );
          this.queryBuilderState.querySetupState.setProcessingDate(
            valueSpecification.parametersValues[1],
          );
          this.queryBuilderState.querySetupState.setBusinessDate(
            valueSpecification.parametersValues[2],
          );
        } else if (stereotype === MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL) {
          acceptedNoOfParameters = 2;
          assertTrue(
            valueSpecification.parametersValues.length ===
              acceptedNoOfParameters,
            `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter`,
          );
          this.queryBuilderState.querySetupState.setProcessingDate(
            valueSpecification.parametersValues[1],
          );
        } else if (stereotype === MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL) {
          acceptedNoOfParameters = 2;
          assertTrue(
            valueSpecification.parametersValues.length ===
              acceptedNoOfParameters,
            `Can't process getAll() expression: when used with a milestoned class getAll() expects a parameter'`,
          );
          this.queryBuilderState.querySetupState.setBusinessDate(
            valueSpecification.parametersValues[1],
          );
        }
      } else {
        assertTrue(
          valueSpecification.parametersValues.length === acceptedNoOfParameters,
          `Can't process getAll() expression: getAll() expects no arguments`,
        );
      }

      return;
    } else if (
      matchFunctionName(functionName, SUPPORTED_FUNCTIONS.FILTER) ||
      matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_FILTER)
    ) {
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process filter() expression: filter() expects 1 argument`,
      );

      const filterState = this.queryBuilderState.filterState;
      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process filter() expression: only support filter() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
      );

      if (
        matchFunctionName(
          precedingExpression.functionName,
          SUPPORTED_FUNCTIONS.GET_ALL,
        )
      ) {
        assertTrue(
          matchFunctionName(functionName, SUPPORTED_FUNCTIONS.FILTER),
          `Can't process filter() expression: only supports ${SUPPORTED_FUNCTIONS.FILTER}() immediately following getAll() (got '${functionName}')`,
        );
        const filterLambda = valueSpecification.parametersValues[1];
        assertType(
          filterLambda,
          LambdaFunctionInstanceValue,
          `Can't process filter() expression: filter() expects argument #1 to be a lambda function`,
        );
        processFilterLambda(filterLambda, filterState);
        /**
         * NOTE: Since group operations like and/or do not take more than 2 parameters, if there are
         * more than 2 clauses in each group operations, then these clauses are converted into an
         * unbalanced tree. However, this would look quite bad for UX, as such, we simplify the tree.
         * After building the filter state.
         */
        filterState.simplifyTree();

        return;
      } else if (
        matchFunctionName(
          precedingExpression.functionName,
          SUPPORTED_FUNCTIONS.TDS_PROJECT,
        ) ||
        matchFunctionName(
          precedingExpression.functionName,
          SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        )
      ) {
        assertTrue(
          matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_FILTER),
          `Can't process post-filter expression: only supports ${SUPPORTED_FUNCTIONS.TDS_FILTER}() immediately following TDS project()/groupBy() (got '${functionName}')`,
        );
        const postFilterState = this.queryBuilderState.postFilterState;
        const postFilterLambda = valueSpecification.parametersValues[1];
        assertType(
          postFilterLambda,
          LambdaFunctionInstanceValue,
          `Can't process post-filter expression: expects argument #1 to be a lambda function`,
        );
        processPostFilterLambda(postFilterLambda, postFilterState);
        postFilterState.setShowPostFilterPanel(true);
        postFilterState.simplifyTree();
        return;
      } else {
        throw new UnsupportedOperationError(
          "`Can't process filter() expression: only support filter() immediately following getAll() or TDS project()/groupBy()",
        );
      }
    } else if (
      matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_PROJECT)
    ) {
      const params = valueSpecification.parametersValues;
      assertTrue(
        params.length === 3,
        `Can't process project() expression: project() expects 2 arguments`,
      );

      const precedingExpression = guaranteeType(
        params[0],
        SimpleFunctionExpression,
        `Can't process project() expression: only support project() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
      );
      // check caller
      assertTrue(
        [SUPPORTED_FUNCTIONS.GET_ALL, SUPPORTED_FUNCTIONS.FILTER].some((fn) =>
          matchFunctionName(precedingExpression.functionName, fn),
        ),
        `Can't process project() expression: only support project() immediately following either getAll() or filter()`,
      );

      // columns
      const columnLambdas = params[1];
      assertType(
        columnLambdas,
        CollectionInstanceValue,
        `Can't process project() expression: project() expects argument #1 to be a collection`,
      );
      columnLambdas.values.map((value) =>
        value.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
            this.queryBuilderState,
            valueSpecification,
          ),
        ),
      );

      // aliases
      const columnAliases = params[2];
      assertType(
        columnAliases,
        CollectionInstanceValue,
        `Can't process project() expression: project() expects argument #2 to be a collection`,
      );
      assertTrue(
        columnLambdas.values.length === columnAliases.values.length,
        `Can't process project() expression: number of aliases does not match the number of columns`,
      );
      const aliases = columnAliases.values
        .map(getNullableStringValueFromValueSpec)
        .filter(isNonNullable);

      this.queryBuilderState.fetchStructureState.projectionState.columns.forEach(
        (e, idx) => e.setColumnName(aliases[idx] as string),
      );

      return;
    } else if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_TAKE)) {
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process take() expression: take() expects 1 argument`,
      );

      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process take() expression: only support take() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
      );

      // check caller
      assertTrue(
        [
          SUPPORTED_FUNCTIONS.TDS_TAKE,
          SUPPORTED_FUNCTIONS.TDS_DISTINCT,
          SUPPORTED_FUNCTIONS.TDS_SORT,
          SUPPORTED_FUNCTIONS.TDS_PROJECT,
          SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        ].some((fn) => matchFunctionName(precedingExpression.functionName, fn)),
        `Can't process take() expression: only support take() in TDS expression`,
      );

      const takeValue = getNullableNumberValueFromValueSpec(
        guaranteeNonNullable(valueSpecification.parametersValues[1]),
      );
      this.queryBuilderState.resultSetModifierState.setLimit(takeValue);

      return;
    } else if (
      matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_DISTINCT)
    ) {
      assertTrue(
        valueSpecification.parametersValues.length === 1,
        `Can't process disctinct() expression: distinct() expects no parameter`,
      );

      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process distinct() expression: only support distinct() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
      );

      // check caller
      assertTrue(
        [
          SUPPORTED_FUNCTIONS.TDS_TAKE,
          SUPPORTED_FUNCTIONS.TDS_DISTINCT,
          SUPPORTED_FUNCTIONS.TDS_SORT,
          SUPPORTED_FUNCTIONS.TDS_PROJECT,
          SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          SUPPORTED_FUNCTIONS.TDS_FILTER,
        ].some((fn) => matchFunctionName(precedingExpression.functionName, fn)),
        `Can't process distinct() expression: only support distinct() in TDS expression`,
      );

      this.queryBuilderState.resultSetModifierState.distinct = true;

      return;
    } else if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_SORT)) {
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process sort() expression: sort() expects 1 argument`,
      );

      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process sort() expression: only support sort() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
      );

      // check caller
      assertTrue(
        [
          SUPPORTED_FUNCTIONS.TDS_TAKE,
          SUPPORTED_FUNCTIONS.TDS_DISTINCT,
          SUPPORTED_FUNCTIONS.TDS_SORT,
          SUPPORTED_FUNCTIONS.TDS_PROJECT,
          SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          SUPPORTED_FUNCTIONS.TDS_FILTER,
        ].some((fn) => matchFunctionName(precedingExpression.functionName, fn)),
        `Can't process sort() expression: only support sort() in TDS expression`,
      );

      const sortParam = valueSpecification.parametersValues[1];
      assertType(
        sortParam,
        CollectionInstanceValue,
        `Can't process sort() expression: sort() argument should be a collection`,
      );
      sortParam.values.map((e) =>
        e.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
            this.queryBuilderState,
            valueSpecification,
          ),
        ),
      );

      return;
    } else if (
      (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_ASC) ||
        matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_DESC)) &&
      this.precedingExpression &&
      matchFunctionName(
        this.precedingExpression.functionName,
        SUPPORTED_FUNCTIONS.TDS_SORT,
      )
    ) {
      assertTrue(
        valueSpecification.parametersValues.length === 1,
        `Can't process ${functionName}() expression: ${functionName}() expects no argument`,
      );

      const sortColumnName = getNullableStringValueFromValueSpec(
        guaranteeNonNullable(valueSpecification.parametersValues[0]),
      );
      const queryBuilderProjectionColumnState =
        this.queryBuilderState.fetchStructureState.projectionState.columns.find(
          (e) => e.columnName === sortColumnName,
        );
      if (queryBuilderProjectionColumnState) {
        const sortColumnState = new SortColumnState(
          this.queryBuilderState,
          queryBuilderProjectionColumnState,
        );
        sortColumnState.sortType = matchFunctionName(
          functionName,
          SUPPORTED_FUNCTIONS.TDS_ASC,
        )
          ? COLUMN_SORT_TYPE.ASC
          : COLUMN_SORT_TYPE.DESC;
        this.queryBuilderState.resultSetModifierState.addSortColumn(
          sortColumnState,
        );
      }

      return;
    } else if (
      matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_GROUP_BY)
    ) {
      assertTrue(
        valueSpecification.parametersValues.length === 4,
        `Can't process groupBy() expression: groupBy() expects 3 arguments`,
      );

      const params = valueSpecification.parametersValues;
      const precedingExpression = guaranteeType(
        params[0],
        SimpleFunctionExpression,
        `Can't process groupBy() expression: only support groupBy() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
      );

      // check caller
      assertTrue(
        [SUPPORTED_FUNCTIONS.GET_ALL, SUPPORTED_FUNCTIONS.FILTER].some((fn) =>
          matchFunctionName(precedingExpression.functionName, fn),
        ),
        `Can't process groupBy() expression: only support groupBy() immediately following either getAll() or filter()`,
      );

      // columns
      const columnExpressions = params[1];
      assertType(
        columnExpressions,
        CollectionInstanceValue,
        `Can't process groupBy() expression: groupBy() expects argument #1 to be a collection`,
      );
      columnExpressions.values.map((e) =>
        e.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
            this.queryBuilderState,
            valueSpecification,
          ),
        ),
      );

      // aggregations
      const aggregationExpressions = params[2];
      assertType(
        aggregationExpressions,
        CollectionInstanceValue,
        `Can't process groupBy() expression: groupBy() expects argument #2 to be a collection`,
      );
      aggregationExpressions.values.map((e) =>
        e.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
            this.queryBuilderState,
            valueSpecification,
          ),
        ),
      );

      // aliases
      const columnAliases = params[3];
      assertType(
        columnAliases,
        CollectionInstanceValue,
        `Can't process groupBy() expression: groupBy() expects argument #3 to be a collection`,
      );
      assertTrue(
        columnAliases.values.length ===
          columnExpressions.values.length +
            aggregationExpressions.values.length,
        `Can't process groupBy() expression: number of aliases does not match the number of columns`,
      );
      const aliases = columnAliases.values
        .map(getNullableStringValueFromValueSpec)
        .filter(isNonNullable);
      this.queryBuilderState.fetchStructureState.projectionState.columns.forEach(
        (e, idx) => e.setColumnName(aliases[idx] as string),
      );

      return;
    } else if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_AGG)) {
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process agg() expression: agg() expects 2 arguments`,
      );

      // check caller
      assertNonNullable(this.precedingExpression);
      assertTrue(
        matchFunctionName(
          this.precedingExpression.functionName,
          SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        ),
        `Can't process agg() expression: only support agg() in aggregation`,
      );

      const columnLambdas = guaranteeNonNullable(
        valueSpecification.parametersValues[0],
      );
      columnLambdas.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(
          this.queryBuilderState,
          valueSpecification,
        ),
      );

      const aggregateLambda = valueSpecification.parametersValues[1];
      assertType(
        aggregateLambda,
        LambdaFunctionInstanceValue,
        `Can't process agg() expression: agg() expects argument #1 to be a lambda function`,
      );

      // NOTE: since we process agg() expressions one by one, we know that the current agg()
      // always correspond to the last column projection state, based on our processing procedure
      processAggregateLambda(
        aggregateLambda,
        guaranteeNonNullable(
          this.queryBuilderState.fetchStructureState.projectionState.columns[
            this.queryBuilderState.fetchStructureState.projectionState.columns
              .length - 1
          ],
        ),
        this.queryBuilderState.fetchStructureState.projectionState
          .aggregationState,
      );

      return;
    } else if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.SERIALIZE)) {
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process serialize() expression: serialize() expects 1 argument`,
      );

      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process serialize() expression: only support serialize() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(
          this.queryBuilderState,

          valueSpecification,
        ),
      );

      // check caller
      assertTrue(
        [
          SUPPORTED_FUNCTIONS.GRAPH_FETCH,
          SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
        ].some((fn) => matchFunctionName(precedingExpression.functionName, fn)),
        `Can't process serialize() expression: only support serialize() in graph-fetch expression`,
      );

      const serializeFunc = guaranteeType(
        valueSpecification.parametersValues[1],
        GraphFetchTreeInstanceValue,
        `Can't process serialize() expression: serialize() graph-fetch is missing`,
      );
      const value = guaranteeType(
        serializeFunc.values[0],
        RootGraphFetchTree,
        `Can't process serialize() expression: serialize() graph-fetch tree root is missing`,
      );
      this.queryBuilderState.fetchStructureState.setFetchStructureMode(
        FETCH_STRUCTURE_MODE.GRAPH_FETCH,
      );
      this.queryBuilderState.fetchStructureState.graphFetchTreeState.initialize(
        value,
      );

      return;
    } else if (
      (matchFunctionName(
        functionName,
        SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
      ) ||
        matchFunctionName(functionName, SUPPORTED_FUNCTIONS.GRAPH_FETCH)) &&
      this.precedingExpression &&
      matchFunctionName(
        this.precedingExpression.functionName,
        SUPPORTED_FUNCTIONS.SERIALIZE,
      )
    ) {
      assertTrue(
        valueSpecification.parametersValues.length === 2,
        `Can't process ${functionName}() expression: ${functionName}() expects 1 argument`,
      );

      const precedingExpression = guaranteeType(
        valueSpecification.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process ${functionName}() expression: only support ${functionName}() immediately following an expression`,
      );
      precedingExpression.accept_ValueSpecificationVisitor(
        new QueryBuilderLambdaProcessor(
          this.queryBuilderState,
          valueSpecification,
        ),
      );

      // check caller
      assertTrue(
        [SUPPORTED_FUNCTIONS.FILTER, SUPPORTED_FUNCTIONS.GET_ALL].some((fn) =>
          matchFunctionName(precedingExpression.functionName, fn),
        ),
        `Can't process ${functionName}(): only support ${functionName}() immediately following either getAll() or filter()`,
      );

      this.queryBuilderState.fetchStructureState.graphFetchTreeState.setChecked(
        matchFunctionName(
          functionName,
          SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
        ),
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

  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): void {
    valueSpecification.values.forEach((value) =>
      value.expressionSequence.forEach((expression) =>
        expression.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
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

    const precedingExpressionName = this.precedingExpression.functionName;
    if (
      [
        SUPPORTED_FUNCTIONS.TDS_PROJECT,
        SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
        SUPPORTED_FUNCTIONS.TDS_AGG,
      ].some((fn) => matchFunctionName(precedingExpressionName, fn))
    ) {
      // NOTE: we do this before creating the projection state, as we will
      // auto-fill arguments for derived properties when missing as part of building
      // the property expression state.
      let currentPropertyExpression: ValueSpecification = valueSpecification;
      while (currentPropertyExpression instanceof AbstractPropertyExpression) {
        const propertyExpression = currentPropertyExpression;
        validateMilestoningPropertyExpression(
          currentPropertyExpression,
          this.queryBuilderState.graphManagerState.graph,
        );
        currentPropertyExpression = guaranteeNonNullable(
          currentPropertyExpression.parametersValues[0],
        );
        // here we just do a simple check to ensure that if we encounter derived properties
        // the number of parameters and arguments provided match
        if (propertyExpression.func instanceof DerivedProperty) {
          assertTrue(
            (Array.isArray(propertyExpression.func.parameters)
              ? propertyExpression.func.parameters.length
              : 0) ===
              propertyExpression.parametersValues.length - 1,
            `Can't process property expression: derived property '${propertyExpression.func.name}' expects number of provided arguments to match number of parameters`,
          );
        }
        // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
        // $x.employees->subType(@Person)->subType(@Staff)
        while (
          currentPropertyExpression instanceof SimpleFunctionExpression &&
          matchFunctionName(
            currentPropertyExpression.functionName,
            SUPPORTED_FUNCTIONS.SUBTYPE,
          )
        ) {
          currentPropertyExpression = guaranteeNonNullable(
            currentPropertyExpression.parametersValues[0],
          );
        }
      }
      assertType(
        currentPropertyExpression,
        VariableExpression,
        `Can't process property expression: expects expression root to be a variable`,
      );

      const projectionState =
        this.queryBuilderState.fetchStructureState.projectionState;
      const columnState = new QueryBuilderSimpleProjectionColumnState(
        projectionState,
        valueSpecification,
        false,
      );

      projectionState.addColumn(columnState, { skipSorting: true });

      // NOTE: technically we should set the lambda parameter name when we process
      // the lambda, not when we process the lambda body like this, but that requires
      // some setup, so it's easier to do it here. The validation of this should have
      // already been taken care of by the builder.
      columnState.setLambdaParameterName(currentPropertyExpression.name);
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

export const processQueryParameters = (
  parameters: VariableExpression[],
  queryBuilderState: QueryBuilderState,
): void => {
  const queryParameterState = queryBuilderState.queryParametersState;
  parameters.forEach((parameter) => {
    const variableState = new QueryParameterState(
      queryParameterState,
      parameter,
    );
    variableState.mockParameterValue();
    queryParameterState.addParameter(variableState);
  });
};

export const processQueryBuilderLambdaFunction = (
  queryBuilderState: QueryBuilderState,
  lambdaFunc: LambdaFunction,
): void => {
  if (lambdaFunc.functionType.parameters.length) {
    processQueryParameters(
      lambdaFunc.functionType.parameters,
      queryBuilderState,
    );
  }
  lambdaFunc.expressionSequence.map((e) =>
    e.accept_ValueSpecificationVisitor(
      new QueryBuilderLambdaProcessor(queryBuilderState, undefined),
    ),
  );
};
