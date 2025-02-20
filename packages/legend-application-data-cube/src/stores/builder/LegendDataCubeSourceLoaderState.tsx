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
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import type { LegendDataCubeBuilderStore } from './LegendDataCubeBuilderStore.js';
import {
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DisplayState,
  type DataCubeAlertService,
} from '@finos/legend-data-cube';
import { LegendDataCubeSourceLoader } from '../../components/builder/LegendDataCubeSourceLoader.js';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeApplicationStore } from '../LegendDataCubeBaseStore.js';
import {
  LegendDataCubeSourceLoaderType,
  type LegendDataCubeSourceLoaderBuilderState,
} from './source/loader/LegendDataCubeSourceLoaderBuilderState.js';
import { LocalFileDataCubeSourceLoaderBuilderState } from './source/loader/LocalFileDataCubeSourceLoaderBuilderState.js';
import { LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE } from '../model/LocalFileDataCubeSource.js';

const DEFAULT_SOURCE_TYPE = LegendDataCubeSourceLoaderType.LOCAL_FILE;

export class LegendDataCubeSourceLoaderState {
  private readonly _application: LegendDataCubeApplicationStore;
  private readonly _engine: LegendDataCubeDataCubeEngine;
  private readonly _alertService: DataCubeAlertService;

  source: PlainObject | undefined;

  readonly display: DisplayState;
  readonly searchState = ActionState.create();
  readonly finalizeState = ActionState.create();

  sourceLoader: LegendDataCubeSourceLoaderBuilderState;

  constructor(store: LegendDataCubeBuilderStore) {
    makeObservable(this, {
      sourceLoader: observable,
      changeSourceLoader: action,

      source: observable,
      setSource: action,
    });

    this._application = store.application;
    this._engine = store.engine;
    this._alertService = store.alertService;
    this.sourceLoader = this.createSourceLoader(DEFAULT_SOURCE_TYPE);

    this.display = store.layoutService.newDisplay(
      'Reupload Source Data',
      () => <LegendDataCubeSourceLoader />,
      {
        ...DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
        width: 500,
        minWidth: 500,
      },
    );
  }

  setSource(source: PlainObject) {
    this.source = source;
  }

  changeSourceLoader(
    type: LegendDataCubeSourceLoaderType,
    skipCheck?: boolean | undefined,
  ): void {
    if (this.sourceLoader.label !== type || skipCheck) {
      this.sourceLoader = this.createSourceLoader(type);
    }
  }

  isPartialSouce(type: string): boolean {
    if (type === LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE) {
      return true;
    }
    return false;
  }

  private createSourceLoader(
    type: LegendDataCubeSourceLoaderType,
  ): LegendDataCubeSourceLoaderBuilderState {
    switch (type) {
      case LegendDataCubeSourceLoaderType.LOCAL_FILE:
        return new LocalFileDataCubeSourceLoaderBuilderState(
          this._application,
          this._engine,
        );
      default:
        throw new UnsupportedOperationError(
          `Can't create source builder for unsupported type '${type}'`,
        );
    }
  }

  async finalize() {
    try {
      this.finalizeState.inProgress();
      const validated = this.sourceLoader.validateSourceData(this.source);
      if (validated) {
        this.source = await this.sourceLoader.generateSourceData();
        this.display.close();
        this.finalizeState.pass();
      } else {
        throw new Error('Validation Failed');
      }
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `DataCube Load Failure: ${error.message}`,
      });
      this.finalizeState.fail();
    }
  }
}
