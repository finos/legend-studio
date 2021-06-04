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
import { TAB_SIZE } from '../EditorConfig';
import { EditorState } from '../editor-state/EditorState';
import type { Entity } from '../../models/sdlc/models/entity/Entity';
import {
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import type { EditorStore } from '../EditorStore';
import type { ImportConfigurationDescription } from '../../models/metamodels/pure/action/generation/ImportConfigurationDescription';
import { ImportMode } from '../../models/metamodels/pure/action/generation/ImportConfigurationDescription';

export enum MODEL_UPDATER_INPUT_TYPE {
  ENTITIES = 'ENTITIES',
  PURE_PROTOCOL = 'PURE_PROTOCOL',
}

export class ModelLoaderState extends EditorState {
  modelText = this.getExampleEntitiesInputText();
  currentInputType = MODEL_UPDATER_INPUT_TYPE.ENTITIES;
  currentExternalInputType?: string;
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
      loadCurrentProjectEntities: action,
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
  loadCurrentProjectEntities(): void {
    switch (this.currentInputType) {
      case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
        const graphEntities = this.editorStore.graphState.graph.isBuilt
          ? this.editorStore.graphState.graph.allElements.map((element) =>
              this.editorStore.graphState.graphManager.elementToEntity(element),
            )
          : this.editorStore.changeDetectionState.workspaceLatestRevisionState
              .entities;
        this.modelText =
          this.editorStore.graphState.graphManager.entitiesToPureProtocolText(
            graphEntities,
          );
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
        const graphEntities = this.editorStore.graphState.graph.isBuilt
          ? this.editorStore.graphState.graph.allElements.map((element) =>
              this.editorStore.graphState.graphManager.elementToEntity(element),
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

  loadModel = flow(function* (this: ModelLoaderState) {
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
          (yield this.editorStore.graphState.graphManager.externalFormatTextToEntities(
            this.modelText,
            this.currentExternalInputType,
            ImportMode.SCHEMA_IMPORT,
          )) as Entity[];
      } else {
        switch (this.currentInputType) {
          case MODEL_UPDATER_INPUT_TYPE.PURE_PROTOCOL: {
            entities =
              this.editorStore.graphState.graphManager.pureProtocolToEntities(
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
      yield this.editorStore.applicationStore.networkClientManager.sdlcClient.updateEntities(
        this.editorStore.sdlcState.currentProjectId,
        this.editorStore.sdlcState.currentWorkspaceId,
        { replace: this.replace, entities, message },
      );
      window.location.reload(); // hard refresh after
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.MODEL_LOADER_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isLoadingModel = false;
      this.editorStore.setBlockingAlert(undefined);
    }
  });

  getImportConfiguration(key: string): ImportConfigurationDescription {
    return guaranteeNonNullable(
      this.modelImportDescriptions.find((config) => config.key === key),
      `Can't find configuration description for import type '${key}'`,
    );
  }

  fetchAvailableModelImportDescriptions = flow(function* (
    this: ModelLoaderState,
  ) {
    try {
      this.modelImportDescriptions =
        (yield this.editorStore.graphState.graphManager.getAvailableImportConfigurationDescriptions()) as unknown as ImportConfigurationDescription[];
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.MODEL_LOADER_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

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
    return `// example Pure model context data\n${this.editorStore.graphState.graphManager.getExamplePureProtocolText()}`;
  }

  private getExampleExternalFormatInputText(): string {
    return `// example external format import data\n${this.editorStore.graphState.graphManager.getExampleExternalFormatImportText()}`;
  }
}
