/**
 * Copyright Goldman Sachs
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
import type { V1_Table } from './V1_Table';
import type { V1_View } from './V1_View';

export class V1_Schema implements Hashable {
  name!: string;
  tables: V1_Table[] = [];
  views: V1_View[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_SCHEMA,
      this.name,
      hashArray(this.tables),
      hashArray(this.views),
    ]);
  }
}
