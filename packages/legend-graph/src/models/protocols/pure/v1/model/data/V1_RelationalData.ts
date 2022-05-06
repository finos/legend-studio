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
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import {
  V1_EmbeddedData,
  type V1_EmbeddedDataVisitor,
} from './V1_EmbeddedData';

export class V1_RelationalDataTableColumn implements Hashable {
  value!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATA_TABLE_COLUMN,
      this.value,
    ]);
  }
}

export class V1_RelationalDataTableRow implements Hashable {
  values!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATA_TABLE_ROW,
      this.values,
    ]);
  }
}

export class V1_RelationalDataTable implements Hashable {
  schemaName: string | undefined;
  tableName!: string;
  columns: V1_RelationalDataTableColumn[] = [];
  rows: V1_RelationalDataTableRow[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATA_TABLE,
      this.schemaName ?? '',
      this.tableName,
      hashArray(this.columns),
      hashArray(this.rows),
    ]);
  }
}

export class V1_RelationalData extends V1_EmbeddedData implements Hashable {
  tables: V1_RelationalDataTable[] = [];
  accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T {
    return visitor.visit_RelationalData(this);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATA_TABLE,
      hashArray(this.tables),
    ]);
  }
}
