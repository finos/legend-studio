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

import { observable, computed, makeObservable } from 'mobx';
import {
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import type { GroupByMapping } from '../../../../../model/packageableElements/store/relational/mapping/GroupByMapping';
import type { FilterMapping } from '../../../../../model/packageableElements/store/relational/mapping/FilterMapping';
import type { JoinReference } from '../../../../../model/packageableElements/store/relational/model/JoinReference';
import { TableReference } from '../../../../../model/packageableElements/store/relational/model/TableReference';
import type { ViewReference } from '../../../../../model/packageableElements/store/relational/model/ViewReference';
import type { ColumnReference } from '../../../../../model/packageableElements/store/relational/model/ColumnReference';
import type { Database } from './Database';
import { SELF_JOIN_TABLE_NAME } from './Join';

export abstract class RelationalOperationElement {
  private readonly _$nominalTypeBrand!: 'RelationalOperationElement';

  abstract get hashCode(): string;
}

export class Relation extends RelationalOperationElement {
  columns: RelationalOperationElement[] = [];

  constructor() {
    super();

    makeObservable(this, {
      columns: observable,
    });
  }

  get hashCode(): string {
    throw new UnsupportedOperationError();
  }
}

export class NamedRelation extends Relation {
  name: string;

  constructor(name: string) {
    super();

    makeObservable(this, {
      name: observable,
    });

    this.name = name;
  }
}

export class Function extends RelationalOperationElement {
  constructor() {
    super();

    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_FUNCTION]);
  }
}

export class Operation extends Function {}

export class DynaFunction extends Operation {
  name: string;
  parameters: RelationalOperationElement[] = [];

  constructor(name: string) {
    super();

    makeObservable(this, {
      name: observable,
      parameters: observable,
    });

    this.name = name;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_DYNA_FUNC,
      this.name,
      hashArray(this.parameters),
    ]);
  }
}

export interface RelationalMappingSpecification {
  filter?: FilterMapping;
  distinct?: boolean;
  groupBy?: GroupByMapping;
  mainTableAlias?: TableAlias;
}

export enum JoinType {
  INNER = 'INNER',
  LEFT_OUTER = 'LEFT_OUTER',
  RIGHT_OUTER = 'RIGHT_OUTER',
}

export const getJoinType = (type: string): JoinType => {
  switch (type) {
    case JoinType.INNER:
      return JoinType.INNER;
    case JoinType.LEFT_OUTER:
      return JoinType.LEFT_OUTER;
    case JoinType.RIGHT_OUTER:
      return JoinType.RIGHT_OUTER;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported join type '${type}'`,
      );
  }
};

// TODO: create RelationalTreeNode like in PURE?
export class JoinTreeNode {
  // FIXME: required in PURE
  alias?: TableAlias;
  children: JoinTreeNode[] = [];
  join: JoinReference;
  joinType?: JoinType;

  constructor(join: JoinReference, joinType?: JoinType, alias?: TableAlias) {
    makeObservable(this, {
      alias: observable,
      children: observable,
      joinType: observable,
      hashCode: computed,
    });

    this.alias = alias;
    this.joinType = joinType;
    this.join = join;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_JOIN,
      this.join.ownerReference.valueForSerialization,
      this.join.value.name,
      this.joinType ?? '',
    ]);
  }
}

/**
 * We could potentially include logic to throw error if tree structure is detected
 */
export const extractLine = (joinTreeNode: JoinTreeNode): JoinTreeNode[] =>
  [joinTreeNode].concat(
    joinTreeNode.children.length ? extractLine(joinTreeNode.children[0]) : [],
  );

export class RelationalOperationElementWithJoin extends RelationalOperationElement {
  relationalOperationElement?: RelationalOperationElement;
  joinTreeNode?: JoinTreeNode;

  constructor() {
    super();

    makeObservable(this, {
      relationalOperationElement: observable,
      joinTreeNode: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_ELEMENTS_WITH_JOINS,
      hashArray(this.joinTreeNode ? extractLine(this.joinTreeNode) : []),
      this.relationalOperationElement ?? '',
    ]);
  }
}

export class TableAlias extends RelationalOperationElement implements Hashable {
  // setMappingOwner?: PropertyMappingsImplementation;
  relation!: TableReference | ViewReference;
  name!: string;
  database?: Database;
  isSelfJoinTarget = false;

  constructor() {
    super();

    makeObservable(this, {
      relation: observable,
      name: observable,
      database: observable,
      isSelfJoinTarget: observable,
    });
  }

  get hashCode(): string {
    throw new UnsupportedOperationError();
  }
}

export class TableAliasColumn extends RelationalOperationElement {
  // setMappingOwner?: PropertyMappingsImplementation;
  alias!: TableAlias;
  column!: ColumnReference;
  columnName?: string;

  constructor() {
    super();

    makeObservable(this, {
      alias: observable,
      column: observable,
      columnName: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_ALIAS_COLUMN,
      this.alias.isSelfJoinTarget &&
      this.alias.relation instanceof TableReference
        ? this.alias.relation.selJoinPointerHashCode
        : this.alias.relation.pointerHashCode,
      this.alias.isSelfJoinTarget ? SELF_JOIN_TABLE_NAME : this.alias.name,
      this.column.value.name,
    ]);
  }
}

export class Literal extends RelationalOperationElement {
  value: string | number | RelationalOperationElement;

  constructor(value: string | number | RelationalOperationElement) {
    super();

    makeObservable(this, {
      value: observable,
      hashCode: computed,
    });

    this.value = value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_LITERAL,
      typeof this.value === 'number' ? this.value.toString() : this.value,
    ]);
  }
}

export class LiteralList extends RelationalOperationElement {
  values: Literal[] = [];

  constructor() {
    super();

    makeObservable(this, {
      values: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_LITERAL_LIST,
      hashArray(this.values),
    ]);
  }
}
