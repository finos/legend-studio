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
import { action, computed, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../QueryBuilderStateHashUtils.js';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../../../QueryBuilderConfig.js';
import type { QueryBuilderProjectionColumnDragSource } from '../projection/QueryBuilderProjectionColumnState.js';
import { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import type { QueryBuilderTDS_WindowOperator } from './operators/QueryBuilderTDS_WindowOperator.js';
import type { COLUMN_SORT_TYPE } from '../../../../graph/QueryBuilderMetaModelConst.js';

export const QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE = 'WINDOW_COLUMN';

export interface QueryBuilderWindowColumnDragSource {
  columnState: QueryBuilderTDSColumnState;
}

interface QueryBuilderInvalidWindowColumnName {
  invalidColumnName: string;
  missingColumnName: string;
}

export type QueryBuilderWindowDropTarget =
  | QueryBuilderProjectionColumnDragSource
  | QueryBuilderWindowColumnDragSource;

export class WindowGroupByColumnSortByState implements Hashable {
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.TDS_WINDOW_COLUMN_SORTBY_STATE,
      this.sortType,
      this.columnState.columnName,
    ]);
  }
}

export abstract class QueryBuilderTDS_WindowOperatorState implements Hashable {
  readonly windowState: QueryBuilderWindowState;
  lambdaParameterName: string = DEFAULT_LAMBDA_VARIABLE_NAME;
  operator: QueryBuilderTDS_WindowOperator;

  constructor(
    windowState: QueryBuilderWindowState,
    operator: QueryBuilderTDS_WindowOperator,
  ) {
    this.windowState = windowState;
    this.operator = operator;
  }

  setLambdaParameterName(paramName: string): void {
    this.lambdaParameterName = paramName;
  }

  setOperator(val: QueryBuilderTDS_WindowOperator): void {
    this.operator = val;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.TDS_WINDOW_GROUPBY_OPERATION_STATE,
      this.lambdaParameterName,
      this.operator,
    ]);
  }
}

export class QueryBuilderTDS_WindowRankOperatorState extends QueryBuilderTDS_WindowOperatorState {
  constructor(
    windowState: QueryBuilderWindowState,
    operator: QueryBuilderTDS_WindowOperator,
  ) {
    super(windowState, operator);
    makeObservable(this, {
      setLambdaParameterName: action,
    });
  }
}

export class QueryBuilderTDS_WindowAggreationOperatorState extends QueryBuilderTDS_WindowOperatorState {
  columnState: QueryBuilderTDSColumnState;
  constructor(
    windowState: QueryBuilderWindowState,
    operator: QueryBuilderTDS_WindowOperator,
    columnState: QueryBuilderTDSColumnState,
  ) {
    super(windowState, operator);
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.TDS_WINDOW_GROUPBY_AGG_OPERATOR_STATE,
      this.lambdaParameterName,
      this.operator,
      this.columnState.columnName,
    ]);
  }
}

