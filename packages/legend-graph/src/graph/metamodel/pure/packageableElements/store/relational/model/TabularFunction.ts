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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { NamedRelation } from './RelationalOperationElement.js';
import type { Schema } from './Schema.js';

export class TabularFunction extends NamedRelation implements Hashable {
  schema!: Schema;

  constructor(name: string, schema: Schema) {
    super(name);
    this.schema = schema;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_SCHEMA_TABULARFUNCTION,
      this.name,
      hashArray(this.columns),
    ]);
  }
}
