/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable, list, object } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { getNullableFirstElement } from 'Utilities/GeneralUtil';
import { EnumValueMapping, getEnumValueMappingSourceValueType } from 'V1/model/packageableElements/mapping/EnumValueMapping';

export class EnumerationMapping implements Hashable {
  @serializable id?: string;
  @serializable enumeration!: string;
  /**
   * NOTE: the order is important, during deserialization, we want sourceType to be already available
   * @deprecated since v1_11_0
   * This flag is convenient but after all it's not a good design for protocol because deserializer while processing the source value
   * might not have access to parent context to know the source type. As such, structured source value is preferred.
   */
  @serializable sourceType?: string;
  @serializable(list(object(EnumValueMapping))) enumValueMappings: EnumValueMapping[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENUMERATION_MAPPING,
      this.id ?? '',
      this.enumeration,
      // NOTE: older protocol formats have information about source type so we have to account for those,
      // otherwise, we don't need to account for the source type in hash computation
      // If there is no enum value mapping, ignore the source type since it's synthetic and used by the editor
      this.enumValueMappings.length ? getNullableFirstElement(Array.from((new Set(this.enumValueMappings.flatMap(evm => evm.sourceValues.map(getEnumValueMappingSourceValueType)))).values())) ?? '' : '', // source type
      hashArray(this.enumValueMappings)
    ]);
  }
}
