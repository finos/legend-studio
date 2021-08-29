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

import type { Hashable } from '@finos/legend-shared';
import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';

export class V1_MappingInclude implements Hashable {
  includedMapping?: string | undefined;
  // TODO: the below two are for backward compatability
  includedMappingName?: string | undefined;
  includedMappingPackage?: string | undefined;
  sourceDatabasePath?: string | undefined;
  targetDatabasePath?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_INCLUDE,
      this.includedMappingPath,
      this.sourceDatabasePath ?? '',
      this.targetDatabasePath ?? '',
    ]);
  }

  get includedMappingPath(): string {
    return this.includedMapping
      ? this.includedMapping
      : `${this.includedMappingPackage}::${this.includedMappingName}`;
  }
}
