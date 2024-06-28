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
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeEditorSortsPanelState } from './DataCubeEditorSortsPanelState.js';
import { DataCubeEditorCodePanelState } from './DataCubeEditorCodePanelState.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { DataCubeEditorGeneralPropertiesPanelState } from './DataCubeEditorGeneralPropertiesPanelState.js';

export enum DATA_CUBE_EDITOR_TAB {
  COLUMNS = 'Columns',
  VERTICAL_PIVOTS = 'VPivots',
  HORIZONTAL_PIVOTS = 'HPivots',
  SORTS = 'Sorts',
  EXTENDED_COLUMNS = 'Extended Columns',
  FILTER = 'Filter',
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  CODE = 'Code',
  DEVELOPER = 'Developer',
  // DEVELOPER_OPTIONS = 'Developer',
  // PIVOT_LAYOUT = 'Pivot Layout',
}

export class DataCubeEditorState extends DataCubeQuerySnapshotSubscriber {
  readonly sortsPanel: DataCubeEditorSortsPanelState;
  readonly generalPropertiesPanel: DataCubeEditorGeneralPropertiesPanelState;
  readonly codePanel: DataCubeEditorCodePanelState;

  isPanelOpen = false;
  currentTab = DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      applyChanges: action,

      currentTab: observable,
      setCurrentTab: action,

      isPanelOpen: observable,
      openPanel: action,
      closePanel: action,
    });

    this.sortsPanel = new DataCubeEditorSortsPanelState(this);
    this.generalPropertiesPanel = new DataCubeEditorGeneralPropertiesPanelState(
      this,
    );
    this.codePanel = new DataCubeEditorCodePanelState(this.dataCube);
  }

  openPanel(): void {
    this.isPanelOpen = true;
  }

  closePanel(): void {
    this.isPanelOpen = false;
  }

  setCurrentTab(val: DATA_CUBE_EDITOR_TAB): void {
    this.currentTab = val;
  }

  applyChanges(): void {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const snapshot = baseSnapshot.clone();

    this.sortsPanel.buildSnapshot(snapshot, baseSnapshot);
    this.generalPropertiesPanel.buildSnapshot(snapshot, baseSnapshot);

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(snapshot);
    }
  }

  override async applySnapshot(snapshot: DataCubeQuerySnapshot): Promise<void> {
    this.sortsPanel.applySnaphot(snapshot);
    this.generalPropertiesPanel.applySnaphot(snapshot);
  }

  override async initialize(): Promise<void> {
    // do nothing
  }
}
