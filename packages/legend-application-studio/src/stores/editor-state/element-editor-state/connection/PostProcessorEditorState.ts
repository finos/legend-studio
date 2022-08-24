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

import type { PostProcessor } from '@finos/legend-graph';
import { makeObservable, observable, action } from 'mobx';
import type { RelationalDatabaseConnectionValueState } from './ConnectionEditorState.js';

export class PostProcessorPostProcessorEditorState {
  selectedPostProcessor: PostProcessor;
  connectionValueState: RelationalDatabaseConnectionValueState;
  selectedPostP: PostProcessor;
  constructor(
    selectedPostProcessor: PostProcessor,
    connectionValueState: RelationalDatabaseConnectionValueState,
    selectedPostP: PostProcessor,
  ) {
    makeObservable(this, {
      selectedPostProcessor: observable,
      setselectedPostProcessor: action,
      connectionValueState: observable,
      selectedPostP: observable,
    });

    this.selectedPostProcessor = selectedPostProcessor;
    this.connectionValueState = connectionValueState;
    this.selectedPostP = selectedPostP;
  }
  setselectedPostProcessor(val: PostProcessor): void {
    this.selectedPostProcessor = val;
  }
}
