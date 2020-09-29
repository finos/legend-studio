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

import { observable, flow, action, computed } from 'mobx';
import { Entity } from 'SDLC/entity/Entity';
import { executionClient } from 'API/ExecutionClient';
import { deserialize } from 'serializr';
import { guaranteeNonNullable, isNonNullable } from 'Utilities/GeneralUtil';
import { LOG_EVENT, Log } from 'Utilities/Logger';
import { GenerationOutput } from 'EXEC/generation/GenerationOutput';
import { GenerationInput } from 'EXEC/generation/GenerationInput';
import { GenerationDirectory, GENERATION_FILE_ROOT_NAME, GenerationFile, getGenerationTreeData, GenerationTreeNodeData, openNode, populateDirectoryTreeNodeChildren, processGenerationResultToGenerationDirectory, reprocessOpenNodes, GenerationOutputResult } from 'Utilities/FileGenerationTreeUtil';
import { TreeData } from 'Utilities/TreeUtil';
import { EditorStore } from 'Stores/EditorStore';
import { ExplorerTreeRootPackageLabel } from 'Stores/ExplorerTreeState';
import { FileGenerationViewerState } from './FileGenerationViewerState';
import { EditorState } from './EditorState';
import { GenerationConfigurationDescription } from 'EXEC/fileGeneration/GenerationConfigurationDescription';
import { ElementEditorState } from './element-editor-state/ElementEditorState';
import { ElementFileGenerationState } from './element-editor-state/ElementFileGenerationState';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { DEFAULT_GENERATION_SPECIFICATION_NAME, GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { FileGenerationTypeOption, FILE_GENERATION_MODE } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';

export class GraphGenerationState {
  editorStore: EditorStore;
  @observable isRunningGlobalGenerate = false;
  @observable generatedEntities = new Map<string, Entity[]>();
  @observable isClearingGenerationEntities = false;
  @observable fileGenerationConfigurations: GenerationConfigurationDescription[] = [];
  // File generation output
  @observable rootFileDirectory: GenerationDirectory;
  @observable filesIndex = new Map<string, GenerationFile>();
  @observable.ref selectedNode?: GenerationTreeNodeData;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    this.rootFileDirectory = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }

  @computed private get supportedFileGenerationConfigurations(): GenerationConfigurationDescription[] {
    return this.fileGenerationConfigurations
      .slice()
      .sort((a, b): number => a.label.localeCompare(b.label));
  }

  @computed get fileGenerationConfigurationOptions(): FileGenerationTypeOption[] {
    return this.supportedFileGenerationConfigurations.map(config => ({ label: config.label, value: config.type }));
  }

  @computed get supportedFileGenerationConfigurationsForCurrentElement(): GenerationConfigurationDescription[] {
    if (this.editorStore.currentEditorState instanceof ElementEditorState) {
      const currentElement = this.editorStore.currentEditorState.element;
      if (currentElement instanceof Class || currentElement instanceof Enumeration) {
        return this.supportedFileGenerationConfigurations;
      }
    }
    return [];
  }

  @action setFileGenerationConfigurations(fileGenerationConfigurations: GenerationConfigurationDescription[]): void {
    this.fileGenerationConfigurations = fileGenerationConfigurations;
  }

  getFileGenerationConfiguration(type: string): GenerationConfigurationDescription {
    return guaranteeNonNullable(this.fileGenerationConfigurations.find(config => config.type === type), `Can't find configuration description for file generation type '${type}'`);
  }

  fetchAvailableFileGenerationDescriptions = flow(function* (this: GraphGenerationState) {
    try {
      const codeGenerationDescriptions = ((yield executionClient.getAvailableCodeGenerationDescriptions()) as unknown as GenerationConfigurationDescription[]).map(gen => ({ ...gen, generationMode: FILE_GENERATION_MODE.CODE_GENERATION }));
      const schemaGenerationDescriptions = ((yield executionClient.getAvailableSchemaGenerationDescriptions()) as unknown as GenerationConfigurationDescription[]).map(gen => ({ ...gen, generationMode: FILE_GENERATION_MODE.SCHEMA_GENERATION }));
      this.setFileGenerationConfigurations([...codeGenerationDescriptions, ...schemaGenerationDescriptions]
        .map(config => deserialize(GenerationConfigurationDescription, config)));
      this.editorStore.elementGenerationStates = this.fileGenerationConfigurations.map(config => new ElementFileGenerationState(this.editorStore, config.type));
    } catch (error) {
      Log.error(LOG_EVENT.GENERATION_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  })

  /**
   * Global generation is tied to the generation specification of the project. Every time a generation element
   * is added, they will be added to the generation specification
   */
  globalGenerate = flow(function* (this: GraphGenerationState) {
    if (this.editorStore.graphState.checkIfApplicationUpdateOperationIsRunning()) { return }
    this.isRunningGlobalGenerate = true;
    try {
      yield this.generateFiles();
    } catch (error) {
      Log.error(LOG_EVENT.GENERATION_PROBLEM, error);
      this.editorStore.graphState.editorStore.applicationStore.notifyError(`${error.message}`);
    } finally {
      this.isRunningGlobalGenerate = false;
    }
  });

  /**
   * Generated File Generation
   * This method does not update graph and application. the files generated
   */
  generateFiles = flow(function* (this: GraphGenerationState) {
    try {
      this.emptyFileGeneration();
      const generationResultMap = new Map<string, GenerationOutput[]>();
      const generationSpecs = this.editorStore.graphState.graph.generationSpecifications;
      if (!generationSpecs.length) {
        return;
      }
      if (generationSpecs.length > 1) {
        throw new Error('Only one generation specification permitted to generate');
      }
      const generationSpec = generationSpecs[0];
      const fileGenerations = generationSpec.fileGenerations;
      // we don't need to keep 'fetching' the main model as it won't grow with each file generation
      const model = this.editorStore.graphState.getFullGraphModelData();
      for (let i = 0; i < fileGenerations.length; i++) {
        const fileGeneration = fileGenerations[i];
        const input = new GenerationInput(model, fileGeneration.value.createConfig());
        let result: GenerationOutput[] = [];
        try {
          result = ((yield executionClient.generateFile(this.editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(fileGeneration.value.type).generationMode, fileGeneration.value.type, input)) as unknown as GenerationOutput[])
            .map(generationOutput => deserialize(GenerationOutput, generationOutput));
        } catch (error) {
          throw new Error(`Failed generating files for ${fileGeneration.value.path}: ${error.message}`);
        }
        generationResultMap.set(fileGeneration.value.path, result);
      }
      this.processGenerationResult(generationResultMap);
    } catch (error) {
      Log.error(LOG_EVENT.GENERATION_PROBLEM, error);
      this.editorStore.graphState.editorStore.applicationStore.notifyError(`${error.message}`);
    }
  })

  /**
   * Used to clear generation entities as well as the generation model
   */
  clearGenerations = flow(function* (this: GraphGenerationState) {
    this.isClearingGenerationEntities = true;
    this.generatedEntities = new Map<string, Entity[]>();
    this.emptyFileGeneration();
    yield this.editorStore.graphState.updateGenerationGraphAndApplication();
    this.isClearingGenerationEntities = false;
  })

  /**
   * Method adds generation specification if
   * 1. no generation specification has been defined in graph
   * 2. there exists a generation element
   */
  @action addMissingGenerationSpecifications(): void {
    if (!this.editorStore.graphState.graph.generationSpecifications.length) {
      /* @MARKER: NEW MODEL GENERATION TYPE SUPPORT --- consider adding new element type handler here whenever support for a new model generation type is added to the app */
      const modelGenerationElements: PackageableElement[] = [
      ];
      const fileGenerations = this.editorStore.graphState.graph.fileGenerations;
      if (modelGenerationElements.length || fileGenerations.length) {
        const generationSpec = new GenerationSpecification(DEFAULT_GENERATION_SPECIFICATION_NAME);
        modelGenerationElements.forEach(e => generationSpec.addGenerationElement(e));
        fileGenerations.forEach(e => generationSpec.addFileGeneration(e));
        // NOTE: add generation specification at the same package as the first generation element found.
        // we might want to revisit this decision?
        const specPackage = guaranteeNonNullable([...modelGenerationElements, ...fileGenerations][0].package);
        specPackage.addElement(generationSpec);
        this.editorStore.graphState.graph.addElement(generationSpec);
      }
    }
  }

  // File Generation Tree
  @action processGenerationResult(fileGenerationOutputMap: Map<string, GenerationOutput[]>): void {
    // empty file index and the directory, we keep the open nodes to reprocess them
    this.emptyFileGeneration();
    const directoryTreeData = this.editorStore.graphState.editorStore.explorerTreeState.fileGenerationTreeData;
    const openedNodeIds = directoryTreeData ? Array.from(directoryTreeData.nodes.values()).filter(node => node.isOpen).map(node => node.id) : [];
    // we read the generation outputs and clean
    const generationResultMap = new Map<string, GenerationOutputResult>();
    Array.from(fileGenerationOutputMap.entries()).forEach(entry => {
      const fileGeneration = this.editorStore.graphState.graph.getNullableFileGeneration(entry[0]);
      const generationOutputs = entry[1];
      generationOutputs.forEach(genOutput => {
        genOutput.cleanFileName();
        if (generationResultMap.has(genOutput.fileName)) {
          Log.warn(LOG_EVENT.CODE_GENERATION_PROBLEM, `Found 2 generation outputs with same path '${genOutput.fileName}'`);
        }
        generationResultMap.set(genOutput.fileName, { generationOutput: genOutput, parentId: fileGeneration?.path });
      });
    });
    // take generation outputs and put them into the root directory
    processGenerationResultToGenerationDirectory(this.rootFileDirectory, generationResultMap, this.filesIndex);
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(getGenerationTreeData(this.rootFileDirectory, ExplorerTreeRootPackageLabel.FILE_GENERATION));
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(this.reprocessNodeTree(Array.from(generationResultMap.values()), this.editorStore.graphState.editorStore.explorerTreeState.getFileGenerationTreeData(), openedNodeIds));
    this.editorStore.openedEditorStates = this.editorStore.openedEditorStates.map(e => this.reprocessGenerationFileState(e)).filter(isNonNullable);
    const currentEditorState = this.editorStore.currentEditorState;
    if (currentEditorState instanceof FileGenerationViewerState) {
      this.editorStore.currentEditorState = this.editorStore.openedEditorStates.find(e => e instanceof FileGenerationViewerState && e.generatedFile.path === currentEditorState.generatedFile.path);
    }
  }

  @action reprocessGenerationFileState(editorState: EditorState): EditorState | undefined {
    if (editorState instanceof FileGenerationViewerState) {
      const fileNode = this.filesIndex.get(editorState.generatedFile.path);
      if (fileNode) {
        editorState.generatedFile = fileNode;
        return editorState;
      } else {
        return undefined;
      }
    }
    return editorState;
  }

  @action reprocessNodeTree(generationResult: GenerationOutputResult[], treeData: TreeData<GenerationTreeNodeData>, openedNodeIds: string[]): TreeData<GenerationTreeNodeData> {
    reprocessOpenNodes(treeData, this.filesIndex, this.rootFileDirectory, openedNodeIds, true);
    const selectedFileNodePath = this.selectedNode?.fileNode.path ?? (generationResult.length === 1 ? generationResult[0].generationOutput.fileName : undefined);
    if (selectedFileNodePath) {
      const file = this.filesIndex.get(selectedFileNodePath);
      if (file) {
        const node = openNode(file, treeData, true);
        if (node) { this.onTreeNodeSelect(node, treeData, true) }
      } else {
        this.selectedNode = undefined;
      }
    }
    return treeData;
  }

  @action onTreeNodeSelect(node: GenerationTreeNodeData, treeData: TreeData<GenerationTreeNodeData>, reprocess?: boolean): void {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.fileNode instanceof GenerationDirectory) {
        populateDirectoryTreeNodeChildren(node, treeData);
      }
    }
    if (!reprocess && node.fileNode instanceof GenerationFile) {
      this.editorStore.openGeneratedFile(node.fileNode);
    }
    this.setSelectedNode(node);
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData({ ...treeData });
  }

  @action setSelectedNode(node?: GenerationTreeNodeData): void {
    if (this.selectedNode) { this.selectedNode.isSelected = false }
    if (node) { node.isSelected = true }
    this.selectedNode = node;
  }

  @action emptyFileGeneration(): void {
    this.filesIndex = new Map<string, GenerationFile>();
    this.rootFileDirectory = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }
}
