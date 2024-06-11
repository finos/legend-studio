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
import { DataCubeEditorSortState } from './DataCubeEditorSortState.js';
import { DataCubeQueryCodeEditorState } from './DataCubeEditorCodeState.js';
import { DataCubeQuerySnapshotSubscriber } from '../core/DataCubeQuerySnapshotSubscriber.js';
import {
  cloneSnapshot,
  type DataCubeQuerySnapshot,
} from '../core/DataCubeQuerySnapshot.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export enum DATA_CUBE_EDITOR_TAB {
  COLUMNS = 'Columns',
  VERTICAL_PIVOTS = 'VPivots',
  HORIZONTAL_PIVOTS = 'HPivots',
  SORTS = 'Sorts',
  EXTENDED_COLUMNS = 'Extended Columns',
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  Code = 'Code',
  // DEVELOPER_OPTIONS = 'Developer',
  // PIVOT_LAYOUT = 'Pivot Layout',
}

export class DataCubeEditorState extends DataCubeQuerySnapshotSubscriber {
  readonly dataCubeState!: DataCubeState;
  readonly sort!: DataCubeEditorSortState;
  readonly codeEditorState!: DataCubeQueryCodeEditorState; // TODO: move to editor state

  isPanelOpen = false;
  currentTab = DATA_CUBE_EDITOR_TAB.SORTS;

  constructor(dataCubeState: DataCubeState) {
    super(dataCubeState.snapshotManager);

    makeObservable(this, {
      applyChanges: action,

      currentTab: observable,
      setCurrentTab: action,

      isPanelOpen: observable,
      openPanel: action,
      closePanel: action,
    });

    this.codeEditorState = new DataCubeQueryCodeEditorState(this.dataCubeState);
    this.dataCubeState = dataCubeState;
    this.sort = new DataCubeEditorSortState(this.dataCubeState);
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
    // let createNew = false;
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const snapshot = cloneSnapshot(baseSnapshot);
    const createNew = this.sort.buildSnapshot(snapshot, baseSnapshot);

    if (createNew) {
      this.publishSnapshot(snapshot);
    }
  }

  override async applySnapshot(snapshot: DataCubeQuerySnapshot): Promise<void> {
    this.sort.applySnaphot(snapshot);
  }
}
