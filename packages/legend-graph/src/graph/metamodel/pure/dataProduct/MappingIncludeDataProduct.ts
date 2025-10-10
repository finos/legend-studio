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

import { hashArray } from '@finos/legend-shared';
import { type Mapping } from '../packageableElements/mapping/Mapping.js';
import { MappingInclude } from '../packageableElements/mapping/MappingInclude.js';
import { type PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import type { DataProduct } from './DataProduct.js';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';

export class MappingIncludeDataProduct extends MappingInclude {
  includedDataProduct: PackageableElementReference<DataProduct>;

  constructor(
    _OWNER: Mapping,
    included: PackageableElementReference<Mapping>,
    includedDataProduct: PackageableElementReference<DataProduct>,
  ) {
    super(_OWNER, included);
    this.includedDataProduct = includedDataProduct;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_INCLUDE_DATAPRODUCT,
      this.includedDataProduct.valueForSerialization ?? '',
    ]);
  }
}
