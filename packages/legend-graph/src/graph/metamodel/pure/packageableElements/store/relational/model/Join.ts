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
import { type Hashable, type Pair, hashArray } from '@finos/legend-shared';
import type { Operation, TableAlias } from './RelationalOperationElement.js';
import type { Database } from './Database.js';

export const SELF_JOIN_TABLE_NAME = '{target}';
export const SELF_JOIN_SCHEMA_NAME = 'default';
export const SELF_JOIN_ALIAS_PREFIX = 't_';

export class Join implements Hashable {
  owner!: Database;
  name: string;
  /**
   * Target is used to show the direction of the join. Since cross table join is symmetrical in nature,
   * the direction is not required at all, whereas for self-join, the direction really matters
   */
  target?: TableAlias | undefined;
  /**
   * This is an optimization for looking up tables/views involved in a join.
   * Normally, it has 2 pairs (A,B) and (B,A)
   */
  aliases: Pair<TableAlias, TableAlias>[] = [];
  operation: Operation;

  constructor(name: string, operation: Operation) {
    this.name = name;
    this.operation = operation;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_JOIN,
      this.name,
      this.operation,
    ]);
  }
}
