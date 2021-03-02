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

import { computed, observable, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';
import type { Relation } from './RelationalOperationElement';
import { RelationalOperationElement } from './RelationalOperationElement';
import type { DataType } from './RelationalDataType';

export class Column extends RelationalOperationElement implements Hashable {
  owner!: Relation;
  name!: string;
  type!: DataType;
  nullable?: boolean;

  constructor() {
    super();

    makeObservable(this, {
      name: observable,
      type: observable,
      nullable: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_TABLE_COLUMN,
      this.name,
      this.nullable?.toString() ?? '',
      this.type,
    ]);
  }
}
