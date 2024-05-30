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
import type { DataCubeState } from './DataCubeState.js';
import { DataCubePanelState } from './DataCubePanelState.js';
import { TDSSort, TDS_SORT_ORDER } from '../../components/grid/TDSRequest.js';

export class HPivotAndSortPanelState extends DataCubePanelState {
  isInitialized = false;
  availableSortColumns: TDSSort[] = [];
  selectedSortColumns: TDSSort[] = [];
  availableSortColumnsSearchText = '';
  selectedSortColumnsSearchText = '';

  constructor(dataCubeState: DataCubeState) {
    super(dataCubeState);

    makeObservable(this, {
      isInitialized: observable,
      availableSortColumns: observable,
      selectedSortColumns: observable,
      availableSortColumnsSearchText: observable,
      selectedSortColumnsSearchText: observable,
      setAvailableSortColumns: action,
      setSelectedSortColumns: action,
      setIsInitialized: action,
      addAvailableSortColumn: action,
      addSelectedSortColumn: action,
      addAllAvailableSortColumns: action,
      addAllSelectedSortColumns: action,
      applyChanges: action,
      initialize: action,
      setSelectedSortColumnsSearchText: action,
      setAvailableSortColumnsSearchText: action,
      availableSortColumnsSearchResults: computed,
      selectedSortColumnsSearchResults: computed,
    });
  }

  setAvailableSortColumns(val: TDSSort[]): void {
    this.availableSortColumns = val;
  }

  setSelectedSortColumns(val: TDSSort[]): void {
    this.selectedSortColumns = val;
  }

  setIsInitialized(val: boolean): void {
    this.isInitialized = val;
  }

  initialize(): void {
    if (!this.isInitialized) {
      this.selectedSortColumns =
        this.dataCubeState.gridState.lastQueryTDSRequest?.sort.map(
          (col) => new TDSSort(col.column, col.order),
        ) ?? [];
      this.availableSortColumns =
        this.dataCubeState.gridState.columns
          ?.filter(
            (col) => !this.selectedSortColumns.find((c) => c.column === col),
          )
          .map((col) => new TDSSort(col, TDS_SORT_ORDER.ASCENDING)) ?? [];
      this.setIsInitialized(true);
    }
  }

  addAvailableSortColumn(columnName: string): void {
    const column = this.availableSortColumns.find(
      (col) => col.column === columnName,
    );
    if (column) {
      this.setAvailableSortColumns(
        this.availableSortColumns.filter((col) => col.column !== columnName),
      );
      this.setSelectedSortColumns(this.selectedSortColumns.concat(column));
    }
  }

  addSelectedSortColumn(columnName: string): void {
    const column = this.selectedSortColumns.find(
      (col) => col.column === columnName,
    );
    if (column) {
      this.setSelectedSortColumns(
        this.selectedSortColumns.filter((col) => col.column !== columnName),
      );
      this.setAvailableSortColumns(this.availableSortColumns.concat(column));
    }
  }

  addAllAvailableSortColumns(): void {
    this.setSelectedSortColumns(
      this.selectedSortColumns.concat(this.availableSortColumns),
    );
    this.setAvailableSortColumns([]);
  }

  addAllSelectedSortColumns(): void {
    this.setAvailableSortColumns(
      this.availableSortColumns.concat(this.selectedSortColumns),
    );
    this.setSelectedSortColumns([]);
  }

  applyChanges(): void {
    if (this.dataCubeState.configState.gridApi) {
      const columnDefs = this.dataCubeState.configState.gridApi.getColumnDefs();
      this.selectedSortColumns.forEach((col) => {
        const colDef = columnDefs?.find(
          (cold) => 'colId' in cold && cold.colId === col.column,
        );
        if (colDef && 'sort' in colDef) {
          colDef.sort = col.order === TDS_SORT_ORDER.ASCENDING ? 'asc' : 'desc';
        }
      });
      this.dataCubeState.configState.gridApi?.setGridOption(
        'columnDefs',
        columnDefs,
      );
      this.dataCubeState.configState.gridApi.onSortChanged();
    }
  }

  setAvailableSortColumnsSearchText(val: string): void {
    this.availableSortColumnsSearchText = val;
  }

  setSelectedSortColumnsSearchText(val: string): void {
    this.selectedSortColumnsSearchText = val;
  }

  get availableSortColumnsSearchResults(): TDSSort[] {
    if (this.availableSortColumnsSearchText) {
      return this.availableSortColumns.filter((col) =>
        col.column
          .toLowerCase()
          .startsWith(this.availableSortColumnsSearchText.toLowerCase()),
      );
    } else {
      return this.availableSortColumns;
    }
  }

  get selectedSortColumnsSearchResults(): TDSSort[] {
    if (this.selectedSortColumnsSearchText) {
      return this.selectedSortColumns.filter((col) =>
        col.column
          .toLowerCase()
          .startsWith(this.selectedSortColumnsSearchText.toLowerCase()),
      );
    } else {
      return this.selectedSortColumns;
    }
  }
}