export class QueryBuilderWindowColumnState
  extends QueryBuilderTDSColumnState
  implements Hashable
{
  readonly windowState: QueryBuilderWindowState;
  windowColumns: QueryBuilderTDSColumnState[] = [];
  sortByState: WindowGroupByColumnSortByState | undefined;
  operatorState: QueryBuilderTDS_WindowOperatorState;
  columnName: string;

  constructor(
    windowState: QueryBuilderWindowState,
    windowColumns: QueryBuilderTDSColumnState[],
    sortType: WindowGroupByColumnSortByState | undefined,
    operatorState: QueryBuilderTDS_WindowOperatorState,
    columnName: string,
  ) {
    super();
    makeObservable(this, {
      windowColumns: observable,
      sortByState: observable,
      operatorState: observable,
      columnName: observable,
      setOperatorState: observable,
      setColumnName: action,
      setSortBy: action,
      changeWindow: action,
      deleteWindow: action,
      addWindow: action,
      setWindows: action,
      changeOperator: action,
      changeSortBy: action,
    });
    this.windowState = windowState;
    this.windowColumns = windowColumns;
    this.sortByState = sortType;
    this.operatorState = operatorState;
    this.columnName = columnName;
  }

  get columnWindowGroupIdx(): number {
    return this.windowState.windowColumns.findIndex((e) => e === this);
  }

  get possibleReferencedColumns(): QueryBuilderTDSColumnState[] {
    // column can only reference TDS columns already defined, i.e in an earlier index of the window columns
    const idx = this.windowState.tdsState.tdsColumns.findIndex(
      (e) => e === this,
    );
    if (idx === -1) {
      return this.windowState.tdsState.tdsColumns;
    }
    return this.windowState.tdsState.tdsColumns.slice(0, idx);
  }

  get referencedTDSColumns(): QueryBuilderTDSColumnState[] {
    const operatorReference =
      this.operatorState instanceof
      QueryBuilderTDS_WindowAggreationOperatorState
        ? [this.operatorState.columnState]
        : [];
    const soryByReference = this.sortByState
      ? [this.sortByState.columnState]
      : [];
    return [...this.windowColumns, ...soryByReference, ...operatorReference];
  }

  getColumnType(): Type | undefined {
    return this.operatorState.operator.getOperatorReturnType(
      this.windowState.tdsState.queryBuilderState.graphManagerState.graph,
    );
  }

  setColumnName(val: string): void {
    this.columnName = val;
  }

  setOperatorState(op: QueryBuilderTDS_WindowOperatorState): void {
    this.operatorState = op;
  }

  setSortBy(val: WindowGroupByColumnSortByState | undefined): void {
    this.sortByState = val;
  }

  changeWindow(val: QueryBuilderTDSColumnState, idx: number): void {
    this.windowColumns[idx] = val;
  }

  addWindow(val: QueryBuilderTDSColumnState): void {
    addUniqueEntry(this.windowColumns, val);
  }

  setWindows(val: QueryBuilderTDSColumnState[]): void {
    this.windowColumns = val;
  }

  deleteWindow(val: QueryBuilderTDSColumnState): void {
    deleteEntry(this.windowColumns, val);
  }

  possibleAggregatedColumns(
    op: QueryBuilderTDS_WindowOperator,
  ): QueryBuilderTDSColumnState[] {
    if (op.isColumnAggregator()) {
      return this.possibleReferencedColumns.filter((col) =>
        op.isCompatibleWithColumn(col),
      );
    }
    return [];
  }

  getChangeOperatorStateAndColumnName(
    currentOperator: QueryBuilderTDS_WindowOperator,
    currentColumn: QueryBuilderTDSColumnState | undefined,
    newOperator: QueryBuilderTDS_WindowOperator,
  ):
    | { operatorState: QueryBuilderTDS_WindowOperatorState; columnName: string }
    | undefined {
    if (currentOperator !== newOperator) {
      if (newOperator.isColumnAggregator()) {
        const compatibleAggCol =
          currentColumn && newOperator.isCompatibleWithColumn(currentColumn)
            ? currentColumn
            : this.possibleAggregatedColumns(newOperator)[0];
        if (compatibleAggCol) {
          return {
            operatorState: new QueryBuilderTDS_WindowAggreationOperatorState(
              this.windowState,
              newOperator,
              compatibleAggCol,
            ),
            columnName: `${newOperator.getLabel()} of ${
              compatibleAggCol.columnName
            }`,
          };
        }
      } else {
        return {
          operatorState: new QueryBuilderTDS_WindowRankOperatorState(
            this.windowState,
            newOperator,
          ),
          columnName: `${newOperator.getLabel()}`,
        };
      }
    }
    return undefined;
  }

  changeOperator(windowOp: QueryBuilderTDS_WindowOperator): void {
    const stateAndName = this.getChangeOperatorStateAndColumnName(
      this.operatorState.operator,
      this.operatorState instanceof
        QueryBuilderTDS_WindowAggreationOperatorState
        ? this.operatorState.columnState
        : undefined,
      windowOp,
    );

    if (stateAndName) {
      this.setOperatorState(stateAndName.operatorState);
      this.setColumnName(stateAndName.columnName);
    }
  }

  changeSortBy(sortOp: COLUMN_SORT_TYPE | undefined): void {
    const sortByState = this.sortByState;
    if (sortByState?.sortType !== sortOp) {
      if (sortOp) {
        const sortInfoOpState =
          sortByState ??
          new WindowGroupByColumnSortByState(
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.TDS_WINDOW_COLUMN_STATE,
      hashArray(this.windowColumns),
      this.sortByState ?? '',
      this.operatorState,
      this.columnName,
    ]);
  }
}

export class QueryBuilderWindowState implements Hashable {
  readonly tdsState: QueryBuilderTDSState;
  windowColumns: QueryBuilderWindowColumnState[] = [];
  operators: QueryBuilderTDS_WindowOperator[];
  editColumn: QueryBuilderWindowColumnState | undefined;

  constructor(
    tdsState: QueryBuilderTDSState,
    operators: QueryBuilderTDS_WindowOperator[],
  ) {
    makeObservable(this, {
      windowColumns: observable,
      editColumn: observable,
      invalidWindowColumnNames: computed,
      windowValidationIssues: computed,
      addWindowColumn: action,
      removeColumn: action,
      moveColumn: action,
      setEditColumn: action,
    });
    this.tdsState = tdsState;
    this.operators = operators;
  }

  get isEmpty(): boolean {
    return !this.windowColumns.length;
  }

  get invalidWindowColumnNames(): QueryBuilderInvalidWindowColumnName[] {
    const invalidColNames: QueryBuilderInvalidWindowColumnName[] = [];
    const windowCols = this.windowColumns;
    windowCols.forEach((item, index) => {
      if (
        item.operatorState instanceof
        QueryBuilderTDS_WindowAggreationOperatorState
      ) {
        if (
          item.operatorState.columnState instanceof
          QueryBuilderWindowColumnState
        ) {
          const windowColumnName = item.operatorState.columnState.columnName;
          const hasExistingColumn = item.windowState.isColumnOrderValid(
            windowColumnName,
            index,
          );
          if (!hasExistingColumn) {
            invalidColNames.push({
              invalidColumnName: item.columnName,
              missingColumnName: windowColumnName,
            });
          }
        }
      }
    });
    return invalidColNames;
  }

  get windowValidationIssues(): string[] {
    const invalidWindowColumnNames = this.invalidWindowColumnNames;
    const issues = [];
    invalidWindowColumnNames.forEach((item) => {
      issues.push(
        `Column '${item.invalidColumnName}' cannot exist before column name '${item.missingColumnName}'`,
      );
    });

    const hasDuplicatedWindowColumns = this.windowColumns.some(
      (column) =>
        this.windowColumns.filter((c) => c.columnName === column.columnName)
          .length > 1,
    );
    if (hasDuplicatedWindowColumns) {
      issues.push(`Query has duplicated window columns`);
    }

    const hasDuplicatedProjectionWindowColumns = this.windowColumns.some(
      (column) =>
        this.tdsState.projectionColumns.filter(
          (c) => c.columnName === column.columnName,
        ).length > 0,
    );
    if (hasDuplicatedProjectionWindowColumns) {
      issues.push('Query has duplicated projection/window columns');
    }

    return issues;
  }

  get referencedTDSColumns(): QueryBuilderTDSColumnState[] {
    return uniq(this.windowColumns.map((c) => c.referencedTDSColumns).flat());
  }

  setEditColumn(col: QueryBuilderWindowColumnState | undefined): void {
    this.editColumn = col;
  }

  findOperator(func: string): QueryBuilderTDS_WindowOperator | undefined {
    return this.operators.find((o) => matchFunctionName(func, o.pureFunc));
  }

  addWindowColumn(windowCol: QueryBuilderWindowColumnState): void {
    addUniqueEntry(this.windowColumns, windowCol);
  }

  removeColumn(column: QueryBuilderWindowColumnState): void {
    deleteEntry(this.windowColumns, column);
  }

  moveColumn(fromIndex: number, toIndex: number): void {
    const fromCol = this.windowColumns[fromIndex];
    const toCol = this.windowColumns[toIndex];
    if (fromCol && toCol) {
      this.windowColumns[fromIndex] = toCol;
      this.windowColumns[toIndex] = fromCol;
    }
  }

  isColumnOrderValid(columnName: string, indexRange: number): boolean {
    return this.windowColumns
      .slice(0, indexRange)
      .some((col) => col.columnName === columnName);
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.TDS_WINDOW_GROUPBY_STATE,
      hashArray(this.windowColumns),
    ]);
  }
}
