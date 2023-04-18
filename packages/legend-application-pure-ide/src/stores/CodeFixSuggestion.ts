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

import type {
  UnmatchedFunctionResult,
  UnknownSymbolResult,
} from '../server/models/Execution.js';
import type { PureIDEStore } from './PureIDEStore.js';

export class CodeFixSuggestion {
  readonly ideStore: PureIDEStore;

  constructor(ideStore: PureIDEStore) {
    this.ideStore = ideStore;
  }
}

export class UnmatchedFunctionCodeFixSuggestion extends CodeFixSuggestion {
  readonly result: UnmatchedFunctionResult;

  constructor(ideStore: PureIDEStore, result: UnmatchedFunctionResult) {
    super(ideStore);
    this.result = result;
  }
}

export class UnknownSymbolCodeFixSuggestion extends CodeFixSuggestion {
  readonly result: UnknownSymbolResult;

  constructor(ideStore: PureIDEStore, result: UnknownSymbolResult) {
    super(ideStore);
    this.result = result;
  }
}
