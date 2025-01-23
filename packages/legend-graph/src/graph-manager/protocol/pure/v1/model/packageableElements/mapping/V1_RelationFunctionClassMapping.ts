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

/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_PropertyMapping } from './V1_PropertyMapping.js';
import {
  type V1_ClassMappingVisitor,
  V1_ClassMapping,
} from './V1_ClassMapping.js';
import type { V1_PackageableElementPointer } from '../V1_PackageableElement.js';
import { hashArray, type Hashable } from '@finos/legend-shared';

export class V1_RelationFunctionClassMapping
  extends V1_ClassMapping
  implements Hashable
{
  relationFunction!: V1_PackageableElementPointer;
  propertyMappings: V1_PropertyMapping[] = [];

  accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T {
    return visitor.visit_RelationFunctionClassMapping(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_FUNCTION_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      hashArray(this.propertyMappings),
    ]);
  }
}
