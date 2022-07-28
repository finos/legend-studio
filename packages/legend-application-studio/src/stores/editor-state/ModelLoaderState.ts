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

import { observable, action, flow, makeObservable } from 'mobx';
import { EditorState } from './EditorState.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  UnsupportedOperationError,
  isNonNullable,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import type { EditorStore } from '../EditorStore.js';
import type { Entity } from '@finos/legend-storage';
import {
  type ImportConfigurationDescription,
  ImportMode,
} from '@finos/legend-graph';
import { TAB_SIZE } from '@finos/legend-application';
import type {
  ModelLoaderExtensionConfiguration,
  LegendStudioApplicationPlugin,
} from '../LegendStudioApplicationPlugin.js';

export enum MODEL_UPDATER_INPUT_TYPE {
  ENTITIES = 'ENTITIES',
  PURE_PROTOCOL = 'PURE_PROTOCOL',
  PURE_GRAMMAR = 'PURE_GRAMMAR',
}

export class ModelLoaderState extends EditorState {
  modelText = this.getExampleEntitiesInputText();
  currentModelLoadType: MODEL_UPDATER_INPUT_TYPE | string =
    MODEL_UPDATER_INPUT_TYPE.ENTITIES;
  // TODO: remove model import in favor of external formats
  modelImportDescriptions: ImportConfigurationDescription[] = [];
  modelLoaderExtensionConfigurations: ModelLoaderExtensionConfiguration[] = [];
  replace = true;
  isLoadingModel = false;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      modelText: observable,
      currentModelLoadType: observable,
      modelImportDescriptions: observable,
      modelLoaderExtensionConfigurations: observable,
      replace: observable,
      isLoadingModel: observable,
      setReplaceFlag: action,
      setModelText: action,
      loadCurrentProjectEntities: flow,
      loadModel: flow,
      fetchAvailableModelImportDescriptions: flow,
    });

    //extensions
    this.modelLoaderExtensionConfigurations = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin: LegendStudioApplicationPlugin) =>
          plugin.getExtraModelLoaderExtensionConfigurations?.() ?? [],
      )
      .filter(isNonNullable);
  }

  get headerName(): string {
    return 'Model Loader';
  }

  getImportConfigurationDescription(
    key: string,
  ): ImportConfigurationDescription | undefined {
    return this.modelImportDescriptions.find(
      (description) => description.key === key,
    );
  }
  getLoaderExtensionConfiguration(
    key: string,
  ): ModelLoaderExtensionConfiguration | undefined {
    return this.modelLoaderExtensionConfigurations.find(
      (config) => config.key === key,
    );
  }
  setReplaceFlag(val: boolean): void {
    this.replace = val;
  }
  setModelText(modelText: string): void {
    this.modelText = modelText;
  }
  setCurrentModelLoadType(
    modelLoadType: MODEL_UPDATER_INPUT_TYPE | string,
  ): void {
    if (modelLoadType !== this.currentModelLoadType) {
      this.currentModelLoadType = modelLoadType;
      this.modelText = this.getExampleText(modelLoadType);
    }
  }

  getExampleText(inputType: MODEL_UPDATER_INPUT_TYPE | string): string {
    if (inputType === MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL) {
      return this.getExamplePureProtocolInputText();
    } else if (inputType === MODEL_UPDATER_INPUT_TYPE.ENTITIES) {
      return this.getExampleEntitiesInputText();
    } else if (this.getImportConfigurationDescription(inputType)) {
      return this.getExampleExternalFormatInputText();
    }
    return '';
  }
  /**
   * Current project entities will be taken from the current graph
   * If graph is not parsable, we will fall back to model loader
   */
  *loadCurrentProjectEntities(): GeneratorFn<void> {
    switch (this.currentModelLoadType) {
      case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
        const graphEntities = this.editorStore.graphManagerState.graphBuildState
          .hasSucceeded
          ? this.editorStore.graphManagerState.graph.allOwnElements.map(
              (element) =>
                this.editorStore.graphManagerState.graphManager.elementToEntity(
                  element,
                ),
            )
          : this.editorStore.changeDetectionState
              .workspaceLocalLatestRevisionState.entities;
        this.modelText =
          (yield this.editorStore.graphManagerState.graphManager.entitiesToPureProtocolText(
            graphEntities,
          )) as string;
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
        const graphEntities = this.editorStore.graphManagerState.graphBuildState
          .hasSucceeded
          ? this.editorStore.graphManagerState.graph.allOwnElements.map(
              (element) =>
                this.editorStore.graphManagerState.graphManager.elementToEntity(
                  element,
                ),
            )
          : this.editorStore.changeDetectionState
              .workspaceLocalLatestRevisionState.entities;
        this.modelText = JSON.stringify(graphEntities, undefined, TAB_SIZE);
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.PURE_GRAMMAR: {
        this.modelText =
          (yield this.editorStore.graphManagerState.graphManager.graphToPureCode(
            this.editorStore.graphManagerState.graph,
          )) as string;
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't load current project entities for input type of type '${this.currentModelLoadType}'`,
        );
    }
  }

  *loadModel(): GeneratorFn<void> {
    try {
      this.isLoadingModel = true;
      this.editorStore.setBlockingAlert({
        message: 'Loading model...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      let entities: Entity[];
      const externalConfigType = this.getImportConfigurationDescription(
        this.currentModelLoadType,
      );
      if (externalConfigType) {
        entities =
          (yield this.editorStore.graphManagerState.graphManager.externalFormatTextToEntities(
            this.modelText,
            externalConfigType.key,
            ImportMode.SCHEMA_IMPORT,
          )) as Entity[];
      } else {
        switch (this.currentModelLoadType) {
          case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
            entities =
              this.editorStore.graphManagerState.graphManager.pureProtocolTextToEntities(
                this.modelText,
              );
            break;
          }
          case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
            entities = JSON.parse(this.modelText) as Entity[];
            break;
          }
          case MODEL_UPDATER_INPUT_TYPE.PURE_GRAMMAR: {
            entities =
              (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
                this.modelText,
              )) as Entity[];
            break;
          }
          default:
            throw new UnsupportedOperationError(
              `Can't load model for input of type '${this.currentModelLoadType}'`,
            );
        }
      }
      const message = `loading entities from ${
        this.editorStore.applicationStore.config.appName
      } [${this.replace ? `potentially affected ` : ''} ${
        entities.length
      } entities]`;
      yield this.editorStore.sdlcServerClient.updateEntities(
        this.editorStore.sdlcState.activeProject.projectId,
        this.editorStore.sdlcState.activeWorkspace,
        { replace: this.replace, entities, message },
      );
      this.editorStore.applicationStore.navigator.reload();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.MODEL_LOADER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isLoadingModel = false;
      this.editorStore.setBlockingAlert(undefined);
    }
  }

  *fetchAvailableModelImportDescriptions(): GeneratorFn<void> {
    try {
      this.modelImportDescriptions =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableImportConfigurationDescriptions()) as ImportConfigurationDescription[];
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.MODEL_LOADER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  private getExampleEntitiesInputText(): string {
    return `// example entity\n${JSON.stringify(
      [
        {
          classifierPath: 'string',
          content: {},
          path: 'string',
        } as Entity,
      ],
      undefined,
      TAB_SIZE,
    )}`;
  }

  private getExamplePureProtocolInputText(): string {
    return `// example Pure model context data\n${this.editorStore.graphManagerState.graphManager.getExamplePureProtocolText()}`;
  }

  private getExampleExternalFormatInputText(): string {
    return `// example external format import data\n${this.editorStore.graphManagerState.graphManager.getExampleExternalFormatImportText()}`;
  }
}
