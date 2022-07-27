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
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../ESService_HashUtils.js';
import { ServiceStoreElement } from './ESService_ServiceStoreElement.js';
import type { ServiceParameter } from './ESService_ServiceParameter.js';
import type { SecurityScheme } from './ESService_SecurityScheme.js';
import type {
  TypeReference,
  ComplexTypeReference,
} from './ESService_TypeReference.js';

export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST',
}

export class ServiceStoreService
  extends ServiceStoreElement
  implements Hashable
{
  requestBody?: TypeReference | undefined;
  method!: HTTP_METHOD;
  parameters: ServiceParameter[] = [];
  response!: ComplexTypeReference;
  security: SecurityScheme[] = [];

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
