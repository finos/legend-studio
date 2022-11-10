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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../../../graph/STO_ServiceStore_HashUtils.js';
import type { V1_ServiceRequestParametersBuildInfo } from './V1_STO_ServiceStore_ServiceRequestParametersBuildInfo.js';
import type { V1_ServiceRequestBodyBuildInfo } from './V1_STO_ServiceStore_ServiceRequestBodyBuildInfo.js';

export class V1_ServiceRequestBuildInfo implements Hashable {
  requestBodyBuildInfo?: V1_ServiceRequestBodyBuildInfo | undefined;
  requestParametersBuildInfo?: V1_ServiceRequestParametersBuildInfo | undefined;

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_REQUEST_BUILD_INFO,
      this.requestBodyBuildInfo ?? '',
      this.requestParametersBuildInfo ?? '',
    ]);
  }
}
