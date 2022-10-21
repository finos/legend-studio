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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  deleteEntry,
  addUniqueEntry,
  type Hashable,
  hashArray,
} from '@finos/legend-shared';
import type { Type } from '@finos/legend-graph';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../../QueryBuilderConfig.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import type { QueryBuilderAggregateOperator } from './QueryBuilderAggregateOperator.js';
import type { QueryBuilderProjectionColumnState } from '../projection/QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../graphManager/QueryBuilderHashUtils.js';
import { QueryBuilderTDSColumnState } from '../QueryBuilderTdsColumnState.js';

export class QueryBuilderAggregateColumnState
  extends QueryBuilderTDSColumnState
  implements Hashable
{
  readonly aggregationState: QueryBuilderAggregationState;
  projectionColumnState: QueryBuilderProjectionColumnState;
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  operator: QueryBuilderAggregateOperator;

  constructor(
    aggregationState: QueryBuilderAggregationState,
    projectionColumnState: QueryBuilderProjectionColumnState,
    operator: QueryBuilderAggregateOperator,
  ) {
    super();
    makeObservable(this, {
      projectionColumnState: observable,
      lambdaParameterName: observable,
      operator: observable,
      setColumnState: action,
      setLambdaParameterName: action,
      setOperator: action,
      hashCode: computed,
    });

    this.aggregationState = aggregationState;
    this.projectionColumnState = projectionColumnState;
    this.operator = operator;
  }
  setColumnState(val: QueryBuilderProjectionColumnState): void {
    this.projectionColumnState = val;
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  setOperator(val: QueryBuilderAggregateOperator): void {
    this.operator = val;
  }

  getColumnType(): Type {
    return this.operator.getReturnType(this);
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.AGGREGATE_COLUMN_STATE,
      this.operator,
    ]);
  }

  get columnName(): string {
    return this.projectionColumnState.columnName;
  }
}

export class QueryBuilderAggregationState implements Hashable {
  readonly tdsState: QueryBuilderTDSState;
  readonly operators: QueryBuilderAggregateOperator[] = [];
  columns: QueryBuilderAggregateColumnState[] = [];

  constructor(
    tdsState: QueryBuilderTDSState,
    operators: QueryBuilderAggregateOperator[],
  ) {
    makeObservable(this, {
      columns: observable,
      removeColumn: action,
      addColumn: action,
      changeColumnAggregateOperator: action,
      hashCode: computed,
    });

    this.tdsState = tdsState;
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
        this.tdsState.moveColumn(
          this.tdsState.projectionColumns.indexOf(projectionColumnState),
          this.tdsState.projectionColumns.length - 1,
        );
      }
    } else {
      if (aggregateColumnState) {
        // automatically move the column to the last position before the aggregate columns
        // NOTE: `moveColumn` will take care of this placement calculation
        this.tdsState.moveColumn(
          this.tdsState.projectionColumns.indexOf(projectionColumnState),
          0,
        );

        this.removeColumn(aggregateColumnState);
      }
    }
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.AGGREGATION_STATE,
      hashArray(this.columns),
    ]);
  }
}
