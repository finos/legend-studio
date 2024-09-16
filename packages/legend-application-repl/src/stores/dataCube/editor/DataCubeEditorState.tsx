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
import { DataCubeQuerySnapshotController } from '../core/DataCubeQuerySnapshotManager.js';
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { DataCubeEditorGeneralPropertiesPanelState } from './DataCubeEditorGeneralPropertiesPanelState.js';
import { DataCubeEditorColumnPropertiesPanelState } from './DataCubeEditorColumnPropertiesPanelState.js';
import { DataCubeEditorColumnsPanelState } from './DataCubeEditorColumnsPanelState.js';
import { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeEditorVerticalPivotsPanelState } from './DataCubeEditorVerticalPivotsPanelState.js';
import { DisplayState } from '../../LayoutManagerState.js';
import { DataCubeEditor } from '../../../components/dataCube/editor/DataCubeEditor.js';
import { buildExecutableQuery } from '../core/DataCubeQueryBuilder.js';
import { _lambda } from '../core/DataCubeQueryBuilderUtils.js';
import { DataCubeEditorHorizontalPivotsPanelState } from './DataCubeEditorHorizontalPivotsPanelState.js';

export enum DataCubeEditorTab {
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  COLUMNS = 'Columns',
  VERTICAL_PIVOTS = 'Vertical Pivots',
  HORIZONTAL_PIVOTS = 'Horizontal Pivots',
  SORTS = 'Sorts',
  CODE = 'Code',
}

/**
 * This query editor state backs the main form editor of data cube. It supports
 * batching changes before application, i.e. allowing user to make multiple edits before
 * applying and propgating them.
 *
 * NOTE: It allows almost FULL 1-1 control over the data cube query state.
 * It could also host other form editor states like filter editors, but due to ergonomic
 * reasons, those have been separated out into their own respective query editor states.
 */
export class DataCubeEditorState extends DataCubeQuerySnapshotController {
  readonly display: DisplayState;
  readonly finalizationState = ActionState.create();

  readonly code: DataCubeEditorCodePanelState;

  readonly generalProperties: DataCubeEditorGeneralPropertiesPanelState;
  readonly columnProperties: DataCubeEditorColumnPropertiesPanelState;

  readonly columns: DataCubeEditorColumnsPanelState;
  readonly verticalPivots: DataCubeEditorVerticalPivotsPanelState;
  readonly horizontalPivots: DataCubeEditorHorizontalPivotsPanelState;
  readonly sorts: DataCubeEditorSortsPanelState;

  currentTab = DataCubeEditorTab.GENERAL_PROPERTIES;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      currentTab: observable,
      setCurrentTab: action,

      applyChanges: action,
    });

    this.display = new DisplayState(
      this.dataCube.repl.layout,
      'Properties',
      () => <DataCubeEditor dataCube={this.dataCube} />,
    );
    this.generalProperties = new DataCubeEditorGeneralPropertiesPanelState(
      this,
    );
    this.columnProperties = new DataCubeEditorColumnPropertiesPanelState(this);
    this.columns = new DataCubeEditorColumnsPanelState(this);
    this.verticalPivots = new DataCubeEditorVerticalPivotsPanelState(this);
    this.horizontalPivots = new DataCubeEditorHorizontalPivotsPanelState(this);
    this.sorts = new DataCubeEditorSortsPanelState(this);
    this.code = new DataCubeEditorCodePanelState(this);
  }

  setCurrentTab(val: DataCubeEditorTab) {
    this.currentTab = val;
  }

  async applyChanges(options?: { closeAfterApply?: boolean | undefined }) {
    this.finalizationState.inProgress();

    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    let snapshot = baseSnapshot.clone();

    // NOTE: column selection must be processed first so necessary
    // prunings can be done to make sure other panel stats are in sync
    // with the current column selection
    this.columns.buildSnapshot(snapshot, baseSnapshot);
    this.verticalPivots.buildSnapshot(snapshot, baseSnapshot);
    this.horizontalPivots.buildSnapshot(snapshot, baseSnapshot);
    this.sorts.buildSnapshot(snapshot, baseSnapshot);

    // grid configuration must be processed before processing columns' configuration
    // to properly generate the container configuration
    this.generalProperties.buildSnapshot(snapshot, baseSnapshot);
    this.columnProperties.buildSnapshot(snapshot, baseSnapshot);

    snapshot.finalize();
    if (snapshot.hashCode === baseSnapshot.hashCode) {
      if (options?.closeAfterApply) {
        this.display.close();
      }
      this.finalizationState.complete();
      return;
    }

    // if h-pivot is enabled, update the cast columns
    try {
      if (snapshot.data.pivot) {
        const castColumns = await this.dataCube.engine.getCastColumns(snapshot);
        snapshot.data.pivot.castColumns = castColumns;
        this.horizontalPivots.setCastColumns(castColumns);
        this.sorts.selector.setSelectedColumns(
          this.sorts.selector.selectedColumns.filter((column) =>
            this.sorts.selector.availableColumns.find(
              (col) => col.name === column.name,
            ),
          ),
        );
        this.sorts.buildSnapshot(snapshot, baseSnapshot);
        snapshot = snapshot.clone();
      }
    } catch {
      // do nothing
    }

    // compile the query to validate it
    // NOTE: This is a helpful check for a lot of different scenarios where the
    // consistency of the query might be thrown off by changes
    // e.g. when a column that group-level extended columns' expressions depend on has been unselected.
    try {
      await this.dataCube.engine.getQueryRelationType(
        _lambda(
          [],
          [
            buildExecutableQuery(
              snapshot,
              this.dataCube.engine.filterOperations,
              this.dataCube.engine.aggregateOperations,
            ),
          ],
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.dataCube.repl.alertError(error, {
        message: `Query Validation Failure: ${error.message}`,
      });
      return;
    } finally {
      this.finalizationState.complete();
    }

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(snapshot);
    }

    if (options?.closeAfterApply) {
      this.display.close();
    }
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );

    this.columns.applySnaphot(snapshot, configuration);
    this.verticalPivots.applySnaphot(snapshot, configuration);
    this.horizontalPivots.applySnaphot(snapshot, configuration);
    this.sorts.applySnaphot(snapshot, configuration);

    this.generalProperties.applySnaphot(snapshot, configuration);
    this.columnProperties.applySnaphot(snapshot, configuration);
  }
}
