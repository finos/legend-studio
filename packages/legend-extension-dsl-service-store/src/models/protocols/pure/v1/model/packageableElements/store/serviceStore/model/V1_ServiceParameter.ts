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

import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { V1_SerializationFormat } from './V1_SerializationFormat';
import type { V1_TypeReference } from './V1_TypeReference';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../../DSLServiceStore_ModelUtils';

export class V1_ServiceParameter implements Hashable {
  name!: string;
  type!: V1_TypeReference;
  location!: string;
  enumeration?: string | undefined;
  serializationFormat?: V1_SerializationFormat | undefined;

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_PARAMETER,
      this.name,
      this.type,
      this.location,
      this.enumeration ?? '',
      this.serializationFormat ?? new V1_SerializationFormat(),
    ]);
  }
}
