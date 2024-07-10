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
import { guaranteeNonNullable, uuid } from '@finos/legend-shared';
import { DataCubeEditorGeneralPropertiesPanelState } from './DataCubeEditorGeneralPropertiesPanelState.js';
import { DataCubeEditorColumnPropertiesPanelState } from './DataCubeEditorColumnPropertiesPanelState.js';
import type { REPLWindowConfig } from '../../../components/REPLWindow.js';
import { DataCubeEditorColumnsPanelState } from './DataCubeEditorColumnsPanelState.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeEditorVerticalPivotsPanelState } from './DataCubeEditorVerticalPivotsPanelState.js';

export enum DATA_CUBE_EDITOR_TAB {
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  FILTER = 'Filter',
  EXTENDED_COLUMNS = 'Extended Columns',
  COLUMNS = 'Columns',
  VERTICAL_PIVOTS = 'Vertical Pivots',
  HORIZONTAL_PIVOTS = 'Horizontal Pivots',
  SORTS = 'Sorts',
  CODE = 'Code',
}

export class DataCubeEditorState extends DataCubeQuerySnapshotSubscriber {
  readonly generalProperties: DataCubeEditorGeneralPropertiesPanelState;
  readonly columnProperties: DataCubeEditorColumnPropertiesPanelState;
  readonly columns: DataCubeEditorColumnsPanelState;
  readonly verticalPivots: DataCubeEditorVerticalPivotsPanelState;
  readonly sorts: DataCubeEditorSortsPanelState;
  readonly code: DataCubeEditorCodePanelState;

  readonly window: REPLWindowConfig = {
    uuid: uuid(),
    title: 'Properties',
    center: true,
  };

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

    this.generalProperties = new DataCubeEditorGeneralPropertiesPanelState(
      this,
    );
    this.columnProperties = new DataCubeEditorColumnPropertiesPanelState(this);
    this.columns = new DataCubeEditorColumnsPanelState(this);
    this.verticalPivots = new DataCubeEditorVerticalPivotsPanelState(this);
    this.sorts = new DataCubeEditorSortsPanelState(this);
    this.code = new DataCubeEditorCodePanelState(this);
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

    // NOTE: column selection must be processed first so necassary
    // prunings can be done to make sure other panel stats are in sync
    // with the current column selection
    this.columns.buildSnapshot(snapshot, baseSnapshot);
    this.verticalPivots.buildSnapshot(snapshot, baseSnapshot);
    this.sorts.buildSnapshot(snapshot, baseSnapshot);

    // grid configuration must be processed before processing columns' configuration
    // to properly generate the container configuration
    this.generalProperties.buildSnapshot(snapshot, baseSnapshot);
    this.columnProperties.buildSnapshot(snapshot, baseSnapshot);

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(snapshot);
    }
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );

    this.columns.applySnaphot(snapshot, configuration);
    this.verticalPivots.applySnaphot(snapshot, configuration);
    this.sorts.applySnaphot(snapshot, configuration);

    this.generalProperties.applySnaphot(snapshot, configuration);
    this.columnProperties.applySnaphot(snapshot, configuration);
  }

  override async initialize(): Promise<void> {
    // do nothing
  }
}
