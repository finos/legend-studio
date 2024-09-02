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
import { guaranteeNonNullable } from '@finos/legend-shared';

export class DataCubeEditorColumnsSelectorColumnState {
  readonly name: string;
  readonly type: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }
}

export enum DataCubeEditorColumnsSelectorHiddenColumnsVisibility {
  VISIBLE = 'visible',
  VISIBLE_WITH_WARNING = 'visible-with-warning',
  HIDDEN = 'hidden',
}

export abstract class DataCubeEditorColumnsSelectorState<
  T extends DataCubeEditorColumnsSelectorColumnState,
> {
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;

  selectedColumns: T[] = [];

  availableColumnsSearchText = '';
  selectedColumnsSearchText = '';

  readonly onChange?:
    | ((selector: DataCubeEditorColumnsSelectorState<T>) => void)
    | undefined;
  hiddenColumnsVisibility!: DataCubeEditorColumnsSelectorHiddenColumnsVisibility;

  constructor(
    editor: DataCubeEditorState,
    options?: {
      initialHiddenColumnsVisibility?:
        | DataCubeEditorColumnsSelectorHiddenColumnsVisibility
        | undefined;
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

      hiddenColumnsVisibility: observable,
      setHiddenColumnsVisibility: action,
    });

    this.editor = editor;
    this.dataCube = editor.dataCube;
    this.onChange = options?.onChange;
    this.hiddenColumnsVisibility =
      options?.initialHiddenColumnsVisibility ??
      // default to show hidden columns
      DataCubeEditorColumnsSelectorHiddenColumnsVisibility.VISIBLE;
  }

  setHiddenColumnsVisibility(
    val: DataCubeEditorColumnsSelectorHiddenColumnsVisibility,
  ) {
    this.hiddenColumnsVisibility = val;
  }

  abstract get availableColumns(): T[];

  get availableColumnsForDisplay(): T[] {
    return this.availableColumns
      .filter(
        (column) =>
          !this.selectedColumns.find((col) => column.name === col.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(
        (column) =>
          this.hiddenColumnsVisibility !==
            DataCubeEditorColumnsSelectorHiddenColumnsVisibility.HIDDEN ||
          !this.editor.columnProperties.columns.find(
            (col) => col.name === column.name,
          )?.hideFromView,
      );
  }

  get selectedColumnsForDisplay(): T[] {
    return this.selectedColumns.filter(
      (column) =>
        this.hiddenColumnsVisibility !==
          DataCubeEditorColumnsSelectorHiddenColumnsVisibility.HIDDEN ||
        !this.editor.columnProperties.columns.find(
          (col) => col.name === column.name,
        )?.hideFromView,
    );
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
