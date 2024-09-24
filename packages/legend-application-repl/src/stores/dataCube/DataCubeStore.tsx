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
  ActionAlertType,
  APPLICATION_EVENT,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { type DataCubeEngine } from './DataCubeEngine.js';
import { DataCubeState } from './DataCubeState.js';
import {
  DEFAULT_SMALL_ALERT_WINDOW_CONFIG,
  DisplayState,
  LayoutConfiguration,
  LayoutManagerState,
  WindowState,
  type WindowConfiguration,
} from '../LayoutManagerState.js';
import { DocumentationPanel } from '../../components/repl/DocumentationPanel.js';
import { SettingsPanel } from '../../components/repl/SettingsPanel.js';
import { ActionState, assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { LicenseManager } from '@ag-grid-enterprise/core';
import {
  Alert,
  AlertType,
  type AlertAction,
} from '../../components/repl/Alert.js';
import { action, makeObservable } from 'mobx';

export class DataCubeStore {
  readonly application: GenericLegendApplicationStore;
  readonly engine: DataCubeEngine;
  readonly dataCubeState: DataCubeState;
  readonly layout: LayoutManagerState;
  readonly settingsDisplay: DisplayState;
  readonly documentationDisplay: DisplayState;
  readonly initState = ActionState.create();
  constructor(
    applicationStore: GenericLegendApplicationStore,
    engine: DataCubeEngine,
  ) {
    makeObservable(this, {
      alert: action,
      alertError: action,
    });
    this.application = applicationStore;
    this.engine = engine;
    this.layout = new LayoutManagerState(this.application);
    this.dataCubeState = new DataCubeState(this, this.engine);
    const settingsDisplay = new DisplayState(this.layout, 'Settings', () => (
      <SettingsPanel />
    ));
    settingsDisplay.configuration.window = {
      x: -50,
      y: 50,
      width: 600,
      height: 400,
      minWidth: 300,
      minHeight: 200,
      center: false,
    };
    const documentationDisplay = new DisplayState(
      this.layout,
      'Documentation',
      () => <DocumentationPanel />,
    );
    documentationDisplay.configuration.window = {
      x: -50,
      y: -50,
      width: 400,
      height: 400,
      minWidth: 300,
      minHeight: 200,
      center: false,
    };
    this.settingsDisplay = settingsDisplay;
    this.documentationDisplay = documentationDisplay;
  }

  async initialize() {
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
      const info = await this.engine.getInfrastructureInfo();
      if (info.gridClientLicense) {
        LicenseManager.setLicenseKey(info.gridClientLicense);
      }
      this.initState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.application.alertService.setActionAlertInfo({
        message: `Initialization Failure: ${error.message}`,
        prompt: `Resolve the issue and reload the application.`,
        type: ActionAlertType.ERROR,
        actions: [],
      });
      this.initState.fail();
    }
  }

  alertError(
    error: Error,
    options: {
      message: string;
      text?: string | undefined;
      actions?: AlertAction[] | undefined;
      windowTitle?: string | undefined;
      windowConfig?: WindowConfiguration | undefined;
    },
  ) {
    const { message, text, actions, windowTitle, windowConfig } = options;
    this.application.notificationService.notifyError(error);
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? 'Error', () => (
        <Alert
          type={AlertType.ERROR}
          message={message}
          text={text}
          actions={actions}
        />
      )),
    );
    window.configuration.window =
      windowConfig ?? DEFAULT_SMALL_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }

  alert(options: {
    message: string;
    type: AlertType;
    text?: string | undefined;
    actions?: AlertAction[] | undefined;
    windowTitle?: string | undefined;
    windowConfig?: WindowConfiguration | undefined;
  }) {
    const { message, type, text, actions, windowTitle, windowConfig } = options;
    const window = new WindowState(
      new LayoutConfiguration(windowTitle ?? '', () => (
        <Alert
          type={type}
          message={message}
          text={text}
          actions={actions}
          onClose={() => this.layout.closeWindow(window)}
        />
      )),
    );
    window.configuration.window =
      windowConfig ?? DEFAULT_SMALL_ALERT_WINDOW_CONFIG;
    this.layout.newWindow(window);
  }
}
