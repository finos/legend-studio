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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../graph/STO_ServiceStore_HashUtils.js';
import type { HTTP_METHOD } from '../../../../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStoreService.js';
import type { V1_StringValuePattern } from './contentPattern/V1_STO_ServiceStore_StringValuePattern.js';

export class V1_ServiceRequestPattern implements Hashable {
  url?: string | undefined;
  urlPath?: string | undefined;
  method!: HTTP_METHOD;
  headerParams?: Map<string, V1_StringValuePattern> | undefined;
  queryParams?: Map<string, V1_StringValuePattern> | undefined;
  bodyPatterns: V1_StringValuePattern[] = [];

  get hashCode(): string {
    const headerParams: V1_StringValuePattern[] = [];
    const headerParamIds: string[] = [];
    this.headerParams?.forEach((v: V1_StringValuePattern, key: string) => {
      headerParams.push(v);
      headerParamIds.push(key);
    });
    const queryParams: V1_StringValuePattern[] = [];
    const queryParamIds: string[] = [];
    this.queryParams?.forEach((v: V1_StringValuePattern, key: string) => {
      queryParams.push(v);
      queryParamIds.push(key);
    });
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_REQUEST_PATTERN,
      this.url ?? '',
      this.urlPath ?? '',
      this.method,
      hashArray(headerParamIds),
      hashArray(headerParams),
      hashArray(queryParamIds),
      hashArray(queryParams),
      // this.headerParams ? this.headerParams.entries.toString() : '',
      // this.queryParams ? this.queryParams.entries.toString() : '',
      hashArray(this.bodyPatterns),
    ]);
  }
}
