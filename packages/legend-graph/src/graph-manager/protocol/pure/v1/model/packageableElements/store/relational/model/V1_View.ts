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

import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';
import type { V1_RelationalOperationElement } from '../../../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement.js';
import type { V1_TablePtr } from '../../../../../model/packageableElements/store/relational/model/V1_TablePtr.js';
import type { V1_FilterMapping } from '../../../../../model/packageableElements/store/relational/mapping/V1_FilterMapping.js';
import type { V1_ColumnMapping } from '../../../../../model/packageableElements/store/relational/model/V1_ColumnMapping.js';
import type { V1_StereotypePtr } from '../../../domain/V1_StereotypePtr.js';
import type { V1_TaggedValue } from '../../../domain/V1_TaggedValue.js';

export class V1_View {
  name!: string;
  mainTable?: V1_TablePtr | undefined;
  distinct?: boolean | undefined;
  filter?: V1_FilterMapping | undefined;
  primaryKey: string[] = [];
  columnMappings: V1_ColumnMapping[] = [];
  groupBy: V1_RelationalOperationElement[] = [];
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATBASE_VIEW,
      this.name,
      Boolean(this.distinct).toString(),
      this.filter ?? '',
      hashArray(this.primaryKey),
      hashArray(this.columnMappings),
      hashArray(this.groupBy),
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
    ]);
  }
}
