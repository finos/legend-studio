/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { action, observable } from 'mobx';
import { ROOT_PACKAGE_NAME } from 'MetaModelConst';
import { EditorStore } from './EditorStore';
import { IllegalStateError, isNonNullable, UnsupportedOperationError, returnUndefOnError, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { getPackableElementTreeData, openNode, openNodeById, openNodes, populatePackageTreeNodeChildren } from 'Utilities/PackageTreeUtil';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { TreeData, PackageTreeNodeData } from 'Utilities/TreeUtil';
import { EXPLORER_TREE_LEGAL_ROOT_PACKAGE_LABEL } from 'Utilities/DemoUtil';
import { config } from 'ApplicationConfig';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { GenerationTreeNodeData, getGenerationTreeData } from 'Utilities/FileGenerationTreeUtil';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Unit } from 'MM/model/packageableElements/domain/Measure';
import { PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';

export enum ExplorerTreeRootPackageLabel {
  FILE_GENERATION = 'generated-files',
  MODEL_GENERATION = 'generated-models',
  SYSTEM = 'system',
  PROJECT_DEPENDENCY = 'dependencies',
}

export class ExplorerTreeState {
  editorStore: EditorStore;
  @observable.ref treeData?: TreeData<PackageTreeNodeData>;
  @observable.ref generationTreeData?: TreeData<PackageTreeNodeData>;
  @observable.ref systemTreeData?: TreeData<PackageTreeNodeData>;
  @observable.ref legalTreeData?: TreeData<PackageTreeNodeData>;
  @observable.ref dependencyTreeData?: TreeData<PackageTreeNodeData>;
  @observable.ref selectedNode?: PackageTreeNodeData;
  @observable.ref fileGenerationTreeData?: TreeData<GenerationTreeNodeData>;
  @observable isBuilt = false;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  getTreeData(rootPackageName = ROOT_PACKAGE_NAME.MAIN): TreeData<PackageTreeNodeData> {
    let treeData: TreeData<PackageTreeNodeData> | undefined;
    switch (rootPackageName) {
      case ROOT_PACKAGE_NAME.MODEL_GENERATION: treeData = this.generationTreeData; break;
      case ROOT_PACKAGE_NAME.SYSTEM: treeData = this.systemTreeData; break;
      case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT: treeData = this.dependencyTreeData; break;
      case ROOT_PACKAGE_NAME.LEGAL: treeData = this.legalTreeData; break;
      default: treeData = this.treeData;
    }
    if (!treeData || !this.isBuilt) {
      Log.error(LOG_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED, `Can't get explorer tree data for root package '${rootPackageName}' as it hasn't been initialized`);
      throw new IllegalStateError(`Can't get explorer tree data for root package '${rootPackageName}' as it hasn't been initialized`);
    }
    return treeData;
  }

  getSelectedNodePackage(): Package {
    if (!this.selectedNode) {
      return this.editorStore.graphState.graph.root;
    }
    return this.selectedNode.packageableElement instanceof Package
      ? this.selectedNode.packageableElement
      : this.selectedNode.packageableElement.package ?? this.editorStore.graphState.graph.root;
  }

  @action setTreeData(data: TreeData<PackageTreeNodeData>): void { this.treeData = data }
  @action setGenerationTreeData(data: TreeData<PackageTreeNodeData>): void { this.generationTreeData = data }
  @action setSystemTreeData(data: TreeData<PackageTreeNodeData>): void { this.systemTreeData = data }
  @action setLegalTreeData(data: TreeData<PackageTreeNodeData>): void { this.legalTreeData = data }
  @action setDependencyTreeData(data: TreeData<PackageTreeNodeData>): void { this.dependencyTreeData = data }
  @action setFileGenerationTreeData(data: TreeData<GenerationTreeNodeData>): void { this.fileGenerationTreeData = data }

  @action setSelectedNode(node: PackageTreeNodeData | undefined): void {
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
    }
    if (node) {
      node.isSelected = true;
    }
    this.selectedNode = node;
  }

  @action build(): void {
    this.isBuilt = false;
    this.treeData = getPackableElementTreeData(this.editorStore.graphState.graph.root, '');
    this.generationTreeData = getPackableElementTreeData(this.editorStore.graphState.graph.generationModel.root, ExplorerTreeRootPackageLabel.MODEL_GENERATION);
    this.fileGenerationTreeData = getGenerationTreeData(this.editorStore.graphState.graphGenerationState.rootFileDirectory, ExplorerTreeRootPackageLabel.FILE_GENERATION);
    this.setSelectedNode(undefined);
    this.isBuilt = true;
  }

  @action buildImmutableModelTrees(): void {
    this.systemTreeData = getPackableElementTreeData(this.editorStore.graphState.systemModel.root, ExplorerTreeRootPackageLabel.SYSTEM);
    this.dependencyTreeData = getPackableElementTreeData(this.editorStore.graphState.graph.dependencyManager.root, ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY);
    if (config.features.BETA__demoMode) {
      this.legalTreeData = getPackableElementTreeData(this.editorStore.graphState.legalModel.root, EXPLORER_TREE_LEGAL_ROOT_PACKAGE_LABEL);
    }
  }

  // FIXME: to be removed when we process project explorer tree properly
  // FIXME: also we need to do this properly, but should we reveal current element when we switch tab and such?
  // right now we screw that up pretty badly and we would need to think of a good strategy to make that happen
  /**
   * WIP: this method should be replaced altogether as this could potentially cause memory leak when we `replace` the graph
   * When we refresh the graph (after compilation in text mode for example), we want to reprocess the app to
   * preserve the status of the explorer tree (opening nodes, selected nodes, etc.)
   */
  /* @MARKER: MEMORY-SENSITIVE */
  @action reprocess(): void {
    // FIXME: change this to `isReprocessingTree` so we don't clash with `isBuilt`
    const originalIsBuiltStatus = this.isBuilt;
    this.isBuilt = false;
    if (!this.systemTreeData) {
      this.systemTreeData = getPackableElementTreeData(this.editorStore.graphState.systemModel.root, ExplorerTreeRootPackageLabel.SYSTEM);
    }
    if (!this.legalTreeData && !config.features.BETA__demoMode) {
      this.legalTreeData = getPackableElementTreeData(this.editorStore.graphState.legalModel.root, EXPLORER_TREE_LEGAL_ROOT_PACKAGE_LABEL);
    }
    if (!this.dependencyTreeData) {
      this.dependencyTreeData = getPackableElementTreeData(this.editorStore.graphState.graph.dependencyManager.root, ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY);
    }
    // Main tree
    {
      const openedTreeNodeIds = this.treeData ? Array.from(this.treeData.nodes.values()).filter(node => node.isOpen).map(node => node.id) : [];
      this.treeData = getPackableElementTreeData(this.editorStore.graphState.graph.root, '');
      const openElements = new Set(openedTreeNodeIds.map(id => this.editorStore.graphState.graph.getNullableElement(id, true)).filter(isNonNullable));
      openNodes(this.editorStore.graphState.graph.root, openElements, this.treeData);
    }
    // Generated tree
    {
      const openedTreeNodeIds = this.generationTreeData ? Array.from(this.generationTreeData.nodes.values()).filter(node => node.isOpen).map(node => node.id) : [];
      this.generationTreeData = getPackableElementTreeData(this.editorStore.graphState.graph.generationModel.root, ExplorerTreeRootPackageLabel.MODEL_GENERATION);
      const openElements = new Set(openedTreeNodeIds.map(id => this.editorStore.graphState.graph.generationModel.getNullableElement(id, true)).filter(isNonNullable));
      openNodes(this.editorStore.graphState.graph.generationModel.root, openElements, this.generationTreeData);
      if (openedTreeNodeIds.includes(ROOT_PACKAGE_NAME.MODEL_GENERATION)) { openNodeById(ROOT_PACKAGE_NAME.MODEL_GENERATION, this.generationTreeData) }
    }
    if (this.selectedNode) {
      const element = this.editorStore.graphState.graph.getNullableElement(this.selectedNode.id);
      if (element) {
        const openingNode = openNode(element, this.treeData)
          ?? openNode(element, this.generationTreeData);
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
    this.isBuilt = originalIsBuiltStatus;
  }

  @action onTreeNodeSelect = (node: PackageTreeNodeData, treeData: TreeData<PackageTreeNodeData>, rootPackageName = ROOT_PACKAGE_NAME.MAIN): void => {
    // Open non-package element
    if (!(node.packageableElement instanceof Package)) {
      this.editorStore.openElement(node.packageableElement);
    }
    // Expand package element
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.packageableElement instanceof Package) {
        populatePackageTreeNodeChildren(node, treeData);
      }
    }
    this.setSelectedNode(node);
    switch (rootPackageName) {
      case ROOT_PACKAGE_NAME.MODEL_GENERATION: this.setGenerationTreeData({ ...treeData }); break;
      case ROOT_PACKAGE_NAME.SYSTEM: this.setSystemTreeData({ ...treeData }); break;
      case ROOT_PACKAGE_NAME.LEGAL: this.setLegalTreeData({ ...treeData }); break;
      case ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT: this.setDependencyTreeData({ ...treeData }); break;
      default: this.setTreeData({ ...treeData });
    }
  };

  /**
   * Given an element we open the node depending on what package tree corresponds to it
   */
  @action openNode(element: PackageableElement): void {
    if (element instanceof PrimitiveType || element instanceof Unit) {
      throw new UnsupportedOperationError(`Can't open package tree node for element type '${returnUndefOnError(() => getPackageableElementType(element)) ?? element.constructor.name}'`);
    }
    const packageName = element.getRoot().path;
    let opened = false;
    if (packageName === ROOT_PACKAGE_NAME.MAIN && this.treeData) {
      const openingNode = openNode(element, this.treeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (packageName === ROOT_PACKAGE_NAME.MODEL_GENERATION && this.generationTreeData) {
      const openingNode = openNode(element, this.generationTreeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (packageName === ROOT_PACKAGE_NAME.SYSTEM && this.systemTreeData) {
      const openingNode = openNode(element, this.systemTreeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (packageName === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT && this.dependencyTreeData) {
      const openingNode = openNode(element, this.dependencyTreeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (config.features.BETA__demoMode && packageName === ROOT_PACKAGE_NAME.LEGAL && this.legalTreeData) {
      const openingNode = openNode(element, this.legalTreeData);
      this.setSelectedNode(openingNode);
      opened = true;
    }
    if (!opened) {
      Log.error(LOG_EVENT.PACKAGE_TREE_PROBLEM, `Can't open package tree node for element '${element.path}' with package root '${packageName}'`);
    }
  }

  getFileGenerationTreeData(): TreeData<GenerationTreeNodeData> {
    return guaranteeNonNullable(this.fileGenerationTreeData, 'File generation tree data has not been initialized');
  }
}
