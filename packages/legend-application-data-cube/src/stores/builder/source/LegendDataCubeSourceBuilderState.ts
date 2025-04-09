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
import type {
  DataCubeAlertService,
  DataCubeConfiguration,
} from '@finos/legend-data-cube';

export enum LegendDataCubeSourceBuilderType {
  LEGEND_QUERY = 'Legend Query',
  FREEFORM_TDS_EXPRESSION = 'Freeform TDS Expression',
  LOCAL_FILE = 'Local File',
  USER_DEFINED_FUNCTION = 'User Defined Function',
}

export abstract class LegendDataCubeSourceBuilderState {
  protected readonly _application: LegendDataCubeApplicationStore;
  protected readonly _engine: LegendDataCubeDataCubeEngine;
  protected readonly _alertService: DataCubeAlertService;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    alertService: DataCubeAlertService,
  ) {
    this._application = application;
    this._engine = engine;
    this._alertService = alertService;
  }

  abstract get label(): LegendDataCubeSourceBuilderType;
  abstract get isValid(): boolean;
  abstract generateSourceData(): Promise<PlainObject>;

  /**
   * Modifies the configuration of the finalized DataCube based on the source builder.
   */
  finalizeConfiguration(configuration: DataCubeConfiguration) {
    // do nothing
  }
}
