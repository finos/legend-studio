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
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../STO_ServiceStore_HashUtils.js';
import type { ServiceRequestParameterBuildInfo } from './STO_ServiceStore_ServiceRequestParameterBuildInfo.js';

export class ServiceRequestParametersBuildInfo implements Hashable {
  parameterBuildInfoList: ServiceRequestParameterBuildInfo[] = [];

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_REQUEST_PARAMETERS_BUILD_INFO,
      hashArray(this.parameterBuildInfoList),
    ]);
  }
}
