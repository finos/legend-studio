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
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../../../mapping/PropertyMapping.js';
import type { RawRelationalOperationElement } from '../model/RawRelationalOperationElement.js';
import type { BindingTransformer } from '../../../externalFormat/store/DSL_ExternalFormat_BindingTransformer.js';
import type { EnumerationMappingReference } from '../../../mapping/EnumerationMappingReference.js';

export class RelationalPropertyMapping
  extends PropertyMapping
  implements Hashable
{
  transformer?: EnumerationMappingReference | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  relationalOperation!: RawRelationalOperationElement;
  bindingTransformer?: BindingTransformer | undefined;

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_RelationalPropertyMapping(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REALTIONAL_PROPERTY_MAPPING,
      super.hashCode,
      this.transformer?.valueForSerialization ?? '',
      this.bindingTransformer ?? '',
      hashObjectWithoutSourceInformation(this.relationalOperation),
    ]);
  }
}
