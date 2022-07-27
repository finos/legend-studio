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
  type Hashable,
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { EmbeddedRelationalInstanceSetImplementation } from './EmbeddedRelationalInstanceSetImplementation.js';
import type { OtherwiseEmebddedSetImplementation } from '../../../mapping/EmbeddedSetImplementation.js';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation.js';
import type {
  PropertyMapping,
  PropertyMappingVisitor,
} from '../../../mapping/PropertyMapping.js';

export class OtherwiseEmbeddedRelationalInstanceSetImplementation
  extends EmbeddedRelationalInstanceSetImplementation
  implements OtherwiseEmebddedSetImplementation, Hashable
{
  otherwisePropertyMapping!: PropertyMapping;

  override accept_PropertyMappingVisitor<T>(
    visitor: PropertyMappingVisitor<T>,
  ): T {
    return visitor.visit_OtherwiseEmbeddedRelationalPropertyMapping(this);
  }

  override accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OTHERWISE_EMBEDDED_REALTIONAL_PROPERTY_MAPPING,
      super.hashCode,
      this.otherwisePropertyMapping,
    ]);
  }
}
