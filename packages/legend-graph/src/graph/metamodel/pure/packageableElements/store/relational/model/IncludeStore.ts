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

import { hashArray, type Hashable } from '@finos/legend-shared';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';
import type { IngestDefinition } from '../../../ingest/IngestDefinition.js';
import type { DataProduct } from '../../../../dataProduct/DataProduct.js';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { INTERNAL__LakehouseGeneratedDatabase } from './Database.js';

export class IncludeStore implements Hashable {
  packageableElementPointer: PackageableElementReference<
    IngestDefinition | DataProduct
  >;
  storeType: string;
  generatedDatabase!: INTERNAL__LakehouseGeneratedDatabase;

  constructor(
    packageableElementPointer: PackageableElementReference<
      IngestDefinition | DataProduct
    >,
    storeType: string,
  ) {
    this.packageableElementPointer = packageableElementPointer;
    this.storeType = storeType;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_INCLUDE_STORE,
      this.packageableElementPointer.value.path,
      this.storeType,
    ]);
  }
}
