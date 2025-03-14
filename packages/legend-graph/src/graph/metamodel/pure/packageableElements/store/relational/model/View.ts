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
import type { ColumnMapping } from './ColumnMapping.js';
import type { Schema } from './Schema.js';
import type { Column } from './Column.js';
import {
  type RelationalMappingSpecification,
  NamedRelation,
} from './RelationalOperationElement.js';
import type { GroupByMapping } from '../mapping/GroupByMapping.js';
import type { FilterMapping } from '../mapping/FilterMapping.js';

export class View
  extends NamedRelation
  implements RelationalMappingSpecification, Hashable
{
  schema!: Schema;
  primaryKey: Column[] = [];
  columnMappings: ColumnMapping[] = [];
  filter?: FilterMapping | undefined;
  distinct?: boolean | undefined;
  groupBy?: GroupByMapping | undefined;

  constructor(name: string, schema: Schema) {
    super(name);
    this.schema = schema;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATBASE_VIEW,
      this.name,
      Boolean(this.distinct).toString(),
      this.filter ?? '',
      hashArray(this.primaryKey.map((p) => p.name)),
      hashArray(this.columnMappings),
      hashArray(this.groupBy?.columns ?? []),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }
}
