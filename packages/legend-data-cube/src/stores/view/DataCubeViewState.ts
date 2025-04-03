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
  deepEqual,
  IllegalStateError,
} from '@finos/legend-shared';
import { DataCubeSnapshotService } from '../services/DataCubeSnapshotService.js';
import { DataCubeInfoState } from './DataCubeInfoState.js';
import { validateAndBuildSnapshot } from '../core/DataCubeSnapshotBuilder.js';
import { DataCubeFilterEditorState } from './filter/DataCubeFilterEditorState.js';
import { DataCubeExtendManagerState } from './extend/DataCubeExtendManagerState.js';
import type { DataCubeState } from '../DataCubeState.js';
import { type DataCubeEngine } from '../core/DataCubeEngine.js';
import type { DataCubeSource } from '../core/model/DataCubeSource.js';
import { DataCubeSpecification } from '../core/model/DataCubeSpecification.js';
import { DataCubeTaskService } from '../services/DataCubeTaskService.js';
import type { DataCubeLogService } from '../services/DataCubeLogService.js';
import { DataCubeConfiguration } from '../core/model/DataCubeConfiguration.js';
import {
  DEFAULT_ALERT_WINDOW_CONFIG,
  type DataCubeLayoutService,
} from '../services/DataCubeLayoutService.js';
import {
  AlertType,
  type DataCubeAlertService,
} from '../services/DataCubeAlertService.js';
import type { DataCubeSettingService } from '../services/DataCubeSettingService.js';
import { CachedDataCubeSource } from '../core/model/CachedDataCubeSource.js';
import { DataCubeSettingKey } from '../../__lib__/DataCubeSetting.js';
import { PureClientVersion } from '@finos/legend-graph';
import { DataCubeEvent } from '../../__lib__/DataCubeEvent.js';

export class DataCubeViewState {
  readonly dataCube: DataCubeState;
  readonly engine: DataCubeEngine;
  readonly logService: DataCubeLogService;
  readonly taskService: DataCubeTaskService;
  readonly layoutService: DataCubeLayoutService;
  readonly alertService: DataCubeAlertService;
  readonly settingService: DataCubeSettingService;
  readonly snapshotService: DataCubeSnapshotService;

  readonly info: DataCubeInfoState;
  readonly editor: DataCubeEditorState;
  readonly grid: DataCubeGridState;
  readonly filter: DataCubeFilterEditorState;
  readonly extend: DataCubeExtendManagerState;

  readonly initializeState = ActionState.create();
  readonly processCacheState = ActionState.create();

  private _source?: DataCubeSource | undefined;
  private _initialSource?: DataCubeSource | undefined;
  private _initialSpecification?: DataCubeSpecification | undefined;

  constructor(dataCube: DataCubeState) {
    this.dataCube = dataCube;
    this.engine = dataCube.engine;
    this.logService = dataCube.logService;
    this.taskService = new DataCubeTaskService(dataCube.taskService.manager);
    this.layoutService = dataCube.layoutService;
    this.alertService = dataCube.alertService;
    this.settingService = dataCube.settingService;
    // NOTE: snapshot manager must be instantiated before subscribers
    this.snapshotService = new DataCubeSnapshotService(
      this.logService,
      this.settingService,
    );

    this.info = new DataCubeInfoState(this);
    this.editor = new DataCubeEditorState(this);
    this.grid = new DataCubeGridState(this);
    this.filter = new DataCubeFilterEditorState(this);
    this.extend = new DataCubeExtendManagerState(this);
  }

  getInitialSource() {
    return this._initialSource;
  }

