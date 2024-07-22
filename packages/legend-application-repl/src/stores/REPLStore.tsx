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

import type { LegendREPLApplicationStore } from './LegendREPLBaseStore.js';
import { REPLServerClient } from '../server/REPLServerClient.js';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  NetworkClient,
} from '@finos/legend-shared';
import { makeObservable, observable } from 'mobx';
import { DataCubeState } from './dataCube/DataCubeState.js';
import { DataCubeEngine } from './dataCube/DataCubeEngine.js';
import { LicenseManager } from '@ag-grid-enterprise/core';
import { ActionAlertType, APPLICATION_EVENT } from '@finos/legend-application';
import {
  DEFAULT_ALERT_WINDOW_CONFIG,
  LayoutConfiguration,
  LayoutManagerState,
  SingletonModeDisplayState,
  WindowState,
} from './LayoutManagerState.js';
import { ErrorAlert } from '../components/repl/Alert.js';
import { DocumentationPanel } from '../components/repl/DocumentationPanel.js';
import { SettingsPanel } from '../components/repl/SettingsPanel.js';

export class REPLStore {
  readonly application: LegendREPLApplicationStore;
  readonly client: REPLServerClient;
  readonly layout: LayoutManagerState;
  readonly initState = ActionState.create();
  readonly settingsDisplay: SingletonModeDisplayState;
  readonly documentationDisplay: SingletonModeDisplayState;

  dataCubeEngine!: DataCubeEngine;

  // TODO: when we support multi-view, we would need to support multiple states
  dataCube!: DataCubeState;

  constructor(application: LegendREPLApplicationStore) {
    makeObservable(this, {
      dataCube: observable,
    });

    this.application = application;
    this.client = new REPLServerClient(
      new NetworkClient({
        baseUrl: this.application.config.useDynamicREPLServer
          ? window.location.origin +
            this.application.config.baseAddress.replace('/repl/', '')
          : this.application.config.replUrl,
      }),
    );
    this.layout = new LayoutManagerState(this.application);
    this.dataCubeEngine = new DataCubeEngine(this);
    this.dataCube = new DataCubeState(this);
    this.settingsDisplay = new SingletonModeDisplayState(
      this.layout,
      'Settings',
      () => <SettingsPanel />,
    );
    this.settingsDisplay.configuration.window = {
      x: -50,
      y: 50,
      width: 600,
      height: 400,
      minWidth: 300,
      minHeight: 200,
      center: false,
    };
    this.documentationDisplay = new SingletonModeDisplayState(
      this.layout,
      'Documentation',
      () => <DocumentationPanel />,
    );
    this.documentationDisplay.configuration.window = {
      x: -50,
      y: -50,
      width: 400,
      height: 400,
      minWidth: 300,
      minHeight: 200,
      center: false,
    };
  }

  notifyError(error: Error, message: string, text?: string | undefined): void {
    this.application.notificationService.notifyError(error);
    const window = new WindowState(
      new LayoutConfiguration('Error', () => (
        <ErrorAlert message={message} text={text} />
      )),
    );
    window.configuration.window = DEFAULT_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }

  async initialize(): Promise<void> {
    if (!this.initState.isInInitialState) {
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'production') {
        this.application.notificationService.notifyIllegalState(
          'REPL store is re-initialized',
        );
      } else {
        this.application.logService.debug(
          LogEvent.create(APPLICATION_EVENT.DEBUG),
          'REPL store is re-initialized',
        );
      }
      return;
    }
    this.initState.inProgress();

    try {
      const info = await this.dataCubeEngine.getInfrastructureInfo();
      if (info.gridClientLicense) {
        LicenseManager.setLicenseKey(info.gridClientLicense);
      }
      this.initState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.application.alertService.setActionAlertInfo({
        message: `Initialization failure: ${error.message}`,
        type: ActionAlertType.ERROR,
        actions: [],
      });
      this.initState.fail();
    }
  }
}
