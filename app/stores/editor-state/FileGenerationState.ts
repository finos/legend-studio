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

import { EditorStore } from 'Stores/EditorStore';
import { observable, action, flow } from 'mobx';
import { GenerationOutput } from 'EXEC/generation/GenerationOutput';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { TreeData } from 'Utilities/TreeUtil';
import { GenerationInput } from 'EXEC/generation/GenerationInput';
import { executionClient } from 'API/ExecutionClient';
import { deserialize } from 'serializr';
import { GenerationTreeNodeData, GenerationDirectory, GENERATION_FILE_ROOT_NAME, GenerationFile, getGenerationTreeData, openNode, populateDirectoryTreeNodeChildren, GenerationOutputResult, processGenerationResultToGenerationDirectory, reprocessOpenNodes } from 'Utilities/FileGenerationTreeUtil';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PackageableElementReference, PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';

export class FileGenerationState {
  editorStore: EditorStore;
  fileGeneration: FileGeneration;
  @observable isGenerating = false;
  @observable root: GenerationDirectory;
  @observable.ref directoryTreeData?: TreeData<GenerationTreeNodeData>;
  @observable.ref selectedNode?: GenerationTreeNodeData;
  @observable filesIndex = new Map<string, GenerationFile>();

  constructor(editorStore: EditorStore, fileGeneration: FileGeneration) {
    this.editorStore = editorStore;
    this.fileGeneration = fileGeneration;
    this.root = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }

  @action resetFileGeneration(): void { this.fileGeneration.configurationProperties = [] }
  @action setIsGeneration(isGenerating: boolean): void { this.isGenerating = isGenerating }
  @action setDirectoryTreeData(directoryTreeData: TreeData<GenerationTreeNodeData>): void { this.directoryTreeData = directoryTreeData }
  getOrCreateDirectory = (directoryName: string): GenerationDirectory => GenerationDirectory.getOrCreateDirectory(this.root, directoryName, true);

  generate = flow(function* (this: FileGenerationState) {
    this.isGenerating = true;
    try {
      // avoid wasting a network call when the scope is empty, we can short-circuit this
      if (!this.fileGeneration.scopeElements.length) {
        this.selectedNode = undefined;
        this.processGenerationResult([]);
        return;
      }
      const input = new GenerationInput(this.editorStore.graphState.getFullGraphModelData(), this.fileGeneration.createConfig());
      const result = ((yield executionClient.generateFile(this.editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(this.fileGeneration.type).generationMode, this.fileGeneration.type, input)) as unknown as GenerationOutput[])
        .map(generationOutput => deserialize(GenerationOutput, generationOutput));
      this.processGenerationResult(result);
    } catch (error) {
      this.selectedNode = undefined;
      this.processGenerationResult([]);
      Log.error(LOG_EVENT.GENERATION_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGenerating = false;
    }
  });

  @action processGenerationResult(output: GenerationOutput[]): void {
    this.root = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
    this.filesIndex = new Map<string, GenerationFile>();
    const openedNodeIds = this.directoryTreeData ? Array.from(this.directoryTreeData.nodes.values()).filter(node => node.isOpen).map(node => node.id) : [];
    const generationResultMap = new Map<string, GenerationOutputResult>();
    output.forEach(item => {
      item.cleanFileName();
      if (generationResultMap.has(item.fileName)) {
        Log.warn(LOG_EVENT.CODE_GENERATION_PROBLEM, 'Found 2 generation outputs with same path');
      }
      generationResultMap.set(item.fileName, { generationOutput: item, parentId: this.fileGeneration.path });
    });
    // take generation outputs and put them into the root directory
    processGenerationResultToGenerationDirectory(this.root, generationResultMap, this.filesIndex);
    this.directoryTreeData = getGenerationTreeData(this.root);
    this.reprocessNodeTree(Array.from(generationResultMap.values()), this.directoryTreeData, openedNodeIds);
  }

  @action reprocessNodeTree(generationResult: GenerationOutputResult[], treeData: TreeData<GenerationTreeNodeData>, openedNodeIds: string[]): void {
    reprocessOpenNodes(treeData, this.filesIndex, this.root, openedNodeIds);
    // select the current file node if available, else select the first output
    const selectedFileNodePath = this.selectedNode?.fileNode.path ?? (generationResult.length === 1 ? generationResult[0].generationOutput.fileName : undefined);
    if (selectedFileNodePath) {
      const file = this.filesIndex.get(selectedFileNodePath);
      if (file) {
        const node = openNode(file, treeData);
        if (node) { this.onTreeNodeSelect(node, treeData) }
      } else {
        this.selectedNode = undefined;
      }
    }
    this.setDirectoryTreeData({ ...treeData });
  }

  @action setSelectedNode(node?: GenerationTreeNodeData): void {
    if (this.selectedNode) { this.selectedNode.isSelected = false }
    if (node) { node.isSelected = true }
    this.selectedNode = node;
  }

  @action onTreeNodeSelect(node: GenerationTreeNodeData, treeData: TreeData<GenerationTreeNodeData>): void {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.fileNode instanceof GenerationDirectory) {
        populateDirectoryTreeNodeChildren(node, treeData);
      }
    }
    this.setSelectedNode(node);
    this.setDirectoryTreeData({ ...treeData });
  }

  getScopeElement = (element: PackageableElement | string): PackageableElementReference<PackageableElement> | string | undefined => this.fileGeneration.scopeElements.find(el => el instanceof PackageableElementReference ? (el.value === element) : (element === el));

  @action addScopeElement(element: PackageableElement | string): void {
    const el = this.getScopeElement(element);
    if (!el) {
      this.fileGeneration.addScopeElement(element instanceof PackageableElement ? PackageableElementExplicitReference.create(element) : element);
    }
  }

  @action deleteScopeElement(element: PackageableElement | string): void {
    const el = this.getScopeElement(element);
    if (el) {
      this.fileGeneration.deleteScopeElement(el);
    }
  }
}
