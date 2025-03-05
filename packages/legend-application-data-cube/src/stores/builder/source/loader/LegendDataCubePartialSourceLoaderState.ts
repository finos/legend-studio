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

import { type PlainObject } from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from '../../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeSourceLoaderType } from '../../LegendDataCubeSourceLoaderState.js';

export abstract class LegendDataCubePartialSourceLoaderState {
  protected readonly _application: LegendDataCubeApplicationStore;
  protected readonly _engine: LegendDataCubeDataCubeEngine;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
  ) {
    this._application = application;
    this._engine = engine;
  }

  abstract initialize(): void;

  abstract get label(): LegendDataCubeSourceLoaderType;

  abstract get isValid(): boolean;

  abstract load(source: PlainObject | undefined): Promise<PlainObject>;
}
