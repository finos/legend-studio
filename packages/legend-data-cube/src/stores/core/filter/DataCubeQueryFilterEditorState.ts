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
import {
  deepClone,
  deleteEntry,
  IllegalStateError,
  uuid,
} from '@finos/legend-shared';
import { makeObservable, observable, action, isObservable } from 'mobx';
import {
  type DataCubeOperationValue,
  DataCubeQueryFilterGroupOperator,
} from '../DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshotFilter,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import type { DataCubeQueryFilterOperation } from './DataCubeQueryFilterOperation.js';

export abstract class DataCubeFilterEditorTreeNode {
  uuid = uuid();
  parent: DataCubeFilterEditorConditionGroupTreeNode | undefined;
  not = false;

  constructor(
    parent: DataCubeFilterEditorConditionGroupTreeNode | undefined,
    not: boolean | undefined,
  ) {
    makeObservable(this, {
      parent: observable,
      setParent: action,

      not: observable,
      setNot: action,
    });

    this.parent = parent;
    this.not = Boolean(not);
  }

  setNot(not: boolean) {
    this.not = not;
  }

  setParent(parent: DataCubeFilterEditorConditionGroupTreeNode | undefined) {
    this.parent = parent;
  }
}

export class DataCubeFilterEditorConditionTreeNode extends DataCubeFilterEditorTreeNode {
  column: DataCubeColumn;
  operation: DataCubeQueryFilterOperation;
  value: DataCubeOperationValue | undefined;

  constructor(
    parent: DataCubeFilterEditorConditionGroupTreeNode | undefined,
    column: DataCubeColumn,
    operation: DataCubeQueryFilterOperation,
    value: DataCubeOperationValue | undefined,
    not: boolean | undefined,
  ) {
    super(parent, not);

    makeObservable(this, {
      column: observable,
      setColumn: action,

      operation: observable,
      setOperation: action,

      value: observable.ref,
      setValue: action,
      updateValue: action,
    });

    this.column = column;
    this.operation = operation;
    this.setValue(value);
  }

  setColumn(col: DataCubeColumn) {
    this.column = col;
  }

  setOperation(operation: DataCubeQueryFilterOperation) {
    this.operation = operation;
  }

  setValue(value: DataCubeOperationValue | undefined) {
    this.value = value
      ? isObservable(value)
        ? value
        : makeObservable(value, { value: observable })
      : undefined;
  }

  updateValue(value: unknown) {
    if (this.value) {
      this.value.value = value;
    }
  }
}

export class DataCubeFilterEditorConditionGroupTreeNode extends DataCubeFilterEditorTreeNode {
  children: DataCubeFilterEditorTreeNode[] = [];
  operation = DataCubeQueryFilterGroupOperator.AND;

  constructor(
    parent: DataCubeFilterEditorConditionGroupTreeNode | undefined,
    operation: DataCubeQueryFilterGroupOperator,
    not: boolean | undefined,
  ) {
    super(parent, not);

    makeObservable(this, {
      children: observable,
      removeChild: action,
      addChild: action,

      operation: observable,
      setOperation: action,
    });

    this.operation = operation;
  }

  setOperation(operation: DataCubeQueryFilterGroupOperator) {
    this.operation = operation;
  }

  removeChild(node: DataCubeFilterEditorTreeNode): void {
    const found = deleteEntry(this.children, node);
    if (found) {
      node.setParent(undefined);
    }
  }

  addChild(node: DataCubeFilterEditorTreeNode, idx?: number | undefined): void {
    if (!this.children.includes(node)) {
      if (idx !== undefined) {
        idx = Math.max(0, Math.min(idx, this.children.length));
        this.children.splice(idx, 0, node);
      } else {
        this.children.push(node);
      }
      node.setParent(this);
    }
  }
}

export function buildFilterQuerySnapshot(
  node: DataCubeFilterEditorConditionGroupTreeNode,
): DataCubeQuerySnapshotFilter {
  return {
    groupOperator: node.operation,
    not: node.not,
    conditions: node.children.map((childNode) => {
      if (childNode instanceof DataCubeFilterEditorConditionTreeNode) {
        return {
          name: childNode.column.name,
          type: childNode.column.type,
          operator: childNode.operation.operator,
          value: deepClone(childNode.value),
          not: childNode.not,
        } satisfies DataCubeQuerySnapshotFilterCondition;
      } else if (
        childNode instanceof DataCubeFilterEditorConditionGroupTreeNode
      ) {
        return buildFilterQuerySnapshot(childNode);
      }
      throw new IllegalStateError('Unknown filter node');
    }),
  };
}

export function buildFilterEditorTree(
  _node: DataCubeQuerySnapshotFilter,
  parent: DataCubeFilterEditorConditionGroupTreeNode | undefined,
  nodes: Map<string, DataCubeFilterEditorTreeNode>,
  operationGetter: (operation: string) => DataCubeQueryFilterOperation,
): DataCubeFilterEditorConditionGroupTreeNode {
  const node = new DataCubeFilterEditorConditionGroupTreeNode(
    parent,
    _node.groupOperator === DataCubeQueryFilterGroupOperator.AND
      ? DataCubeQueryFilterGroupOperator.AND
      : DataCubeQueryFilterGroupOperator.OR,
    _node.not,
  );
  _node.conditions.forEach((_childNode) => {
    let childNode: DataCubeFilterEditorTreeNode;
    if ('groupOperator' in _childNode) {
      childNode = buildFilterEditorTree(
        _childNode,
        node,
        nodes,
        operationGetter,
      );
    } else {
      childNode = new DataCubeFilterEditorConditionTreeNode(
        node,
        { name: _childNode.name, type: _childNode.type },
        operationGetter(_childNode.operator),
        _childNode.value,
        _childNode.not,
      );
    }
    node.addChild(childNode);
    nodes.set(childNode.uuid, childNode);
  });
  nodes.set(node.uuid, node);
  return node;
}

export type DataCubeFilterEditorTree = {
  root?: DataCubeFilterEditorConditionGroupTreeNode | undefined;
  nodes: Map<string, DataCubeFilterEditorTreeNode>;
};
