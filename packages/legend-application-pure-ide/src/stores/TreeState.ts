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

import type { TreeData, TreeNodeData } from '@finos/legend-art';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, observable, makeObservable, flow, flowResult } from 'mobx';
import type { PureIDEStore } from './PureIDEStore.js';

export abstract class TreeState<
  T extends TreeNodeData & { isLoading: boolean },
  V,
> {
  readonly ideStore: PureIDEStore;

  treeData?: TreeData<T>;
  selectedNode?: T | undefined;
  loadInitialDataState = ActionState.create();
  refreshDataState = ActionState.create();

  constructor(ideStore: PureIDEStore) {
    makeObservable(this, {
      treeData: observable.ref,
      loadInitialDataState: observable,
      refreshDataState: observable,
      initialize: flow,
      expandNode: flow,
      openNode: flow,
      refreshTreeData: flow,
      setTreeData: action,
      setSelectedNode: action,
    });

    this.ideStore = ideStore;
  }

  getTreeData(): TreeData<T> {
    return guaranteeNonNullable(
      this.treeData,
      'Tree data has not been initialized',
    );
  }

  abstract getRootNodes(): Promise<V[]>;
  abstract buildTreeData(rootNodes: V[]): TreeData<T>;
  abstract getChildNodes(node: T): Promise<V[]>;
  abstract processChildNodes(node: T, childNodes: V[]): void;

  *initialize(): GeneratorFn<void> {
    if (this.loadInitialDataState.isInProgress) {
      this.ideStore.applicationStore.notificationService.notifyWarning(
        'Tree state initialization is in progress',
      );
      return;
    }
    this.loadInitialDataState.inProgress();
    try {
      this.treeData = this.buildTreeData((yield this.getRootNodes()) as V[]);
      this.loadInitialDataState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.ideStore.applicationStore.notificationService.notifyError(error);
      this.loadInitialDataState.fail();
    }
  }

  setSelectedNode(node: T | undefined): void {
    if (node !== this.selectedNode) {
      if (this.selectedNode) {
        this.selectedNode.isSelected = false;
      }
      if (node) {
        node.isSelected = true;
      }
      this.selectedNode = node;
      this.refreshTree();
    }
  }
  setTreeData(data: TreeData<T>): void {
    this.treeData = data;
  }
  refreshTree(): void {
    this.setTreeData({ ...guaranteeNonNullable(this.treeData) });
  }

  abstract openNode(node: T): GeneratorFn<void>;

  *expandNode(node: T): GeneratorFn<void> {
    if (node.isLoading) {
      return;
    }
    if (this.getTreeData().nodes.has(node.id) && node.childrenIds) {
      node.isLoading = false;
      node.isOpen = true;
      this.refreshTree();
    } else {
      node.isLoading = true;
      try {
        const childNodes = (yield this.getChildNodes(node)) as V[];
        this.processChildNodes(node, childNodes);
        node.isOpen = true;
        this.refreshTree();
      } catch (error) {
        assertErrorThrown(error);
        this.ideStore.applicationStore.notificationService.notifyError(error);
      } finally {
        node.isLoading = false;
      }
    }
  }

  *refreshTreeData(): GeneratorFn<void> {
    if (!this.treeData) {
      return;
    }
    const openingNodeIds = new Set(
      Array.from(this.getTreeData().nodes.values())
        .filter((node) => node.isOpen)
        .map((node) => node.id),
    );
    const selectedNodeId = this.selectedNode?.id;
    this.refreshDataState.inProgress();
    try {
      this.treeData = this.buildTreeData((yield this.getRootNodes()) as V[]);
    } catch (error) {
      assertErrorThrown(error);
      this.ideStore.applicationStore.notificationService.notifyError(error);
      this.refreshDataState.fail();
      return;
    }
    const nodesToOpen = this.getTreeData()
      .rootIds.map((id) =>
        guaranteeNonNullable(this.getTreeData().nodes.get(id)),
      )
      .filter((node) => openingNodeIds.has(node.id));
    yield this.refreshOpenNodes(nodesToOpen, openingNodeIds);
    if (selectedNodeId && this.getTreeData().nodes.has(selectedNodeId)) {
      this.setSelectedNode(
        guaranteeNonNullable(this.getTreeData().nodes.get(selectedNodeId)),
      );
    }
  }

  async refreshOpenNodes(
    nodesToOpen: T[],
    openingNodeIds: Set<string>,
  ): Promise<void> {
    await Promise.all(
      nodesToOpen.map((node) => {
        openingNodeIds.delete(node.id);
        return flowResult(this.expandNode(node)).catch(() => undefined);
      }),
    );
    nodesToOpen = nodesToOpen
      .flatMap((node) => node.childrenIds ?? [])
      .map((childId) =>
        guaranteeNonNullable(this.getTreeData().nodes.get(childId)),
      )
      .filter((node) => openingNodeIds.has(node.id));
    if (nodesToOpen.length) {
      return this.refreshOpenNodes(nodesToOpen, openingNodeIds);
    }
    return Promise.resolve();
  }
}
