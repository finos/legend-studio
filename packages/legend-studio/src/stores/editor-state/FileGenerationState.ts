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

import type { EditorStore } from '../EditorStore';
import { observable, action, flow, makeAutoObservable } from 'mobx';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import type { TreeData } from '@finos/legend-studio-components';
import type {
  GenerationTreeNodeData,
  GenerationFile,
  GenerationOutputResult,
} from '../shared/FileGenerationTreeUtil';
import {
  GenerationDirectory,
  GENERATION_FILE_ROOT_NAME,
  getGenerationTreeData,
  openNode,
  populateDirectoryTreeNodeChildren,
  processGenerationResultToGenerationDirectory,
  reprocessOpenNodes,
} from '../shared/FileGenerationTreeUtil';
import type { FileGenerationSpecification } from '../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { PackageableElement } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import {
  PackageableElementReference,
  PackageableElementExplicitReference,
} from '../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import type { GenerationOutput } from '../../models/metamodels/pure/action/generation/GenerationOutput';
import { ELEMENT_PATH_DELIMITER } from '../../models/MetaModelConst';

export class FileGenerationState {
  editorStore: EditorStore;
  fileGeneration: FileGenerationSpecification;
  isGenerating = false;
  root: GenerationDirectory;
  directoryTreeData?: TreeData<GenerationTreeNodeData>;
  selectedNode?: GenerationTreeNodeData;
  filesIndex = new Map<string, GenerationFile>();

  constructor(
    editorStore: EditorStore,
    fileGeneration: FileGenerationSpecification,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      fileGeneration: false,
      directoryTreeData: observable.ref,
      selectedNode: observable.ref,
      resetFileGeneration: action,
      setIsGeneration: action,
      setDirectoryTreeData: action,
      processGenerationResult: action,
      reprocessNodeTree: action,
      setSelectedNode: action,
      onTreeNodeSelect: action,
      addScopeElement: action,
      deleteScopeElement: action,
    });

    this.editorStore = editorStore;
    this.fileGeneration = fileGeneration;
    this.root = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }

  resetFileGeneration(): void {
    this.fileGeneration.configurationProperties = [];
  }
  setIsGeneration(isGenerating: boolean): void {
    this.isGenerating = isGenerating;
  }
  setDirectoryTreeData(
    directoryTreeData: TreeData<GenerationTreeNodeData>,
  ): void {
    this.directoryTreeData = directoryTreeData;
  }
  getOrCreateDirectory = (directoryName: string): GenerationDirectory =>
    GenerationDirectory.getOrCreateDirectory(this.root, directoryName, true);

  generate = flow(function* (this: FileGenerationState) {
    this.isGenerating = true;
    try {
      // avoid wasting a network call when the scope is empty, we can short-circuit this
      if (!this.fileGeneration.scopeElements.length) {
        this.selectedNode = undefined;
        this.processGenerationResult([]);
        return;
      }
      const mode =
        this.editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
          this.fileGeneration.type,
        ).generationMode;
      const result =
        (yield this.editorStore.graphState.graphManager.generateFile(
          this.fileGeneration,
          mode,
          this.editorStore.graphState.graph,
        )) as GenerationOutput[];
      this.processGenerationResult(result);
    } catch (error: unknown) {
      this.selectedNode = undefined;
      this.processGenerationResult([]);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GENERATION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGenerating = false;
    }
  });

  processGenerationResult(output: GenerationOutput[]): void {
    this.root = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
    this.filesIndex = new Map<string, GenerationFile>();
    const openedNodeIds = this.directoryTreeData
      ? Array.from(this.directoryTreeData.nodes.values())
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    const generationResultMap = new Map<string, GenerationOutputResult>();
    const rootFolder =
      this.fileGeneration.generationOutputPath ??
      this.fileGeneration.path.split(ELEMENT_PATH_DELIMITER).join('_');
    output.forEach((entry) => {
      entry.cleanFileName(rootFolder);
      if (generationResultMap.has(entry.fileName)) {
        this.editorStore.applicationStore.logger.warn(
          CORE_LOG_EVENT.CODE_GENERATION_PROBLEM,
          'Found 2 generation outputs with same path',
        );
      }
      generationResultMap.set(entry.fileName, {
        generationOutput: entry,
        parentId: this.fileGeneration.path,
      });
    });
    // take generation outputs and put them into the root directory
    processGenerationResultToGenerationDirectory(
      this.root,
      generationResultMap,
      this.filesIndex,
    );
    this.directoryTreeData = getGenerationTreeData(this.root);
    this.reprocessNodeTree(
      Array.from(generationResultMap.values()),
      this.directoryTreeData,
      openedNodeIds,
    );
  }

  reprocessNodeTree(
    generationResult: GenerationOutputResult[],
    treeData: TreeData<GenerationTreeNodeData>,
    openedNodeIds: string[],
  ): void {
    reprocessOpenNodes(treeData, this.filesIndex, this.root, openedNodeIds);
    // select the current file node if available, else select the first output
    const selectedFileNodePath =
      this.selectedNode?.fileNode.path ??
      (generationResult.length === 1
        ? generationResult[0].generationOutput.fileName
        : undefined);
    if (selectedFileNodePath) {
      const file = this.filesIndex.get(selectedFileNodePath);
      if (file) {
        const node = openNode(file, treeData);
        if (node) {
          this.onTreeNodeSelect(node, treeData);
        }
      } else {
        this.selectedNode = undefined;
      }
    }
    this.setDirectoryTreeData({ ...treeData });
  }

  setSelectedNode(node?: GenerationTreeNodeData): void {
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
    }
    if (node) {
      node.isSelected = true;
    }
    this.selectedNode = node;
  }

  onTreeNodeSelect(
    node: GenerationTreeNodeData,
    treeData: TreeData<GenerationTreeNodeData>,
  ): void {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.fileNode instanceof GenerationDirectory) {
        populateDirectoryTreeNodeChildren(node, treeData);
      }
    }
    this.setSelectedNode(node);
    this.setDirectoryTreeData({ ...treeData });
  }

  getScopeElement = (
    element: PackageableElement | string,
  ): PackageableElementReference<PackageableElement> | string | undefined =>
    this.fileGeneration.scopeElements.find((el) =>
      el instanceof PackageableElementReference
        ? el.value === element
        : element === el,
    );

  addScopeElement(element: PackageableElement | string): void {
    const el = this.getScopeElement(element);
    if (!el) {
      this.fileGeneration.addScopeElement(
        element instanceof PackageableElement
          ? PackageableElementExplicitReference.create(element)
          : element,
      );
    }
  }

  deleteScopeElement(element: PackageableElement | string): void {
    const el = this.getScopeElement(element);
    if (el) {
      this.fileGeneration.deleteScopeElement(el);
    }
  }
}
