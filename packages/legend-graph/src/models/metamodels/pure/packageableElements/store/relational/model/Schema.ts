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

import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import {
  type Hashable,
  hashArray,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { Database } from './Database';
import type { Table } from './Table';
import type { View } from './View';
import type { Relation } from './RelationalOperationElement';

export class Schema implements Hashable {
  owner: Database;
  name: string;
  tables: Table[] = [];
  views: View[] = [];

  constructor(name: string, owner: Database) {
    this.name = name;
    this.owner = owner;
  }

  getTable = (name: string): Table =>
    guaranteeNonNullable(
      this.tables.find((table) => table.name === name),
      `Can't find table '${name}' in schema '${this.name}' of database '${this.owner.path}'`,
    );
  getView = (name: string): View =>
    guaranteeNonNullable(
      this.views.find((view) => view.name === name),
      `Can't find view '${name}' in schema '${this.name}' of database '${this.owner.path}'`,
    );
  getRelation = (name: string): Relation => {
    const relations: (Table | View)[] = this.tables;
    return guaranteeNonNullable(
      relations.concat(this.views).find((relation) => relation.name === name),
      `Can't find relation '${name}' in schema '${this.name}' of database '${this.owner.path}'`,
    );
  };

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_SCHEMA,
      this.name,
      hashArray(this.tables),
      hashArray(this.views),
    ]);
  }
}
