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
  type DataCubeEngine,
  type DataCubeInitialInput,
} from './core/DataCubeEngine.js';
import { DataCubeViewState } from './view/DataCubeViewState.js';
import type { DisplayState } from './core/DataCubeLayoutManagerState.js';
import { DocumentationPanel } from '../components/core/DataCubeDocumentationPanel.js';
import { DataCubeSettingsPanel } from '../components/core/DataCubeSettingsPanel.js';
import {
  ActionState,
  assertErrorThrown,
  type DocumentationEntry,
} from '@finos/legend-shared';
import {
  AlertType,
  type ActionAlert,
} from '../components/core/DataCubeAlert.js';
import type { DataCubeSource } from './core/models/DataCubeSource.js';
import { action, makeObservable, observable } from 'mobx';
import { DataCubeSettings } from './DataCubeSettings.js';
import type { DataCubeAPI } from './DataCubeAPI.js';
import type { DataCubeOptions } from './DataCubeOptions.js';

export class DataCubeState implements DataCubeAPI {
  readonly engine: DataCubeEngine;
  readonly settings!: DataCubeSettings;
  readonly initState = ActionState.create();
  readonly settingsDisplay: DisplayState;
  readonly documentationDisplay: DisplayState;
  // NOTE: when we support multiview, there can be multiple view states to support
  // the first one in that list will be taken as the main view state
  readonly view: DataCubeViewState;

  onNameChanged?: ((name: string, source: DataCubeSource) => void) | undefined;
  onSettingChanged?:
    | ((
        key: string,
        value: string | number | boolean | object | undefined,
      ) => void)
    | undefined;

  initialInput?: DataCubeInitialInput | undefined;
  currentDocumentationEntry?: DocumentationEntry | undefined;
  currentActionAlert?: ActionAlert | undefined;

  constructor(engine: DataCubeEngine, options?: DataCubeOptions | undefined) {
    makeObservable(this, {
      currentDocumentationEntry: observable,
      openDocumentationEntry: action,

      currentActionAlert: observable,
      alertAction: action,
    });

    this.engine = engine;
    this.settings = new DataCubeSettings(this);
    this.view = new DataCubeViewState(this);

    this.settingsDisplay = this.engine.layout.newDisplay(
      'Settings',
      () => <DataCubeSettingsPanel />,
      {
        x: -50,
        y: 50,
        width: 600,
        height: 400,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );
    this.documentationDisplay = this.engine.layout.newDisplay(
      'Documentation',
      () => <DocumentationPanel />,
      {
        x: -50,
        y: -50,
        width: 400,
        height: 400,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );

    this.onNameChanged = options?.onNameChanged;
    this.onSettingChanged = options?.onSettingChanged;
    this.initialInput = options?.initialInput;

    this.settings.enableDebugMode =
      options?.enableDebugMode !== undefined
        ? options.enableDebugMode
        : this.settings.enableDebugMode;
    this.settings.gridClientRowBuffer =
      options?.gridClientRowBuffer !== undefined
        ? options.gridClientRowBuffer
        : this.settings.gridClientRowBuffer;
    this.settings.gridClientPurgeClosedRowNodes =
      options?.gridClientPurgeClosedRowNodes !== undefined
        ? options.gridClientPurgeClosedRowNodes
        : this.settings.gridClientPurgeClosedRowNodes;
    this.settings.gridClientSuppressLargeDatasetWarning =
      options?.gridClientSuppressLargeDatasetWarning !== undefined
        ? options.gridClientSuppressLargeDatasetWarning
        : this.settings.gridClientSuppressLargeDatasetWarning;
  }

  getSettings() {
    return this.settings;
  }

  openDocumentationEntry(entry: DocumentationEntry | undefined) {
    this.currentDocumentationEntry = entry;
  }

  alertAction(alert: ActionAlert | undefined) {
    this.currentActionAlert = alert;
  }

  refreshFailedDataFetches() {
    this.runTaskForEachView((view) => {
      view.grid.client.retryServerSideLoads();
    });
  }

  runTaskForEachView(runner: (view: DataCubeViewState) => void) {
    // TODO: When we support multi-view (i.e. multiple instances of DataCubes) we would need
    // to traverse through and update the configurations of all of their grid clients
    runner(this.view);
  }

  async initialize() {
    if (!this.initState.isInInitialState) {
      this.engine.logDebug('REPL store is re-initialized');
      return;
    }
    this.initState.inProgress();

    try {
      await this.engine.initialize();
      this.initState.pass();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.alertAction({
        message: `Initialization Failure: ${error.message}`,
        prompt: `Resolve the issue and reload the engine.`,
        type: AlertType.ERROR,
        actions: [],
      });
      this.initState.fail();
    }
  }
}
