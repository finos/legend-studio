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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { GraphManagerState } from '@finos/legend-graph';
import { QueryBuilderState } from '../QueryBuilderState.js';

export class BasicQueryBuilderState extends QueryBuilderState {
  static create(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ): BasicQueryBuilderState {
    return new BasicQueryBuilderState(applicationStore, graphManagerState);
  }

  get isParametersDisabled(): boolean {
    return false;
  }

  get isResultPanelHidden(): boolean {
    return false;
  }

  get isClassReadOnly(): boolean {
    return false;
  }

  get isMappingReadOnly(): boolean {
    return false;
  }

  get isRuntimeReadOnly(): boolean {
    return false;
  }
}
