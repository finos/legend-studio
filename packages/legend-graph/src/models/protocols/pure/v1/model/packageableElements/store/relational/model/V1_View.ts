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

import { CORE_HASH_STRUCTURE } from '../../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-shared';
import type { V1_RelationalOperationElement } from '../../../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import type { V1_TablePtr } from '../../../../../model/packageableElements/store/relational/model/V1_TablePtr';
import type { V1_FilterMapping } from '../../../../../model/packageableElements/store/relational/mapping/V1_FilterMapping';
import type { V1_ColumnMapping } from '../../../../../model/packageableElements/store/relational/model/V1_ColumnMapping';

export class V1_View {
  name!: string;
  mainTable?: V1_TablePtr;
  distinct?: boolean;
  filter?: V1_FilterMapping;
  primaryKey: string[] = [];
  columnMappings: V1_ColumnMapping[] = [];
  groupBy: V1_RelationalOperationElement[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATBASE_VIEW,
      this.name,
      Boolean(this.distinct).toString(),
      this.filter ?? '',
      hashArray(this.primaryKey),
      hashArray(this.columnMappings),
      hashArray(this.groupBy),
    ]);
  }
}
