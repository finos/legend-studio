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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { type DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { DataCubeEditorMutableColumnConfiguration } from './DataCubeEditorMutableConfiguration.js';
import {
  at,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { _findCol } from '../../core/model/DataCubeColumn.js';
import type { DataCubeQueryAggregateOperation } from '../../core/aggregation/DataCubeQueryAggregateOperation.js';
import {
  fallBackUnavailableAggregations,
  getAggregationParameterColumns,
  setColumnAggregateOperation,
} from '../../core/DataCubeConfigurationBuilder.js';

export class DataCubeEditorColumnPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  private readonly _view!: DataCubeViewState;
  private readonly _editor!: DataCubeEditorState;

  columns: DataCubeEditorMutableColumnConfiguration[] = [];
  selectedColumnName?: string | undefined;
  showAdvancedSettings = false;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      columns: observable,
      setColumns: action,

      selectedColumnName: observable,
      setSelectedColumnName: action,
      selectedColumn: computed,

      showAdvancedSettings: observable,
      setShowAdvancedSettings: action,

      selectedColumnAggregationParameterColumns: computed,
      selectedColumnCompatibleAggregateOperations: computed,
      setAggregateOperation: action,
      adaptPropagatedChanges: action,

      applySnaphot: action,
    });

    this._view = editor.view;
    this._editor = editor;
  }

  /**
   * Columns which the aggregation of the specified column can reference, e.g. the
   * weights of a weighted average.
   */
  getAggregationParameterColumns(
    column: DataCubeEditorMutableColumnConfiguration,
  ) {
    return getAggregationParameterColumns(
      column,
      this.columns,
      this._editor.horizontalPivots.selector.selectedColumns,
      this._editor.groupExtendColumns,
    );
  }

  /**
   * Aggregations available for the specified column; those which reference another
   * column, e.g. weighted average, are only available when such column can be found
   * among the columns which the aggregation can reference.
   */
  getCompatibleAggregateOperations(
    column: DataCubeEditorMutableColumnConfiguration,
    parameterColumns = this.getAggregationParameterColumns(column),
  ) {
    return this._view.engine.aggregateOperations.filter(
      (operation) =>
        operation.isCompatibleWithColumn(column) &&
        operation.isCompatibleWithParameterValues(
          operation.generateDefaultParameterValues(column, parameterColumns),
        ),
    );
  }

  // NOTE: these are computed so they are not recomputed on every render of the panel, e.g.
  // while editing the display name, since this goes through all aggregations and columns
  get selectedColumnAggregationParameterColumns() {
    return this.selectedColumn
      ? this.getAggregationParameterColumns(this.selectedColumn)
      : [];
  }

  get selectedColumnCompatibleAggregateOperations() {
    return this.selectedColumn
      ? this.getCompatibleAggregateOperations(
          this.selectedColumn,
          this.selectedColumnAggregationParameterColumns,
        )
      : [];
  }

  setAggregateOperation(
    column: DataCubeEditorMutableColumnConfiguration,
    operation: DataCubeQueryAggregateOperation,
  ) {
    if (operation !== column.aggregateOperation) {
      setColumnAggregateOperation(
        column,
        operation,
        this._view.engine.aggregateOperations,
        this.getAggregationParameterColumns(column),
      );
    }
  }

  adaptPropagatedChanges() {
    fallBackUnavailableAggregations(
      this.columns,
      this._editor.horizontalPivots.selector.selectedColumns,
      this._editor.groupExtendColumns,
      this._view.engine.aggregateOperations,
    );
  }

  getColumnConfiguration(colName: string | undefined) {
    return guaranteeNonNullable(
      _findCol(this.columns, colName),
      `Can't find configuration for column '${colName}'`,
    );
  }

  setColumns(val: DataCubeEditorMutableColumnConfiguration[]) {
    this.columns = val;
  }

  setSelectedColumnName(val: string | undefined) {
    this.selectedColumnName = val;
  }

  get selectedColumn() {
    return _findCol(this.columns, this.selectedColumnName);
  }

  setShowAdvancedSettings(val: boolean) {
    this.showAdvancedSettings = val;
  }

  applySnaphot(
    snapshot: DataCubeSnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.setColumns(
      (snapshot.data.configuration as { columns: PlainObject[] }).columns.map(
        (column) =>
          DataCubeEditorMutableColumnConfiguration.create(
            column,
            snapshot,
            this._view.engine.aggregateOperations,
          ),
      ),
    );

    if (!this.selectedColumn && this.columns.length) {
      this.setSelectedColumnName(at(this.columns, 0).name);
    }
  }

  buildSnapshot(newSnapshot: DataCubeSnapshot, baseSnapshot: DataCubeSnapshot) {
    // NOTE: changes are propagated when leaving the columns and horizontal pivots panels, but
    // changes can be applied without leaving these panels, and changes made in this panel,
    // e.g. excluding a column from pivot, are not propagated, so adapt to them here before
    // serializing; this is idempotent, so it is fine if changes have already been propagated
    this.adaptPropagatedChanges();
    newSnapshot.data.configuration = {
      ...newSnapshot.data.configuration,
      columns: this.columns.map((column) => column.serialize()),
    };
  }
}
