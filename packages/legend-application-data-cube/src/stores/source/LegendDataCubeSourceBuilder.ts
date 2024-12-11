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

import { flow, makeObservable, observable } from 'mobx';
import {
  DataCubeSourceType,
  type CubeInputSourceState,
} from './CubeInputSourceLoader.js';
import { SavedQueryInputSourceState } from './SavedQueryInputSourceState.js';
import type { LegendDataCubeStoreContext } from '../LegendDataCubeEditorStore.js';
import {
  UnsupportedOperationError,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { CubeInputSource } from './CubeInputSource.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';

export class LegendDataCubeSourceBuilder {
  readonly context: LegendDataCubeStoreContext;
  open = false;
  sourceState: CubeInputSourceState;

  constructor(context: LegendDataCubeStoreContext) {
    makeObservable(this, {
      open: observable,
      sourceState: observable,
      inputSource: flow,
    });
    this.context = context;
    this.sourceState = this.buildSource(guaranteeNonNullable(this.options[0]));
  }

  get options(): DataCubeSourceType[] {
    return Object.values(DataCubeSourceType);
  }

  get currentOption(): DataCubeSourceType {
    throw new UnsupportedOperationError('');
  }

  openModal(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  changeSource(source: DataCubeSourceType): void {
    if (this.sourceState.label !== source) {
      this.sourceState = this.buildSource(source);
    }
  }

  buildSource(source: DataCubeSourceType): CubeInputSourceState {
    if (source === DataCubeSourceType.LEGEND_QUERY) {
      return SavedQueryInputSourceState.builder(this.context);
    }
    throw new UnsupportedOperationError('Not supported');
  }

  *inputSource(
    callback: (source: CubeInputSource, engine: DataCubeEngine) => void,
  ): GeneratorFn<void> {
    try {
      assertTrue(
        this.sourceState.isValid,
        'Source State is in a valid state to input',
      );
      const engine =
        (yield this.sourceState.buildCubeEngine()) as DataCubeEngine;
      const source = this.sourceState.process();
      callback(source, engine);
      this.close();
    } catch (error) {
      assertErrorThrown(error);
      this.context.applicationStore.notificationService.notifyError(
        `Unable to import: ${this.sourceState.label}: ${error.message}`,
      );
    }
  }
}
