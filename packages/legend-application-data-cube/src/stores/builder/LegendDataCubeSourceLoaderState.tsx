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
  guaranteeNonNullable,
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import type { LegendDataCubeBuilderStore } from './LegendDataCubeBuilderStore.js';
import {
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DataCubeAlertService,
} from '@finos/legend-data-cube';
import { LegendDataCubePartialSourceLoader } from '../../components/builder/LegendDataCubePartialSourceLoader.js';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeApplicationStore } from '../LegendDataCubeBaseStore.js';
import type { LegendDataCubePartialSourceLoaderState } from './source/loader/LegendDataCubePartialSourceLoaderState.js';
import { LocalFileDataCubePartialSourceLoaderState } from './source/loader/LocalFileDataCubePartialSourceLoaderState.js';
import { LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE } from '../model/LocalFileDataCubeSource.js';
import { LegendDataCubeBlockingWindowState } from '../../components/LegendDataCubeBlockingWindow.js';
import type { PersistentDataCube } from '@finos/legend-graph';

export enum LegendDataCubeSourceLoaderType {
  LOCAL_FILE = 'Local File',
}

export class LegendDataCubeSourceLoaderState {
  private readonly _application: LegendDataCubeApplicationStore;
  private readonly _engine: LegendDataCubeDataCubeEngine;
  private readonly _alertService: DataCubeAlertService;

  source: PlainObject | undefined;
  persistentDataCube: PersistentDataCube | undefined;

  readonly display: LegendDataCubeBlockingWindowState;
  readonly searchState = ActionState.create();
  readonly finalizeState = ActionState.create();

  partialSourceLoader: LegendDataCubePartialSourceLoaderState;

  partialSourceResolved = false;

  constructor(store: LegendDataCubeBuilderStore) {
    makeObservable(this, {
      source: observable,
      setSource: action,

      partialSourceResolved: observable,
      setPartialSourceResolved: action,
    });

    this._application = store.application;
    this._engine = store.engine;
    this._alertService = store.alertService;
    this.partialSourceLoader = this.createSourceLoader(
      LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE,
    );

    this.display = new LegendDataCubeBlockingWindowState(
      'Load DataCube',
      () => <LegendDataCubePartialSourceLoader />,
      {
        ...DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
        width: 500,
        minWidth: 500,
      },
      () => {
        store.loader.sourceLoaderDisplay.close();
        store.loadPartialSourceDataCube();
      },
    );
  }

  initialize(
    source: PlainObject,
    persistentDataCube: PersistentDataCube | undefined,
  ) {
    this.setSource(source);
    this.setPersistentDataCube(persistentDataCube);
  }

  setSource(source: PlainObject) {
    this.source = source;
  }

  setPersistentDataCube(persistentDataCube: PersistentDataCube | undefined) {
    this.persistentDataCube = guaranteeNonNullable(persistentDataCube);
  }

  setPartialSourceResolved(sourceResolved: boolean) {
    this.partialSourceResolved = sourceResolved;
  }

  changeSourceLoader(type: string): void {
    this.partialSourceLoader = this.createSourceLoader(type);
  }

  private createSourceLoader(
    type: string,
  ): LegendDataCubePartialSourceLoaderState {
    // We can add more partial sources
    switch (type) {
      case LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE:
        return new LocalFileDataCubePartialSourceLoaderState(
          this._application,
          this._engine,
        );
      default:
        throw new UnsupportedOperationError(
          `Can't create source loader for unsupported type '${type}'`,
        );
    }
  }

  async finalize() {
    try {
      this.finalizeState.inProgress();
      this.setSource(await this.partialSourceLoader.load(this.source));
      this.display.close();
      this.finalizeState.pass();
      this.setPartialSourceResolved(true);
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `DataCube Source Load Failure: ${error.message}`,
      });
      this.finalizeState.fail();
    }
  }
}
