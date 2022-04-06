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

import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { Operation } from './RelationalOperationElement';
import type { Database } from './Database';

export class Filter implements Hashable {
  owner!: Database;
  name: string;
  operation: Operation;

  constructor(name: string, operation: Operation) {
    this.name = name;
    this.operation = operation;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_FILTER,
      this.name,
      this.operation,
    ]);
  }
}
