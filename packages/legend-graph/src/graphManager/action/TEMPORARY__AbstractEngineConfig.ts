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

const DEFAULT_TAB_SIZE = 2;

/**
 * When we make application config generic, we can probably remove this
 * See https://github.com/finos/legend-studio/issues/407
 */
export class TEMPORARY__AbstractEngineConfig {
  env?: string | undefined;
  tabSize = DEFAULT_TAB_SIZE;
  currentUserId?: string | undefined;
  baseUrl?: string | undefined;
  useClientRequestPayloadCompression = false;
  useBase64ForAdhocConnectionDataUrls = false;

  setEnv(val: string | undefined): void {
    this.env = val;
  }

  setTabSize(val: number): void {
    this.tabSize = val;
  }

  setCurrentUserId(val: string | undefined): void {
    this.currentUserId = val;
  }

  setBaseUrl(val: string | undefined): void {
    this.baseUrl = val;
  }

  setUseClientRequestPayloadCompression(val: boolean): void {
    this.useClientRequestPayloadCompression = val;
  }

  setUseBase64ForAdhocConnectionDataUrls(val: boolean): void {
    this.useBase64ForAdhocConnectionDataUrls = val;
  }
}
