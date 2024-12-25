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

import { ActionState, type PlainObject } from '@finos/legend-shared';
import type {
  LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from '../LegendDataCubeBaseStore.js';
import type { GraphManagerState } from '@finos/legend-graph';

export enum LegendDataCubeSourceBuilderType {
  LEGEND_QUERY = 'Legend Query',
  ADHOC_QUERY = 'Ad hoc Query',
}

export abstract class LegendDataCubeSourceBuilderState {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;
  readonly graphManagerState: GraphManagerState;

  readonly buildState = ActionState.create();

  constructor(baseStore: LegendDataCubeBaseStore) {
    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.graphManagerState = baseStore.graphManagerState;
  }

  abstract get label(): LegendDataCubeSourceBuilderType;
  abstract get isValid(): boolean;
  abstract build(): Promise<PlainObject>;
}
