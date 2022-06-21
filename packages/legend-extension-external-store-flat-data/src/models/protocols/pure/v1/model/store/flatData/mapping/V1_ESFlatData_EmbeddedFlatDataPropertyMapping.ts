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

import type { V1_PropertyMappingVisitor } from '@finos/legend-graph';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { FLAT_DATA_STORE_HASH_STRUCTURE } from '../../../../../../../ESFlatData_ModelUtils.js';
import { V1_AbstractFlatDataPropertyMapping } from './V1_ESFlatData_AbstractFlatDataPropertyMapping.js';

export class V1_EmbeddedFlatDataPropertyMapping
  extends V1_AbstractFlatDataPropertyMapping
  implements Hashable
{
  id!: string;
  root!: boolean; // root value for embedded property mapping should always be false
  class!: string; // the class for the property being mapped by this embedded mapping
  propertyMappings: V1_AbstractFlatDataPropertyMapping[] = [];

  override get hashCode(): string {
    return hashArray([
      FLAT_DATA_STORE_HASH_STRUCTURE.EMBEDDED_FLAT_DATA_PROPERTY_MAPPING,
      super.hashCode,
      this.id,
      this.class,
      // skip `root` since we disregard it in embedded property mappings
      hashArray(this.propertyMappings),
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: V1_PropertyMappingVisitor<T>): T {
    return visitor.visit_PropertyMapping(this);
  }
}
