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
import type { TreeData } from '@finos/legend-art';
import type { EditorStore } from '../EditorStore.js';
import type { EditorState } from './EditorState.js';
import { ElementEditorState } from './element-editor-state/ElementEditorState.js';
import { ElementFileGenerationState } from './element-editor-state/ElementFileGenerationState.js';
import type { Entity } from '@finos/legend-storage';
import {
  type GenerationConfigurationDescription,
  type GenerationOutput,
  type DSL_Generation_PureGraphManagerPlugin_Extension,
  type GenerationTreeNode,
  ArtifactGenerationExtensionResult,
  Class,
  Enumeration,
  GenerationSpecification,
  ELEMENT_PATH_DELIMITER,
} from '@finos/legend-graph';
import { ExternalFormatState } from './ExternalFormatState.js';
import { ExplorerTreeRootPackageLabel } from '../ExplorerTreeState.js';
import type { DSL_Generation_LegendStudioApplicationPlugin_Extension } from '../../extensions/DSL_Generation_LegendStudioApplicationPlugin_Extension.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import {
  FileSystem_Directory,
  type FileSystemTreeNodeData,
  FileSystem_File,
  GENERATION_FILE_ROOT_NAME,
  buildFileSystemDirectory,
  getFileSystemTreeData,
  reprocessOpenNodes,
  type FileResult,
  openNode,
  populateDirectoryTreeNodeChildren,
} from '../utils/FileSystemTreeUtils.js';
import { ArtifactGenerationViewerState } from './ArtifactGenerationViewerState.js';
import {
  generationSpecification_addFileGeneration,
  generationSpecification_addGenerationElement,
} from '../../graph-modifier/DSL_Generation_GraphModifierHelper.js';

export const DEFAULT_GENERATION_SPECIFICATION_NAME =
  'MyGenerationSpecification';

export type GenerationTypeOption = {
  value: string;
  label: string;
};

export class DEPREACTED_GlobalFileGenerationState {
  readonly graphGenerationState: GraphGenerationState;
  readonly editorStore: EditorStore;
  // NOTE: this will eventually be removed once we also do model/schema import using external format
  // See https://github.com/finos/legend-studio/issues/866
  fileGenerationConfigurations: GenerationConfigurationDescription[] = [];

  constructor(
    graphGenerationState: GraphGenerationState,
    editorStore: EditorStore,
  ) {
    makeObservable(this, {
      fileGenerationConfigurations: observable,
      fileGenerationConfigurationOptions: computed,
      supportedFileGenerationConfigurationsForCurrentElement: computed,
      setFileGenerationConfigurations: action,
      fetchAvailableFileGenerationDescriptions: flow,
      DEPREACTED_generateFiles: flow,
    });
    this.graphGenerationState = graphGenerationState;
    this.editorStore = editorStore;
  }

