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

import { observable, flow, action, computed, makeObservable } from 'mobx';
import type { Entity } from '../../models/sdlc/models/entity/Entity';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import type {
  GenerationTreeNodeData,
  GenerationOutputResult,
} from '../shared/FileGenerationTreeUtil';
import {
  GenerationDirectory,
  GENERATION_FILE_ROOT_NAME,
  GenerationFile,
  getGenerationTreeData,
  openNode,
  populateDirectoryTreeNodeChildren,
  processGenerationResultToGenerationDirectory,
  reprocessOpenNodes,
} from '../shared/FileGenerationTreeUtil';
import type { TreeData } from '@finos/legend-studio-components';
import type { EditorStore } from '../EditorStore';
import { ExplorerTreeRootPackageLabel } from '../ExplorerTreeState';
import { FileGenerationViewerState } from './FileGenerationViewerState';
import type { EditorState } from './EditorState';
import { ElementEditorState } from './element-editor-state/ElementEditorState';
import { ElementFileGenerationState } from './element-editor-state/ElementFileGenerationState';
import type { GenerationConfigurationDescription } from '../../models/metamodels/pure/action/generation/GenerationConfigurationDescription';
import type { PackageableElement } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import {
  DEFAULT_GENERATION_SPECIFICATION_NAME,
  GenerationSpecification,
} from '../../models/metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import type { FileGenerationTypeOption } from '../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { Class } from '../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import type { GenerationOutput } from '../../models/metamodels/pure/action/generation/GenerationOutput';
import type { DSLGenerationSpecification_PureGraphManagerPlugin_Extension } from '../../models/metamodels/pure/graph/DSLGenerationSpecification_PureGraphManagerPlugin_Extension';
import { ELEMENT_PATH_DELIMITER } from '../../models/MetaModelConst';

export class GraphGenerationState {
  editorStore: EditorStore;
  isRunningGlobalGenerate = false;
  generatedEntities = new Map<string, Entity[]>();
  isClearingGenerationEntities = false;
  fileGenerationConfigurations: GenerationConfigurationDescription[] = [];
  // File generation output
  rootFileDirectory: GenerationDirectory;
  filesIndex = new Map<string, GenerationFile>();
  selectedNode?: GenerationTreeNodeData;

  constructor(editorStore: EditorStore) {
    makeObservable<GraphGenerationState>(this, {
      isRunningGlobalGenerate: observable,
      generatedEntities: observable.shallow,
      isClearingGenerationEntities: observable,
      fileGenerationConfigurations: observable,
      rootFileDirectory: observable,
      filesIndex: observable,
      selectedNode: observable.ref,
      fileGenerationConfigurationOptions: computed,
      supportedFileGenerationConfigurationsForCurrentElement: computed,
      setFileGenerationConfigurations: action,
      addMissingGenerationSpecifications: action,
      processGenerationResult: action,
      reprocessGenerationFileState: action,
      reprocessNodeTree: action,
      onTreeNodeSelect: action,
      setSelectedNode: action,
      emptyFileGeneration: action,
    });

    this.editorStore = editorStore;
    this.rootFileDirectory = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }

  get fileGenerationConfigurationOptions(): FileGenerationTypeOption[] {
    return this.fileGenerationConfigurations
      .slice()
      .sort((a, b): number => a.label.localeCompare(b.label))
      .map((config) => ({
        label: config.label,
        value: config.key,
      }));
  }

  get supportedFileGenerationConfigurationsForCurrentElement(): GenerationConfigurationDescription[] {
    if (this.editorStore.currentEditorState instanceof ElementEditorState) {
      const currentElement = this.editorStore.currentEditorState.element;
      if (
        currentElement instanceof Class ||
        currentElement instanceof Enumeration
      ) {
        return this.fileGenerationConfigurations
          .slice()
          .sort((a, b): number => a.label.localeCompare(b.label));
      }
    }
    return [];
  }

  setFileGenerationConfigurations(
    fileGenerationConfigurations: GenerationConfigurationDescription[],
  ): void {
    this.fileGenerationConfigurations = fileGenerationConfigurations;
  }

  getFileGenerationConfiguration(
    type: string,
  ): GenerationConfigurationDescription {
    return guaranteeNonNullable(
      this.fileGenerationConfigurations.find((config) => config.key === type),
      `Can't find configuration description for file generation type '${type}'`,
    );
  }

