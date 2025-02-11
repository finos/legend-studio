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

import {
  ActionState,
  LogEvent,
  NetworkClient,
  assertErrorThrown,
  guaranteeNonNullable,
  uuid,
} from '@finos/legend-shared';
import type { LegendREPLApplicationStore } from '../application/LegendREPLApplicationStore.js';
import { LegendREPLServerClient } from './LegendREPLServerClient.js';
import {
  DataCubeSpecification,
  type DataCubeSource,
  LayoutConfiguration,
  RawAdhocQueryDataCubeSource,
  WindowState,
  type DataCubeAPI,
  DEFAULT_REPORT_NAME,
  DataCubeLayoutService,
  DataCubeAlertService,
  DataCubeLogService,
  DataCubeTaskService,
} from '@finos/legend-data-cube';
import {
  LegendREPLDataCubeSource,
  RawLegendREPLDataCubeSource,
} from './LegendREPLDataCubeSource.js';
import { PersistentDataCube } from '@finos/legend-graph';
import { LegendREPLPublishDataCubeAlert } from '../components/LegendREPLPublishDataCubeAlert.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { action, makeObservable, observable } from 'mobx';
import { LegendREPLDataCubeEngine } from './LegendREPLDataCubeEngine.js';

export class LegendREPLBaseStore {
  private readonly _client: LegendREPLServerClient;
  readonly application: LegendREPLApplicationStore;
  readonly engine: LegendREPLDataCubeEngine;
  readonly taskService: DataCubeTaskService;
  readonly layoutService: DataCubeLayoutService;
  readonly alertService: DataCubeAlertService;

  readonly initializeState = ActionState.create();
  readonly publishState = ActionState.create();

  source?: DataCubeSource | undefined;
  gridClientLicense?: string | undefined;
  queryServerBaseUrl?: string | undefined;
  hostedApplicationBaseUrl?: string | undefined;
  specification?: DataCubeSpecification | undefined;

  constructor(application: LegendREPLApplicationStore) {
    makeObservable(this, {
      specification: observable,
      setSpecification: action,

      source: observable,
      setSource: action,
    });
    this.application = application;
    this._client = new LegendREPLServerClient(
      new NetworkClient({
        baseUrl: application.config.useDynamicREPLServer
          ? window.location.origin +
            guaranteeNonNullable(application.config.baseAddress).replace(
              '/repl/',
              '',
            )
          : application.config.replUrl,
      }),
    );
    this.engine = new LegendREPLDataCubeEngine(this.application, this._client);
    this.taskService = new DataCubeTaskService();
    this.layoutService = new DataCubeLayoutService();
    this.alertService = new DataCubeAlertService(
      new DataCubeLogService(this.engine),
      this.layoutService,
    );
  }

  setSpecification(specification: DataCubeSpecification | undefined) {
    this.specification = specification;
  }

  setSource(source: DataCubeSource | undefined) {
    this.source = source;
  }

  async initialize() {
    const task = this.taskService.newTask('Initialize REPL');

    this.initializeState.inProgress();
    try {
      const info = await this._client.getInfrastructureInfo();
      if (info.currentUser) {
        this.application.identityService.setCurrentUser(info.currentUser);
      }
      this.application.telemetryService.setup();

      this.queryServerBaseUrl = info.queryServerBaseUrl;
      this.hostedApplicationBaseUrl = info.hostedApplicationBaseUrl;
      this.gridClientLicense = info.gridClientLicense;
      this.setSpecification(
        DataCubeSpecification.serialization.fromJson(
          await this._client.getBaseSpecification(),
        ),
      );

      this.initializeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__FAILURE),
        `Can't initialize REPL`,
        error,
      );
      this.alertService.alertError(error, {
        message: `Initialization Failure: ${error.message}`,
        text: `Resolve the issue and reload the engine.`,
      });
      this.initializeState.fail();
    } finally {
      this.taskService.endTask(task);
    }
  }

  async publishDataCube(api: DataCubeAPI) {
    if (
      !this.queryServerBaseUrl ||
      !(this.source instanceof LegendREPLDataCubeSource) ||
      !this.source.isPersistenceSupported ||
      !this.source.model ||
      // eslint-disable-next-line no-process-env
      !(process.env.NODE_ENV === 'development' || !this.source.isLocal)
    ) {
      return;
    }

    this.publishState.inProgress();
    const task = this.taskService.newTask('Publish query');

    try {
      const query = await api.generateSpecification();

      const source = new RawAdhocQueryDataCubeSource();
      source.query = RawLegendREPLDataCubeSource.serialization.fromJson(
        query.source,
      ).query;
      source.runtime = this.source.runtime;
      source.model = this.source.model;
      query.source = RawAdhocQueryDataCubeSource.serialization.toJson(source);

      const newQuery = new PersistentDataCube();
      newQuery.id = uuid();
      newQuery.name = query.configuration?.name ?? DEFAULT_REPORT_NAME;
      newQuery.content = DataCubeSpecification.serialization.toJson(query);
      newQuery.owner = this.application.identityService.currentUser;

      const publishedQuery = PersistentDataCube.serialization.fromJson(
        await this._client.publishQuery(
          PersistentDataCube.serialization.toJson(newQuery),
          this.queryServerBaseUrl,
        ),
      );

      const window = new WindowState(
        new LayoutConfiguration('Publish Query', () => (
          <LegendREPLPublishDataCubeAlert persistentDataCube={publishedQuery} />
        )),
      );
      window.configuration.window = {
        width: 420,
        height: 150,
        minWidth: 300,
        minHeight: 100,
        center: true,
      };
      this.layoutService.newWindow(window);
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Persistence Failure: Can't publish query.`,
        text: `Error: ${error.message}`,
      });
    } finally {
      this.taskService.endTask(task);
      this.publishState.complete();
    }
  }
}
