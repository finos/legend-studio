/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EditorStore } from 'Stores/EditorStore';
import { observable, action } from 'mobx';
import { executionClient } from 'API/ExecutionClient';

// TODO: We might potentially make this persisting data to local storage
export class DevToolState {
  editorStore: EditorStore;
  @observable isNetworkCallWithDataCompressionEnabled = true;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  @action setNetworkCallWithDataCompression(val: boolean): void {
    this.isNetworkCallWithDataCompressionEnabled = val;
    executionClient.setCompression(this.isNetworkCallWithDataCompressionEnabled);
  }
}
