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

import { computed, observable, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray, guaranteeNonNullable } from '@finos/legend-shared';
import { NamedRelation } from './RelationalOperationElement';
import type { Schema } from './Schema';
import { Column } from './Column';
import type { Milestoning } from './milestoning/Milestoning';

export class Table extends NamedRelation implements Hashable {
  schema!: Schema;
  primaryKey: Column[] = [];
  milestoning: Milestoning[] = [];
  // // TODO
  // temporaryTable : Boolean[0..1];

  constructor(name: string, schema: Schema) {
    super(name);

    makeObservable(this, {
      primaryKey: observable,
      hashCode: computed,
    });

    this.schema = schema;
  }

  getColumn = (name: string): Column =>
    guaranteeNonNullable(
      this.columns.find(
        (column): column is Column =>
          column instanceof Column && column.name === name,
      ),
      `Can't find column '${name}' in table '${this.name}'`,
    );

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_SCHEMA_TABLE,
      this.name,
      hashArray(this.columns),
      hashArray(this.primaryKey.map((e) => e.name)),
      hashArray(this.milestoning),
    ]);
  }
}
