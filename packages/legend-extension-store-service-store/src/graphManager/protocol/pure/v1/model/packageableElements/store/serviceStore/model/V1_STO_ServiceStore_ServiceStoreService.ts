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
import { V1_ServiceStoreElement } from './V1_STO_ServiceStore_ServiceStoreElement.js';
import type { V1_ServiceParameter } from './V1_STO_ServiceStore_ServiceParameter.js';
import type { V1_SecurityScheme } from './V1_STO_ServiceStore_SecurityScheme.js';
import type {
  V1_TypeReference,
  V1_ComplexTypeReference,
} from './V1_STO_ServiceStore_TypeReference.js';

export class V1_ServiceStoreService
  extends V1_ServiceStoreElement
  implements Hashable
{
  requestBody?: V1_TypeReference | undefined;
  method!: string;
  parameters: V1_ServiceParameter[] = [];
  response!: V1_ComplexTypeReference;
  security: V1_SecurityScheme[] = [];

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_STORE_SERVICE,
      this.id,
      this.path,
      this.requestBody ?? '',
      this.method,
      hashArray(this.parameters),
      this.response,
      hashArray(this.security),
    ]);
  }
}
