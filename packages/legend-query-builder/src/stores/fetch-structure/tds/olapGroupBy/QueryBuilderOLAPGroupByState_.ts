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

import { matchFunctionName, type Type } from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  guaranteeNonNullable,
  hashArray,
  uniq,
  type Hashable,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../graphManager/QueryBuilderHashUtils.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../../QueryBuilderConfig.js';
import type { QueryBuilderProjectionColumnDragSource } from '../projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import type { COLUMN_SORT_TYPE } from '../QueryResultSetModifierState.js';
import type { QueryBuilderTDS_OLAPOperator } from './operators/QueryBuilderTDS_OLAPOperator.js';

export const QUERY_BUILDER_OLAP_COLUMN_DND_TYPE = 'OLAP_COLUMN';

export interface QueryBuilderOLAPColumnDragSource {
  columnState: QueryBuilderTDSColumnState;
}

export type QueryBuilderOLAPDropTarget =
  | QueryBuilderProjectionColumnDragSource
  | QueryBuilderOLAPColumnDragSource;

export class OLAPGroupByColumnSortByState implements Hashable {
  columnState: QueryBuilderTDSColumnState;
  sortType: COLUMN_SORT_TYPE;

  constructor(
    columnState: QueryBuilderTDSColumnState,
    sortType: COLUMN_SORT_TYPE,
  ) {
    makeObservable(this, {
      columnState: observable,
      sortType: observable,
      setColumnState: action,
      setSortType: action,
    });

    this.columnState = columnState;
    this.sortType = sortType;
  }

  setColumnState(colState: QueryBuilderTDSColumnState): void {
    this.columnState = colState;
  }

  setSortType(type: COLUMN_SORT_TYPE): void {
    this.sortType = type;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.TDS_OLAP_GROUPBY_COLUMN_SORTBY_STATE,
      this.sortType,
      this.columnState.columnName,
    ]);
  }
}

export abstract class QueryBuilderTDS_OLAPOperatorState implements Hashable {
  readonly olapState: QueryBuilderOLAPGroupByState;
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  operator: QueryBuilderTDS_OLAPOperator;

  constructor(
    olapState: QueryBuilderOLAPGroupByState,
    operator: QueryBuilderTDS_OLAPOperator,
  ) {
    this.olapState = olapState;
    this.operator = operator;
  }

  setLambdaParameterName(paramName: string): void {
    this.lambdaParameterName = paramName;
  }

  setOperator(val: QueryBuilderTDS_OLAPOperator): void {
    this.operator = val;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.TDS_OLAP_GROUPBY_OPERATION_STATE,
      this.lambdaParameterName,
      this.operator,
    ]);
  }
}

export class QueryBuilderTDS_OLAPRankOperatorState extends QueryBuilderTDS_OLAPOperatorState {
  constructor(
    olapState: QueryBuilderOLAPGroupByState,
    operator: QueryBuilderTDS_OLAPOperator,
  ) {
    super(olapState, operator);
    makeObservable(this, {
      setLambdaParameterName: action,
    });
  }
}

export class QueryBuilderTDS_OLAPAggreationOperatorState extends QueryBuilderTDS_OLAPOperatorState {
  columnState: QueryBuilderTDSColumnState;
  constructor(
    olapState: QueryBuilderOLAPGroupByState,
    operator: QueryBuilderTDS_OLAPOperator,
    columnState: QueryBuilderTDSColumnState,
  ) {
    super(olapState, operator);
    makeObservable(this, {
      columnState: observable,
      setColumnState: action,
      setLambdaParameterName: action,
    });
    this.columnState = columnState;
  }

  setColumnState(val: QueryBuilderTDSColumnState): void {
    this.columnState = val;
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.TDS_OLAP_GROUPBY_AGG_OPERATION_STATE,
      this.lambdaParameterName,
      this.operator,
      this.columnState.columnName,
    ]);
  }
}

