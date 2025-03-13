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
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { Database } from './Database.js';
import type { Table } from './Table.js';
import type { View } from './View.js';
import type { TabularFunction } from './TabularFunction.js';
import type { StereotypeReference } from '../../../domain/StereotypeReference.js';
import type { TaggedValue } from '../../../domain/TaggedValue.js';

export class Schema implements Hashable {
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  readonly _OWNER: Database;

  name: string;
  tables: Table[] = [];
  views: View[] = [];
  tabularFunctions: TabularFunction[] = [];

  constructor(name: string, owner: Database) {
    this.name = name;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_SCHEMA,
      this.name,
      hashArray(this.tables),
      hashArray(this.views),
      hashArray(this.tabularFunctions),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }
}
