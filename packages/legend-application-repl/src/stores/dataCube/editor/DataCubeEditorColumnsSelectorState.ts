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

import { makeObservable, observable, action } from 'mobx';

export abstract class DataCubeEditorColumnsSelectorColumnState {
  abstract get name(): string;
  resetWhenMadeAvailable(): void {
    // do nothing
  }
}

export class DataCubeEditorColumnsSelectorState<
  T extends DataCubeEditorColumnsSelectorColumnState,
> {
  availableColumns: T[] = [];
  selectedColumns: T[] = [];
  availableColumnsSearchText = '';
  selectedColumnsSearchText = '';

  constructor() {
    makeObservable(this, {
      availableColumns: observable,
      selectedColumns: observable,
      availableColumnsSearchText: observable,
      selectedColumnsSearchText: observable,
      setAvailableColumns: action,
      setSelectedColumns: action,
      setSelectedColumnsSearchText: action,
      setAvailableColumnsSearchText: action,
    });
  }

  setAvailableColumns(val: T[]): void {
    this.availableColumns = val
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.availableColumns.forEach((column) => column.resetWhenMadeAvailable());
  }

  setSelectedColumns(val: T[]): void {
    this.selectedColumns = val;
  }

  setAvailableColumnsSearchText(val: string): void {
    this.availableColumnsSearchText = val;
  }

  setSelectedColumnsSearchText(val: string): void {
    this.selectedColumnsSearchText = val;
  }

  getAvailableColumn(colName: string): T | undefined {
    return this.availableColumns.find((col) => col.name === colName);
  }

  getSelectedColumn(colName: string): T | undefined {
    return this.selectedColumns.find((col) => col.name === colName);
  }
}
