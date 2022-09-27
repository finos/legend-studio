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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';
import { InstanceValue } from './InstanceValue.js';

export class AlloySerializationConfig implements Hashable {
  typeKeyName: string;
  includeType?: boolean | undefined;
  includeEnumType?: boolean | undefined;
  removePropertiesWithNullValues?: boolean | undefined;
  removePropertiesWithEmptySets?: boolean | undefined;
  fullyQualifiedTypePath?: boolean | undefined;
  includeObjectReference?: boolean | undefined;

  constructor(typeKeyName: string) {
    this.typeKeyName = typeKeyName;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ALLOY_SERIALIZATION_CONFIG_INSTANCE_VALUE,
      this.typeKeyName,
      this.includeType ?? '',
      this.includeEnumType ?? '',
      this.removePropertiesWithEmptySets ?? '',
      this.removePropertiesWithNullValues ?? '',
      this.fullyQualifiedTypePath ?? '',
      this.includeObjectReference ?? '',
    ]);
  }
}

export class AlloySerializationConfigInstanceValue
  extends InstanceValue
  implements Hashable
{
  override values: AlloySerializationConfig[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ALLOY_SERIALIZATION_CONFIG_INSTANCE_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(this.values),
    ]);
  }
}
