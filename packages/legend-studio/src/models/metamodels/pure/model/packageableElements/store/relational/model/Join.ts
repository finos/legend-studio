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

import { computed, observable, makeObservable } from 'mobx';
import type { Hashable, Pair } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';
import type {
  Operation,
  TableAlias,
} from '../../../../../model/packageableElements/store/relational/model/RelationalOperationElement';
import type { Database } from '../../../../../model/packageableElements/store/relational/model/Database';

export const SELF_JOIN_TABLE_NAME = '{target}';
export const SELF_JOIN_SCHEMA_NAME = 'default';
export const SELF_JOIN_ALIAS_PREFIX = 't_';

export class Join implements Hashable {
  owner!: Database;
  name: string;
  target?: TableAlias;
  aliases: Pair<TableAlias, TableAlias>[] = [];
  operation: Operation;

  constructor(name: string, operation: Operation) {
    makeObservable(this, {
      name: observable,
      target: observable,
      aliases: observable,
      operation: observable,
      hashCode: computed,
    });

    this.name = name;
    this.operation = operation;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_JOIN,
      this.name,
      this.target?.name ?? '',
      this.operation,
    ]);
  }
}
