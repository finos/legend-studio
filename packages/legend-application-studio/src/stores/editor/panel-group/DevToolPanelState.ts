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

import {
  ContentType,
  downloadFileUsingDataURI,
  formatDate,
  returnUndefOnError,
} from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';
import { DEFAULT_DATE_TIME_FORMAT } from '@finos/legend-application';

// TODO: We might potentially make this persisting data to local storage
// as such the logic in this state might get a little more complicated, so we just leave it like this for now
export class DevToolPanelState {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export const payloadDebugger = (payload: unknown, identifier: string): void => {
  let isJSON = false;
  let content = returnUndefOnError(() => JSON.stringify(payload, undefined, 2));
  if (content) {
    isJSON = true;
  }
  content = content ?? returnUndefOnError(() => `${payload}`) ?? '';
  // TODO: we can also copy the debug content to clipboard
  downloadFileUsingDataURI(
    `PAYLOAD_DEBUG__${identifier}__${formatDate(
      new Date(Date.now()),
      DEFAULT_DATE_TIME_FORMAT,
    )}${isJSON ? '.json' : '.txt'}`,
    content,
    isJSON ? ContentType.APPLICATION_JSON : ContentType.TEXT_PLAIN,
  );
};
