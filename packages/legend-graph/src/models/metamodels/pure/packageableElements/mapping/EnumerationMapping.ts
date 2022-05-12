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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type {
  PackageableElementReference,
  OptionalPackageableElementReference,
} from '../PackageableElementReference';
import type { Mapping } from './Mapping';
import type { Enumeration } from '../domain/Enumeration';
import type { EnumValueMapping } from './EnumValueMapping';
import type { Type } from '../domain/Type';
import type { InferableMappingElementIdValue } from './InferableMappingElementId';

export class EnumerationMapping implements Hashable {
  readonly _PARENT: Mapping;

  enumeration: PackageableElementReference<Enumeration>;
  id: InferableMappingElementIdValue;
  sourceType: OptionalPackageableElementReference<Type>;
  enumValueMappings: EnumValueMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    enumeration: PackageableElementReference<Enumeration>,
    parent: Mapping,
    sourceType: OptionalPackageableElementReference<Type>,
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
      this.enumeration.hashValue,
      // If there are no enum value mapping, source type means nothing since it's not in the protocol anyway
      this.enumValueMappings.filter(
        // TODO: use `isStubbed_EnumValueMapping` when we refactor hashing
        (enumValueMapping) =>
          enumValueMapping.sourceValues.filter(isNonNullable).length,
      ).length
        ? this.sourceType.valueForSerialization ?? ''
        : '', // default source value when there is no element
      hashArray(
        this.enumValueMappings.filter(
          // TODO: use `isStubbed_EnumValueMapping` when we refactor hashing
          (enumValueMapping) =>
            enumValueMapping.sourceValues.filter(isNonNullable).length,
        ),
      ),
    ]);
  }
}
