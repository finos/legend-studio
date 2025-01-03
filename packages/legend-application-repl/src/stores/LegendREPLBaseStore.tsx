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
  DataCubeConfiguration,
  DataCubeQuery,
  LayoutConfiguration,
  RawAdhocQueryDataCubeSource,
  WindowState,
  type DataCubeState,
} from '@finos/legend-data-cube';
import {
  LegendREPLDataCubeSource,
  RawLegendREPLDataCubeSource,
} from './LegendREPLDataCubeSource.js';
import { PersistentDataCubeQuery } from '@finos/legend-graph';
import { LegendREPLPublishDataCubeAlert } from '../components/LegendREPLPublishDataCubeAlert.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { action, makeObservable, observable } from 'mobx';
import { LegendREPLDataCubeEngine } from './LegendREPLDataCubeEngine.js';

export class LegendREPLBaseStore {
  private readonly _client: LegendREPLServerClient;
  readonly application: LegendREPLApplicationStore;
  readonly engine: LegendREPLDataCubeEngine;

  readonly initializeState = ActionState.create();
  readonly publishState = ActionState.create();

  gridClientLicense?: string | undefined;
  queryServerBaseUrl?: string | undefined;
  hostedApplicationBaseUrl?: string | undefined;
  query?: DataCubeQuery | undefined;

  constructor(application: LegendREPLApplicationStore) {
    makeObservable(this, {
      query: observable,

      setQuery: action,
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
  }

  setQuery(query: DataCubeQuery | undefined): void {
    this.query = query;
  }

  async initialize() {
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
      this.setQuery(
        DataCubeQuery.serialization.fromJson(await this._client.getBaseQuery()),
      );

      this.initializeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.APPLICATION_LOAD__FAILURE),
        `Can't initialize REPL`,
        error,
      );
      this.initializeState.fail();
    }
  }

  async publishDataCube(dataCube: DataCubeState) {
    // NOTE: due to the unique setup of the REPL, we can just "borrow" services
    // native to DataCube for tasks done at the application layer.
    // when the use case gets more sophisticated, consider having dedicated
    // services (similar to how Legend DataCube does it)
    const view = dataCube.view;
    const taskService = view.taskService;
    const layoutService = dataCube.layoutService;
    const alertService = dataCube.alertService;

    if (
      !view.isSourceProcessed ||
      !this.queryServerBaseUrl ||
      !(view.source instanceof LegendREPLDataCubeSource) ||
      !view.source.isPersistenceSupported ||
      !view.source.model ||
      // eslint-disable-next-line no-process-env
      !(process.env.NODE_ENV === 'development' || !view.source.isLocal)
    ) {
      return;
    }

    this.publishState.inProgress();
    const task = taskService.start('Publish query');

    try {
      const query = new DataCubeQuery();
      query.query = await dataCube.engine.getPartialQueryCode(
        view.snapshotService.currentSnapshot,
      );
      const source = new RawAdhocQueryDataCubeSource();
      source.query = RawLegendREPLDataCubeSource.serialization.fromJson(
        view.dataCube.query.source,
      ).query;
      source.runtime = view.source.runtime;
      source.model = view.source.model;
      query.source = RawAdhocQueryDataCubeSource.serialization.toJson(source);
      const newQuery = new PersistentDataCubeQuery();
      newQuery.id = uuid();
      newQuery.name = DataCubeConfiguration.serialization.fromJson(
        view.snapshotService.currentSnapshot.data.configuration,
      ).name;
      newQuery.content = DataCubeQuery.serialization.toJson(query);
      newQuery.owner = this.application.identityService.currentUser;
      const publishedQuery = PersistentDataCubeQuery.serialization.fromJson(
        await this._client.publishQuery(
          PersistentDataCubeQuery.serialization.toJson(newQuery),
          this.queryServerBaseUrl,
        ),
      );

      const window = new WindowState(
        new LayoutConfiguration('Publish Query', () => (
          <LegendREPLPublishDataCubeAlert query={publishedQuery} />
        )),
      );
      window.configuration.window = {
        width: 420,
        height: 150,
        minWidth: 300,
        minHeight: 100,
        center: true,
      };
      layoutService.newWindow(window);
    } catch (error) {
      assertErrorThrown(error);
      alertService.alertError(error, {
        message: `Persistence Failure: Can't publish query.`,
        text: `Error: ${error.message}`,
      });
    } finally {
      taskService.end(task);
      this.publishState.complete();
    }
  }
}
