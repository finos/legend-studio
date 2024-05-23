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

import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  getAggregationTDSColumnCustomizations,
  getFilterModeltype,
  getTDSColumnCustomizations,
  getTDSRowData,
  type TDSRowDataType,
} from '../components/grid/GridUtils.js';
import { action, computed, makeObservable, observable } from 'mobx';
import type { ColDef, GridApi } from '@ag-grid-community/core';
import type { V1_Lambda, TDSExecutionResult } from '@finos/legend-graph';
import { QueryEditorState } from '../components/REPLQueryEditor.js';
import {
  TDS_FILTER_GROUP,
  type TDSRequest,
} from '../components/grid/TDSRequest.js';

interface FilterModel {
  [key: string]: object;
}

export enum PIVOT_PANEL_TABS {
  COLUMNS_AND_PIVOTS = 'Colums/Pivots',
  HPIVOTS_AND_SORTS = 'HPivots/Sorts',
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  DEVELOPER_OPTIONS = 'Developer',
  PIVOT_LAYOUT = 'Pivot Layout',
}

export class REPLGridState {
  initialResult?: TDSExecutionResult | undefined;
  currentResult?: TDSExecutionResult | undefined;
  columns?: string[] | undefined;
  queryEditorState: QueryEditorState;
  currentSubQuery?: string | undefined;
  licenseKey?: string | undefined;
  initialQueryLambda?: V1_Lambda | undefined;
  isPaginationEnabled!: boolean;
  currentQueryTDSRequest?: TDSRequest | undefined;
  lastQueryTDSRequest?: TDSRequest | undefined;

  gridApi?: GridApi | undefined;

  isPivotPanelOpened = false;
  selectedPivotPanelTab = PIVOT_PANEL_TABS.COLUMNS_AND_PIVOTS;

  constructor(isPaginationEnabled: boolean) {
    makeObservable(this, {
      initialResult: observable,
      initialQueryLambda: observable,
      currentResult: observable,
      currentSubQuery: observable,
      licenseKey: observable,
      columns: observable,
      isPaginationEnabled: observable,
      queryEditorState: observable,
      currentQueryTDSRequest: observable,
      lastQueryTDSRequest: observable,
      gridApi: observable,
      isPivotPanelOpened: observable,
      selectedPivotPanelTab: observable,
      setSelectedPivotPanelTab: action,
      setIsPivotPanelOpened: action,
      setGridApi: action,
      setInitialResult: action,
      setCurrentSubQuery: action,
      setColumns: action,
      setInitialQueryLambda: action,
      setCurrentResult: action,
      setLicenseKey: action,
      setIsPaginationEnabled: action,
      setCurrentQueryTDSRequest: action,
      setLastQueryTDSRequest: action,
      rowData: computed,
      columnDefs: computed,
    });

    this.queryEditorState = new QueryEditorState('');
    this.isPaginationEnabled = isPaginationEnabled;
  }

  setSelectedPivotPanelTab(val: PIVOT_PANEL_TABS): void {
    this.selectedPivotPanelTab = val;
  }

  setIsPivotPanelOpened(val: boolean): void {
    this.isPivotPanelOpened = val;
  }

  setGridApi(val: GridApi | undefined): void {
    this.gridApi = val;
  }

  setLastQueryTDSRequest(val: TDSRequest | undefined): void {
    this.lastQueryTDSRequest = val;
  }

  setCurrentQueryTDSRequest(val: TDSRequest | undefined): void {
    this.currentQueryTDSRequest = val;
  }

  setInitialQueryLambda(val: V1_Lambda | undefined): void {
    this.initialQueryLambda = val;
  }

  setCurrentSubQuery(val: string | undefined): void {
    this.currentSubQuery = val;
  }

  setInitialResult(val: TDSExecutionResult | undefined): void {
    this.initialResult = val;
  }

  setCurrentResult(val: TDSExecutionResult | undefined): void {
    this.currentResult = val;
  }

  setColumns(val: string[]): void {
    this.columns = val;
  }

  setLicenseKey(val: string | undefined): void {
    this.licenseKey = val;
  }

  setIsPaginationEnabled(val: boolean): void {
    this.isPaginationEnabled = val;
  }

  get rowData(): TDSRowDataType[] {
    return this.initialResult ? getTDSRowData(this.initialResult.result) : [];
  }

  get columnDefs(): ColDef[] {
    const filterModel: FilterModel = {};
    this.currentQueryTDSRequest?.filter.forEach((filter) => {
      if (filter.conditions.length === 1) {
        filterModel[filter.column] = {
          filter: filter.conditions[0]?.value,
          filterType: getFilterModeltype(filter.columnType),
          type: filter.conditions[0]?.operation,
        };
      } else {
        filterModel[filter.column] = {
          filterType: getFilterModeltype(filter.columnType),
          operator:
            filter.groupOperation === TDS_FILTER_GROUP.AND ? 'AND' : 'OR',
          condition1: {
            filter: filter.conditions[0]?.value,
            filterType: getFilterModeltype(filter.columnType),
            type: filter.conditions[0]?.operation,
          },
          condition2: {
            filter: filter.conditions[1]?.value,
            filterType: getFilterModeltype(filter.columnType),
            type: filter.conditions[1]?.operation,
          },
        };
      }
    });
    if (this.currentQueryTDSRequest) {
      this.gridApi?.setFilterModel(filterModel);
    }
    return this.columns
      ? this.columns.map((c) => ({
          field: c,
          headerName: c,
          ...getAggregationTDSColumnCustomizations(
            guaranteeNonNullable(this.initialResult),
            c,
          ),
          ...getTDSColumnCustomizations(
            guaranteeNonNullable(this.initialResult),
            c,
            this.currentQueryTDSRequest,
          ),
        }))
      : [];
  }
}
