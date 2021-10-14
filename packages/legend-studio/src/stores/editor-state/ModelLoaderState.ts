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
import { EditorState } from '../editor-state/EditorState';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  assertErrorThrown,
  LogEvent,
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { STUDIO_LOG_EVENT } from '../../stores/StudioLogEvent';
import type { EditorStore } from '../EditorStore';
import type { Entity } from '@finos/legend-model-storage';
import type { ImportConfigurationDescription } from '@finos/legend-graph';
import { ImportMode } from '@finos/legend-graph';
import { TAB_SIZE } from '@finos/legend-application';

export enum MODEL_UPDATER_INPUT_TYPE {
  ENTITIES = 'ENTITIES',
  PURE_PROTOCOL = 'PURE_PROTOCOL',
}

export class ModelLoaderState extends EditorState {
  modelText = this.getExampleEntitiesInputText();
  currentInputType = MODEL_UPDATER_INPUT_TYPE.ENTITIES;
  currentExternalInputType?: string | undefined;
  modelImportDescriptions: ImportConfigurationDescription[] = [];
  replace = true;
  isLoadingModel = false;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      modelText: observable,
      currentInputType: observable,
      currentExternalInputType: observable,
      modelImportDescriptions: observable,
      replace: observable,
      isLoadingModel: observable,
      setReplaceFlag: action,
      setModelText: action,
      setCurrentInputType: action,
      setCurrentExternalFormatInputType: action,
      loadCurrentProjectEntities: flow,
      loadModel: flow,
      fetchAvailableModelImportDescriptions: flow,
    });
  }

  get headerName(): string {
    return 'Model Loader';
  }

  setReplaceFlag(val: boolean): void {
    this.replace = val;
  }
  setModelText(modelText: string): void {
    this.modelText = modelText;
  }

  setCurrentInputType(inputType: MODEL_UPDATER_INPUT_TYPE): void {
    this.currentInputType = inputType;
    this.setCurrentExternalFormatInputType(undefined);
    switch (inputType) {
      case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
        this.modelText = this.getExamplePureProtocolInputText();
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
        this.modelText = this.getExampleEntitiesInputText();
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't use model loader with input of type '${inputType}'`,
        );
    }
  }

  setCurrentExternalFormatInputType(
    inputType: ImportConfigurationDescription | undefined,
  ): void {
    this.currentExternalInputType = inputType?.key;
    if (this.currentExternalInputType) {
      this.modelText = this.getExampleExternalFormatInputText();
    }
  }

  /**
   * Current project entities will be taken from the current graph
   * If graph is not parsable, we will fall back to model loader
   */
  *loadCurrentProjectEntities(): GeneratorFn<void> {
    switch (this.currentInputType) {
      case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
        const graphEntities = this.editorStore.graphManagerState.graph
          .buildState.hasSucceeded
          ? this.editorStore.graphManagerState.graph.allOwnElements.map(
              (element) =>
                this.editorStore.graphManagerState.graphManager.elementToEntity(
                  element,
                ),
            )
          : this.editorStore.changeDetectionState.workspaceLatestRevisionState
              .entities;
        this.modelText =
          (yield this.editorStore.graphManagerState.graphManager.entitiesToPureProtocolText(
            graphEntities,
          )) as string;
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
        const graphEntities = this.editorStore.graphManagerState.graph
          .buildState.hasSucceeded
          ? this.editorStore.graphManagerState.graph.allOwnElements.map(
              (element) =>
                this.editorStore.graphManagerState.graphManager.elementToEntity(
                  element,
                ),
            )
          : this.editorStore.changeDetectionState.workspaceLatestRevisionState
              .entities;
        this.modelText = JSON.stringify(graphEntities, undefined, TAB_SIZE);
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't load current project entities for input type of type '${this.currentInputType}'`,
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
      if (this.currentExternalInputType) {
        entities =
          (yield this.editorStore.graphManagerState.graphManager.externalFormatTextToEntities(
            this.modelText,
            this.currentExternalInputType,
            ImportMode.SCHEMA_IMPORT,
          )) as Entity[];
      } else {
        switch (this.currentInputType) {
          case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
            entities =
              this.editorStore.graphManagerState.graphManager.pureProtocolToEntities(
                this.modelText,
              );
            break;
          }
          case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
            entities = JSON.parse(this.modelText) as Entity[];
            break;
          }
          default:
            throw new UnsupportedOperationError(
              `Can't load model for input of type '${this.currentInputType}'`,
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
        LogEvent.create(STUDIO_LOG_EVENT.MODEL_LOADER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isLoadingModel = false;
      this.editorStore.setBlockingAlert(undefined);
    }
  }

  getImportConfiguration(key: string): ImportConfigurationDescription {
    return guaranteeNonNullable(
      this.modelImportDescriptions.find((config) => config.key === key),
      `Can't find configuration description for import type '${key}'`,
    );
  }

  *fetchAvailableModelImportDescriptions(): GeneratorFn<void> {
    try {
      this.modelImportDescriptions =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableImportConfigurationDescriptions()) as ImportConfigurationDescription[];
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.MODEL_LOADER_FAILURE),
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
