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

import { type DataCubeEngine } from './DataCubeEngine.js';
import { DataCubeViewState } from './DataCubeViewState.js';
import {
  DEFAULT_SMALL_ALERT_WINDOW_CONFIG,
  DisplayState,
  LayoutConfiguration,
  LayoutManagerState,
  WindowState,
  type WindowConfiguration,
} from '../../components/shared/LayoutManagerState.js';
import { DocumentationPanel } from '../../components/shared/DocumentationPanel.js';
import { SettingsPanel } from '../../components/shared/SettingsPanel.js';
import { ActionState, assertErrorThrown } from '@finos/legend-shared';
import {
  Alert,
  AlertType,
  type ActionAlertAction,
} from '../../components/shared/Alert.js';
import { action, makeObservable } from 'mobx';
import { type DataCubeApplicationEngine } from './DataCubeApplicationEngine.js';

export class DataCubeState {
  readonly application: DataCubeApplicationEngine;
  readonly engine: DataCubeEngine;
  readonly layout: LayoutManagerState;

  readonly initState = ActionState.create();

  readonly settingsDisplay: DisplayState;
  readonly documentationDisplay: DisplayState;

  // NOTE: when we support multiview, there can be multiple view states to support
  // the first one in that list will be taken as the main view state
  readonly view: DataCubeViewState;

  constructor(application: DataCubeApplicationEngine, engine: DataCubeEngine) {
    makeObservable(this, {
      alert: action,
      alertError: action,
    });
    this.application = application;
    this.engine = engine;
    this.engine.viewTaskRunner = (task) => this.runTaskForAllViews(task);
    this.layout = new LayoutManagerState();
    this.view = new DataCubeViewState(this);

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

  private runTaskForAllViews(task: (view: DataCubeViewState) => void): void {
    // TODO: When we support multi-view (i.e. multiple instances of DataCubes) we would need
    // to traverse through and update the configurations of all of their grid clients
    task(this.view);
  }

  async initialize() {
    if (!this.initState.isInInitialState) {
      this.application.logDebug('REPL store is re-initialized');
      return;
    }
    this.initState.inProgress();

    try {
      await this.engine.initialize();
      this.initState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.application.alertAction({
        message: `Initialization Failure: ${error.message}`,
        prompt: `Resolve the issue and reload the application.`,
        type: AlertType.ERROR,
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
      actions?: ActionAlertAction[] | undefined;
      windowTitle?: string | undefined;
      windowConfig?: WindowConfiguration | undefined;
    },
  ) {
    const { message, text, actions, windowTitle, windowConfig } = options;
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
    actions?: ActionAlertAction[] | undefined;
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
