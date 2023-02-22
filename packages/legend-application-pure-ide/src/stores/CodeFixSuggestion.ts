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
import type { EditorStore } from './EditorStore.js';

export class CodeFixSuggestion {
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export class UnmatchedFunctionCodeFixSuggestion extends CodeFixSuggestion {
  readonly result: UnmatchedFunctionResult;

  constructor(editorStore: EditorStore, result: UnmatchedFunctionResult) {
    super(editorStore);
    this.result = result;
  }
}

export class UnknownSymbolCodeFixSuggestion extends CodeFixSuggestion {
  readonly result: UnknownSymbolResult;

  constructor(editorStore: EditorStore, result: UnknownSymbolResult) {
    super(editorStore);
    this.result = result;
  }
}
