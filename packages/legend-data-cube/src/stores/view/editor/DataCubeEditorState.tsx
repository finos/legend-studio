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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { DataCubeEditorSortsPanelState } from './DataCubeEditorSortsPanelState.js';
import { DataCubeQuerySnapshotController } from '../DataCubeQuerySnapshotManager.js';
import {
  _toCol,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotExtendedColumn,
} from '../../core/DataCubeQuerySnapshot.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  HttpStatus,
  NetworkClientError,
} from '@finos/legend-shared';
import { DataCubeEditorGeneralPropertiesPanelState } from './DataCubeEditorGeneralPropertiesPanelState.js';
import { DataCubeEditorColumnPropertiesPanelState } from './DataCubeEditorColumnPropertiesPanelState.js';
import { DataCubeEditorColumnsPanelState } from './DataCubeEditorColumnsPanelState.js';
import { DataCubeConfiguration } from '../../core/DataCubeConfiguration.js';
import { DataCubeEditorVerticalPivotsPanelState } from './DataCubeEditorVerticalPivotsPanelState.js';
import type { DisplayState } from '../../core/DataCubeLayoutManagerState.js';
import { DataCubeEditor } from '../../../components/view/editor/DataCubeEditor.js';
import { DataCubeEditorHorizontalPivotsPanelState } from './DataCubeEditorHorizontalPivotsPanelState.js';
import { DataCubeEditorPivotLayoutPanelState } from './DataCubeEditorPivotLayoutPanelState.js';
import type { DataCubeQueryBuilderError } from '../../core/DataCubeEngine.js';
import { V1_deserializeValueSpecification } from '@finos/legend-graph';

export enum DataCubeEditorTab {
  GENERAL_PROPERTIES = 'General Properties',
  COLUMN_PROPERTIES = 'Column Properties',
  COLUMNS = 'Columns',
  VERTICAL_PIVOTS = 'Vertical Pivots',
  HORIZONTAL_PIVOTS = 'Horizontal Pivots',
  SORTS = 'Sorts',
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

  readonly generalProperties: DataCubeEditorGeneralPropertiesPanelState;
  readonly pivotLayout: DataCubeEditorPivotLayoutPanelState;
  readonly columnProperties: DataCubeEditorColumnPropertiesPanelState;

  readonly columns: DataCubeEditorColumnsPanelState;
  readonly horizontalPivots: DataCubeEditorHorizontalPivotsPanelState;
  readonly verticalPivots: DataCubeEditorVerticalPivotsPanelState;
  readonly sorts: DataCubeEditorSortsPanelState;

  currentTab = DataCubeEditorTab.GENERAL_PROPERTIES;

  sourceColumns: DataCubeQuerySnapshotColumn[] = [];
  leafExtendColumns: DataCubeQuerySnapshotExtendedColumn[] = [];
  groupExtendColumns: DataCubeQuerySnapshotExtendedColumn[] = [];

  constructor(view: DataCubeViewState) {
    super(view);

    makeObservable(this, {
      currentTab: observable,
      setCurrentTab: action,

      sourceColumns: observable.ref,
      leafExtendColumns: observable.ref,
      groupExtendColumns: observable.ref,

      applySnapshot: action,
      applyChanges: action,
    });

    this.display = this.view.application.layout.newDisplay('Properties', () => (
      <DataCubeEditor view={this.view} />
    ));
    this.generalProperties = new DataCubeEditorGeneralPropertiesPanelState(
      this,
    );
    this.pivotLayout = new DataCubeEditorPivotLayoutPanelState(this);
    this.columnProperties = new DataCubeEditorColumnPropertiesPanelState(this);
    this.columns = new DataCubeEditorColumnsPanelState(this);
    this.horizontalPivots = new DataCubeEditorHorizontalPivotsPanelState(this);
    this.verticalPivots = new DataCubeEditorVerticalPivotsPanelState(this);
    this.sorts = new DataCubeEditorSortsPanelState(this);
  }

