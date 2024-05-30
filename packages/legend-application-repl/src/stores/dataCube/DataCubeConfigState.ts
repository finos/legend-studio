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

import { action, makeObservable, observable } from 'mobx';
import type { GridApi } from '@ag-grid-community/core';
import type { DataCubeState } from './DataCubeState.js';
import { LEGEND_APPLICATION_REPL_SETTING_KEY } from '../../Const.js';

export class DataCubeConfigState {
  readonly dataCubeState!: DataCubeState;

  licenseKey?: string | undefined;
  isPaginationEnabled!: boolean;
  gridApi?: GridApi | undefined;

  isPivotPanelOpened = false;

  constructor(dataCubeState: DataCubeState) {
    makeObservable(this, {
      licenseKey: observable,
      isPaginationEnabled: observable,
      gridApi: observable,
      isPivotPanelOpened: observable,
      setGridApi: action,
      setLicenseKey: action,
      setIsPaginationEnabled: action,
      setIsPivotPanelOpened: action,
      openPanel: action,
      closePanel: action,
    });

    this.dataCubeState = dataCubeState;
    this.isPaginationEnabled =
      dataCubeState.editorStore.applicationStore.settingService.getBooleanValue(
        LEGEND_APPLICATION_REPL_SETTING_KEY.PAGINATION,
      ) ?? true;
  }

  setIsPivotPanelOpened(val: boolean): void {
    this.isPivotPanelOpened = val;
  }

  setGridApi(val: GridApi | undefined): void {
    this.gridApi = val;
  }

  setLicenseKey(val: string | undefined): void {
    this.licenseKey = val;
  }

  setIsPaginationEnabled(val: boolean): void {
    this.isPaginationEnabled = val;
  }

  openPanel(): void {
    this.dataCubeState.configState.setIsPivotPanelOpened(true);
    this.dataCubeState.propertiesPanelState.hpivotAndSortPanelState.initialize();
  }

  closePanel(): void {
    this.dataCubeState.configState.setIsPivotPanelOpened(false);
    this.dataCubeState.propertiesPanelState.hpivotAndSortPanelState.setIsInitialized(
      false,
    );
  }
}
