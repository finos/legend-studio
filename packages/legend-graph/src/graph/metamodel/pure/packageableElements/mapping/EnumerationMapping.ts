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

import { hashArray, isNonNullable, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { Mapping } from './Mapping.js';
import type { Enumeration } from '../domain/Enumeration.js';
import type { EnumValueMapping } from './EnumValueMapping.js';
import type { Type } from '../domain/Type.js';
import type { InferableMappingElementIdValue } from './InferableMappingElementId.js';

export class EnumerationMapping implements Hashable {
  readonly _PARENT: Mapping;

  enumeration: PackageableElementReference<Enumeration>;
  id: InferableMappingElementIdValue;
  sourceType?: PackageableElementReference<Type> | undefined;
  enumValueMappings: EnumValueMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    enumeration: PackageableElementReference<Enumeration>,
    parent: Mapping,
    sourceType: PackageableElementReference<Type> | undefined,
  ) {
    this.id = id;
    this.enumeration = enumeration;
    this._PARENT = parent;
    this.sourceType = sourceType;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUMERATION_MAPPING,
      this.id.valueForSerialization ?? '',
      this.enumeration.valueForSerialization ?? '',
      // If there are no enum value mapping, source type means nothing since it's not in the protocol anyway
      this.enumValueMappings.filter(
        // TODO: use `isStubbed_EnumValueMapping` when we refactor hashing
        (enumValueMapping) =>
          enumValueMapping.sourceValues.filter((sourceValue) =>
            isNonNullable(sourceValue.value),
          ).length,
      ).length
        ? (this.sourceType?.valueForSerialization ?? '')
        : '', // default source value when there is no element
      hashArray(
        this.enumValueMappings.filter(
          // TODO: use `isStubbed_EnumValueMapping` when we refactor hashing
          (enumValueMapping) =>
            enumValueMapping.sourceValues.filter((sourceValue) =>
              isNonNullable(sourceValue.value),
            ).length,
        ),
      ),
    ]);
  }
}
