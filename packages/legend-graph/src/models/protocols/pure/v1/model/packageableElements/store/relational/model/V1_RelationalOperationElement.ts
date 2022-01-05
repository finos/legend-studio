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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../MetaModelConst';
import type { V1_JoinPointer } from './V1_JoinPointer';
import type { V1_TablePtr } from './V1_TablePtr';

export abstract class V1_RelationalOperationElement implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_RelationalOperationElement';

  abstract get hashCode(): string;
}

export class V1_DynaFunc
  extends V1_RelationalOperationElement
  implements Hashable
{
  funcName!: string;
  parameters: V1_RelationalOperationElement[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_DYNA_FUNC,
      this.funcName,
      hashArray(this.parameters),
    ]);
  }
}

export class V1_ElementWithJoins
  extends V1_RelationalOperationElement
  implements Hashable
{
  joins: V1_JoinPointer[] = [];
  relationalElement?: V1_RelationalOperationElement | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_ELEMENTS_WITH_JOINS,
      hashArray(this.joins),
      this.relationalElement ?? '',
    ]);
  }
}

export class V1_TableAliasColumn
  extends V1_RelationalOperationElement
  implements Hashable
{
  table!: V1_TablePtr;
  tableAlias!: string;
  column!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_ALIAS_COLUMN,
      this.table,
      this.tableAlias,
      this.column,
    ]);
  }
}

export class V1_Literal
  extends V1_RelationalOperationElement
  implements Hashable
{
  value!: string | number | V1_RelationalOperationElement;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_LITERAL,
      typeof this.value === 'number' ? this.value.toString() : this.value,
    ]);
  }
}

export class V1_LiteralList
  extends V1_RelationalOperationElement
  implements Hashable
{
  values: V1_Literal[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_LITERAL_LIST,
      hashArray(this.values),
    ]);
  }
}
