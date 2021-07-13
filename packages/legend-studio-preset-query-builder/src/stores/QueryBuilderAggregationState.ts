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

import { action, makeAutoObservable } from 'mobx';
import { uuid, deleteEntry, addUniqueEntry } from '@finos/legend-studio-shared';
import type {
  EditorStore,
  SimpleFunctionExpression,
  ValueSpecification,
} from '@finos/legend-studio';
import {
  CORE_ELEMENT_PATH,
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-studio';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Const';
import type {
  QueryBuilderProjectionColumnState,
  QueryBuilderProjectionState,
} from './QueryBuilderProjectionState';

export abstract class QueryBuilderAggregateOperator {
  uuid = uuid();

  abstract getLabel(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): string;

  abstract isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean;

  abstract buildAggregateExpression(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): ValueSpecification;

  abstract buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined;
}

export const buildAggregateLambda = (
  aggregateColumnState: QueryBuilderAggregateColumnState,
): LambdaFunctionInstanceValue => {
  const multiplicityOne =
    aggregateColumnState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const typeAny = aggregateColumnState.editorStore.graphState.graph.getType(
    CORE_ELEMENT_PATH.ANY,
  );
  const aggregateLambda = new LambdaFunctionInstanceValue(multiplicityOne);
  const colLambdaFunctionType = new FunctionType(typeAny, multiplicityOne);
  colLambdaFunctionType.parameters.push(
    new VariableExpression(
      aggregateColumnState.lambdaParameterName,
      multiplicityOne,
    ),
  );
  const colLambdaFunction = new LambdaFunction(colLambdaFunctionType);
  colLambdaFunction.expressionSequence.push(
    aggregateColumnState.operator.buildAggregateExpression(
      aggregateColumnState,
    ),
  );
  aggregateLambda.values.push(colLambdaFunction);
  return aggregateLambda;
};

export class QueryBuilderAggregateColumnState {
  uuid = uuid();
  editorStore: EditorStore;
  aggregationState: QueryBuilderAggregationState;
  projectionColumnState: QueryBuilderProjectionColumnState;
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  operator: QueryBuilderAggregateOperator;

  constructor(
    editorStore: EditorStore,
    aggregationState: QueryBuilderAggregationState,
    projectionColumnState: QueryBuilderProjectionColumnState,
    operator: QueryBuilderAggregateOperator,
  ) {
    makeAutoObservable(this, {
      uuid: false,
      editorStore: false,
      aggregationState: false,
      setLambdaParameterName: action,
      setOperator: action,
    });

    this.editorStore = editorStore;
    this.aggregationState = aggregationState;
    this.projectionColumnState = projectionColumnState;
    this.operator = operator;
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  setOperator(val: QueryBuilderAggregateOperator): void {
    this.operator = val;
  }
}

export class QueryBuilderAggregationState {
  editorStore: EditorStore;
  projectionState: QueryBuilderProjectionState;
  operators: QueryBuilderAggregateOperator[] = [];
  columns: QueryBuilderAggregateColumnState[] = [];

  constructor(
    editorStore: EditorStore,
    projectionState: QueryBuilderProjectionState,
    operators: QueryBuilderAggregateOperator[],
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      projectionState: false,
      removeColumn: action,
      addColumn: action,
    });

    this.editorStore = editorStore;
    this.projectionState = projectionState;
    this.operators = operators;
  }

  removeColumn(val: QueryBuilderAggregateColumnState): void {
    deleteEntry(this.columns, val);
  }

  addColumn(val: QueryBuilderAggregateColumnState): void {
    addUniqueEntry(this.columns, val);
  }

  changeColumnAggregateOperator(
    val: QueryBuilderAggregateOperator | undefined,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): void {
    const aggregateColumnState = this.columns.find(
      (column) => column.projectionColumnState === projectionColumnState,
    );
    const aggreateOperators = this.operators.filter((op) =>
      op.isCompatibleWithColumn(projectionColumnState),
    );
    if (val) {
      if (!aggreateOperators.includes(val)) {
        return;
      }
      if (aggregateColumnState) {
        aggregateColumnState.setOperator(val);
      } else {
        const newAggregateColumnState = new QueryBuilderAggregateColumnState(
          this.editorStore,
          this,
          projectionColumnState,
          val,
        );
        newAggregateColumnState.setOperator(val);
        this.addColumn(newAggregateColumnState);

        // automatically move the column to the end
        // as aggregate column should always be the last one
        // NOTE: unless we do `olap` aggregation
        // See https://github.com/finos/legend-studio/issues/253
        this.projectionState.moveColumn(
          this.projectionState.columns.indexOf(projectionColumnState),
          this.projectionState.columns.length - 1,
        );
      }
    } else {
      if (aggregateColumnState) {
        // automatically move the column to the last position before the aggregate columns
        // NOTE: `moveColumn` will take care of this placement calculation
        this.projectionState.moveColumn(
          this.projectionState.columns.indexOf(projectionColumnState),
          0,
        );

        this.removeColumn(aggregateColumnState);
      }
    }
  }
}
