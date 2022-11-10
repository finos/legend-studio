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
import {
  InstanceSetImplementation,
  type SetImplementationVisitor,
} from '@finos/legend-graph';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../STO_ServiceStore_HashUtils.js';
import type { LocalMappingProperty } from './STO_ServiceStore_LocalMappingProperty.js';
import type { ServiceMapping } from './STO_ServiceStore_ServiceMapping.js';

export class RootServiceInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  localMappingProperties: LocalMappingProperty[] = [];
  servicesMapping: ServiceMapping[] = [];

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.ROOT_SERVICE_STORE_CLASS_MAPPING,
      this.id.valueForSerialization ?? '',
      this.class.valueForSerialization ?? '',
      this.root.valueForSerialization.toString(),
      hashArray(this.localMappingProperties),
      hashArray(this.servicesMapping),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_SetImplementation(this);
  }
}
