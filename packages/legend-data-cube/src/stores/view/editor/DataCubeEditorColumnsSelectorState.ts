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
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { _findCol, _sortByColName } from '../../core/model/DataCubeColumn.js';
import type { DataCubeQuerySortDirection } from '../../core/DataCubeQueryEngine.js';

export class DataCubeEditorColumnsSelectorColumnState {
  readonly name: string;
  readonly type: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }
}

export abstract class DataCubeEditorColumnsSelectorState<
  T extends DataCubeEditorColumnsSelectorColumnState,
> {
  protected readonly _editor!: DataCubeEditorState;

  selectedColumns: T[] = [];

  availableColumnsSearchText = '';
  selectedColumnsSearchText = '';

  readonly onChange?:
    | ((selector: DataCubeEditorColumnsSelectorState<T>) => void)
    | undefined;

  constructor(
    editor: DataCubeEditorState,
    options?: {
      onChange?:
        | ((select: DataCubeEditorColumnsSelectorState<T>) => void)
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

    this._editor = editor;
    this.onChange = options?.onChange;
  }

  abstract get availableColumns(): T[];

  get availableColumnsForDisplay(): T[] {
    return this.availableColumns
      .filter((column) => !_findCol(this.selectedColumns, column.name))
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
      _findCol(this.availableColumns, colName),
      `Can't find column '${colName}'`,
    );
  }

  protected abstract cloneColumn(column: T): T;
}

export class DataCubeEditorColumnsSelectorSortColumnState extends DataCubeEditorColumnsSelectorColumnState {
  readonly onChange?: (() => void) | undefined;
  direction: DataCubeQuerySortDirection;

  constructor(
    name: string,
    type: string,
    direction: DataCubeQuerySortDirection,
    onChange?: (() => void) | undefined,
  ) {
    super(name, type);

    makeObservable(this, {
      direction: observable,
      setDirection: action,
    });

    this.direction = direction;
    this.onChange = onChange;
  }

  setDirection(val: DataCubeQuerySortDirection) {
    this.direction = val;
    this.onChange?.();
  }
}
