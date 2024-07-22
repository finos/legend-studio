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
import type { EditorStore } from './EditorStore.js';
import {
  LogEvent,
  IllegalStateError,
  isNonNullable,
  UnsupportedOperationError,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-shared';
import {
  getDependenciesPackableElementTreeData,
  getPackableElementTreeData,
  openNode,
  openNodeById,
  openNodes,
  populatePackageTreeNodeChildren,
} from './utils/PackageTreeUtils.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import type { PackageTreeNodeData } from './utils/TreeUtils.js';
import type { TreeData } from '@finos/legend-art';
import {
  type FileSystemTreeNodeData,
  getFileSystemTreeData,
} from './utils/FileSystemTreeUtils.js';
import {
  type PackageableElement,
  ROOT_PACKAGE_NAME,
  Package,
  Unit,
  PrimitiveType,
  getElementRootPackage,
  isDependencyElement,
  type Class,
  type RelationalDatabaseConnection,
  type Database,
} from '@finos/legend-graph';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { DatabaseBuilderWizardState } from './editor-state/element-editor-state/connection/DatabaseBuilderWizardState.js';
import { DatabaseModelBuilderState } from './editor-state/element-editor-state/connection/DatabaseModelBuilderState.js';

export enum ExplorerTreeRootPackageLabel {
  FILE_GENERATION = 'generated-files',
  MODEL_GENERATION = 'generated-models',
  SYSTEM = 'system',
  PROJECT_DEPENDENCY = 'dependencies',
}

export class ExplorerTreeState {
  readonly editorStore: EditorStore;

  readonly buildState = ActionState.create();

  treeData?: TreeData<PackageTreeNodeData> | undefined;
  generationTreeData?: TreeData<PackageTreeNodeData> | undefined;
  systemTreeData?: TreeData<PackageTreeNodeData> | undefined;
  legalTreeData?: TreeData<PackageTreeNodeData> | undefined;
  dependencyTreeData?: TreeData<PackageTreeNodeData> | undefined;
  selectedNode?: PackageTreeNodeData | undefined;
  artifactsGenerationTreeData?: TreeData<FileSystemTreeNodeData> | undefined;

  elementToRename?: PackageableElement | undefined;
  classToGenerateSampleData?: Class | undefined;
  databaseBuilderState: DatabaseBuilderWizardState | undefined;
  databaseModelBuilderState: DatabaseModelBuilderState | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      treeData: observable.ref,
      generationTreeData: observable.ref,
      systemTreeData: observable.ref,
      legalTreeData: observable.ref,
      dependencyTreeData: observable.ref,
      artifactsGenerationTreeData: observable.ref,
      selectedNode: observable.ref,
      elementToRename: observable,
      classToGenerateSampleData: observable,
      databaseBuilderState: observable,
      databaseModelBuilderState: observable,
      setTreeData: action,
      setGenerationTreeData: action,
      setSystemTreeData: action,
      setLegalTreeData: action,
      setDependencyTreeData: action,
      setArtifactsGenerationTreeData: action,
      setSelectedNode: action,
      setElementToRename: action,
      setClassToGenerateSampleData: action,
      build: action,
      buildImmutableModelTrees: action,
      buildTreeInTextMode: action,
      buildDatabaseModels: action,
      openExplorerTreeNodes: action,
      reprocess: action,
      buildDatabase: action,
      setDatabaseBuilderState: action,
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
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
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
      : (this.selectedNode.packageableElement.package ??
          this.editorStore.graphManagerState.graph.root);
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
  setArtifactsGenerationTreeData(data: TreeData<FileSystemTreeNodeData>): void {
    this.artifactsGenerationTreeData = data;
  }
  setElementToRename(val: PackageableElement | undefined): void {
    this.elementToRename = val;
  }
  setClassToGenerateSampleData(val: Class | undefined): void {
    this.classToGenerateSampleData = val;
  }

  setDatabaseBuilderState(val: DatabaseBuilderWizardState | undefined): void {
    this.databaseBuilderState = val;
  }
  buildDatabase(val: RelationalDatabaseConnection, isReadOnly: boolean): void {
    const dbBuilderState = new DatabaseBuilderWizardState(
      this.editorStore,
      val,
      isReadOnly,
    );
    dbBuilderState.setShowModal(true);
    this.setDatabaseBuilderState(dbBuilderState);
  }
  setDatabaseModelBuilderState(
    val: DatabaseModelBuilderState | undefined,
  ): void {
    this.databaseModelBuilderState = val;
  }
  buildDatabaseModels(val: Database, isReadOnly: boolean): void {
    const dbBuilderState = new DatabaseModelBuilderState(
      this.editorStore,
      val,
      isReadOnly,
      this.editorStore.graphManagerState.graph,
    );
    dbBuilderState.setShowModal(true);
    this.setDatabaseModelBuilderState(dbBuilderState);
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
    this.artifactsGenerationTreeData = getFileSystemTreeData(
      this.editorStore.graphState.graphGenerationState.rootFileDirectory,
      ExplorerTreeRootPackageLabel.FILE_GENERATION,
    );
    this.setSelectedNode(undefined);
    this.buildState.complete();
  }

  buildTreeInTextMode(): void {
    this.buildState.reset();
    if (!this.systemTreeData) {
      this.systemTreeData = getPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.systemModel.root,
        ExplorerTreeRootPackageLabel.SYSTEM,
      );
    }
    if (!this.dependencyTreeData) {
      this.dependencyTreeData = getDependenciesPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.graph.dependencyManager.roots,
        ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY,
      );
    }
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
    this.artifactsGenerationTreeData = getFileSystemTreeData(
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
    this.dependencyTreeData = getDependenciesPackableElementTreeData(
      this.editorStore,
      this.editorStore.graphManagerState.graph.dependencyManager.roots,
      ExplorerTreeRootPackageLabel.PROJECT_DEPENDENCY,
    );
  }

  openExplorerTreeNodes(
    mainTreeOpenedNodeIds: string[],
    generationTreeOpenedNodeIds: string[],
    selectedNodeId: string | undefined,
  ): void {
    // Main tree
    {
      const openElements = new Set(
        mainTreeOpenedNodeIds
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
        guaranteeNonNullable(this.treeData),
      );
    }
    // Generated tree
    {
      const openElements = new Set(
        generationTreeOpenedNodeIds
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
        guaranteeNonNullable(this.generationTreeData),
      );
      if (
        generationTreeOpenedNodeIds.includes(ROOT_PACKAGE_NAME.MODEL_GENERATION)
      ) {
        openNodeById(
          ROOT_PACKAGE_NAME.MODEL_GENERATION,
          this.generationTreeData,
        );
      }
    }
    {
      if (selectedNodeId) {
        const element =
          this.editorStore.graphManagerState.graph.getNullableElement(
            selectedNodeId,
          );
        if (element) {
          const openingNode =
            openNode(
              this.editorStore,
              element,
              guaranteeNonNullable(this.treeData),
            ) ??
            openNode(
              this.editorStore,
              element,
              guaranteeNonNullable(this.generationTreeData),
            );
          // ?? openNode(element, this.systemTreeData)
          // ?? openNode(element, this.legalTreeData)
          // ?? openNode(element, this.dependencyTreeData);
          this.setSelectedNode(openingNode);
        } else {
          this.setSelectedNode(undefined);
        }
      }
    }
  }

  /**
   * FIXME: this method should be replaced altogether as this could potentially cause memory leak when we `replace` the graph
   * When we refresh the graph (after compilation in text mode for example), we want to reprocess the app to
   * preserve the status of the explorer tree (opening nodes, selected nodes, etc.)
   *
   * @risk memory-leak
   */
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
      this.dependencyTreeData = getDependenciesPackableElementTreeData(
        this.editorStore,
        this.editorStore.graphManagerState.graph.dependencyManager.roots,
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
    this.artifactsGenerationTreeData = getFileSystemTreeData(
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
      this.editorStore.graphEditorMode.openElement(node.packageableElement);
    }
    // Expand package element
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.packageableElement instanceof Package) {
        populatePackageTreeNodeChildren(
          this.editorStore,
          node,
          treeData,
          rootPackageName === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
        );
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
    const rootPackageName = getElementRootPackage(element).name;
    let opened = false;
    if (rootPackageName === ROOT_PACKAGE_NAME.MAIN && this.treeData) {
      const openingNode = openNode(this.editorStore, element, this.treeData);
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (
      rootPackageName === ROOT_PACKAGE_NAME.MODEL_GENERATION &&
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
      rootPackageName === ROOT_PACKAGE_NAME.SYSTEM &&
      this.systemTreeData
    ) {
      const openingNode = openNode(
        this.editorStore,
        element,
        this.systemTreeData,
      );
      this.setSelectedNode(openingNode);
      opened = true;
    } else if (isDependencyElement(element) && this.dependencyTreeData) {
      const openingNode = openNode(
        this.editorStore,
        element,
        this.dependencyTreeData,
        undefined,
        true,
      );
      this.setSelectedNode(openingNode);
      opened = true;
    }
    if (!opened) {
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.PACKAGE_TREE_BUILDER_FAILURE),
        `Can't open package tree node for element '${element.path}' with root package '${rootPackageName}'`,
      );
    }
  }

  getArtifactsGenerationTreeData(): TreeData<FileSystemTreeNodeData> {
    return guaranteeNonNullable(
      this.artifactsGenerationTreeData,
      'File generation tree data has not been initialized',
    );
  }
}
