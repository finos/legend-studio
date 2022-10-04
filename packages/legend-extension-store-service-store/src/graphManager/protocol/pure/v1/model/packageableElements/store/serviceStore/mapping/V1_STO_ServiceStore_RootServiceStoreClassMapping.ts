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
import {
  V1_ClassMapping,
  type V1_ClassMappingVisitor,
} from '@finos/legend-graph';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../../../graph/STO_ServiceStore_HashUtils.js';
import type { V1_LocalMappingProperty } from './V1_STO_ServiceStore_LocalMappingProperty.js';
import type { V1_ServiceMapping } from './V1_STO_ServiceStore_ServiceMapping.js';

export class V1_RootServiceStoreClassMapping
  extends V1_ClassMapping
  implements Hashable
{
  localMappingProperties: V1_LocalMappingProperty[] = [];
  servicesMapping: V1_ServiceMapping[] = [];

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.ROOT_SERVICE_STORE_CLASS_MAPPING,
      this.id ?? '',
      this.class ?? '',
      this.root.toString(),
      hashArray(this.localMappingProperties),
      hashArray(this.servicesMapping),
    ]);
  }

  accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T {
    return visitor.visit_ClassMapping(this);
  }
}
