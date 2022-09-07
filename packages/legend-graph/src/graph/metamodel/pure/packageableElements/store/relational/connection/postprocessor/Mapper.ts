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

import { CORE_HASH_STRUCTURE } from '../../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray, uuid } from '@finos/legend-shared';

export class PostProcessorParameter {}

export abstract class Mapper
  extends PostProcessorParameter
  implements Hashable
{
  readonly _UUID = uuid();

  from: string;
  to: string;

  constructor(from: string, to: string) {
    super();
    this.from = from;
    this.to = to;
  }

  get hashCode(): string {
    return hashArray([this.from, this.to]);
  }
}

export class SchemaNameMapper extends Mapper {
  override get hashCode(): string {
    return hashArray([super.hashCode, CORE_HASH_STRUCTURE.SCHEMA_MAPPER]);
  }
}

export class TableNameMapper extends Mapper {
  schema: SchemaNameMapper;
  constructor(from: string, to: string, schema: SchemaNameMapper) {
    super(from, to);
    this.schema = schema;
  }

  override get hashCode(): string {
    return hashArray([
      super.hashCode,
      CORE_HASH_STRUCTURE.TABLE_MAPPER,
      this.schema,
    ]);
  }
}
