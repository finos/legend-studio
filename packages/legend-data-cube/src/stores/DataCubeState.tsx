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

import { type DataCubeEngine } from './core/DataCubeEngine.js';
import { DataCubeViewState } from './view/DataCubeViewState.js';
import { ActionState, assertErrorThrown, uuid } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { DataCubeSettingService } from './services/DataCubeSettingService.js';
import { INTERNAL__DataCubeAPI } from './DataCubeAPI.js';
import type { DataCubeOptions } from './DataCubeOptions.js';
import type { DataCubeQuery } from './core/model/DataCubeQuery.js';
import { LicenseManager } from 'ag-grid-enterprise';
import {
  configureCodeEditor,
  setupPureLanguageService,
} from '@finos/legend-code-editor';
import { DataCubeFont } from './core/DataCubeQueryEngine.js';
import { DataCubeDocumentationService } from './services/DataCubeDocumentationService.js';
import { DataCubeLayoutService } from './services/DataCubeLayoutService.js';
import { DataCubeAlertService } from './services/DataCubeAlertService.js';
import { DataCubeTelemetryService } from './services/DataCubeTelemetryService.js';
import { DataCubeNavigationService } from './services/DataCubeNavigationService.js';
import { DataCubeLogService } from './services/DataCubeLogService.js';

export class DataCubeState {
  readonly engine: DataCubeEngine;
  readonly logService: DataCubeLogService;
  readonly layoutService: DataCubeLayoutService;
  readonly settingService: DataCubeSettingService;
  readonly documentationService: DataCubeDocumentationService;
  readonly alertService: DataCubeAlertService;
  readonly navigationService: DataCubeNavigationService;
  readonly telemetryService: DataCubeTelemetryService;

  readonly query: DataCubeQuery;
  readonly options?: DataCubeOptions | undefined;

  readonly initializeState = ActionState.create();
  readonly api: INTERNAL__DataCubeAPI;

  uuid = uuid();
  // NOTE: when we support multiview, there can be multiple view states to support
  // the first one in that list will be taken as the main view state
  view: DataCubeViewState;

  constructor(
    query: DataCubeQuery,
    engine: DataCubeEngine,
    options?: DataCubeOptions | undefined,
  ) {
    makeObservable(this, {
      uuid: observable,
      reload: action,
    });

    this.engine = engine;
    this.logService = new DataCubeLogService(this.engine);
    this.layoutService = new DataCubeLayoutService(options?.layoutManager);
    this.settingService = new DataCubeSettingService(
      this.engine,
      this.logService,
      this.layoutService,
      options,
    );
    this.documentationService = new DataCubeDocumentationService(
      this.engine,
      this.layoutService,
    );
    this.alertService = new DataCubeAlertService(
      this.engine,
      this.logService,
      this.layoutService,
    );
    this.navigationService = new DataCubeNavigationService(this.engine);
    this.telemetryService = new DataCubeTelemetryService(this.engine);

    this.api = new INTERNAL__DataCubeAPI(this);
    this.query = query;
    this.options = options;

    this.view = new DataCubeViewState(this);
  }

  async initialize() {
    if (!this.initializeState.isInInitialState) {
      this.logService.logDebug('DataCube state is re-initialized');
      return;
    }
    this.initializeState.inProgress();

    try {
      // set up the components
      if (this.options?.gridClientLicense) {
        LicenseManager.setLicenseKey(this.options.gridClientLicense);
      }
      await configureCodeEditor(DataCubeFont.ROBOTO_MONO, (error) => {
        throw error;
      });
      setupPureLanguageService({});

      this.options?.onInitialized?.(this);
      this.initializeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      // this.alertAction({
      //   message: `Initialization Failure: ${error.message}`,
      //   prompt: `Resolve the issue and reload the engine.`,
      //   type: AlertType.ERROR,
      //   actions: [],
      // });
      this.initializeState.fail();
    }
  }

  dispose() {
    this.layoutService.dispose();
  }

  reload() {
    this.view = new DataCubeViewState(this);
    this.uuid = uuid();
  }
}