  get fileGenerationConfigurationOptions(): GenerationTypeOption[] {
    return this.fileGenerationConfigurations
      .toSorted((a, b): number => a.label.localeCompare(b.label))
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

  /**
   * Generated file generations in the graph.
   * NOTE: This method does not update graph and application only the files are generated.
   */
  *DEPREACTED_generateFiles(
    generationOutputIndex: Map<string, GenerationOutput[]>,
  ): GeneratorFn<void> {
    try {
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
            this.editorStore.graphState.graphGenerationState.globalFileGenerationState.getFileGenerationConfiguration(
              fileGeneration.value.type,
            ).generationMode;
          result =
            (yield this.editorStore.graphManagerState.graphManager.generateFile(
              fileGeneration.value,
              mode,
              this.editorStore.graphManagerState.graph,
              this.editorStore.graphEditorMode.getGraphTextInputOption(),
            )) as GenerationOutput[];
        } catch (error) {
          assertErrorThrown(error);
          throw new Error(
            `Can't generate files using specification '${fileGeneration.value.path}'. Error: ${error.message}`,
          );
        }
        generationOutputIndex.set(fileGeneration.value.path, result);
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
}

export class GraphGenerationState {
  editorStore: EditorStore;
  isRunningGlobalGenerate = false;
  generatedEntities = new Map<string, Entity[]>();
  clearingGenerationEntitiesState = ActionState.create();
  externalFormatState: ExternalFormatState;
  globalFileGenerationState: DEPREACTED_GlobalFileGenerationState;
  // file generation output
  rootFileDirectory: FileSystem_Directory;
  filesIndex = new Map<string, FileSystem_File>();
  selectedNode?: FileSystemTreeNodeData | undefined;
  // Note for now generation of artifact generations is set to false.
  // This is to explore the performance impact of inlcuding this in the generation action and whether we always
  // generate artifacts or add inputs to the api to choose which ones we generate.
  enableArtifactGeneration = false;

  constructor(editorStore: EditorStore) {
    makeObservable<GraphGenerationState>(this, {
      isRunningGlobalGenerate: observable,
      generatedEntities: observable.shallow,
      clearingGenerationEntitiesState: observable,
      externalFormatState: observable,
      enableArtifactGeneration: observable,
      globalFileGenerationState: observable,
      rootFileDirectory: observable,
      filesIndex: observable,
      selectedNode: observable.ref,
      processGenerationResult: action,
      reprocessGenerationFileState: action,
      setEnableArtifactGeneration: action,
      reprocessNodeTree: action,
      onTreeNodeSelect: action,
      setSelectedNode: action,
      emptyGeneratedArtifacts: action,
      possiblyAddMissingGenerationSpecifications: flow,
      globalGenerate: flow,
      generateModels: flow,
      generateArtifacts: flow,
      clearGenerations: flow,
    });

    this.editorStore = editorStore;
    this.externalFormatState = new ExternalFormatState(editorStore);
    this.globalFileGenerationState = new DEPREACTED_GlobalFileGenerationState(
      this,
      editorStore,
    );
    this.rootFileDirectory = new FileSystem_Directory(
      GENERATION_FILE_ROOT_NAME,
    );
  }

  setEnableArtifactGeneration(val: boolean): void {
    this.enableArtifactGeneration = val;
  }

  findGenerationParentPath(genChildPath: string): string | undefined {
    const genEntity = Array.from(this.generatedEntities.entries()).find(
      ([, genEntities]) => genEntities.find((m) => m.path === genChildPath),
    );
    return genEntity?.[0];
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
      yield flowResult(this.generateArtifacts());
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
              this.editorStore.graphEditorMode.getGraphTextInputOption(),
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
   * Generated artifacts generations in graph
   * NOTE: This method does not update graph and application only the files are generated.
   */
  *generateArtifacts(): GeneratorFn<void> {
    try {
      this.emptyGeneratedArtifacts();
      const generationOutputIndex = new Map<string, GenerationOutput[]>();
      // handle deprecated file generations
      yield flowResult(
        this.globalFileGenerationState.DEPREACTED_generateFiles(
          generationOutputIndex,
        ),
      );
      let artifacts = new ArtifactGenerationExtensionResult();
      if (this.enableArtifactGeneration) {
        artifacts =
          (yield this.editorStore.graphManagerState.graphManager.generateArtifacts(
            this.editorStore.graphManagerState.graph,
            this.editorStore.graphEditorMode.getGraphTextInputOption(),
          )) as ArtifactGenerationExtensionResult;
      }

      // handle results
      this.processGenerationResult(artifacts, generationOutputIndex);
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

  // Artifact Generation Tree
  processGenerationResult(
    artifacts: ArtifactGenerationExtensionResult,
    generationOutputIndex: Map<string, GenerationOutput[]>,
  ): void {
    // empty file index and the directory, we keep the open nodes to reprocess them
    this.emptyGeneratedArtifacts();
    const directoryTreeData =
      this.editorStore.graphState.editorStore.explorerTreeState
        .artifactsGenerationTreeData;
    const openedNodeIds = directoryTreeData
      ? Array.from(directoryTreeData.nodes.values())
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    // we read the generation outputs and clean
    const generationResultIndex = new Map<string, FileResult>();
    // handle DEPRECATED file gen for backward compatible
    Array.from(generationOutputIndex.entries()).forEach((entry) => {
      const generator =
        this.editorStore.graphManagerState.graph.getNullableFileGeneration(
          entry[0],
        );
      const rootFolder =
        generator?.generationOutputPath ??
        generator?.path.split(ELEMENT_PATH_DELIMITER).join('_');
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
          parentId: generator?.path,
        });
      });
    });
    artifacts.values
      .map((v) => v.artifactsByExtensionElements)
      .flat()
      .forEach((artifactByElement) => {
        artifactByElement.files.forEach((genOutput) => {
          genOutput.cleanFileName();
          if (generationResultIndex.has(genOutput.fileName)) {
            this.editorStore.applicationStore.logService.warn(
              LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
              `Found 2 generation outputs with same path '${genOutput.fileName}'`,
            );
          }
          generationResultIndex.set(genOutput.fileName, {
            value: genOutput,
            parentId: artifactByElement.element,
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
    this.editorStore.graphState.editorStore.explorerTreeState.setArtifactsGenerationTreeData(
      getFileSystemTreeData(
        this.editorStore.graphState.graphGenerationState.rootFileDirectory,
        ExplorerTreeRootPackageLabel.FILE_GENERATION,
      ),
    );
    this.editorStore.graphState.editorStore.explorerTreeState.setArtifactsGenerationTreeData(
      this.reprocessNodeTree(
        Array.from(generationResultIndex.values()),
        this.editorStore.graphState.editorStore.explorerTreeState.getArtifactsGenerationTreeData(),
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
    if (editorState instanceof ArtifactGenerationViewerState) {
      const fileNode = this.filesIndex.get(editorState.artifact.path);
      if (fileNode) {
        editorState.artifact = fileNode;
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
      this.editorStore.graphEditorMode.openFileSystem_File(node.fileNode);
    }
    this.setSelectedNode(node);
    this.editorStore.graphState.editorStore.explorerTreeState.setArtifactsGenerationTreeData(
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

  emptyGeneratedArtifacts(): void {
    this.filesIndex = new Map<string, FileSystem_File>();
    this.rootFileDirectory = new FileSystem_Directory(
      GENERATION_FILE_ROOT_NAME,
    );
  }

  /**
   * Used to clear generation entities as well as the generation model
   */
  *clearGenerations(): GeneratorFn<void> {
    this.clearingGenerationEntitiesState.inProgress();
    this.generatedEntities = new Map<string, Entity[]>();
    this.emptyGeneratedArtifacts();
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
}
