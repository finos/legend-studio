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
  assertErrorThrown,
  type PlainObject,
} from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DataCubeAlertService,
} from '@finos/legend-data-cube';
import { LegendDataCubeBlockingWindowState } from '../../../components/LegendDataCubeBlockingWindow.js';
import { generateBuilderRoute } from '../../../__lib__/LegendDataCubeNavigation.js';
import { LegendDataCubeSourceLoader } from '../../../components/builder/source/LegendDataCubeSourceLoader.js';
import type { PersistentDataCube } from '@finos/legend-graph';

export abstract class LegendDataCubeSourceLoaderState {
  protected readonly _application: LegendDataCubeApplicationStore;
  protected readonly _engine: LegendDataCubeDataCubeEngine;
  protected readonly _alertService: DataCubeAlertService;

  readonly display: LegendDataCubeBlockingWindowState;
  readonly finalizeState = ActionState.create();

  protected readonly onSuccess: () => Promise<void>;
  protected readonly onError: (error: unknown) => Promise<void>;
  readonly sourceData: PlainObject;
  readonly persistentDataCube: PersistentDataCube;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    alertService: DataCubeAlertService,
    sourceData: PlainObject,
    persistentDataCube: PersistentDataCube,
    onSuccess: () => Promise<void>,
    onError: (error: unknown) => Promise<void>,
  ) {
    this._application = application;
    this._engine = engine;
    this._alertService = alertService;

    this.sourceData = sourceData;
    this.persistentDataCube = persistentDataCube;
    this.onSuccess = onSuccess;
    this.onError = onError;

    this.display = new LegendDataCubeBlockingWindowState(
      'Load DataCube',
      () => <LegendDataCubeSourceLoader state={this} />,
      {
        ...DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
        width: 500,
        minWidth: 500,
      },
      () => {
        this._application.navigationService.navigator.updateCurrentLocation(
          generateBuilderRoute(null),
        );
      },
    );
  }

  abstract initialize(): void;

  abstract get label(): string;

  abstract get isValid(): boolean;

  abstract load(source: PlainObject | undefined): Promise<PlainObject>;

  async finalize() {
    this.finalizeState.inProgress();
    try {
      await this.load(this.sourceData);
      this.display.close();
      await this.onSuccess();
      this.finalizeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `DataCube Load Failure: ${error.message}`,
      });
      await this.onError(error);
      this.finalizeState.fail();
    }
  }
}
