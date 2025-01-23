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

import { CORE_HASH_STRUCTURE } from '../../../../../Core_HashUtils.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../PropertyMapping.js';
import type { PropertyReference } from '../../domain/PropertyReference.js';
import type { PropertyMappingsImplementation } from '../PropertyMappingsImplementation.js';
import type { SetImplementationReference } from '../SetImplementationReference.js';
import type { RelationColumn } from '../../relation/RelationType.js';

export class RelationFunctionPropertyMapping
  extends PropertyMapping
  implements Hashable
{
  column: RelationColumn;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    source: SetImplementationReference,
    target: SetImplementationReference | undefined,
    column: RelationColumn,
  ) {
    super(owner, property, source, target);
    this.column = column;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_FUNCTION_PROPERTY_MAPPING,
      super.hashCode,
      this.column.name,
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_RelationFunctionPropertyMapping(this);
  }
}
