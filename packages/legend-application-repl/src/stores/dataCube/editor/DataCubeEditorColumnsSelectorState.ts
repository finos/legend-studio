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

import { makeObservable, observable, action, computed } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';

export abstract class DataCubeEditorColumnsSelectorColumnState {
  abstract get name(): string;
}

export enum DataCubeEditorColumnsSelectorColumnsVisibility {
  VISIBLE = 'visible',
  VISIBLE_WITH_WARNING = 'visible-with-warning',
  HIDDEN = 'hidden',
}

export class DataCubeEditorColumnsSelectorState<
  T extends DataCubeEditorColumnsSelectorColumnState,
> {
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;

  private _availableColumns: T[] = [];
  private _selectedColumns: T[] = [];

  availableColumnsSearchText = '';
  selectedColumnsSearchText = '';

  readonly onChange?:
    | ((selector: DataCubeEditorColumnsSelectorState<T>) => void)
    | undefined;
  columnsVisibility!: DataCubeEditorColumnsSelectorColumnsVisibility;

  constructor(
    editor: DataCubeEditorState,
    options?: {
      initialColumnsVisibility?:
        | DataCubeEditorColumnsSelectorColumnsVisibility
        | undefined;
      onChange?:
        | ((select: DataCubeEditorColumnsSelectorState<T>) => void)
        | undefined;
    },
  ) {
    makeObservable<
      DataCubeEditorColumnsSelectorState<T>,
      '_availableColumns' | '_selectedColumns'
    >(this, {
      _availableColumns: observable,
      availableColumns: computed,
      visibleAvailableColumns: computed,
      hiddenAvailableColumns: computed,
      setAvailableColumns: action,

      _selectedColumns: observable,
      selectedColumns: computed,
      visibleSelectedColumns: computed,
      hiddenSelectedColumns: computed,
      setSelectedColumns: action,

      availableColumnsSearchText: observable,
      setAvailableColumnsSearchText: action,

      selectedColumnsSearchText: observable,
      setSelectedColumnsSearchText: action,

      columnsVisibility: observable,
      setColumnsVisibility: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.onChange = options?.onChange;
    this.columnsVisibility =
      options?.initialColumnsVisibility ??
      DataCubeEditorColumnsSelectorColumnsVisibility.VISIBLE;
  }

  setColumnsVisibility(
    visibility: DataCubeEditorColumnsSelectorColumnsVisibility,
  ): void {
    this.columnsVisibility = visibility;
  }

  get hiddenAvailableColumns(): T[] {
    return this._availableColumns.filter((column) =>
      Boolean(
        this.editor.columnProperties.hiddenColumns.find(
          (hiddenColumn) => hiddenColumn.name === column.name,
        ),
      ),
    );
  }

  get hiddenSelectedColumns(): T[] {
    return this._selectedColumns.filter((column) =>
      Boolean(
        this.editor.columnProperties.hiddenColumns.find(
          (hiddenColumn) => hiddenColumn.name === column.name,
        ),
      ),
    );
  }

  get visibleAvailableColumns(): T[] {
    return this._availableColumns.filter(
      (column) =>
        !this.editor.columnProperties.hiddenColumns.find(
          (hiddenColumn) => hiddenColumn.name === column.name,
        ),
    );
  }

  get visibleSelectedColumns(): T[] {
    return this._selectedColumns.filter(
      (column) =>
        !this.editor.columnProperties.hiddenColumns.find(
          (hiddenColumn) => hiddenColumn.name === column.name,
        ),
    );
  }

  get availableColumns(): T[] {
    if (
      this.columnsVisibility ===
      DataCubeEditorColumnsSelectorColumnsVisibility.HIDDEN
    ) {
      return this.visibleAvailableColumns;
    }
    return this._availableColumns;
  }

  get selectedColumns(): T[] {
    if (
      this.columnsVisibility ===
      DataCubeEditorColumnsSelectorColumnsVisibility.HIDDEN
    ) {
      return this.visibleSelectedColumns;
    }
    return this._selectedColumns;
  }

  setAvailableColumns(val: T[]): void {
    this._availableColumns = val
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.onChange?.(this);
  }

  setSelectedColumns(val: T[]): void {
    this._selectedColumns = val;
    this.onChange?.(this);
  }

  setAvailableColumnsSearchText(val: string): void {
    this.availableColumnsSearchText = val;
  }

  setSelectedColumnsSearchText(val: string): void {
    this.selectedColumnsSearchText = val;
  }

  getAvailableColumn(colName: string): T | undefined {
    return this._availableColumns.find((col) => col.name === colName);
  }

  getSelectedColumn(colName: string): T | undefined {
    return this._selectedColumns.find((col) => col.name === colName);
  }
}
