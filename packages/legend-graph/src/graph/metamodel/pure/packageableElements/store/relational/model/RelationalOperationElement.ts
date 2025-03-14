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
import {
  hashArray,
  UnsupportedOperationError,
  type Hashable,
} from '@finos/legend-shared';
import type { GroupByMapping } from '../mapping/GroupByMapping.js';
import type { FilterMapping } from '../mapping/FilterMapping.js';
import type { JoinReference } from './JoinReference.js';
import type { TableReference } from './TableReference.js';
import type { ViewReference } from './ViewReference.js';
import type { ColumnReference } from './ColumnReference.js';
import type { Database } from './Database.js';
import { SELF_JOIN_TABLE_NAME } from './Join.js';

import type { StereotypeReference } from '../../../domain/StereotypeReference.js';
import type { TaggedValue } from '../../../domain/TaggedValue.js';

export abstract class RelationalOperationElement {
  abstract get hashCode(): string;
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
}

export abstract class Relation extends RelationalOperationElement {
  columns: RelationalOperationElement[] = [];

  get hashCode(): string {
    throw new UnsupportedOperationError();
  }
}

export abstract class NamedRelation extends Relation {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

abstract class Function extends RelationalOperationElement {}

export abstract class Operation extends Function {}

export class DynaFunction extends Operation {
  name: string;
  parameters: RelationalOperationElement[] = [];

  constructor(name: string) {
    super();
    this.name = name;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_DYNA_FUNC,
      this.name,
      hashArray(this.parameters),
    ]);
  }
}

export interface RelationalMappingSpecification {
  filter?: FilterMapping | undefined;
  distinct?: boolean | undefined;
  groupBy?: GroupByMapping | undefined;
  mainTableAlias?: TableAlias | undefined;
}

export enum JoinType {
  INNER = 'INNER',
  LEFT_OUTER = 'LEFT_OUTER',
  RIGHT_OUTER = 'RIGHT_OUTER',
  // NOTE: this is not technically part of the join type enumeration
  // but Engine expose it as an alias for which can be resolved into either outer join types
  // for simplicity sake
  OUTER = 'OUTER',
}

// TODO: create RelationalTreeNode like in PURE?
export class JoinTreeNode {
  /**
   * This field is required in PURE
   *
   * @discrepancy model
   */
  alias?: TableAlias | undefined;
  children: JoinTreeNode[] = [];
  join: JoinReference;
  /**
   * For convenience, we use a Typescript enum instead of the native
   * Pure enumeration meta::relational::metamodel::join::JoinType
   *
   * @discrepancy model
   */
  joinType?: JoinType | undefined;

  constructor(join: JoinReference, joinType?: JoinType, alias?: TableAlias) {
    this.alias = alias;
    this.joinType = joinType;
    this.join = join;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE_JOIN,
      this.join.ownerReference.valueForSerialization ?? '',
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
    joinTreeNode.children.length
      ? extractLine(joinTreeNode.children[0] as JoinTreeNode)
      : [],
  );

export class RelationalOperationElementWithJoin extends RelationalOperationElement {
  relationalOperationElement?: RelationalOperationElement | undefined;
  joinTreeNode?: JoinTreeNode | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_ELEMENTS_WITH_JOINS,
      hashArray(this.joinTreeNode ? extractLine(this.joinTreeNode) : []),
      this.relationalOperationElement ?? '',
    ]);
  }
}

export class TableAlias extends RelationalOperationElement implements Hashable {
  // setMappingOwner?: PropertyMappingsImplementation | undefined;
  relation!: TableReference | ViewReference;
  name!: string;
  database?: Database | undefined;
  isSelfJoinTarget = false;

  get hashCode(): string {
    throw new UnsupportedOperationError();
  }
}

export class TableAliasColumn extends RelationalOperationElement {
  // setMappingOwner?: PropertyMappingsImplementation | undefined;
  alias!: TableAlias;
  column!: ColumnReference;
  columnName?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_ALIAS_COLUMN,
      this.alias.isSelfJoinTarget
        ? this.alias.relation.selfJoinPointerHashCode
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

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_LITERAL_LIST,
      hashArray(this.values),
    ]);
  }
}