  fetchAvailableFileGenerationDescriptions = flow(function* (
    this: GraphGenerationState,
  ) {
    try {
      const availableFileGenerationDescriptions =
        (yield this.editorStore.graphState.graphManager.getAvailableGenerationConfigurationDescriptions()) as unknown as GenerationConfigurationDescription[];
      this.setFileGenerationConfigurations(availableFileGenerationDescriptions);
      this.editorStore.elementGenerationStates =
        this.fileGenerationConfigurations.map(
          (config) =>
            new ElementFileGenerationState(this.editorStore, config.key),
        );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GENERATION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  /**
   * Global generation is tied to the generation specification of the project. Every time a generation element
   * is added, they will be added to the generation specification
   */
  globalGenerate = flow(function* (this: GraphGenerationState) {
    if (
      this.editorStore.graphState.checkIfApplicationUpdateOperationIsRunning()
    ) {
      return;
    }
    this.isRunningGlobalGenerate = true;
    try {
      yield this.generateModels();
      yield this.generateFiles();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GENERATION_PROBLEM,
        error,
      );
      this.editorStore.graphState.editorStore.applicationStore.notifyError(
        `${error.message}`,
      );
    } finally {
      this.isRunningGlobalGenerate = false;
    }
  });

  generateModels = flow(function* (this: GraphGenerationState) {
    try {
      this.generatedEntities = new Map<string, Entity[]>(); // reset the map of generated entities
      const generationSpecs =
        this.editorStore.graphState.graph.generationSpecifications;
      if (!generationSpecs.length) {
        return;
      }
      if (generationSpecs.length > 1) {
        throw new Error(
          'Only one generation specification permitted to generate',
        );
      }
      const generationSpec = generationSpecs[0];
      const generationNodes = generationSpec.generationNodes;
      for (let i = 0; i < generationNodes.length; i++) {
        const node = generationNodes[i];
        let generatedEntities: Entity[] = [];
        /* @MARKER: FIX TRY CATCH ERRORING */
        try {
          generatedEntities = (yield this.generateGenerationElement(
            node.generationElement.value,
          )) as unknown as Entity[];
        } catch (error: unknown) {
          assertErrorThrown(error);
          throw new Error(
            `Generation failed in step ${i + 1} for element ${
              node.generationElement.value.path
            }: ${error.message}`,
          );
        }
        this.generatedEntities.set(
          node.generationElement.value.path,
          generatedEntities,
        );
        yield this.editorStore.graphState.updateGenerationGraphAndApplication();
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GENERATION_PROBLEM,
        error,
      );
      this.editorStore.graphState.editorStore.applicationStore.notifyError(
        `${error.message}`,
      );
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
      const generationSpecs =
        this.editorStore.graphState.graph.generationSpecifications;
      if (!generationSpecs.length) {
        return;
      }
      if (generationSpecs.length > 1) {
        throw new Error(
          'Only one generation specification permitted to generate',
        );
      }
      const generationSpec = generationSpecs[0];
      const fileGenerations = generationSpec.fileGenerations;
      // we don't need to keep 'fetching' the main model as it won't grow with each file generation
      for (const fileGeneration of fileGenerations) {
        let result: GenerationOutput[] = [];
        try {
          const mode =
            this.editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
              fileGeneration.value.type,
            ).generationMode;
          result = (yield this.editorStore.graphState.graphManager.generateFile(
            fileGeneration.value,
            mode,
            this.editorStore.graphState.graph,
          )) as GenerationOutput[];
        } catch (error: unknown) {
          assertErrorThrown(error);
          throw new Error(
            `Failed generating files for ${fileGeneration.value.path}: ${error.message}`,
          );
        }
        generationResultMap.set(fileGeneration.value.path, result);
      }
      this.processGenerationResult(generationResultMap);
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GENERATION_PROBLEM,
        error,
      );
      this.editorStore.graphState.editorStore.applicationStore.notifyError(
        `${error.message}`,
      );
    }
  });

  /**
   * Used to clear generation entities as well as the generation model
   */
  clearGenerations = flow(function* (this: GraphGenerationState) {
    this.isClearingGenerationEntities = true;
    this.generatedEntities = new Map<string, Entity[]>();
    this.emptyFileGeneration();
    yield this.editorStore.graphState.updateGenerationGraphAndApplication();
    this.isClearingGenerationEntities = false;
  });

  /**
   * Method takes a generation element, defined as a packageable element that generates another model, and returns generated entities
   */
  generateGenerationElement = flow(function* (
    this: GraphGenerationState,
    generationElement: PackageableElement,
  ): GeneratorFn<Entity[]> {
    return (yield this.editorStore.graphState.graphManager.generateModel(
      generationElement,
      this.editorStore.graphState.graph,
    )) as Entity[];
  });

