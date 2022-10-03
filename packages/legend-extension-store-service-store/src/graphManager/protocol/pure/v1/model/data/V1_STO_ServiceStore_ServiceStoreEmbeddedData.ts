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
  V1_EmbeddedData,
  type V1_EmbeddedDataVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../graph/STO_ServiceStore_HashUtils.js';
import type { V1_ServiceStubMapping } from './V1_STO_ServiceStore_ServiceStubMapping.js';

export class V1_ServiceStoreEmbeddedData
  extends V1_EmbeddedData
  implements Hashable
{
  serviceStubMappings: V1_ServiceStubMapping[] = [];

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_STORE_EMBEDDED_DATA,
      hashArray(this.serviceStubMappings),
    ]);
  }

  accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T {
    return visitor.visit_EmbeddedData(this);
  }
}
