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
import type { DataCubeState } from './DataCubeState.js';
import { HPivotAndSortPanelState } from './HPivotAndSortPanelState.js';

export enum PIVOT_PANEL_TABS {
  COLUMNS_AND_PIVOTS = 'Colums/Pivots',
  HPIVOTS_AND_SORTS = 'HPivots/Sorts',
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  DEVELOPER_OPTIONS = 'Developer',
  PIVOT_LAYOUT = 'Pivot Layout',
}

export class DataCubePropertiesPanelState {
  readonly dataCubeState!: DataCubeState;
  selectedPivotPanelTab = PIVOT_PANEL_TABS.COLUMNS_AND_PIVOTS;
  hpivotAndSortPanelState!: HPivotAndSortPanelState;

  constructor(dataCubeState: DataCubeState) {
    makeObservable(this, {
      selectedPivotPanelTab: observable,
      hpivotAndSortPanelState: observable,
      setSelectedPivotPanelTab: action,
      applyChanges: action,
    });

    this.dataCubeState = dataCubeState;
    this.hpivotAndSortPanelState = new HPivotAndSortPanelState(
      this.dataCubeState,
    );
  }

  setSelectedPivotPanelTab(val: PIVOT_PANEL_TABS): void {
    this.selectedPivotPanelTab = val;
    switch (val) {
      case PIVOT_PANEL_TABS.HPIVOTS_AND_SORTS: {
        this.hpivotAndSortPanelState.initialize();
        break;
      }
      default: {
        return;
      }
    }
  }

  applyChanges(): void {
    this.hpivotAndSortPanelState.applyChanges();
  }
}
