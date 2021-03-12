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
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';

export class V1_Mapper implements Hashable {
  from!: string;
  to!: string;

  get hashCode(): string {
    return hashArray([this.from, this.to]);
  }
}

export class V1_SchemaNameMapper extends V1_Mapper {
  get hashCode(): string {
    return hashArray([super.hashCode, CORE_HASH_STRUCTURE.SCHEMA_MAPPER]);
  }
}

export class V1_TableNameMapper extends V1_Mapper {
  schema!: V1_SchemaNameMapper;

  get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.TABLE_MAPPER,
      this.schema,
    ]);
  }
}
