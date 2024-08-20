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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  DataCubeQueryFilterGroupOperator,
  DataCubeQueryFilterOperator,
  type DataCubeOperationValue,
} from '../core/DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotFilter,
  DataCubeQuerySnapshotFilterCondition,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryFilterOperation } from '../core/filter/DataCubeQueryFilterOperation.js';
import {
  deepClone,
  deleteEntry,
  getNonNullableEntry,
  guaranteeNonNullable,
  IllegalStateError,
  uuid,
} from '@finos/legend-shared';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';

export abstract class DataCubeEditorFilterNode {
  uuid = uuid();
  parent: DataCubeEditorFilterConditionGroupNode | undefined;
  not = false;

  constructor(
    parent: DataCubeEditorFilterConditionGroupNode | undefined,
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

  setParent(parent: DataCubeEditorFilterConditionGroupNode | undefined) {
    this.parent = parent;
  }
}

export class DataCubeEditorFilterConditionNode extends DataCubeEditorFilterNode {
  column: DataCubeQuerySnapshotColumn;
  operation: DataCubeQueryFilterOperation;
  value: DataCubeOperationValue | undefined;

  constructor(
    parent: DataCubeEditorFilterConditionGroupNode | undefined,
    column: DataCubeQuerySnapshotColumn,
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

  setColumn(col: DataCubeQuerySnapshotColumn) {
    this.column = col;
  }

  setOperation(operation: DataCubeQueryFilterOperation) {
    this.operation = operation;
  }

  setValue(value: DataCubeOperationValue | undefined) {
    this.value = value
      ? makeObservable(value, { value: observable })
      : undefined;
  }

  updateValue(value: unknown) {
    if (this.value) {
      this.value.value = value;
    }
  }
}

export class DataCubeEditorFilterConditionGroupNode extends DataCubeEditorFilterNode {
  children: DataCubeEditorFilterNode[] = [];
  operation = DataCubeQueryFilterGroupOperator.AND;

