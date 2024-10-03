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

import { DataCubeGridState } from './grid/DataCubeGridState.js';
import { DataCubeEditorState } from './editor/DataCubeEditorState.js';
import { assertErrorThrown, uuid } from '@finos/legend-shared';
import { DataCubeQuerySnapshotManager } from './DataCubeQuerySnapshotManager.js';
import { DataCubeInfoState } from './DataCubeInfoState.js';
import { validateAndBuildQuerySnapshot } from '../core/DataCubeQuerySnapshotBuilder.js';
import { action, makeObservable, observable } from 'mobx';
import { DataCubeFilterEditorState } from './filter/DataCubeFilterEditorState.js';
import { DataCubeExtendManagerState } from './extend/DataCubeExtendManagerState.js';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';
import { type DataCubeApplicationEngine } from '../core/DataCubeApplicationEngine.js';
import { AlertType } from '../../components/core/DataCubeAlert.js';

class DataCubeTask {
  uuid = uuid();
  name: string;
  startTime = Date.now();
  endTime?: number | undefined;

  constructor(name: string) {
    this.name = name;
  }

  end() {
    this.endTime = Date.now();
  }
}

export class DataCubeViewState {
  readonly dataCube: DataCubeState;
  readonly application: DataCubeApplicationEngine;
  readonly engine: DataCubeEngine;

  readonly snapshotManager: DataCubeQuerySnapshotManager;

  readonly info: DataCubeInfoState;
  readonly editor: DataCubeEditorState;
  readonly grid: DataCubeGridState;
  readonly filter: DataCubeFilterEditorState;
  readonly extend: DataCubeExtendManagerState;

  readonly runningTasks = new Map<string, DataCubeTask>();

  constructor(dataCube: DataCubeState) {
    makeObservable(this, {
      runningTasks: observable,
      newTask: action,
      endTask: action,
    });

    this.dataCube = dataCube;
    this.application = dataCube.application;
    this.engine = dataCube.engine;

    // NOTE: snapshot manager must be instantiated before subscribers
    this.snapshotManager = new DataCubeQuerySnapshotManager(this);

    this.info = new DataCubeInfoState(this);
    this.editor = new DataCubeEditorState(this);
    this.grid = new DataCubeGridState(this);
    this.filter = new DataCubeFilterEditorState(this);
    this.extend = new DataCubeExtendManagerState(this);
  }

  newTask(name: string) {
    const task = new DataCubeTask(name);
    this.runningTasks.set(task.uuid, task);
    return task;
  }

  endTask(task: DataCubeTask) {
    task.end();
    this.runningTasks.delete(task.uuid);
    return task;
  }

  async initialize() {
    const task = this.newTask('Initializing');
    try {
      await Promise.all(
        [
          this.info,
          this.editor,
          this.grid,
          this.grid.controller,
          this.filter,
          this.extend,
        ].map(async (state) => {
          this.snapshotManager.registerSubscriber(state);
        }),
      );
      const result = await this.engine.getBaseQuery();
      const initialSnapshot = validateAndBuildQuerySnapshot(
        result.partialQuery,
        result.sourceQuery,
        result.query,
      );
      initialSnapshot.timestamp = result.timestamp;
      this.snapshotManager.broadcastSnapshot(initialSnapshot);
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.application.alertAction({
        message: `Initialization Failure: ${error.message}`,
        prompt: `Resolve the issue and reload the application.`,
        type: AlertType.ERROR,
        actions: [],
      });
    } finally {
      this.endTask(task);
    }
  }
}