export class QueryBuilderOLAPGroupByColumnState
  extends QueryBuilderTDSColumnState
  implements Hashable
{
  readonly olapState: QueryBuilderOLAPGroupByState;
  windowColumns: QueryBuilderTDSColumnState[] = [];
  sortByState: OLAPGroupByColumnSortByState | undefined;
  operationState: QueryBuilderTDS_OLAPOperatorState;
  columnName: string;

  constructor(
    olapState: QueryBuilderOLAPGroupByState,
    windowColumns: QueryBuilderTDSColumnState[],
    sortType: OLAPGroupByColumnSortByState | undefined,
    operationState: QueryBuilderTDS_OLAPOperatorState,
    columnName: string,
  ) {
    super();
    makeObservable(this, {
      windowColumns: observable,
      sortByState: observable,
      operationState: observable,
      columnName: observable,
      setOperatorState: observable,
      setColumnName: action,
      setSortBy: action,
      changeWindow: action,
      deleteWindow: action,
      addWindow: action,
      changeOperator: action,
      changeSortBy: action,
    });
    this.olapState = olapState;
    this.windowColumns = windowColumns;
    this.sortByState = sortType;
    this.operationState = operationState;
    this.columnName = columnName;
  }

  get columnOLAPGroupIdx(): number {
    return this.olapState.olapColumns.findIndex((e) => e === this);
  }

  get possibleReferencedColumns(): QueryBuilderTDSColumnState[] {
    // column can only reference TDS columns already defined, i.e in an earlier index of the olap columns
    const idx = this.olapState.tdsState.tdsColumns.findIndex((e) => e === this);
    if (idx === -1) {
      return this.olapState.tdsState.tdsColumns;
    }
    return this.olapState.tdsState.tdsColumns.slice(0, idx);
  }

  get referencedTDSColumns(): QueryBuilderTDSColumnState[] {
    const operatorReference =
      this.operationState instanceof QueryBuilderTDS_OLAPAggreationOperatorState
        ? [this.operationState.columnState]
        : [];
    const soryByReference = this.sortByState
      ? [this.sortByState.columnState]
      : [];
    return [...this.windowColumns, ...soryByReference, ...operatorReference];
  }

  getColumnType(): Type | undefined {
    return this.operationState.operator.getOperatorReturnType(
      this.olapState.tdsState.queryBuilderState.graphManagerState.graph,
    );
  }

  setColumnName(val: string): void {
    this.columnName = val;
  }

  setOperatorState(op: QueryBuilderTDS_OLAPOperatorState): void {
    this.operationState = op;
  }

  setSortBy(val: OLAPGroupByColumnSortByState | undefined): void {
    this.sortByState = val;
  }

  changeWindow(val: QueryBuilderTDSColumnState, idx: number): void {
    this.windowColumns[idx] = val;
  }

  addWindow(val: QueryBuilderTDSColumnState): void {
    addUniqueEntry(this.windowColumns, val);
  }

  deleteWindow(val: QueryBuilderTDSColumnState): void {
    deleteEntry(this.windowColumns, val);
  }

  possibleAggregatedColumns(
    op: QueryBuilderTDS_OLAPOperator,
  ): QueryBuilderTDSColumnState[] {
    if (op.isColumnAggregator()) {
      return this.possibleReferencedColumns.filter((col) =>
        op.isCompatibleWithColumn(col),
      );
    }
    return [];
  }

  changeOperator(olapOp: QueryBuilderTDS_OLAPOperator): void {
    const currentOperator = this.operationState.operator;
    const currentAggregateColumn =
      this.operationState instanceof QueryBuilderTDS_OLAPAggreationOperatorState
        ? this.operationState.columnState
        : undefined;
    if (currentOperator !== olapOp) {
      if (olapOp.isColumnAggregator()) {
        const compatibleAggCol =
          currentAggregateColumn &&
          olapOp.isCompatibleWithColumn(currentAggregateColumn)
            ? currentAggregateColumn
            : this.possibleAggregatedColumns(olapOp)[0];
        if (compatibleAggCol) {
          this.setOperatorState(
            new QueryBuilderTDS_OLAPAggreationOperatorState(
              this.olapState,
              olapOp,
              compatibleAggCol,
            ),
          );
        }
      } else {
        this.setOperatorState(
          new QueryBuilderTDS_OLAPRankOperatorState(this.olapState, olapOp),
        );
      }
    }
  }

  changeSortBy(sortOp: COLUMN_SORT_TYPE | undefined): void {
    const sortByState = this.sortByState;
    if (sortByState?.sortType !== sortOp) {
      if (sortOp) {
        const sortInfoOpState =
          sortByState ??
          new OLAPGroupByColumnSortByState(
            guaranteeNonNullable(this.possibleReferencedColumns[0]),
            sortOp,
          );
        sortInfoOpState.setSortType(sortOp);
        this.setSortBy(sortInfoOpState);
      } else {
        this.setSortBy(undefined);
      }
    }
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.TDS_OLAP_GROUPBY_COLUMN_STATE,
      hashArray(this.windowColumns),
      this.sortByState ?? '',
      this.operationState,
      this.columnName,
    ]);
  }
}

export class QueryBuilderOLAPGroupByState implements Hashable {
  readonly tdsState: QueryBuilderTDSState;
  olapColumns: QueryBuilderOLAPGroupByColumnState[] = [];
  operators: QueryBuilderTDS_OLAPOperator[];
  editColumn: QueryBuilderOLAPGroupByColumnState | undefined;

  constructor(
    tdsState: QueryBuilderTDSState,
    operators: QueryBuilderTDS_OLAPOperator[],
  ) {
    makeObservable(this, {
      olapColumns: observable,
      editColumn: observable,
      addOLAPColumn: action,
      removeColumn: action,
      moveColumn: action,
      setEditColumn: action,
    });
    this.tdsState = tdsState;
    this.operators = operators;
  }

  get isEmpty(): boolean {
    return !this.olapColumns.length;
  }

  get referencedTDSColumns(): QueryBuilderTDSColumnState[] {
    return uniq(this.olapColumns.map((c) => c.referencedTDSColumns).flat());
  }

  setEditColumn(col: QueryBuilderOLAPGroupByColumnState | undefined): void {
    this.editColumn = col;
  }

  findOperator(func: string): QueryBuilderTDS_OLAPOperator | undefined {
    return this.operators.find((o) => matchFunctionName(func, o.pureFunc));
  }

  addOLAPColumn(olapGroupByCol: QueryBuilderOLAPGroupByColumnState): void {
    addUniqueEntry(this.olapColumns, olapGroupByCol);
  }

  removeColumn(column: QueryBuilderOLAPGroupByColumnState): void {
    deleteEntry(this.olapColumns, column);
  }

  moveColumn(fromIndex: number, toIndex: number): void {
    const fromCol = this.olapColumns[fromIndex];
    const toCol = this.olapColumns[toIndex];
    if (fromCol && toCol) {
      this.olapColumns[fromIndex] = toCol;
      this.olapColumns[toIndex] = fromCol;
    }
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.TDS_OLAP_GROUPBY_STATE,
      hashArray(this.olapColumns),
    ]);
  }
}
