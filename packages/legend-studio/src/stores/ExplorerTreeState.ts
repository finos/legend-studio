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

import { action, observable, makeObservable } from 'mobx';
import { ROOT_PACKAGE_NAME } from '../models/MetaModelConst';
import type { EditorStore } from './EditorStore';
import {
  IllegalStateError,
  isNonNullable,
  UnsupportedOperationError,
  guaranteeNonNullable,
  getClass,
} from '@finos/legend-studio-shared';
import {
  getPackableElementTreeData,
  openNode,
  openNodeById,
  openNodes,
  populatePackageTreeNodeChildren,
} from './shared/PackageTreeUtil';
import { CORE_LOG_EVENT } from '../utils/Logger';
import type { PackageTreeNodeData } from './shared/TreeUtil';
import type { TreeData } from '@finos/legend-studio-components';
import type { GenerationTreeNodeData } from './shared/FileGenerationTreeUtil';
import { getGenerationTreeData } from './shared/FileGenerationTreeUtil';
import { Package } from '../models/metamodels/pure/model/packageableElements/domain/Package';
import type { PackageableElement } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Unit } from '../models/metamodels/pure/model/packageableElements/domain/Measure';
import { PrimitiveType } from '../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';

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
  isBuilt = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      treeData: observable.ref,
      generationTreeData: observable.ref,
      systemTreeData: observable.ref,
      legalTreeData: observable.ref,
      dependencyTreeData: observable.ref,
      selectedNode: observable.ref,
      fileGenerationTreeData: observable.ref,
      isBuilt: observable,
      setTreeData: action,
      setGenerationTreeData: action,
      setSystemTreeData: action,
      setLegalTreeData: action,
      setDependencyTreeData: action,
      setFileGenerationTreeData: action,
      setSelectedNode: action,
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
    if (!treeData || !this.isBuilt) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED,
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
      return this.editorStore.graphState.graph.root;
    }
    return this.selectedNode.packageableElement instanceof Package
      ? this.selectedNode.packageableElement
      : this.selectedNode.packageableElement.package ??
          this.editorStore.graphState.graph.root;
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
    this.isBuilt = false;
    this.treeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphState.graph.root,
      '',
    );
    this.generationTreeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphState.graph.generationModel.root,
      ExplorerTreeRootPackageLabel.MODEL_GENERATION,
    );
    this.fileGenerationTreeData = getGenerationTreeData(
      this.editorStore.graphState.graphGenerationState.rootFileDirectory,
      ExplorerTreeRootPackageLabel.FILE_GENERATION,
    );
    this.setSelectedNode(undefined);
    this.isBuilt = true;
  }

  buildImmutableModelTrees(): void {
    this.systemTreeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphState.systemModel.root,
      ExplorerTreeRootPackageLabel.SYSTEM,
    );
    this.dependencyTreeData = getPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphState.graph.dependencyManager.root,
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
    this.isBuilt = false;
    if (!this.systemTreeData) {
      this.systemTreeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphState.systemModel.root,
        ExplorerTreeRootPackageLabel.SYSTEM,
      );
    }
    if (!this.dependencyTreeData) {
      this.dependencyTreeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphState.graph.dependencyManager.root,
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
        this.editorStore.graphState.graph.root,
        '',
      );
      const openElements = new Set(
        openedTreeNodeIds
          .map((id) =>
            this.editorStore.graphState.graph.getNullableElement(id, true),
          )
          .filter(isNonNullable),
      );
      openNodes(
        this.editorStore,
        this.editorStore.graphState.graph.root,
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
        this.editorStore.graphState.graph.generationModel.root,
        ExplorerTreeRootPackageLabel.MODEL_GENERATION,
      );
      const openElements = new Set(
        openedTreeNodeIds
          .map((id) =>
            this.editorStore.graphState.graph.generationModel.getNullableElement(
              id,
              true,
            ),
          )
          .filter(isNonNullable),
      );
      openNodes(
        this.editorStore,
        this.editorStore.graphState.graph.generationModel.root,
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
      const element = this.editorStore.graphState.graph.getNullableElement(
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
    this.isBuilt = true;
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
        `Can't open package tree node for element type '${
          getClass(element).name
        }'`,
      );
    }
    const packageName = element.getRoot().path;
    let opened = false;
    if (packageName === ROOT_PACKAGE_NAME.MAIN && this.treeData) {
      const openingNode = openNode(this.editorStore, element, this.treeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (
      packageName === ROOT_PACKAGE_NAME.MODEL_GENERATION &&
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
      packageName === ROOT_PACKAGE_NAME.SYSTEM &&
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
      packageName === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT &&
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
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.PACKAGE_TREE_PROBLEM,
        `Can't open package tree node for element '${element.path}' with package root '${packageName}'`,
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
