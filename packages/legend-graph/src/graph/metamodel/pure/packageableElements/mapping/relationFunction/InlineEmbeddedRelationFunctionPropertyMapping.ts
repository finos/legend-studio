/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { hashArray, UnsupportedOperationError } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../Core_HashUtils.js';
import { EmbeddedRelationFunctionPropertyMapping } from './EmbeddedRelationFunctionPropertyMapping.js';
import type { InlineEmbeddedSetImplementation } from '../../mapping/EmbeddedSetImplementation.js';
import type {
  SetImplementation,
  SetImplementationVisitor,
} from '../../mapping/SetImplementation.js';
import type { PropertyMappingVisitor } from '../../mapping/PropertyMapping.js';

export class InlineEmbeddedRelationFunctionPropertyMapping
  extends EmbeddedRelationFunctionPropertyMapping
  implements InlineEmbeddedSetImplementation
{
  inlineSetImplementation!: SetImplementation;

  override accept_PropertyMappingVisitor<T>(
    visitor: PropertyMappingVisitor<T>,
  ): T {
    return visitor.visit_InlineEmbeddedRelationFunctionPropertyMapping(this);
  }

  override accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INLINE_EMBEDDED_RELATION_FUNCTION_PROPERTY_MAPPING,
      this.property.pointerHashCode,
      this.inlineSetImplementation.id.value,
    ]);
  }
}
