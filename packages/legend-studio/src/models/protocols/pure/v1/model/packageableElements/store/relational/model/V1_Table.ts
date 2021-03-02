/**
 * Copyright 2020 Goldman Sachs
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

import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';
import type { V1_Column } from './V1_Column';
import type { V1_Milestoning } from './milestoning/V1_Milestoning';

export class V1_Table implements Hashable {
  name!: string;
  columns: V1_Column[] = [];
  primaryKey: string[] = [];
  milestoning: V1_Milestoning[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_SCHEMA_TABLE,
      this.name,
      hashArray(this.columns),
      hashArray(this.primaryKey),
      hashArray(this.milestoning),
    ]);
  }
}
