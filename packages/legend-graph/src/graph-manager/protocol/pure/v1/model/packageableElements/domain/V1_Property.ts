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
import type { V1_Multiplicity } from './V1_Multiplicity.js';
import type { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue.js';
import type { V1_DefaultValue } from './V1_DefaultValue.js';
import type { V1_GenericType } from '../type/V1_GenericType.js';
import { V1_PackageableType } from '../type/V1_PackageableType.js';

export class V1_Property implements Hashable {
  name!: string;
  genericType!: V1_GenericType;
  multiplicity!: V1_Multiplicity;
  aggregation?: string | undefined;
  defaultValue: V1_DefaultValue | undefined;
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROPERTY,
      this.name,
      this.multiplicity,
      this.genericType.rawType instanceof V1_PackageableType
        ? this.genericType.rawType.fullPath
        : '',
      this.aggregation ?? '',
      this.defaultValue ?? '',
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
    ]);
  }
}