  async generateSpecification() {
    const snapshot = this.snapshotService.getCurrentSnapshot();
    const query = new DataCubeSpecification();
    query.source = this.dataCube.specification.source;
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

  updateName(name: string) {
    const baseSnapshot = this.snapshotService.getCurrentSnapshot();
    const snapshot = baseSnapshot.clone();

    const configuration = DataCubeConfiguration.serialization.fromJson(
      baseSnapshot.data.configuration,
    );
    if (configuration.name === name) {
      return;
    }
    configuration.name = name;
    snapshot.data.configuration = configuration.serialize();

    snapshot.finalize();
    if (snapshot.hashCode !== baseSnapshot.hashCode) {
      this.snapshotService.broadcastSnapshot(snapshot);
    }
  }

  async applySpecification(specification: DataCubeSpecification) {
    const task = this.taskService.newTask('Applying specification...');

    try {
      if (!this._initialSource || !this._initialSpecification) {
        throw new Error(`DataCube is not initialized`);
      }
      if (!deepEqual(specification.source, this._initialSpecification.source)) {
        throw new Error(`Can't apply specification with different source`);
      }
      const partialQuery = await this.engine.parseValueSpecification(
        specification.query,
      );
      const snapshot = await validateAndBuildSnapshot(
        partialQuery,
        this._initialSource,
        specification,
        this.engine,
      );
      snapshot.finalize();
      if (
        snapshot.hashCode !== this.snapshotService.getCurrentSnapshot().hashCode
      ) {
        this.snapshotService.broadcastSnapshot(snapshot);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Specification Application Failure: ${error.message}`,
      });
      this.initializeState.fail();
    } finally {
      this.taskService.endTask(task);
    }
  }

  async initializeCache() {
    this.processCacheState.inProgress();
    const task = this.taskService.newTask('Initializing cache...');

    try {
      const cachedSource = await this.engine.initializeCache(this.source, {
        debug: this.settingService.getBooleanValue(
          DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
        ),
        clientVersion: this.settingService.getBooleanValue(
          DataCubeSettingKey.DEBUGGER__USE_DEV_CLIENT_PROTOCOL_VERSION,
        )
          ? PureClientVersion.VX_X_X
          : undefined,
      });
      if (cachedSource) {
        this._source = cachedSource;
      }
      this.processCacheState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Cache Processing Failure: ${error.message}`,
      });
      this._source = this._initialSource;
      this.processCacheState.fail();
    } finally {
      this.taskService.endTask(task);
    }
  }

  async disposeCache() {
    if (!(this._source instanceof CachedDataCubeSource)) {
      return;
    }
    const cachedSource = this._source;
    this._source = this._initialSource;

    this.processCacheState.inProgress();
    const task = this.taskService.newTask('Disposing cache...');

    try {
      await this.engine.disposeCache(cachedSource);
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Cache Processing Failure: ${error.message}`,
      });
    } finally {
      this.processCacheState.complete();
      this.taskService.endTask(task);
    }
  }

  async initialize(specification: DataCubeSpecification) {
    this.initializeState.inProgress();
    const task = this.taskService.newTask('Initializing...');

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
      const source = await this.engine.processSource(specification.source);
      this._source = source;
      this._initialSource = source;
      this._initialSpecification = specification;
      const partialQuery = await this.engine.parseValueSpecification(
        specification.query,
      );
      const initialSnapshot = await validateAndBuildSnapshot(
        partialQuery,
        source,
        specification,
        this.engine,
      );

      const logAlertAction = (cachingEnabled: boolean) => {
        this.dataCube.telemetryService.sendTelemetry(
          DataCubeEvent.SELECT_ACTION_CACHE_LOAD_ALERT,
          {
            ...this.engine.getDataFromSource(this._initialSource),
            keepCachingEnabled: cachingEnabled,
          },
        );
      };

      // auto-enable cache if specified before broadcasting the first snapshot
      // so first data-fetches will be against cache
      if (specification.options?.autoEnableCache) {
        await this.grid.setCachingEnabled(true, {
          suppressWarning: true,
        });

        if (
          this.grid.isCachingEnabled &&
          this.settingService.getBooleanValue(
            DataCubeSettingKey.GRID_CLIENT__SHOW_AUTO_ENABLE_CACHE_PERFORMANCE_WARNING,
          )
        ) {
          this.alertService.alert({
            message: `Caching is auto-enabled for this DataCube`,
            text: `When enabled, the source dataset will be cached locally in order to boost query performance. But depending on computational resource available to your environment, sometimes, caching can negatively impact the overall performance, and can even lead to crashes.\n\nOverall, caching is still an experimental feature where we only support queries with simple execution plans, certain queries might not work.\n\nYou can disable caching if needed, otherwise, please proceed with caution.`,
            type: AlertType.WARNING,
            actions: [
              {
                label: 'OK',
                handler: () => {
                  logAlertAction(true);
                },
              },
              {
                label: 'Disable Caching',
                handler: () => {
                  logAlertAction(false);
                  this.grid
                    .setCachingEnabled(false, {
                      suppressWarning: true,
                    })
                    .catch((error) =>
                      this.alertService.alertUnhandledError(error),
                    );
                },
              },
              {
                label: 'Dismiss Warning',
                handler: () => {
                  logAlertAction(true);
                  this.settingService.updateValue(
                    this.dataCube.api,
                    DataCubeSettingKey.GRID_CLIENT__SHOW_AUTO_ENABLE_CACHE_PERFORMANCE_WARNING,
                    false,
                  );
                },
              },
            ],
            windowConfig: {
              ...DEFAULT_ALERT_WINDOW_CONFIG,
              width: 600,
              height: 300,
              minWidth: 300,
              minHeight: 150,
            },
          });
        }
      }

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
