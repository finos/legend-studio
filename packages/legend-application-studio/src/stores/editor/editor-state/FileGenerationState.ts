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
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import {
  type FileSystem_File,
  type FileResult,
  FileSystem_Directory,
  GENERATION_FILE_ROOT_NAME,
  getFileSystemTreeData,
  buildFileSystemDirectory,
} from '../utils/FileSystemTreeUtils.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  deepEqual,
  isEmpty,
  LogEvent,
  ActionState,
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
  configurationProperty_addConfigurationProperty,
  fileGeneration_addScopeElement,
  fileGeneration_deleteScopeElement,
} from '../../graph-modifier/DSL_Generation_GraphModifierHelper.js';
import { FileSystemState } from './FileSystemState.js';

export abstract class GeneratedFileStructureState {
  readonly editorStore: EditorStore;
  fileSystemState: FileSystemState;
  generatingAction = ActionState.create();
  rootDirectoryName: string;

  constructor(rootDirectory: string, editorStore: EditorStore) {
    this.rootDirectoryName = rootDirectory;
    this.fileSystemState = new FileSystemState(rootDirectory);
    this.editorStore = editorStore;
  }

  abstract resetGenerator(): void;

  abstract generate(): GeneratorFn<void>;

  abstract get rootFolder(): string;

  abstract get generationParentId(): string | undefined;

  processGenerationResult(output: GenerationOutput[]): void {
    this.fileSystemState.root = new FileSystem_Directory(
      this.rootDirectoryName,
    );
    this.fileSystemState.filesIndex = new Map<string, FileSystem_File>();
    const openedNodeIds = this.fileSystemState.directoryTreeData
      ? Array.from(this.fileSystemState.directoryTreeData.nodes.values())
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    const generationResultIndex = new Map<string, FileResult>();
    const rootFolder = this.rootFolder;
    output.forEach((entry) => {
      entry.cleanFileName(rootFolder);
      if (generationResultIndex.has(entry.fileName)) {
        this.editorStore.applicationStore.logService.warn(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
          'Found 2 generation outputs with same path',
        );
      }
      generationResultIndex.set(entry.fileName, {
        value: entry,
        parentId: this.generationParentId,
      });
    });
    // take generation outputs and put them into the root directory
    buildFileSystemDirectory(
      this.fileSystemState.root,
      generationResultIndex,
      this.fileSystemState.filesIndex,
    );
    this.fileSystemState.directoryTreeData = getFileSystemTreeData(
      this.fileSystemState.root,
    );
    this.fileSystemState.reprocessNodeTree(
      Array.from(generationResultIndex.values()),
      this.fileSystemState.directoryTreeData,
      openedNodeIds,
    );
  }
}

export class FileGenerationState extends GeneratedFileStructureState {
  readonly fileGeneration: FileGenerationSpecification;

  constructor(
    editorStore: EditorStore,
    fileGeneration: FileGenerationSpecification,
  ) {
    super(GENERATION_FILE_ROOT_NAME, editorStore);
    makeObservable(this, {
      generatingAction: observable,
      fileSystemState: observable,
      resetGenerator: action,
      processGenerationResult: action,
      addScopeElement: action,
      deleteScopeElement: action,
      updateFileGenerationParameters: action,
      generate: flow,
    });
    this.fileGeneration = fileGeneration;
  }

  get rootFolder(): string {
    return (
      this.fileGeneration.generationOutputPath ??
      this.fileGeneration.path.split(ELEMENT_PATH_DELIMITER).join('_')
    );
  }

  get generationParentId(): string | undefined {
    return this.fileGeneration.path;
  }

  resetGenerator(): void {
    this.fileGeneration.configurationProperties = [];
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
          configurationProperty_addConfigurationProperty(
            fileGeneration.configurationProperties,
            newItem,
          );
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
          configurationProperty_addConfigurationProperty(
            fileGeneration.configurationProperties,
            newItem,
          );
        }
      } else {
        fileGeneration.configurationProperties =
          fileGeneration.configurationProperties.filter(
            (e) => e.name !== generationProperty.name,
          );
      }
    }
  }

  *generate(): GeneratorFn<void> {
    this.generatingAction.inProgress();
    try {
      // avoid wasting a network call when the scope is empty, we can short-circuit this
      if (!this.fileGeneration.scopeElements.length) {
        this.fileSystemState.selectedNode = undefined;
        this.processGenerationResult([]);
        return;
      }
      const mode =
        this.editorStore.graphState.graphGenerationState.globalFileGenerationState.getFileGenerationConfiguration(
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
      this.fileSystemState.selectedNode = undefined;
      this.processGenerationResult([]);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.generatingAction.complete();
    }
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
}
