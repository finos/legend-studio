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
  getClass,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  isNumber,
  isString,
} from '@finos/legend-studio-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import {
  COLUMN_SORT_TYPE,
  SortColumnState,
} from './QueryResultSetModifierState';
import type { QueryBuilderFilterState } from './QueryBuilderFilterState';
import {
  QueryBuilderFilterTreeGroupNodeData,
  QUERY_BUILDER_FILTER_GROUP_OPERATION,
  QueryBuilderFilterTreeConditionNodeData,
} from './QueryBuilderFilterState';
import { FETCH_STRUCTURE_MODE } from './QueryBuilderFetchStructureState';
import type {
  AlloySerializationConfigInstanceValue,
  EnumerationInstanceValue,
  EnumValueInstanceValue,
  FunctionExpression,
  InstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  PureListInstanceValue,
  RootGraphFetchTreeInstanceValue,
  RuntimeInstanceValue,
  ValueSpecification,
  ValueSpecificationVisitor,
  AbstractPropertyExpression,
} from '@finos/legend-studio';
import {
  SUPPORTED_FUNCTIONS,
  Class,
  ClassInstanceValue,
  CollectionInstanceValue,
  GraphFetchTreeInstanceValue,
  LambdaFunctionInstanceValue,
  PrimitiveInstanceValue,
  RootGraphFetchTree,
  SimpleFunctionExpression,
  VariableExpression,
} from '@finos/legend-studio';

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
    Object.values(QUERY_BUILDER_FILTER_GROUP_OPERATION).includes(
      expression.functionName as QUERY_BUILDER_FILTER_GROUP_OPERATION,
    )
  ) {
    const groupNode = new QueryBuilderFilterTreeGroupNodeData(
      parentFilterNodeId,
      expression.functionName as QUERY_BUILDER_FILTER_GROUP_OPERATION,
    );
    filterState.nodes.set(groupNode.id, groupNode);
    expression.parametersValues.forEach((filterExpression) =>
      processFilterExpression(
        guaranteeType(
          filterExpression,
          SimpleFunctionExpression,
          `Can't process filter expression of type '${
            getClass(filterExpression).name
          }'`,
        ),
        filterState,
        groupNode.id,
      ),
    );
    filterState.addNodeFromNode(groupNode, parentNode);
  } else {
    for (const operator of filterState.operators) {
      const filterConditionState = operator.buildFilterConditionState(
        filterState,
        expression,
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
    throw new Error(`Can't process filter expression function`);
  }
};

const processFilterFunction = (
  valueSpec: LambdaFunctionInstanceValue,
  filterQueryState: QueryBuilderFilterState,
): void => {
  const lambdaFunc = guaranteeNonNullable(
    valueSpec.values[0],
    'Lambda function is missing',
  );
  if (
    lambdaFunc.expressionSequence.length === 1 &&
    lambdaFunc.expressionSequence[0] instanceof SimpleFunctionExpression &&
    lambdaFunc.functionType.parameters.length === 1 &&
    lambdaFunc.functionType.parameters[0] instanceof VariableExpression
  ) {
    const rootExpression = guaranteeType(
      lambdaFunc.expressionSequence[0],
      SimpleFunctionExpression,
    );
    filterQueryState.setLambdaVariableName(
      guaranteeType(lambdaFunc.functionType.parameters[0], VariableExpression)
        .name,
    );
    processFilterExpression(rootExpression, filterQueryState, undefined);
  } else {
    throw new Error(`Can't process filter function`);
  }
};

export class QueryBuilderLambdaProcessor
  implements ValueSpecificationVisitor<void>
{
  queryBuilderState: QueryBuilderState;
  parentSimpleFunction?: SimpleFunctionExpression;

  constructor(
    queryBuilderState: QueryBuilderState,
    parentSimpleFunction: SimpleFunctionExpression | undefined,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.parentSimpleFunction = parentSimpleFunction;
  }

  getParentSimpleFunctionName(): string | undefined {
    return this.parentSimpleFunction?.functionName;
  }

  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_PropertyGraphFetchTreeInstanceValue(
    valueSpecification: PropertyGraphFetchTreeInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_AlloySerializationConfigInstanceValue(
    valueSpecification: AlloySerializationConfigInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_PrimitiveInstanceValue(
    valueSpecification: PrimitiveInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_ClassInstanceValue(valueSpecification: ClassInstanceValue): void {
    throw new Error('Method not implemented.');
  }
  visit_EnumerationInstanceValue(
    valueSpecification: EnumerationInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_RuntimeInstanceValue(valueSpecification: RuntimeInstanceValue): void {
    throw new Error('Method not implemented.');
  }
  visit_PairInstanceValue(valueSpecification: PairInstanceValue): void {
    throw new Error('Method not implemented.');
  }
  visit_MappingInstanceValue(valueSpecification: MappingInstanceValue): void {
    throw new Error('Method not implemented.');
  }
  visit_PureListInsanceValue(valueSpecification: PureListInstanceValue): void {
    throw new Error('Method not implemented.');
  }
  visit_CollectionInstanceValue(
    valueSpecification: CollectionInstanceValue,
  ): void {
    throw new Error('Method not implemented.');
  }
  visit_FunctionExpression(valueSpecification: FunctionExpression): void {
    throw new Error('Method not implemented.');
  }
  visit_SimpleFunctionExpression(
    valueSpecification: SimpleFunctionExpression,
  ): void {
    const functionName = valueSpecification.functionName;
    if (functionName === SUPPORTED_FUNCTIONS.PROJECT) {
      const params = valueSpecification.parametersValues;
      if (params.length === 3) {
        params[0].accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
        );
        const lambdaParam = params[1];
        const lambdaAlias = params[2];
        if (lambdaParam instanceof CollectionInstanceValue) {
          lambdaParam.values.map((e) =>
            e.accept_ValueSpecificationVisitor(
              new QueryBuilderLambdaProcessor(
                this.queryBuilderState,
                valueSpecification,
              ),
            ),
          );
        } else {
          lambdaParam.accept_ValueSpecificationVisitor(
            new QueryBuilderLambdaProcessor(
              this.queryBuilderState,
              valueSpecification,
            ),
          );
        }
        let aliases: string[] = [];
        if (lambdaAlias instanceof CollectionInstanceValue) {
          aliases = lambdaAlias.values
            .map(getNullableStringValueFromValueSpec)
            .filter(isNonNullable);
        } else if (lambdaAlias instanceof PrimitiveInstanceValue) {
          aliases = [getNullableStringValueFromValueSpec(lambdaAlias) ?? ''];
        } else {
          throw new Error(
            `Expecting different specification for function ${SUPPORTED_FUNCTIONS.PROJECT}`,
          );
        }
        this.queryBuilderState.fetchStructureState.projectionColumns.forEach(
          (e, idx) => e.setColumnName(aliases[idx]),
        );
        return;
      }
      throw new Error(
        `Expecting different specification for function '${SUPPORTED_FUNCTIONS.PROJECT}'`,
      );
    } else if (functionName === SUPPORTED_FUNCTIONS.GET_ALL) {
      const paramOne = valueSpecification.parametersValues[0];
      if (paramOne instanceof ClassInstanceValue) {
        const _class = guaranteeNonNullable(paramOne.values[0]).value;
        if (_class instanceof Class) {
          this.queryBuilderState.querySetupState.setClass(_class, true);
          this.queryBuilderState.explorerState.refreshTreeData();
          return;
        }
      }
      throw new Error(
        `Expecting different specification for function '${SUPPORTED_FUNCTIONS.GET_ALL}'`,
      );
    } else if (functionName === SUPPORTED_FUNCTIONS.TAKE) {
      if (valueSpecification.parametersValues.length === 2) {
        valueSpecification.parametersValues[0].accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
        );
        const takeValue = getNullableNumberValueFromValueSpec(
          valueSpecification.parametersValues[1],
        );
        this.queryBuilderState.resultSetModifierState.setLimit(takeValue);
        return;
      }
      throw new Error(
        `Expecting different specification for function '${SUPPORTED_FUNCTIONS.TAKE}'`,
      );
    } else if (functionName === SUPPORTED_FUNCTIONS.DISTINCT) {
      this.queryBuilderState.resultSetModifierState.distinct = true;
      valueSpecification.parametersValues.map((e) =>
        e.accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
        ),
      );
      return;
    } else if (functionName === SUPPORTED_FUNCTIONS.SORT_FUNC) {
      if (valueSpecification.parametersValues.length === 2) {
        valueSpecification.parametersValues[0].accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
        );
        const sortParam = valueSpecification.parametersValues[1];
        if (sortParam instanceof CollectionInstanceValue) {
          sortParam.values.map((e) =>
            e.accept_ValueSpecificationVisitor(
              new QueryBuilderLambdaProcessor(
                this.queryBuilderState,
                valueSpecification,
              ),
            ),
          );
          return;
        }
      }
      throw new Error(
        `Expecting different specification for function '${SUPPORTED_FUNCTIONS.SORT_FUNC}'`,
      );
    } else if (
      (functionName === COLUMN_SORT_TYPE.ASC ||
        functionName === COLUMN_SORT_TYPE.DESC) &&
      this.getParentSimpleFunctionName() === SUPPORTED_FUNCTIONS.SORT_FUNC
    ) {
      if (valueSpecification.parametersValues.length === 1) {
        const sortColumnName = getNullableStringValueFromValueSpec(
          valueSpecification.parametersValues[0],
        );
        const queryBuilderProjectionColumnState =
          this.queryBuilderState.fetchStructureState.projectionColumns.find(
            (e) => e.columnName === sortColumnName,
          );
        if (queryBuilderProjectionColumnState) {
          const editorStore = this.queryBuilderState.editorStore;
          const sortColumnState = new SortColumnState(
            editorStore,
            queryBuilderProjectionColumnState,
          );
          sortColumnState.sortType = functionName;
          this.queryBuilderState.resultSetModifierState.addSortColumn(
            sortColumnState,
          );
          return;
        }
      }
      throw new Error(
        `Expecting different specification for function '${functionName}'`,
      );
    } else if (functionName === SUPPORTED_FUNCTIONS.FILTER) {
      const filterState = this.queryBuilderState.filterState;
      if (valueSpecification.parametersValues.length === 2) {
        valueSpecification.parametersValues[0].accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(this.queryBuilderState, undefined),
        );
        const filterExpression = valueSpecification.parametersValues[1];
        if (filterExpression instanceof LambdaFunctionInstanceValue) {
          processFilterFunction(filterExpression, filterState);
          /**
           * NOTE: Since group operations ike and/or do not take more than 2 parameters, if there are
           * more than 2 clauses in each group operations, then these clauses are converted into an
           * unbalanced tree. However, this would look quite bad for UX, as such, we simplify the tree.
           * After building the filter state.
           */
          filterState.simplifyTree();
          return;
        }
      }
      throw new Error(
        `Expecting different specification for function '${SUPPORTED_FUNCTIONS.FILTER}'`,
      );
    } else if (functionName === SUPPORTED_FUNCTIONS.SERIALIZE) {
      if (valueSpecification.parametersValues.length === 2) {
        valueSpecification.parametersValues[0].accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
            this.queryBuilderState,
            valueSpecification,
          ),
        );
        const serializeFunc = valueSpecification.parametersValues[1];
        if (serializeFunc instanceof GraphFetchTreeInstanceValue) {
          const value = serializeFunc.values[0];
          if (value instanceof RootGraphFetchTree) {
            this.queryBuilderState.fetchStructureState.setFetchStructureMode(
              FETCH_STRUCTURE_MODE.GRAPH_FETCH,
            );
            this.queryBuilderState.fetchStructureState.graphFetchTreeState.init(
              value,
            );
            return;
          }
        }
      }
    } else if (
      functionName === SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED &&
      this.getParentSimpleFunctionName() === SUPPORTED_FUNCTIONS.SERIALIZE
    ) {
      if (valueSpecification.parametersValues.length === 2) {
        valueSpecification.parametersValues[0].accept_ValueSpecificationVisitor(
          new QueryBuilderLambdaProcessor(
            this.queryBuilderState,
            valueSpecification,
          ),
        );
        return;
      }
    }
    throw new Error(`Can't process function '${functionName}'`);
  }

  visit_VariableExpression(valueSpecification: VariableExpression): void {
    throw new Error('Method not implemented.');
  }

  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): void {
    valueSpecification.values
      .map((value) =>
        value.expressionSequence.map((e) =>
          e.accept_ValueSpecificationVisitor(
            new QueryBuilderLambdaProcessor(
              this.queryBuilderState,
              this.parentSimpleFunction,
            ),
          ),
        ),
      )
      .flat();
  }

  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): void {
    if (this.getParentSimpleFunctionName() === SUPPORTED_FUNCTIONS.PROJECT) {
      const columnState =
        this.queryBuilderState.fetchStructureState.addPropertyExpressionProjectionColumn(
          valueSpecification,
          true,
        );
      if (
        valueSpecification.parametersValues[0] instanceof VariableExpression
      ) {
        columnState.setLambdaVariableName(
          (valueSpecification.parametersValues[0] as VariableExpression).name,
        );
      }
      return;
    }
    throw new Error('Error processing property expression');
  }

  visit_InstanceValue(valueSpecification: InstanceValue): void {
    throw new Error('Method not implemented.');
  }
}
