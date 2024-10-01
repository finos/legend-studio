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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { _sortByColName } from '../core/DataCubeQuerySnapshot.js';

export class DataCubeEditorColumnSelectorColumnState {
  readonly name: string;
  readonly type: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }
}

export abstract class DataCubeEditorColumnSelectorState<
  T extends DataCubeEditorColumnSelectorColumnState,
> {
  readonly view!: DataCubeViewState;
  readonly editor!: DataCubeEditorState;

  selectedColumns: T[] = [];

  availableColumnsSearchText = '';
  selectedColumnsSearchText = '';

  readonly onChange?:
    | ((selector: DataCubeEditorColumnSelectorState<T>) => void)
    | undefined;

  constructor(
    editor: DataCubeEditorState,
    options?: {
      onChange?:
        | ((select: DataCubeEditorColumnSelectorState<T>) => void)
        | undefined;
    },
  ) {
    makeObservable(this, {
      availableColumns: computed,
      availableColumnsForDisplay: computed,
      selectedColumnsForDisplay: computed,

      selectedColumns: observable,
      setSelectedColumns: action,

      availableColumnsSearchText: observable,
      setAvailableColumnsSearchText: action,

      selectedColumnsSearchText: observable,
      setSelectedColumnsSearchText: action,
    });

    this.editor = editor;
    this.view = editor.view;
    this.onChange = options?.onChange;
  }

  abstract get availableColumns(): T[];

  get availableColumnsForDisplay(): T[] {
    return this.availableColumns
      .filter(
        (column) =>
          !this.selectedColumns.find((col) => column.name === col.name),
      )
      .sort(_sortByColName);
  }

  get selectedColumnsForDisplay(): T[] {
    return this.selectedColumns;
  }

  setSelectedColumns(val: T[]) {
    // NOTE: since we have a list of columns available which we treat as
    // "templates" to select from, we need to clone these columns in order
    // to avoid modifying the original available columns
    this.selectedColumns = val.map((col) => this.cloneColumn(col));
    this.onChange?.(this);
  }

  setAvailableColumnsSearchText(val: string) {
    this.availableColumnsSearchText = val;
  }

  setSelectedColumnsSearchText(val: string) {
    this.selectedColumnsSearchText = val;
  }

  getColumn(colName: string): T {
    return guaranteeNonNullable(
      this.availableColumns.find((col) => col.name === colName),
      `Can't find column '${colName}'`,
    );
  }

  protected abstract cloneColumn(column: T): T;
}
