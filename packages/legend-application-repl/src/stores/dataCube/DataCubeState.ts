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

import { flowResult } from 'mobx';
import type { REPLStore } from './DataCubeStore.js';
import { DataCubeGridState } from './grid/DataCubeGridState.js';
import { DataCubeEditorState } from './editor/DataCubeEditorState.js';
import type { DataCubeQuery } from '../../server/models/DataCubeQuery.js';
import { ActionState, assertErrorThrown } from '@finos/legend-shared';
import { DataCubeEngine } from './core/DataCubeEngine.js';
import { DataCubeQuerySnapshotManager } from './core/DataCubeQuerySnapshotManager.js';
import { buildSnapshotFromQuery } from './core/DataCubeQueryAnalyzer.js';
import type { LegendREPLApplicationStore } from '../LegendREPLBaseStore.js';

export class DataCubeState {
  readonly editorStore: REPLStore;
  readonly applicationStore: LegendREPLApplicationStore;
  readonly engine: DataCubeEngine;
  readonly snapshotManager: DataCubeQuerySnapshotManager;
  readonly grid: DataCubeGridState;
  readonly editor: DataCubeEditorState;
  readonly initState = ActionState.create();

  baseQuery!: DataCubeQuery;

  constructor(editorStore: REPLStore) {
    this.editorStore = editorStore;
    this.applicationStore = editorStore.applicationStore;
    this.engine = new DataCubeEngine(this.editorStore.client);

    // NOTE: snapshot manager must be instantiated before subscribers
    this.snapshotManager = new DataCubeQuerySnapshotManager(this);
    this.grid = new DataCubeGridState(this);
    this.editor = new DataCubeEditorState(this);
  }

  async initialize(): Promise<void> {
    this.initState.inProgress();
    try {
      await flowResult(this.grid.initialize());
      this.snapshotManager.registerSubscriber(this.grid);
      this.snapshotManager.registerSubscriber(this.editor);

      this.baseQuery = await this.engine.getBaseQuery();
      const initialSnapshot = await buildSnapshotFromQuery(
        this.baseQuery,
        this.engine,
      );
      this.snapshotManager.broadcastSnapshot(initialSnapshot);
      this.initState.complete();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.initState.fail();
    }
  }
}
