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
import type { Hashable } from '@finos/legend-studio-shared';
import { hashArray, guaranteeNonNullable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { ColumnMapping } from '../../../../../model/packageableElements/store/relational/model/ColumnMapping';
import type { Schema } from './Schema';
import { Column } from './Column';
import type { RelationalMappingSpecification } from './RelationalOperationElement';
import { NamedRelation } from './RelationalOperationElement';
import type { GroupByMapping } from '../../../../../model/packageableElements/store/relational/mapping/GroupByMapping';
import type { FilterMapping } from '../../../../../model/packageableElements/store/relational/mapping/FilterMapping';

export class View
  extends NamedRelation
  implements RelationalMappingSpecification, Hashable
{
  schema!: Schema;
  primaryKey: Column[] = [];
  columnMappings: ColumnMapping[] = [];
  filter?: FilterMapping;
  distinct?: boolean;
  groupBy?: GroupByMapping;

  constructor(name: string, schema: Schema) {
    super(name);

    makeObservable(this, {
      primaryKey: observable,
      columnMappings: observable,
      filter: observable,
      distinct: observable,
      groupBy: observable,
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

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATBASE_VIEW,
      this.name,
      Boolean(this.distinct).toString(),
      this.filter ?? '',
      hashArray(this.primaryKey.map((p) => p.name)),
      hashArray(this.columnMappings),
      hashArray(this.groupBy?.columns ?? []),
    ]);
  }
}
