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
  getTDSRowData,
  type TDSRowDataType,
} from '../components/grid/GridUtils.js';
import { action, computed, makeObservable, observable } from 'mobx';
import type { ColDef } from '@ag-grid-community/core';
import type { V1_Lambda, TDSExecutionResult } from '@finos/legend-graph';

export class REPLGridState {
  initialResult?: TDSExecutionResult | undefined;
  currentResult?: TDSExecutionResult | undefined;
  columns?: string[] | undefined;
  currentQuery?: string | undefined;
  currentSubQuery?: string | undefined;
  licenseKey?: string | undefined;
  initialQueryLambda?: V1_Lambda | undefined;

  constructor() {
    makeObservable(this, {
      initialResult: observable,
      initialQueryLambda: observable,
      currentResult: observable,
      currentQuery: observable,
      currentSubQuery: observable,
      licenseKey: observable,
      columns: observable,
      setInitialResult: action,
      setCurrentQuery: action,
      setCurrentSubQuery: action,
      setColumns: action,
      setInitialQueryLambda: action,
      setCurrentResult: action,
      setLicenseKey: action,
      rowData: computed,
      columnDefs: computed,
    });
  }

  setInitialQueryLambda(val: V1_Lambda | undefined): void {
    this.initialQueryLambda = val;
  }

  setCurrentQuery(val: string | undefined): void {
    this.currentQuery = val;
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

  get rowData(): TDSRowDataType[] {
    return this.initialResult ? getTDSRowData(this.initialResult.result) : [];
  }

  get columnDefs(): ColDef[] {
    return this.columns
      ? this.columns.map((c) => ({
          field: c,
          headerName: c,
          ...getAggregationTDSColumnCustomizations(
            this.licenseKey ? true : false,
            guaranteeNonNullable(this.initialResult),
            c,
          ),
        }))
      : [];
  }
}
