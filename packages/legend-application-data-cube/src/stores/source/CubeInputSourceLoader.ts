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

import { ActionState, UnsupportedOperationError } from '@finos/legend-shared';
import { type CubeInputSource } from './CubeInputSource.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';
import type { LegendDataCubeStoreContext } from '../LegendDataCubeEditorStore.js';

export enum DataCubeSourceType {
  LEGEND_QUERY = 'Legend Query',
  DEPOT_QUERY = 'Depot Query',
}

export abstract class CubeInputSourceState {
  buildCubeEngineState = ActionState.create();

  setupActionState = ActionState.create();

  readonly context: LegendDataCubeStoreContext;

  constructor(context: LegendDataCubeStoreContext) {
    this.context = context;
  }
  abstract get label(): DataCubeSourceType;

  async setup(): Promise<void> {
    this.setupActionState.complete();
  }

  abstract buildCubeEngine(): Promise<DataCubeEngine | undefined>;

  abstract process(): CubeInputSource;

  abstract get isValid(): boolean;

  get openActionable(): boolean {
    return true;
  }

  static builder(context: LegendDataCubeStoreContext): CubeInputSourceState {
    throw new UnsupportedOperationError('No builder');
  }
}
