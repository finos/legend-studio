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
import { type DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { DataCubeEditorMutablePivotLayoutConfiguration } from './DataCubeEditorMutableConfiguration.js';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import type { PlainObject } from '@finos/legend-shared';
import { _pruneExpandedPaths } from '../../core/DataCubeSnapshotBuilderUtils.js';

export class DataCubeEditorPivotLayoutPanelState
  implements DataCubeQueryEditorPanelState
{
  private readonly _editor!: DataCubeEditorState;

  pivotLayout = new DataCubeEditorMutablePivotLayoutConfiguration();

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      pivotLayout: observable,

      applySnaphot: action,
    });

    this._editor = editor;
  }

  applySnaphot(
    snapshot: DataCubeSnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.pivotLayout = DataCubeEditorMutablePivotLayoutConfiguration.create(
      snapshot.data.configuration.pivotLayout as PlainObject,
    );
  }

  buildSnapshot(newSnapshot: DataCubeSnapshot, baseSnapshot: DataCubeSnapshot) {
    this.pivotLayout.setExpandedPaths(
      _pruneExpandedPaths(
        baseSnapshot.data.groupBy?.columns ?? [],
        this._editor.verticalPivots.selector.selectedColumns,
        this.pivotLayout.expandedPaths,
      ),
    );
    newSnapshot.data.configuration = {
      ...newSnapshot.data.configuration,
      pivotLayout: this.pivotLayout.serialize(),
    };
  }
}
