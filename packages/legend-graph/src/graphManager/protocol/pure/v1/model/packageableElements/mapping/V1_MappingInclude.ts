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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { ELEMENT_PATH_DELIMITER } from '../../../../../../../graph/MetaModelConst.js';

export class V1_MappingInclude implements Hashable {
  includedMapping?: string | undefined;
  sourceDatabasePath?: string | undefined;
  targetDatabasePath?: string | undefined;
  /**
   * The below 2 fields are kept for backward compatibility
   * @backwardCompatibility
   */
  includedMappingName?: string | undefined;
  includedMappingPackage?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_INCLUDE,
      this.includedMapping
        ? this.includedMapping
        : `${this.includedMappingPackage}${ELEMENT_PATH_DELIMITER}${this.includedMappingName}`,
      this.sourceDatabasePath ?? '',
      this.targetDatabasePath ?? '',
    ]);
  }
}
