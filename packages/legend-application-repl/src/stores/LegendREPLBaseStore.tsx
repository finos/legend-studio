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
import { LegendREPLDataCubeSource } from './LegendREPLDataCubeSource.js';
import { PersistentDataCubeQuery } from '@finos/legend-graph';
import { LegendREPLPublishDataCubeAlert } from '../components/LegendREPLPublishDataCubeAlert.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { action, makeObservable, observable } from 'mobx';
import { LegendREPLDataCubeEngine } from './LegendREPLDataCubeEngine.js';

export class LegendREPLBaseStore {
  readonly application: LegendREPLApplicationStore;
  readonly client: LegendREPLServerClient;
  readonly engine: LegendREPLDataCubeEngine;
  readonly initializeState = ActionState.create();
  readonly publishState = ActionState.create();

  sourceQuery?: string | undefined;
  currentUser?: string | undefined;
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
    this.client = new LegendREPLServerClient(
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
    this.engine = new LegendREPLDataCubeEngine(this);
  }

  setQuery(query: DataCubeQuery | undefined): void {
    this.query = query;
  }

  async initialize() {
    this.initializeState.inProgress();
    try {
      const info = await this.client.getInfrastructureInfo();
      this.currentUser = info.currentUser;
      if (info.currentUser) {
        this.application.identityService.setCurrentUser(info.currentUser);
      }
      this.application.telemetryService.setup();

      this.queryServerBaseUrl = info.queryServerBaseUrl;
      this.hostedApplicationBaseUrl = info.hostedApplicationBaseUrl;
      this.gridClientLicense = info.gridClientLicense;
      this.setQuery(
        DataCubeQuery.serialization.fromJson(await this.client.getBaseQuery()),
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
    if (
      !this.sourceQuery ||
      !dataCube.view.isSourceProcessed ||
      !this.queryServerBaseUrl ||
      !(dataCube.view.source instanceof LegendREPLDataCubeSource) ||
      !dataCube.view.source.isPersistenceSupported ||
      !dataCube.view.source.model ||
      // eslint-disable-next-line no-process-env
      !(process.env.NODE_ENV === 'development' || !dataCube.view.source.isLocal)
    ) {
      return;
    }

    this.publishState.inProgress();
    const task = dataCube.view.newTask('Publish query');

    try {
      const query = new DataCubeQuery();
      query.query = await dataCube.engine.getPartialQueryCode(
        dataCube.view.snapshotManager.currentSnapshot,
      );
      const source = new RawAdhocQueryDataCubeSource();
      source.query = this.sourceQuery;
      source.runtime = dataCube.view.source.runtime;
      source.model = dataCube.view.source.model;
      query.source = RawAdhocQueryDataCubeSource.serialization.toJson(source);
      const newQuery = new PersistentDataCubeQuery();
      newQuery.id = uuid();
      newQuery.name = DataCubeConfiguration.serialization.fromJson(
        dataCube.view.snapshotManager.currentSnapshot.data.configuration,
      ).name;
      newQuery.content = DataCubeQuery.serialization.toJson(query);
      newQuery.owner = this.currentUser;
      const publishedQuery = PersistentDataCubeQuery.serialization.fromJson(
        await this.client.publishQuery(
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
      dataCube.engine.layout.newWindow(window);
    } catch (error) {
      assertErrorThrown(error);
      dataCube.view.engine.alertError(error, {
        message: `Persistence Failure: Can't publish query.`,
        text: `Error: ${error.message}`,
      });
    } finally {
      dataCube.view.endTask(task);
      this.publishState.complete();
    }
  }
}
