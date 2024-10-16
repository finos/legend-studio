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
} from '../../core/DataCubeQueryEngine.js';
import type { DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import {
  deepClone,
  getNonNullableEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import {
  type DataCubeFilterEditorTree,
  type DataCubeFilterEditorTreeNode,
  DataCubeFilterEditorConditionGroupTreeNode,
  DataCubeFilterEditorConditionTreeNode,
  buildFilterEditorTree,
  buildFilterQuerySnapshot,
} from '../../core/filter/DataCubeQueryFilterEditorState.js';
import { DataCubeQuerySnapshotController } from '../DataCubeQuerySnapshotManager.js';
import {
  DataCubeConfiguration,
  type DataCubeColumnConfiguration,
} from '../../core/models/DataCubeConfiguration.js';
import type { DisplayState } from '../../core/DataCubeLayoutManagerState.js';
import { DataCubeFilterEditor } from '../../../components/view/filter/DataCubeFilterEditor.js';

/**
 * This query editor state backs the form editor for filter. It batches changes made
 * to the filter in the form editor.
 */
export class DataCubeFilterEditorState extends DataCubeQuerySnapshotController {
  readonly display: DisplayState;

  tree: DataCubeFilterEditorTree;
  selectedNode?: DataCubeFilterEditorTreeNode | undefined;
  columns: DataCubeColumnConfiguration[] = [];

  constructor(view: DataCubeViewState) {
    super(view);

    makeObservable(this, {
      tree: observable.ref,
      initializeTree: action,
      refreshTree: action,

      columns: observable.struct,

      applySnapshot: action,

      selectedNode: observable,
      selectedGroupNode: computed,
      setSelectedNode: action,
      addFilterNode: action,
      removeFilterNode: action,
      layerFilterNode: action,
    });

    this.display = this.view.engine.layout.newDisplay(
      'Filter',
      () => <DataCubeFilterEditor view={this.view} />,
      {
        x: -50,
        y: 50,
        width: 600,
        height: 400,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );

    this.tree = {
      nodes: new Map<string, DataCubeFilterEditorTreeNode>(),
    };
  }

  initializeTree() {
    if (this.tree.root === undefined && this.tree.nodes.size === 0) {
      const root = new DataCubeFilterEditorConditionGroupTreeNode(
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

  get selectedGroupNode():
    | DataCubeFilterEditorConditionGroupTreeNode
    | undefined {
    return this.selectedNode instanceof
      DataCubeFilterEditorConditionGroupTreeNode
      ? this.selectedNode
      : this.selectedNode?.parent;
  }

  setSelectedNode(node: DataCubeFilterEditorTreeNode | undefined) {
    this.selectedNode = node;
  }

  private generateNewFilterNode(baseNode: DataCubeFilterEditorTreeNode) {
    if (baseNode instanceof DataCubeFilterEditorConditionTreeNode) {
      return new DataCubeFilterEditorConditionTreeNode(
        undefined,
        baseNode.column,
        baseNode.operation,
        deepClone(baseNode.value),
        baseNode.not,
      );
    } else if (baseNode instanceof DataCubeFilterEditorConditionGroupTreeNode) {
      if (this.columns.length !== 0) {
        const columnConfig = getNonNullableEntry(this.columns, 0);
        const column = {
          name: columnConfig.name,
          type: columnConfig.type,
        };
        const operation = this.view.engine.getFilterOperation(
          DataCubeQueryFilterOperator.EQUAL,
        );
        return new DataCubeFilterEditorConditionTreeNode(
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
  addFilterNode(baseNode: DataCubeFilterEditorTreeNode) {
    if (this.tree.root) {
      const node = this.generateNewFilterNode(baseNode);
      const parentNode = baseNode.parent;
      if (parentNode && node) {
        parentNode.addChild(
          node,
          baseNode instanceof DataCubeFilterEditorConditionTreeNode
            ? parentNode.children.indexOf(baseNode) + 1
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
  removeFilterNode(nodeToRemove: DataCubeFilterEditorTreeNode) {
    if (this.tree.root) {
      const parentNode = nodeToRemove.parent;
      // skip root node
      if (nodeToRemove !== this.tree.root && parentNode) {
        // remove all nodes in the subtree
        let childNodesToRemove = [nodeToRemove];
        while (childNodesToRemove.length) {
          childNodesToRemove.forEach((node) => {
            if (node instanceof DataCubeFilterEditorConditionGroupTreeNode) {
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
  layerFilterNode(baseNode: DataCubeFilterEditorTreeNode) {
    if (this.tree.root) {
      const node = this.generateNewFilterNode(baseNode);
      const parentNode = baseNode.parent;
      if (parentNode && node) {
        const baseNodeIndex = parentNode.children.indexOf(baseNode);
        parentNode.removeChild(baseNode);

        const subGroupNode = new DataCubeFilterEditorConditionGroupTreeNode(
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

  override getSnapshotSubscriberName() {
    return 'filter-editor';
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    // NOTE: filtering group-level extended columns is not supported
    this.columns = configuration.columns.filter(
      (column) =>
        !snapshot.data.groupExtendedColumns.find(
          (col) => col.name === column.name,
        ),
    );

    this.tree.nodes = new Map<string, DataCubeFilterEditorTreeNode>();
    this.tree.root = snapshot.data.filter
      ? buildFilterEditorTree(
          snapshot.data.filter,
          undefined,
          this.tree.nodes,
          (op) => this.view.engine.getFilterOperation(op),
        )
      : undefined;
    this.setSelectedNode(undefined);
    this.refreshTree();
  }

  applyChanges() {
    const baseSnapshot = guaranteeNonNullable(this.getLatestSnapshot());
    const newSnapshot = baseSnapshot.clone();

    newSnapshot.data.filter = this.tree.root
      ? buildFilterQuerySnapshot(this.tree.root)
      : undefined;

    newSnapshot.finalize();
    if (newSnapshot.hashCode !== baseSnapshot.hashCode) {
      this.publishSnapshot(newSnapshot);
    }
  }
}
