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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import {
  type V1_EnumValueMapping,
  V1_getEnumValueMappingSourceValueType,
} from '../../../model/packageableElements/mapping/V1_EnumValueMapping.js';
import type { V1_PackageableElementPointer } from '../V1_PackageableElement.js';

export class V1_EnumerationMapping implements Hashable {
  id?: string | undefined;
  enumeration!: V1_PackageableElementPointer;
  /**
   * NOTE: the order is important, during deserialization, we want sourceType to be already available
   * @deprecated since v1_11_0
   * This flag is convenient but after all it's not a good design for protocol because deserializer while processing the source value
   * might not have access to parent context to know the source type. As such, structured source value is preferred.
   */
  sourceType?: string | undefined;
  enumValueMappings: V1_EnumValueMapping[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUMERATION_MAPPING,
      this.id ?? '',
      this.enumeration.path,
      // NOTE: older protocol formats have information about source type so we have to account for those,
      // otherwise, we don't need to account for the source type in hash computation
      // If there is no enum value mapping, ignore the source type since it's synthetic and used by the editor
      this.enumValueMappings.length
        ? (Array.from(
            new Set(
              this.enumValueMappings.flatMap((evm) =>
                evm.sourceValues.map(V1_getEnumValueMappingSourceValueType),
              ),
            ).values(),
          )[0] ?? '')
        : '', // source type
      hashArray(this.enumValueMappings),
    ]);
  }
}
