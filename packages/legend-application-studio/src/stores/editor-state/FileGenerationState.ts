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

import type { EditorStore } from '../EditorStore.js';
import { observable, action, makeObservable, flow } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import type { TreeData } from '@finos/legend-art';
import {
  type GenerationTreeNodeData,
  type GenerationFile,
  type GenerationOutputResult,
  GenerationDirectory,
  GENERATION_FILE_ROOT_NAME,
  getGenerationTreeData,
  openNode,
  populateDirectoryTreeNodeChildren,
  buildGenerationDirectory,
  reprocessOpenNodes,
} from '../shared/FileGenerationTreeUtils.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  deepEqual,
  isEmpty,
  LogEvent,
} from '@finos/legend-shared';
import {
  type FileGenerationSpecification,
  type GenerationOutput,
  type GenerationProperty,
  ConfigurationProperty,
  GenerationPropertyItemType,
  PackageableElement,
  PackageableElementReference,
  PackageableElementExplicitReference,
  ELEMENT_PATH_DELIMITER,
  getNullableFileGenerationConfig,
} from '@finos/legend-graph';
import {
  configurationProperty_setValue,
  fileGeneration_addConfigurationProperty,
  fileGeneration_addScopeElement,
  fileGeneration_deleteScopeElement,
} from '../shared/modifier/DSL_Generation_GraphModifierHelper.js';

export class FileGenerationState {
  readonly editorStore: EditorStore;
  readonly fileGeneration: FileGenerationSpecification;

  isGenerating = false;
  root: GenerationDirectory;
  directoryTreeData?: TreeData<GenerationTreeNodeData> | undefined;
  selectedNode?: GenerationTreeNodeData | undefined;
  filesIndex = new Map<string, GenerationFile>();

  constructor(
    editorStore: EditorStore,
    fileGeneration: FileGenerationSpecification,
  ) {
    makeObservable(this, {
      isGenerating: observable,
      root: observable,
      directoryTreeData: observable.ref,
      selectedNode: observable.ref,
      filesIndex: observable,
      resetFileGeneration: action,
      setIsGeneration: action,
      setDirectoryTreeData: action,
      processGenerationResult: action,
      reprocessNodeTree: action,
      setSelectedNode: action,
      onTreeNodeSelect: action,
      addScopeElement: action,
      deleteScopeElement: action,
      updateFileGenerationParameters: action,
      generate: flow,
    });

    this.editorStore = editorStore;
    this.fileGeneration = fileGeneration;
    this.root = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
  }

  getOrCreateDirectory(directoryName: string): GenerationDirectory {
    return GenerationDirectory.getOrCreateDirectory(
      this.root,
      directoryName,
      true,
    );
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

  *generate(): GeneratorFn<void> {
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
        (yield this.editorStore.graphManagerState.graphManager.generateFile(
          this.fileGeneration,
          mode,
          this.editorStore.graphManagerState.graph,
        )) as GenerationOutput[];
      this.processGenerationResult(result);
    } catch (error) {
      assertErrorThrown(error);
      this.selectedNode = undefined;
      this.processGenerationResult([]);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGenerating = false;
    }
  }

  processGenerationResult(output: GenerationOutput[]): void {
    this.root = new GenerationDirectory(GENERATION_FILE_ROOT_NAME);
    this.filesIndex = new Map<string, GenerationFile>();
    const openedNodeIds = this.directoryTreeData
      ? Array.from(this.directoryTreeData.nodes.values())
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    const generationResultIndex = new Map<string, GenerationOutputResult>();
    const rootFolder =
      this.fileGeneration.generationOutputPath ??
      this.fileGeneration.path.split(ELEMENT_PATH_DELIMITER).join('_');
    output.forEach((entry) => {
      entry.cleanFileName(rootFolder);
      if (generationResultIndex.has(entry.fileName)) {
        this.editorStore.applicationStore.log.warn(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
          'Found 2 generation outputs with same path',
        );
      }
      generationResultIndex.set(entry.fileName, {
        generationOutput: entry,
        parentId: this.fileGeneration.path,
      });
    });
    // take generation outputs and put them into the root directory
    buildGenerationDirectory(this.root, generationResultIndex, this.filesIndex);
    this.directoryTreeData = getGenerationTreeData(this.root);
    this.reprocessNodeTree(
      Array.from(generationResultIndex.values()),
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
      generationResult.length === 1 ||
      (this.selectedNode === undefined && generationResult.length !== 0)
        ? (generationResult[0] as GenerationOutputResult).generationOutput
            .fileName
        : this.selectedNode?.fileNode.path;
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

  getScopeElement(
    element: PackageableElement | string,
  ): PackageableElementReference<PackageableElement> | string | undefined {
    return this.fileGeneration.scopeElements.find((el) =>
      el instanceof PackageableElementReference
        ? el.value === element
        : element === el,
    );
  }

  addScopeElement(element: PackageableElement | string): void {
    const el = this.getScopeElement(element);
    if (!el) {
      fileGeneration_addScopeElement(
        this.fileGeneration,
        element instanceof PackageableElement
          ? PackageableElementExplicitReference.create(element)
          : element,
      );
    }
  }

  deleteScopeElement(element: PackageableElement | string): void {
    const el = this.getScopeElement(element);
    if (el) {
      fileGeneration_deleteScopeElement(this.fileGeneration, el);
    }
  }

  updateFileGenerationParameters(
    fileGeneration: FileGenerationSpecification,
    generationProperty: GenerationProperty,
    newValue: unknown,
  ): void {
    if (generationProperty.type === GenerationPropertyItemType.MAP) {
      if (
        !newValue ||
        isEmpty(newValue) ||
        deepEqual(newValue, generationProperty.defaultValue)
      ) {
        fileGeneration.configurationProperties =
          fileGeneration.configurationProperties.filter(
            (e) => e.name !== generationProperty.name,
          );
      } else {
        const configProperty = getNullableFileGenerationConfig(
          fileGeneration,
          generationProperty.name,
        );
        if (configProperty) {
          configurationProperty_setValue(configProperty, {
            ...(newValue as object),
          });
        } else {
          const newItem = new ConfigurationProperty(
            generationProperty.name,
            newValue,
          );
          fileGeneration_addConfigurationProperty(fileGeneration, newItem);
        }
      }
    } else {
      const configProperty = getNullableFileGenerationConfig(
        fileGeneration,
        generationProperty.name,
      );
      let useDefaultValue = generationProperty.defaultValue === newValue;
      if (generationProperty.type === GenerationPropertyItemType.BOOLEAN) {
        useDefaultValue =
          (generationProperty.defaultValue === 'true') ===
          (newValue as boolean);
      }
      const newConfigValue = useDefaultValue ? undefined : newValue;
      if (newConfigValue !== undefined) {
        if (configProperty) {
          configurationProperty_setValue(configProperty, newConfigValue);
        } else {
          const newItem = new ConfigurationProperty(
            generationProperty.name,
            newConfigValue,
          );
          fileGeneration_addConfigurationProperty(fileGeneration, newItem);
        }
      } else {
        fileGeneration.configurationProperties =
          fileGeneration.configurationProperties.filter(
            (e) => e.name !== generationProperty.name,
          );
      }
    }
  }
}
