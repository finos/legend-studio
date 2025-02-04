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
import {
  ActionState,
  assertErrorThrown,
  IllegalStateError,
} from '@finos/legend-shared';
import { DataCubeQuerySnapshotService } from '../services/DataCubeQuerySnapshotService.js';
import { DataCubeInfoState } from './DataCubeInfoState.js';
import { validateAndBuildQuerySnapshot } from '../core/DataCubeQuerySnapshotBuilder.js';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { DataCubeFilterEditorState } from './filter/DataCubeFilterEditorState.js';
import { DataCubeExtendManagerState } from './extend/DataCubeExtendManagerState.js';
import type { DataCubeState } from '../DataCubeState.js';
import { type DataCubeEngine } from '../core/DataCubeEngine.js';
import type { DataCubeSource } from '../core/model/DataCubeSource.js';
import { DataCubeQuery } from '../core/model/DataCubeQuery.js';
import { DataCubeTaskService } from '../services/DataCubeTaskService.js';
import type { DataCubeLogService } from '../services/DataCubeLogService.js';
import { DataCubeConfiguration } from '../core/model/DataCubeConfiguration.js';
import type { DataCubeLayoutService } from '../services/DataCubeLayoutService.js';
import type { DataCubeAlertService } from '../services/DataCubeAlertService.js';
import type { DataCubeSettingService } from '../services/DataCubeSettingService.js';

export class DataCubeViewState {
  readonly dataCube: DataCubeState;
  readonly engine: DataCubeEngine;
  readonly logService: DataCubeLogService;
  readonly taskService: DataCubeTaskService;
  readonly layoutService: DataCubeLayoutService;
  readonly alertService: DataCubeAlertService;
  readonly settingService: DataCubeSettingService;
  readonly snapshotService: DataCubeQuerySnapshotService;

  readonly info: DataCubeInfoState;
  readonly editor: DataCubeEditorState;
  readonly grid: DataCubeGridState;
  readonly filter: DataCubeFilterEditorState;
  readonly extend: DataCubeExtendManagerState;

  readonly initializeState = ActionState.create();

  private _source?: DataCubeSource | undefined;

  constructor(dataCube: DataCubeState) {
    makeObservable<DataCubeViewState, '_source'>(this, {
      _source: observable,
      source: computed,

      initialize: action,
    });

    this.dataCube = dataCube;
    this.engine = dataCube.engine;
    this.logService = dataCube.logService;
    this.taskService = new DataCubeTaskService(dataCube.taskService.manager);
    this.layoutService = dataCube.layoutService;
    this.alertService = dataCube.alertService;
    this.settingService = dataCube.settingService;
    // NOTE: snapshot manager must be instantiated before subscribers
    this.snapshotService = new DataCubeQuerySnapshotService(
      this.engine,
      this.logService,
    );

    this.info = new DataCubeInfoState(this);
    this.editor = new DataCubeEditorState(this);
    this.grid = new DataCubeGridState(this);
    this.filter = new DataCubeFilterEditorState(this);
    this.extend = new DataCubeExtendManagerState(this);
  }

  async generateDataCubeQuery() {
    const snapshot = this.snapshotService.currentSnapshot;
    const query = new DataCubeQuery();
    query.source = this.dataCube.query.source;
    query.configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    query.query = await this.engine.getPartialQueryCode(snapshot);
    return query;
  }

  get source() {
    if (!this._source) {
      throw new IllegalStateError('Source is not initialized');
    }
    return this._source;
  }

  async initialize(query: DataCubeQuery) {
    this.initializeState.inProgress();
    const task = this.taskService.newTask('Initializing');

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
          this.snapshotService.registerSubscriber(state);
        }),
      );
      const source = await this.engine.processQuerySource(query.source);
      runInAction(() => {
        this._source = source;
      });
      const partialQuery = await this.engine.parseValueSpecification(
        query.query,
      );
      const initialSnapshot = await validateAndBuildQuerySnapshot(
        partialQuery,
        source,
        query,
        this.engine,
      );
      this.engine.processInitialSnapshot?.(source, initialSnapshot);
      this.snapshotService.broadcastSnapshot(initialSnapshot);
      this.dataCube.options?.onViewInitialized?.({
        api: this.dataCube.api,
        source,
      });
      this.initializeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Initialization Failure: ${error.message}`,
        text: `Resolve the issue and reload the engine.`,
      });
      this.initializeState.fail();
    } finally {
      this.taskService.endTask(task);
    }
  }

  dispose() {
    this.taskService.dispose();
  }
}
