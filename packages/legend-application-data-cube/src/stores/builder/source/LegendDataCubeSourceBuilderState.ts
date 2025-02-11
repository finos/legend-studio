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
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import type { DataCubeConfiguration } from '@finos/legend-data-cube';

export enum LegendDataCubeSourceBuilderType {
  LEGEND_QUERY = 'Legend Query',
  ADHOC_QUERY = 'Ad hoc Query',
}

export abstract class LegendDataCubeSourceBuilderState {
  protected readonly _application: LegendDataCubeApplicationStore;
  protected readonly _engine: LegendDataCubeDataCubeEngine;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
  ) {
    this._application = application;
    this._engine = engine;
  }

  abstract get label(): LegendDataCubeSourceBuilderType;
  abstract get isValid(): boolean;
  abstract generateSourceData(): Promise<PlainObject>;

  /* Modifies the configuration of the finalized DataCube based on the source builder */
  finalizeConfiguration(configuration: DataCubeConfiguration) {
    // do nothing
  }
}