  constructor(
    parent: DataCubeEditorFilterConditionGroupNode | undefined,
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

  removeChild(node: DataCubeEditorFilterNode): void {
    const found = deleteEntry(this.children, node);
    if (found) {
      node.setParent(undefined);
    }
  }

  addChild(node: DataCubeEditorFilterNode, idx?: number | undefined): void {
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

function buildFilterSnapshot(
  node: DataCubeEditorFilterConditionGroupNode,
): DataCubeQuerySnapshotFilter {
  return {
    groupOperator: node.operation,
    not: node.not,
    conditions: node.children.map((childNode) => {
      if (childNode instanceof DataCubeEditorFilterConditionNode) {
        return {
          name: childNode.column.name,
          type: childNode.column.type,
          operation: childNode.operation.operator,
          value: deepClone(childNode.value),
          not: childNode.not,
        } satisfies DataCubeQuerySnapshotFilterCondition;
      } else if (childNode instanceof DataCubeEditorFilterConditionGroupNode) {
        return buildFilterSnapshot(childNode);
      }
      throw new IllegalStateError('Unknown filter node');
    }),
  };
}

function buildFilterTree(
  _node: DataCubeQuerySnapshotFilter,
  parent: DataCubeEditorFilterConditionGroupNode | undefined,
  nodes: Map<string, DataCubeEditorFilterNode>,
  operationGetter: (operation: string) => DataCubeQueryFilterOperation,
): DataCubeEditorFilterConditionGroupNode {
  const node = new DataCubeEditorFilterConditionGroupNode(
    parent,
    _node.groupOperator === DataCubeQueryFilterGroupOperator.AND
      ? DataCubeQueryFilterGroupOperator.AND
      : DataCubeQueryFilterGroupOperator.OR,
    _node.not,
  );
  _node.conditions.forEach((_childNode) => {
    let childNode: DataCubeEditorFilterNode;
    if ('groupOperator' in _childNode) {
      childNode = buildFilterTree(_childNode, node, nodes, operationGetter);
    } else {
      childNode = new DataCubeEditorFilterConditionNode(
        node,
        { name: _childNode.name, type: _childNode.type },
        operationGetter(_childNode.operation),
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

type DataCubeFilterTree = {
  root?: DataCubeEditorFilterConditionGroupNode | undefined;
  nodes: Map<string, DataCubeEditorFilterNode>;
};

export class DataCubeEditorFilterPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  readonly editor!: DataCubeEditorState;
  readonly operations: DataCubeQueryFilterOperation[];

  tree: DataCubeFilterTree;
  selectedNode?: DataCubeEditorFilterNode | undefined;

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      tree: observable.ref,
      initializeTree: action,
      refreshTree: action,

      selectedNode: observable,
      selectedGroupNode: computed,
      setSelectedNode: action,
      addFilterNode: action,
      removeFilterNode: action,
      layerFilterNode: action,
    });

    this.dataCube = editor.dataCube;
    this.editor = editor;
    this.operations = this.dataCube.engine.filterOperations;
    this.tree = {
      nodes: new Map<string, DataCubeEditorFilterNode>(),
    };
  }

  get columns() {
    // TODO: include leaf-extended columns
    return this.editor.columns.sourceColumns;
  }

  private getOperation(operator: string) {
    return guaranteeNonNullable(
      this.operations.find((op) => op.operator === operator),
    );
  }

  initializeTree() {
    if (this.tree.root === undefined && this.tree.nodes.size === 0) {
      const root = new DataCubeEditorFilterConditionGroupNode(
        undefined,
        DataCubeQueryFilterGroupOperator.AND,
        undefined,
      );
      this.tree.nodes.set(root.uuid, root);
      this.tree.root = root;
      const condition = this.generateNewFilterNode(root);
      if (condition) {
        root.addChild(condition);
        this.tree.nodes.set(condition.uuid, condition);
      }
      this.refreshTree();
    }
  }

  refreshTree() {
    this.tree = { ...this.tree };
  }

  get selectedGroupNode(): DataCubeEditorFilterConditionGroupNode | undefined {
    return this.selectedNode instanceof DataCubeEditorFilterConditionGroupNode
      ? this.selectedNode
      : this.selectedNode?.parent;
  }

  setSelectedNode(node: DataCubeEditorFilterNode | undefined) {
    this.selectedNode = node;
  }

  private generateNewFilterNode(baseNode: DataCubeEditorFilterNode) {
    if (baseNode instanceof DataCubeEditorFilterConditionNode) {
      return new DataCubeEditorFilterConditionNode(
        undefined,
        baseNode.column,
        baseNode.operation,
        deepClone(baseNode.value),
        baseNode.not,
      );
    } else if (baseNode instanceof DataCubeEditorFilterConditionGroupNode) {
      if (this.editor.columnProperties.columns.length !== 0) {
        const columnConfig = getNonNullableEntry(
          this.editor.columnProperties.columns,
          0,
        );
        const column = {
          name: columnConfig.name,
          type: columnConfig.type,
        };
        const operation = this.getOperation(DataCubeQueryFilterOperator.EQUAL);
        return new DataCubeEditorFilterConditionNode(
          undefined,
          column,
          operation,
          operation.generateDefaultValue(column),
          undefined,
        );
      }
    }
    return undefined;
  }

  /**
   * Add a new filter condition node just after the specified filter node.
   * The added node is a clone of the specified node to make the filter's overall match unaffected,
   * except if the specified node is a group node, then a new (default) condition will be added.
   */
  addFilterNode(baseNode: DataCubeEditorFilterNode) {
    if (this.tree.root) {
      const node = this.generateNewFilterNode(baseNode);
      const parentNode = baseNode.parent;
      if (parentNode && node) {
        parentNode.addChild(
          node,
          baseNode instanceof DataCubeEditorFilterConditionNode
            ? parentNode.children.indexOf(baseNode)
            : undefined,
        );

        this.tree.nodes.set(node.uuid, node);
        this.refreshTree();
      }
    }
  }

  /**
   * Remove the specified filter node.
   * If its parent node has just one child, then flatten the parent node if:
   * 1. parent node is not the root node and has exactly one child left
   * 2. OR parent node is the root node and has no child left, in this case,
   *    flattening means completely remove the filter tree
   */
  removeFilterNode(nodeToRemove: DataCubeEditorFilterNode) {
    if (this.tree.root) {
      const parentNode = nodeToRemove.parent;
      // skip root node
      if (nodeToRemove !== this.tree.root && parentNode) {
        // remove all nodes in the subtree
        let childNodesToRemove = [nodeToRemove];
        while (childNodesToRemove.length) {
          childNodesToRemove.forEach((node) => {
            if (node instanceof DataCubeEditorFilterConditionGroupNode) {
              node.children.forEach((child) => {
                child.setParent(undefined);
              });
            }
            this.tree.nodes.delete(node.uuid);
          });
          childNodesToRemove = Array.from(this.tree.nodes.values()).filter(
            (node) => node !== this.tree.root && !node.parent,
          );
        }

        // remove node from parent
        parentNode.removeChild(nodeToRemove);
        this.tree.nodes.delete(nodeToRemove.uuid);

        // flatten parent node if
        // 1. parent node is not the root node and has exactly one child left
        // 2. OR parent node is the root node and has no child left, in this case,
        // flattening means completely remove the filter tree
        if (parentNode.children.length === 1) {
          if (parentNode !== this.tree.root) {
            const childNode = getNonNullableEntry(parentNode.children, 0);
            const grandParentNode = guaranteeNonNullable(parentNode.parent);

            parentNode.removeChild(childNode);

            const parentNodeIndex =
              grandParentNode.children.indexOf(parentNode);
            grandParentNode.removeChild(parentNode);
            this.tree.nodes.delete(parentNode.uuid);

            grandParentNode.addChild(childNode, parentNodeIndex);
          }
        } else if (parentNode.children.length === 0) {
          if (parentNode === this.tree.root) {
            this.tree.root = undefined;
            this.tree.nodes.delete(parentNode.uuid);
          }
        }

        this.refreshTree();

        if (this.selectedNode === nodeToRemove) {
          this.setSelectedNode(undefined);
        }
      }
    }
  }

  /**
   * Replace the specified filter node with a group which contains
   * the specified node and a new condition node.
   * The added node is a clone of the specified node to make the filter's overall match unaffected,
   * except if the specified node is a group node, then a new (default) condition will be added.
   */
  layerFilterNode(baseNode: DataCubeEditorFilterNode) {
    if (this.tree.root) {
      const node = this.generateNewFilterNode(baseNode);
      const parentNode = baseNode.parent;
      if (parentNode && node) {
        const baseNodeIndex = parentNode.children.indexOf(baseNode);
        parentNode.removeChild(baseNode);

        const subGroupNode = new DataCubeEditorFilterConditionGroupNode(
          undefined,
          // Use OR condition when we create sub-group to relax filtering
          DataCubeQueryFilterGroupOperator.OR,
          undefined,
        );

        subGroupNode.addChild(baseNode);
        subGroupNode.addChild(node);
        parentNode.addChild(subGroupNode, baseNodeIndex);

        this.tree.nodes.set(subGroupNode.uuid, subGroupNode);
        this.tree.nodes.set(node.uuid, node);
        this.refreshTree();

        if (this.selectedNode === baseNode) {
          this.setSelectedNode(subGroupNode);
        }
      }
    }
  }

  applySnaphot(
    snapshot: DataCubeQuerySnapshot,
    configuration: DataCubeConfiguration,
  ): void {
    this.tree.nodes = new Map<string, DataCubeEditorFilterNode>();
    this.tree.root = snapshot.data.filter
      ? buildFilterTree(
          snapshot.data.filter,
          undefined,
          this.tree.nodes,
          (op: string) => this.getOperation(op),
        )
      : undefined;
    this.setSelectedNode(undefined);
    this.refreshTree();
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): void {
    newSnapshot.data.filter = this.tree.root
      ? buildFilterSnapshot(this.tree.root)
      : undefined;
  }
}
