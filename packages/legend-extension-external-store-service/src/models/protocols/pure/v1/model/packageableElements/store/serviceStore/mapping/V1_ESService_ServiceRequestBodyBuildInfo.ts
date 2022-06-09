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
import type { V1_RawLambda } from '@finos/legend-graph';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../../ESService_ModelUtils.js';

export class V1_ServiceRequestBodyBuildInfo implements Hashable {
  transform!: V1_RawLambda;

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_REQUEST_BODY_BUILD_INFO,
      this.transform,
    ]);
  }
}
