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

import { hashArray } from '@finos/legend-shared';
import {
  type Mapping,
  MappingInclude,
  type PackageableElementReference,
} from '@finos/legend-graph';
import type { DataSpace } from '../dataSpace/DSL_DataSpace_DataSpace.js';
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../DSL_DataSpace_HashUtils.js';

export class MappingIncludeDataSpace extends MappingInclude {
  includedDataSpace: PackageableElementReference<DataSpace>;

  constructor(
    _OWNER: Mapping,
    included: PackageableElementReference<Mapping>,
    includedDataSpace: PackageableElementReference<DataSpace>,
  ) {
    super(_OWNER, included);
    this.includedDataSpace = includedDataSpace;
  }

  override get hashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.MAPPING_INCLUDE_DATASPACE,
      this.includedDataSpace.valueForSerialization ?? '',
    ]);
  }
}
