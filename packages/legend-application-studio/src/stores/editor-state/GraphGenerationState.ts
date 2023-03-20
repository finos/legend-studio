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

import {
  observable,
  flow,
  action,
  computed,
  makeObservable,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  LogEvent,
  assertTrue,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  ActionState,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../../application/LegendStudioEvent.js';
import {
  type FileSystemTreeNodeData,
  type FileResult,
  FileSystem_Directory,
  GENERATION_FILE_ROOT_NAME,
  FileSystem_File,
  openNode,
  populateDirectoryTreeNodeChildren,
  buildFileSystemDirectory,
  reprocessOpenNodes,
  getFileSystemTreeData,
} from '../shared/FileSystemTreeUtils.js';
import type { TreeData } from '@finos/legend-art';
import type { EditorStore } from '../EditorStore.js';
import { FileGenerationViewerState } from './FileGenerationViewerState.js';
import type { EditorState } from './EditorState.js';
import { ElementEditorState } from './element-editor-state/ElementEditorState.js';
import { ElementFileGenerationState } from './element-editor-state/ElementFileGenerationState.js';
import type { Entity } from '@finos/legend-storage';
import {
  type GenerationConfigurationDescription,
  type GenerationOutput,
  type DSL_Generation_PureGraphManagerPlugin_Extension,
  type GenerationTreeNode,
  Class,
  Enumeration,
  GenerationSpecification,
  ELEMENT_PATH_DELIMITER,
} from '@finos/legend-graph';
import type { DSL_Generation_LegendStudioApplicationPlugin_Extension } from '../extensions/DSL_Generation_LegendStudioApplicationPlugin_Extension.js';
import { ExternalFormatState } from './ExternalFormatState.js';
import {
  generationSpecification_addFileGeneration,
  generationSpecification_addGenerationElement,
} from '../shared/modifier/DSL_Generation_GraphModifierHelper.js';
import { ExplorerTreeRootPackageLabel } from '../ExplorerTreeState.js';

export const DEFAULT_GENERATION_SPECIFICATION_NAME =
  'MyGenerationSpecification';

export type FileGenerationTypeOption = {
  value: string;
  label: string;
};

export class GraphGenerationState {
  editorStore: EditorStore;
  isRunningGlobalGenerate = false;
  generatedEntities = new Map<string, Entity[]>();
  clearingGenerationEntitiesState = ActionState.create();
  externalFormatState: ExternalFormatState;
  // NOTE: this will eventually be removed once we also do model/schema import using external format
  // See https://github.com/finos/legend-studio/issues/866
  fileGenerationConfigurations: GenerationConfigurationDescription[] = [];
  // file generation output
  rootFileDirectory: FileSystem_Directory;
  filesIndex = new Map<string, FileSystem_File>();
  selectedNode?: FileSystemTreeNodeData | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable<GraphGenerationState>(this, {
      isRunningGlobalGenerate: observable,
      generatedEntities: observable.shallow,
      clearingGenerationEntitiesState: observable,
      fileGenerationConfigurations: observable,
      externalFormatState: observable,
      rootFileDirectory: observable,
      filesIndex: observable,
      selectedNode: observable.ref,
      fileGenerationConfigurationOptions: computed,
      supportedFileGenerationConfigurationsForCurrentElement: computed,
      setFileGenerationConfigurations: action,
      processGenerationResult: action,
      reprocessGenerationFileState: action,
      reprocessNodeTree: action,
      onTreeNodeSelect: action,
      setSelectedNode: action,
      emptyFileGeneration: action,
      possiblyAddMissingGenerationSpecifications: flow,
      fetchAvailableFileGenerationDescriptions: flow,
      globalGenerate: flow,
      generateModels: flow,
      generateFiles: flow,
      clearGenerations: flow,
    });

    this.editorStore = editorStore;
    this.rootFileDirectory = new FileSystem_Directory(
      GENERATION_FILE_ROOT_NAME,
    );
    this.externalFormatState = new ExternalFormatState(editorStore);
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
    if (
      this.editorStore.tabManagerState.currentTab instanceof ElementEditorState
    ) {
      const currentElement =
        this.editorStore.tabManagerState.currentTab.element;
      // NOTE: For now we only allow classes and enumerations for all types of generations.
      const extraFileGenerationScopeFilterConfigurations =
        this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_Generation_LegendStudioApplicationPlugin_Extension
              ).getExtraFileGenerationScopeFilterConfigurations?.() ?? [],
          );
      return this.fileGenerationConfigurations.filter((generationType) => {
        const scopeFilters =
          extraFileGenerationScopeFilterConfigurations.filter(
            (configuration) =>
              configuration.type.toLowerCase() === generationType.key,
          );
        if (scopeFilters.length) {
          return scopeFilters.some((scopeFilter) =>
            scopeFilter.filter(currentElement),
          );
        }
        return (
          currentElement instanceof Class ||
          currentElement instanceof Enumeration
        );
      });
    }
    return [];
  }

  findGenerationParentPath(genChildPath: string): string | undefined {
    const genEntity = Array.from(this.generatedEntities.entries()).find(
      ([, genEntities]) => genEntities.find((m) => m.path === genChildPath),
    );
    return genEntity?.[0];
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

  *fetchAvailableFileGenerationDescriptions(): GeneratorFn<void> {
    try {
      const availableFileGenerationDescriptions =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableGenerationConfigurationDescriptions()) as GenerationConfigurationDescription[];
      this.setFileGenerationConfigurations(availableFileGenerationDescriptions);
      this.editorStore.elementGenerationStates =
        this.fileGenerationConfigurations.map(
          (config) =>
            new ElementFileGenerationState(this.editorStore, config.key),
        );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  /**
   * Global generation is tied to the generation specification of the project. Every time a generation element
   * is added, they will be added to the generation specification
   */
  *globalGenerate(): GeneratorFn<void> {
    if (
      this.editorStore.graphState.checkIfApplicationUpdateOperationIsRunning()
    ) {
      return;
    }
    this.isRunningGlobalGenerate = true;
    try {
      yield flowResult(this.generateModels());
      yield flowResult(this.generateFiles());
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
        error,
      );
      this.editorStore.graphState.editorStore.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    } finally {
      this.isRunningGlobalGenerate = false;
    }
  }

  *generateModels(): GeneratorFn<void> {
    try {
      this.generatedEntities = new Map<string, Entity[]>(); // reset the map of generated entities
      const generationSpecs =
        this.editorStore.graphManagerState.graph.ownGenerationSpecifications;
      if (!generationSpecs.length) {
        return;
      }
      assertTrue(
        generationSpecs.length === 1,
        `Can't generate models: only one generation specification permitted to generate`,
      );
      const generationSpec = generationSpecs[0] as GenerationSpecification;
      const generationNodes = generationSpec.generationNodes;
      for (let i = 0; i < generationNodes.length; i++) {
        const node = generationNodes[i] as GenerationTreeNode;
        let generatedEntities: Entity[] = [];
        try {
          generatedEntities =
            (yield this.editorStore.graphManagerState.graphManager.generateModel(
              node.generationElement.value,
              this.editorStore.graphManagerState.graph,
            )) as Entity[];
        } catch (error) {
          assertErrorThrown(error);
          throw new Error(
            `Can't generate models: failure occured at step ${
              i + 1
            } with specification '${
              node.generationElement.value.path
            }'. Error: ${error.message}`,
          );
        }
        this.generatedEntities.set(
          node.generationElement.value.path,
          generatedEntities,
        );
        yield flowResult(
          this.editorStore.graphState.updateGenerationGraphAndApplication(),
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
        error,
      );
      this.editorStore.graphState.editorStore.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    }
  }

  /**
   * Generated file generations in the graph.
   * NOTE: This method does not update graph and application only the files are generated.
   */
  *generateFiles(): GeneratorFn<void> {
    try {
      this.emptyFileGeneration();
      const generationOutputIndex = new Map<string, GenerationOutput[]>();
      const generationSpecs =
        this.editorStore.graphManagerState.graph.ownGenerationSpecifications;
      if (!generationSpecs.length) {
        return;
      }
      assertTrue(
        generationSpecs.length === 1,
        `Can't generate models: only one generation specification permitted to generate`,
      );
      const generationSpec = generationSpecs[0] as GenerationSpecification;
      const fileGenerations = generationSpec.fileGenerations;
      // we don't need to keep 'fetching' the main model as it won't grow with each file generation
      for (const fileGeneration of fileGenerations) {
        let result: GenerationOutput[] = [];
        try {
          const mode =
            this.editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
              fileGeneration.value.type,
            ).generationMode;
          result =
            (yield this.editorStore.graphManagerState.graphManager.generateFile(
              fileGeneration.value,
              mode,
              this.editorStore.graphManagerState.graph,
            )) as GenerationOutput[];
        } catch (error) {
          assertErrorThrown(error);
          throw new Error(
            `Can't generate files using specification '${fileGeneration.value.path}'. Error: ${error.message}`,
          );
        }
        generationOutputIndex.set(fileGeneration.value.path, result);
      }
      this.processGenerationResult(generationOutputIndex);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
        error,
      );
      this.editorStore.graphState.editorStore.applicationStore.notificationService.notifyError(
        `${error.message}`,
      );
    }
  }

  /**
   * Used to clear generation entities as well as the generation model
   */
  *clearGenerations(): GeneratorFn<void> {
    this.clearingGenerationEntitiesState.inProgress();
    this.generatedEntities = new Map<string, Entity[]>();
    this.emptyFileGeneration();
    yield flowResult(
      this.editorStore.graphState.updateGenerationGraphAndApplication(),
    );
    this.clearingGenerationEntitiesState.complete();
  }

  /**
   * Method adds generation specification if
   * 1. no generation specification has been defined in graph
   * 2. there exists a generation element
   */
  *possiblyAddMissingGenerationSpecifications(): GeneratorFn<void> {
    if (
      !this.editorStore.graphManagerState.graph.ownGenerationSpecifications
        .length
    ) {
      const modelGenerationElements = this.editorStore.pluginManager
        .getPureGraphManagerPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Generation_PureGraphManagerPlugin_Extension
            ).getExtraModelGenerationElementGetters?.() ?? [],
        )
        .flatMap((getter) => getter(this.editorStore.graphManagerState.graph));
      const fileGenerations =
        this.editorStore.graphManagerState.graph.ownFileGenerations;
      if (modelGenerationElements.length || fileGenerations.length) {
        const generationSpec = new GenerationSpecification(
          DEFAULT_GENERATION_SPECIFICATION_NAME,
        );
        modelGenerationElements.forEach((e) =>
          generationSpecification_addGenerationElement(generationSpec, e),
        );
        fileGenerations.forEach((e) =>
          generationSpecification_addFileGeneration(generationSpec, e),
        );
        // NOTE: add generation specification at the same package as the first generation element found.
        // we might want to revisit this decision?
        const specPackage = guaranteeNonNullable(
          [...modelGenerationElements, ...fileGenerations][0]?.package,
        );
        yield flowResult(
          this.editorStore.graphEditorMode.addElement(
            generationSpec,
            specPackage.path,
            false,
          ),
        );
      }
    }
  }

  // File Generation Tree
  processGenerationResult(
    generationOutputIndex: Map<string, GenerationOutput[]>,
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
    const generationResultIndex = new Map<string, FileResult>();
    Array.from(generationOutputIndex.entries()).forEach((entry) => {
      const fileGeneration =
        this.editorStore.graphManagerState.graph.getNullableFileGeneration(
          entry[0],
        );
      const rootFolder =
        fileGeneration?.generationOutputPath ??
        fileGeneration?.path.split(ELEMENT_PATH_DELIMITER).join('_');
      const generationOutputs = entry[1];
      generationOutputs.forEach((genOutput) => {
        genOutput.cleanFileName(rootFolder);
        if (generationResultIndex.has(genOutput.fileName)) {
          this.editorStore.applicationStore.logService.warn(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
            `Found 2 generation outputs with same path '${genOutput.fileName}'`,
          );
        }
        generationResultIndex.set(genOutput.fileName, {
          value: genOutput,
          parentId: fileGeneration?.path,
        });
      });
    });
    // take generation outputs and put them into the root directory
    buildFileSystemDirectory(
      this.rootFileDirectory,
      generationResultIndex,
      this.filesIndex,
    );
    // after building root directory set the generation tree data
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(
      getFileSystemTreeData(
        this.editorStore.graphState.graphGenerationState.rootFileDirectory,
        ExplorerTreeRootPackageLabel.FILE_GENERATION,
      ),
    );
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(
      this.reprocessNodeTree(
        Array.from(generationResultIndex.values()),
        this.editorStore.graphState.editorStore.explorerTreeState.getFileGenerationTreeData(),
        openedNodeIds,
      ),
    );
    this.editorStore.tabManagerState.tabs =
      this.editorStore.tabManagerState.tabs
        .map((e) => this.reprocessGenerationFileState(e))
        .filter(isNonNullable);
  }

  reprocessGenerationFileState(
    editorState: EditorState,
  ): EditorState | undefined {
    if (editorState instanceof FileGenerationViewerState) {
      const fileNode = this.filesIndex.get(editorState.file.path);
      if (fileNode) {
        editorState.file = fileNode;
        return editorState;
      } else {
        return undefined;
      }
    }
    return editorState;
  }

  reprocessNodeTree(
    generationResult: FileResult[],
    treeData: TreeData<FileSystemTreeNodeData>,
    openedNodeIds: string[],
  ): TreeData<FileSystemTreeNodeData> {
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
        ? (generationResult[0] as FileResult).value.fileName
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
    node: FileSystemTreeNodeData,
    treeData: TreeData<FileSystemTreeNodeData>,
    reprocess?: boolean,
  ): void {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.fileNode instanceof FileSystem_Directory) {
        populateDirectoryTreeNodeChildren(node, treeData);
      }
    }
    if (!reprocess && node.fileNode instanceof FileSystem_File) {
      this.editorStore.tabManagerState.openTab(
        new FileGenerationViewerState(this.editorStore, node.fileNode),
      );
    }
    this.setSelectedNode(node);
    this.editorStore.graphState.editorStore.explorerTreeState.setFileGenerationTreeData(
      { ...treeData },
    );
  }

  setSelectedNode(node?: FileSystemTreeNodeData): void {
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
    }
    if (node) {
      node.isSelected = true;
    }
    this.selectedNode = node;
  }

  emptyFileGeneration(): void {
    this.filesIndex = new Map<string, FileSystem_File>();
    this.rootFileDirectory = new FileSystem_Directory(
      GENERATION_FILE_ROOT_NAME,
    );
  }
}