  /**
   * Method adds generation specification if
   * 1. no generation specification has been defined in graph
   * 2. there exists a generation element
   */
  addMissingGenerationSpecifications(): void {
    if (!this.editorStore.graphState.graph.generationSpecifications.length) {
      const modelGenerationElements =
        this.editorStore.applicationStore.pluginManager
          .getPureGraphManagerPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSLGenerationSpecification_PureGraphManagerPlugin_Extension
              ).getExtraModelGenerationElementGetters?.() ?? [],
          )
          .flatMap((getter) => getter(this.editorStore.graphState.graph));
      const fileGenerations = this.editorStore.graphState.graph.fileGenerations;
      if (modelGenerationElements.length || fileGenerations.length) {
        const generationSpec = new GenerationSpecification(
          DEFAULT_GENERATION_SPECIFICATION_NAME,
        );
        modelGenerationElements.forEach((e) =>
          generationSpec.addGenerationElement(e),
        );
        fileGenerations.forEach((e) => generationSpec.addFileGeneration(e));
        // NOTE: add generation specification at the same package as the first generation element found.
        // we might want to revisit this decision?
        const specPackage = guaranteeNonNullable(
          [...modelGenerationElements, ...fileGenerations][0].package,
        );
        specPackage.addElement(generationSpec);
        this.editorStore.graphState.graph.addElement(generationSpec);
      }
    }
  }

  // File Generation Tree
  processGenerationResult(
    fileGenerationOutputMap: Map<string, GenerationOutput[]>,
  ): void {
    // empty file index and the directory, we keep the open nodes to reprocess them
    this.emptyFileGeneration();
    const directoryTreeData =
      this.editorStore.graphState.editorStore.explorerTreeState
        .fileGenerationTreeData;
    const openedNodeIds = directoryTreeData
      ? Array.from(directoryTreeData.nodes.values())
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    // we read the generation outputs and clean
    const generationResultMap = new Map<string, GenerationOutputResult>();
    Array.from(fileGenerationOutputMap.entries()).forEach((entry) => {
      const fileGeneration =
        this.editorStore.graphState.graph.getNullableFileGeneration(entry[0]);
      const rootFolder =
        fileGeneration?.generationOutputPath ??
        fileGeneration?.path.split(ELEMENT_PATH_DELIMITER).join('_');
      const generationOutputs = entry[1];
      generationOutputs.forEach((genOutput) => {
        genOutput.cleanFileName(rootFolder);
        if (generationResultMap.has(genOutput.fileName)) {
          this.editorStore.applicationStore.logger.warn(
            CORE_LOG_EVENT.CODE_GENERATION_PROBLEM,
            `Found 2 generation outputs with same path '${genOutput.fileName}'`,
          );
        }
        generationResultMap.set(genOutput.fileName, {
          generationOutput: genOutput,
          parentId: fileGeneration?.path,
        });
      });
    });
    // take generation outputs and put them into the root directory
    processGenerationResultToGenerationDirectory(
      this.rootFileDirectory,
      generationResultMap,
      this.filesIndex,
    );
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(
      getGenerationTreeData(
        this.rootFileDirectory,
        ExplorerTreeRootPackageLabel.FILE_GENERATION,
      ),
    );
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(
      this.reprocessNodeTree(
        Array.from(generationResultMap.values()),
        this.editorStore.graphState.editorStore.explorerTreeState.getFileGenerationTreeData(),
        openedNodeIds,
      ),
    );
    this.editorStore.openedEditorStates = this.editorStore.openedEditorStates
      .map((e) => this.reprocessGenerationFileState(e))
      .filter(isNonNullable);
    const currentEditorState = this.editorStore.currentEditorState;
    if (currentEditorState instanceof FileGenerationViewerState) {
      this.editorStore.currentEditorState =
        this.editorStore.openedEditorStates.find(
          (e) =>
            e instanceof FileGenerationViewerState &&
            e.generatedFile.path === currentEditorState.generatedFile.path,
        );
    }
  }

  reprocessGenerationFileState(
    editorState: EditorState,
  ): EditorState | undefined {
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

  reprocessNodeTree(
    generationResult: GenerationOutputResult[],
    treeData: TreeData<GenerationTreeNodeData>,
    openedNodeIds: string[],
  ): TreeData<GenerationTreeNodeData> {
    reprocessOpenNodes(
      treeData,
      this.filesIndex,
      this.rootFileDirectory,
      openedNodeIds,
      true,
    );
    const selectedFileNodePath =
      this.selectedNode?.fileNode.path ??
      (generationResult.length === 1
        ? generationResult[0].generationOutput.fileName
        : undefined);
    if (selectedFileNodePath) {
      const file = this.filesIndex.get(selectedFileNodePath);
      if (file) {
        const node = openNode(file, treeData, true);
        if (node) {
          this.onTreeNodeSelect(node, treeData, true);
        }
      } else {
        this.selectedNode = undefined;
      }
    }
    return treeData;
  }

  onTreeNodeSelect(
    node: GenerationTreeNodeData,
    treeData: TreeData<GenerationTreeNodeData>,
    reprocess?: boolean,
  ): void {
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
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(
      { ...treeData },
    );
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

  emptyFileGeneration(): void {
    this.filesIndex = new Map<string, GenerationFile>();
    this.rootFileDirectory = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }
}
