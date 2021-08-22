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

import { action, observable, makeObservable } from 'mobx';
import type { EditorStore } from './EditorStore';
import {
  LogEvent,
  IllegalStateError,
  isNonNullable,
  UnsupportedOperationError,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-shared';
import {
  getPackableElementTreeData,
  openNode,
  openNodeById,
  openNodes,
  populatePackageTreeNodeChildren,
} from './shared/PackageTreeUtil';
import { STUDIO_LOG_EVENT } from '../utils/StudioLogEvent';
import { APPLICATION_LOG_EVENT } from '../utils/ApplicationLogEvent';
import type { PackageTreeNodeData } from './shared/TreeUtil';
import type { TreeData } from '@finos/legend-application-components';
import type { GenerationTreeNodeData } from './shared/FileGenerationTreeUtil';
import { getGenerationTreeData } from './shared/FileGenerationTreeUtil';
import type { PackageableElement } from '@finos/legend-graph';
import {
  ROOT_PACKAGE_NAME,
  Package,
  Unit,
  PrimitiveType,
} from '@finos/legend-graph';

export enum ExplorerTreeRootPackageLabel {
  FILE_GENERATION = 'generated-files',
  MODEL_GENERATION = 'generated-models',
  SYSTEM = 'system',
  PROJECT_DEPENDENCY = 'dependencies',
}

export class ExplorerTreeState {
  editorStore: EditorStore;
  treeData?: TreeData<PackageTreeNodeData>;
  generationTreeData?: TreeData<PackageTreeNodeData>;
  systemTreeData?: TreeData<PackageTreeNodeData>;
  legalTreeData?: TreeData<PackageTreeNodeData>;
  dependencyTreeData?: TreeData<PackageTreeNodeData>;
  selectedNode?: PackageTreeNodeData;
  fileGenerationTreeData?: TreeData<GenerationTreeNodeData>;
  elementToRename?: PackageableElement;
  buildState = ActionState.create();

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      treeData: observable.ref,
      generationTreeData: observable.ref,
      systemTreeData: observable.ref,
      legalTreeData: observable.ref,
      dependencyTreeData: observable.ref,
      selectedNode: observable.ref,
      fileGenerationTreeData: observable.ref,
      elementToRename: observable,
      setTreeData: action,
      setGenerationTreeData: action,
      setSystemTreeData: action,
      setLegalTreeData: action,
      setDependencyTreeData: action,
      setFileGenerationTreeData: action,
      setSelectedNode: action,
      setElementToRename: action,
      build: action,
      buildImmutableModelTrees: action,
      reprocess: action,
      onTreeNodeSelect: action,
      openNode: action,
    });

    this.editorStore = editorStore;
  }

  getTreeData(
    rootPackageName = ROOT_PACKAGE_NAME.MAIN,
  ): TreeData<PackageTreeNodeData> {
    let treeData: TreeData<PackageTreeNodeData> | undefined;
    switch (rootPackageName) {
      case ROOT_PACKAGE_NAME.MODEL_GENERATION:
        treeData = this.generationTreeData;
        break;
      case ROOT_PACKAGE_NAME.SYSTEM:
        treeData = this.systemTreeData;
        break;
      case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
        treeData = this.dependencyTreeData;
        break;
      default:
        treeData = this.treeData;
    }
    if (!treeData || !this.buildState.hasCompleted) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(
          APPLICATION_LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED,
        ),
        `Can't get explorer tree data for root package '${rootPackageName}' as it hasn't been initialized`,
      );
      throw new IllegalStateError(
        `Can't get explorer tree data for root package '${rootPackageName}' as it hasn't been initialized`,
      );
    }
    return treeData;
  }

  getSelectedNodePackage(): Package {
    if (!this.selectedNode) {
      return this.editorStore.graphManagerState.graph.root;
    }
    return this.selectedNode.packageableElement instanceof Package
      ? this.selectedNode.packageableElement
      : this.selectedNode.packageableElement.package ??
          this.editorStore.graphManagerState.graph.root;
  }

  setTreeData(data: TreeData<PackageTreeNodeData>): void {
    this.treeData = data;
  }
  setGenerationTreeData(data: TreeData<PackageTreeNodeData>): void {
    this.generationTreeData = data;
  }
  setSystemTreeData(data: TreeData<PackageTreeNodeData>): void {
    this.systemTreeData = data;
  }
  setLegalTreeData(data: TreeData<PackageTreeNodeData>): void {
    this.legalTreeData = data;
  }
  setDependencyTreeData(data: TreeData<PackageTreeNodeData>): void {
    this.dependencyTreeData = data;
  }
  setFileGenerationTreeData(data: TreeData<GenerationTreeNodeData>): void {
    this.fileGenerationTreeData = data;
  }
  setElementToRename(val: PackageableElement | undefined): void {
    this.elementToRename = val;
  }

  setSelectedNode(node: PackageTreeNodeData | undefined): void {
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
    }
    if (node) {
      node.isSelected = true;
    }
    this.selectedNode = node;
  }

  build(): void {
    this.buildState.reset();
    this.treeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphManagerState.graph.root,
      '',
    );
    this.generationTreeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphManagerState.graph.generationModel.root,
      ExplorerTreeRootPackageLabel.MODEL_GENERATION,
    );
    this.fileGenerationTreeData = getGenerationTreeData(
      this.editorStore.graphState.graphGenerationState.rootFileDirectory,
      ExplorerTreeRootPackageLabel.FILE_GENERATION,
    );
    this.setSelectedNode(undefined);
    this.buildState.complete();
  }

  buildImmutableModelTrees(): void {
    this.systemTreeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphManagerState.systemModel.root,
      ExplorerTreeRootPackageLabel.SYSTEM,
    );
    this.dependencyTreeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphManagerState.graph.dependencyManager.root,
      ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY,
    );
  }

  // FIXME: to be removed when we process project explorer tree properly
  // FIXME: also we need to do this properly, but should we reveal current element when we switch tab and such?
  // right now we screw that up pretty badly and we would need to think of a good strategy to make that happen
  /**
   * FIXME: this method should be replaced altogether as this could potentially cause memory leak when we `replace` the graph
   * When we refresh the graph (after compilation in text mode for example), we want to reprocess the app to
   * preserve the status of the explorer tree (opening nodes, selected nodes, etc.)
   */
  /* @MARKER: MEMORY-SENSITIVE */
  reprocess(): void {
    this.buildState.reset();
    if (!this.systemTreeData) {
      this.systemTreeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.systemModel.root,
        ExplorerTreeRootPackageLabel.SYSTEM,
      );
    }
    if (!this.dependencyTreeData) {
      this.dependencyTreeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.graph.dependencyManager.root,
        ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY,
      );
    }
    // Main tree
    {
      const openedTreeNodeIds = this.treeData
        ? Array.from(this.treeData.nodes.values())
            .filter((node) => node.isOpen)
            .map((node) => node.id)
        : [];
      this.treeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.graph.root,
        '',
      );
      const openElements = new Set(
        openedTreeNodeIds
          .map((id) =>
            this.editorStore.graphManagerState.graph.getNullableElement(
              id,
              true,
            ),
          )
          .filter(isNonNullable),
      );
      openNodes(
        this.editorStore,
        this.editorStore.graphManagerState.graph.root,
        openElements,
        this.treeData,
      );
    }
    // Generated tree
    {
      const openedTreeNodeIds = this.generationTreeData
        ? Array.from(this.generationTreeData.nodes.values())
            .filter((node) => node.isOpen)
            .map((node) => node.id)
        : [];
      this.generationTreeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.graph.generationModel.root,
        ExplorerTreeRootPackageLabel.MODEL_GENERATION,
      );
      const openElements = new Set(
        openedTreeNodeIds
          .map((id) =>
            this.editorStore.graphManagerState.graph.generationModel.getOwnNullableElement(
              id,
              true,
            ),
          )
          .filter(isNonNullable),
      );
      openNodes(
        this.editorStore,
        this.editorStore.graphManagerState.graph.generationModel.root,
        openElements,
        this.generationTreeData,
      );
      if (openedTreeNodeIds.includes(ROOT_PACKAGE_NAME.MODEL_GENERATION)) {
        openNodeById(
          ROOT_PACKAGE_NAME.MODEL_GENERATION,
          this.generationTreeData,
        );
      }
    }
    // File generation tree
    // TODO: fix this so it does proper reprocessing, right now it just rebuilds
    this.fileGenerationTreeData = getGenerationTreeData(
      this.editorStore.graphState.graphGenerationState.rootFileDirectory,
      ExplorerTreeRootPackageLabel.FILE_GENERATION,
    );
    if (this.selectedNode) {
      const element =
        this.editorStore.graphManagerState.graph.getNullableElement(
          this.selectedNode.id,
        );
      if (element) {
        const openingNode =
          openNode(this.editorStore, element, this.treeData) ??
          openNode(this.editorStore, element, this.generationTreeData);
        // ?? openNode(element, this.systemTreeData)
        // ?? openNode(element, this.legalTreeData)
        // ?? openNode(element, this.dependencyTreeData);
        this.setSelectedNode(openingNode);
      } else {
        this.setSelectedNode(undefined);
      }
    }
    this.setTreeData({ ...this.treeData });
    this.setGenerationTreeData({ ...this.generationTreeData });
    this.buildState.complete();
  }

  onTreeNodeSelect = (
    node: PackageTreeNodeData,
    treeData: TreeData<PackageTreeNodeData>,
    rootPackageName = ROOT_PACKAGE_NAME.MAIN,
  ): void => {
    // Open non-package element
    if (!(node.packageableElement instanceof Package)) {
      this.editorStore.openElement(node.packageableElement);
    }
    // Expand package element
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.packageableElement instanceof Package) {
        populatePackageTreeNodeChildren(this.editorStore, node, treeData);
      }
    }
    this.setSelectedNode(node);
    switch (rootPackageName) {
      case ROOT_PACKAGE_NAME.MODEL_GENERATION:
        this.setGenerationTreeData({ ...treeData });
        break;
      case ROOT_PACKAGE_NAME.SYSTEM:
        this.setSystemTreeData({ ...treeData });
        break;
      case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT:
        this.setDependencyTreeData({ ...treeData });
        break;
      default:
        this.setTreeData({ ...treeData });
    }
  };

  /**
   * Given an element we open the node depending on what package tree corresponds to it
   */
  openNode(element: PackageableElement): void {
    if (element instanceof PrimitiveType || element instanceof Unit) {
      throw new UnsupportedOperationError(
        `Can't open package tree node for element`,
        element,
      );
    }
    const packagePath = element.getRoot().path;
    let opened = false;
    if (packagePath === ROOT_PACKAGE_NAME.MAIN && this.treeData) {
      const openingNode = openNode(this.editorStore, element, this.treeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (
      packagePath === ROOT_PACKAGE_NAME.MODEL_GENERATION &&
      this.generationTreeData
    ) {
      const openingNode = openNode(
        this.editorStore,
        element,
        this.generationTreeData,
      );
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (
      packagePath === ROOT_PACKAGE_NAME.SYSTEM &&
      this.systemTreeData
    ) {
      const openingNode = openNode(
        this.editorStore,
        element,
        this.systemTreeData,
      );
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (
      packagePath === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT &&
      this.dependencyTreeData
    ) {
      const openingNode = openNode(
        this.editorStore,
        element,
        this.dependencyTreeData,
      );
      this.setSelectedNode(openingNode);
      opened = true;
    }
    if (!opened) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.PACKAGE_TREE_BUILDER_FAILURE),
        `Can't open package tree node for element '${element.path}' with package root '${packagePath}'`,
      );
    }
  }

  getFileGenerationTreeData(): TreeData<GenerationTreeNodeData> {
    return guaranteeNonNullable(
      this.fileGenerationTreeData,
      'File generation tree data has not been initialized',
    );
  }
}
