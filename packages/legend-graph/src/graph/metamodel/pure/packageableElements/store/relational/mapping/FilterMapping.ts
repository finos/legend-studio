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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { Database } from '../model/Database.js';
import {
  extractLine,
  type JoinTreeNode,
} from '../model/RelationalOperationElement.js';
import type { FilterReference } from '../model/FilterReference.js';

export class FilterMapping implements Hashable {
  // setMappingOwner?: RelationalInstanceSetImplementation | undefined;
  joinTreeNode?: JoinTreeNode | undefined;
  database: Database;
  filterName: string;
  filter: FilterReference;

  constructor(db: Database, filterName: string, filter: FilterReference) {
    this.database = db;
    this.filterName = filterName;
    this.filter = filter;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FILTER_MAPPING,
      this.filter.ownerReference.valueForSerialization ?? '',
      this.filter.value.name,
      hashArray(this.joinTreeNode ? extractLine(this.joinTreeNode) : []),
    ]);
  }
}