  setCurrentTab(val: DataCubeEditorTab) {
    this.currentTab = val;
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    this.sourceColumns = snapshot.data.sourceColumns;
    this.leafExtendColumns = snapshot.data.leafExtendedColumns;
    this.groupExtendColumns = snapshot.data.groupExtendedColumns;

    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    this.generalProperties.applySnaphot(snapshot, configuration);
    this.pivotLayout.applySnaphot(snapshot, configuration);
    this.columnProperties.applySnaphot(snapshot, configuration);

    this.columns.applySnaphot(snapshot, configuration);
    this.horizontalPivots.applySnaphot(snapshot, configuration);
    this.verticalPivots.applySnaphot(snapshot, configuration);
    this.sorts.applySnaphot(snapshot, configuration);
  }

  override getSnapshotSubscriberName() {
    return 'editor';
  }

  async applyChanges(options?: { closeAfterApply?: boolean | undefined }) {
    this.finalizationState.inProgress();

    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const newSnapshot = baseSnapshot.clone();

    // grid configuration must be processed before processing columns' configuration
    // to properly generate the container configuration
    this.generalProperties.buildSnapshot(newSnapshot, baseSnapshot);
    this.pivotLayout.buildSnapshot(newSnapshot, baseSnapshot);
    this.columnProperties.buildSnapshot(newSnapshot, baseSnapshot);

    // NOTE: column selection must be processed first since the snapshot
    // processing of other parts of the query can be affected by column selection.
    this.columns.buildSnapshot(newSnapshot, baseSnapshot);
    this.horizontalPivots.buildSnapshot(newSnapshot, baseSnapshot);
    this.verticalPivots.buildSnapshot(newSnapshot, baseSnapshot);
    this.sorts.buildSnapshot(newSnapshot, baseSnapshot);

    // finalize
    newSnapshot.finalize();
    if (newSnapshot.hashCode !== baseSnapshot.hashCode) {
      const task = this.view.newTask('Validate query');
      // NOTE: Compile the query to validate. This is a helpful check for a lot of different scenarios
      // where the consistency of the query might be thrown off by changes from various parts that the
      // editor does not have full control over (i.e. extended columns, pivot cast columns, etc.)
      // e.g. when a column that group-level extended columns' expressions depend on has been unselected.
      const tempSnapshot = newSnapshot.clone();
      // NOTE: in order to obtain the actual pivot result columns information, we need to execute
      // the query which is expensive in certain cases, so here, we just compute the "optimistic" set
      // of pivot result columns for casting to guarantee validation is not thronn off.
      if (tempSnapshot.data.pivot) {
        tempSnapshot.data.pivot.castColumns =
          this.sorts.selector.availableColumns
            .filter(
              (col) =>
                !tempSnapshot.data.groupExtendedColumns.find(
                  (column) => column.name === col.name,
                ),
            )
            .map(_toCol);
      }

      const codePrefix = `->`;
      const code = await this.view.engine.getPartialQueryCode(
        tempSnapshot,
        true,
      );
      try {
        await this.view.engine.getQueryCodeRelationReturnType(
          codePrefix + code,
          V1_deserializeValueSpecification(tempSnapshot.data.sourceQuery, []),
        );
      } catch (error) {
        assertErrorThrown(error);
        if (
          error instanceof NetworkClientError &&
          error.response.status === HttpStatus.BAD_REQUEST
        ) {
          this.view.application.alertCodeCheckError(
            error.payload as DataCubeQueryBuilderError,
            code,
            codePrefix,
            {
              message: `Query Validation Failure: Can't safely apply changes. Check the query code below for more details.`,
              text: `Error: ${error.message}`,
            },
          );
        } else {
          this.view.application.alertError(error, {
            message: `Query Validation Failure: Can't safely apply changes.`,
            text: `Error: ${error.message}`,
          });
        }
        return;
      } finally {
        this.view.endTask(task);
        this.finalizationState.complete();
      }

      this.publishSnapshot(newSnapshot);
    } else {
      this.finalizationState.complete();
    }

    if (options?.closeAfterApply) {
      this.display.close();
    }
  }
}
