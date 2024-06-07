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
} from '../../components/grid/GridUtils.js';
import { action, computed, makeObservable, observable } from 'mobx';
import type { ColDef } from '@ag-grid-community/core';
import type { V1_Lambda, TDSExecutionResult } from '@finos/legend-graph';
import {
  TDS_FILTER_GROUP,
  type TDSRequest,
} from '../../components/grid/TDSRequest.js';
import type { DataCubeState } from './DataCubeState.js';

interface FilterModel {
  [key: string]: object;
}

export class DataCubeGridState {
  readonly dataCubeState!: DataCubeState;

  initialResult?: TDSExecutionResult | undefined;
  currentResult?: TDSExecutionResult | undefined;
  columns?: string[] | undefined;
  initialQueryLambda?: V1_Lambda | undefined;
  currentQueryTDSRequest?: TDSRequest | undefined;
  lastQueryTDSRequest?: TDSRequest | undefined;

  constructor(dataCubeState: DataCubeState) {
    makeObservable(this, {
      initialResult: observable,
      initialQueryLambda: observable,
      currentResult: observable,
      columns: observable,
      currentQueryTDSRequest: observable,
      lastQueryTDSRequest: observable,
      setInitialResult: action,
      setColumns: action,
      setInitialQueryLambda: action,
      setCurrentResult: action,
      setCurrentQueryTDSRequest: action,
      setLastQueryTDSRequest: action,
      rowData: computed,
      columnDefs: computed,
    });

    this.dataCubeState = dataCubeState;
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

  setInitialResult(val: TDSExecutionResult | undefined): void {
    this.initialResult = val;
  }

  setCurrentResult(val: TDSExecutionResult | undefined): void {
    this.currentResult = val;
  }

  setColumns(val: string[]): void {
    this.columns = val;
  }

  get rowData(): TDSRowDataType[] {
    return this.initialResult ? getTDSRowData(this.initialResult.result) : [];
  }

  get columnDefs(): ColDef[] {
    const filterModel: FilterModel = {};
    if (this.currentQueryTDSRequest) {
      this.dataCubeState.configState.gridApi?.setFilterModel(filterModel);
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
