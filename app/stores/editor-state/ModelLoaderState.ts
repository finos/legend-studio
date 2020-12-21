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

import { observable, action, flow } from 'mobx';
import { APP_NAME, TAB_SIZE } from 'Stores/EditorConfig';
import { EditorState } from 'Stores/editor-state/EditorState';
import { Entity } from 'SDLC/entity/Entity';
import { sdlcClient } from 'API/SdlcClient';
import { executionClient } from 'API/ExecutionClient';
import { UnsupportedOperationError, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { deserialize } from 'serializr';
import { PureModelContextGenerationInput } from 'EXEC/grammar/PureModelContextGenerationInput';
import { MODEL_IMPORT_MODE, ImportConfigurationDescription } from 'EXEC/modelImport/ImportConfigurationDescription';
import { LOG_EVENT, Log } from 'Utilities/Logger';
import { PureModelContextDataObject, graphModelDataToEntities } from 'MM/AbstractPureGraphManager';

export enum MODEL_UPDATER_INPUT_TYPE {
  ENTITIES = 'ENTITIES',
  PURE_MODEL_CONTEXT_DATA = 'PURE_MODEL_CONTEXT_DATA',
}

const DEFAULT_ENTITIES_TEXT_VALUE = '[]';
const DEFAULT_EXTERNAL_FORMAT_TEXT_VALUE = '{\n' +
  ' "package": "string",\n' +
  ' "imports": [\n' +
  '   {\n' +
  '     "fileName": "string",\n' +
  '     "content": "string"\n' +
  '   }\n' +
  ' ]\n' +
  '}';

export class ModelLoaderState extends EditorState {
  @observable modelText = DEFAULT_ENTITIES_TEXT_VALUE;
  @observable currentInputType = MODEL_UPDATER_INPUT_TYPE.ENTITIES;
  @observable currentExternalInputKey?: string;
  @observable modelImportDescriptions: ImportConfigurationDescription[] = [];
  @observable replace = true;
  @observable isLoadingModel = false;

  get headerName(): string { return 'Model Loader' }

  @action setReplaceFlag(val: boolean): void { this.replace = val }
  @action setModelText(modelText: string): void { this.modelText = modelText }

  @action setCurrentInputType(inputType: MODEL_UPDATER_INPUT_TYPE): void {
    this.currentInputType = inputType;
    this.setCurrentExternalFormatInputType(undefined);
    switch (inputType) {
      case MODEL_UPDATER_INPUT_TYPE.PURE_MODEL_CONTEXT_DATA: {
        this.modelText = JSON.stringify(this.editorStore.graphState.graphManager.createBareModelData(), null, TAB_SIZE);
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
        this.modelText = DEFAULT_ENTITIES_TEXT_VALUE;
        break;
      }
      default: throw new UnsupportedOperationError(`Unsupported model loader input type '${inputType}'`);
    }
  }

  @action setCurrentExternalFormatInputType(inputType: ImportConfigurationDescription | undefined): void {
    this.currentExternalInputKey = inputType?.key;
    if (this.currentExternalInputKey) {
      this.modelText = DEFAULT_EXTERNAL_FORMAT_TEXT_VALUE;
    }
  }

  /**
   * Current project entities will be taken from the current graph
   * If graph is not parsable, we will fall back to model loader
   */
  @action loadCurrentProjectEntities(): void {
    switch (this.currentInputType) {
      case MODEL_UPDATER_INPUT_TYPE.PURE_MODEL_CONTEXT_DATA: {
        const graphData = this.editorStore.graphState.graph.isBuilt
          ? this.editorStore.graphState.getBasicGraphModelData()
          : this.editorStore.graphState.graphManager.buildModelDataFromEntities(this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities);
        this.modelText = JSON.stringify(graphData, null, TAB_SIZE);
        break;
      }
      case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
        const graphEntities = this.editorStore.graphState.graph.isBuilt
          ? graphModelDataToEntities(this.editorStore.graphState.graphManager, this.editorStore.graphState.getBasicGraphModelData())
          : this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities;
        this.modelText = JSON.stringify(graphEntities, null, TAB_SIZE);
        break;
      }
      default: throw new UnsupportedOperationError(`Unsupported model loader input with key '${this.currentInputType}'`);
    }
  }

  loadModel = flow(function* (this: ModelLoaderState) {
    try {
      this.isLoadingModel = true;
      this.editorStore.setBlockingAlert({ message: 'Loading model...', prompt: 'Please do not close the application', showLoading: true });
      let entities: Entity[];
      if (this.currentExternalInputKey) {
        const parsedModel = (yield executionClient.transformExternalFormatToProtocol(deserialize(PureModelContextGenerationInput, JSON.parse(this.modelText)), this.currentExternalInputKey, MODEL_IMPORT_MODE.SCHEMA_IMPORT)) as unknown as PureModelContextDataObject;
        entities = graphModelDataToEntities(this.editorStore.graphState.graphManager, parsedModel);
      } else {
        switch (this.currentInputType) {
          case MODEL_UPDATER_INPUT_TYPE.PURE_MODEL_CONTEXT_DATA: {
            const parsedModel = JSON.parse(this.modelText) as PureModelContextDataObject;
            entities = graphModelDataToEntities(this.editorStore.graphState.graphManager, parsedModel);
            break;
          }
          case MODEL_UPDATER_INPUT_TYPE.ENTITIES: {
            entities = JSON.parse(this.modelText) as Entity[];
            break;
          }
          default: throw new UnsupportedOperationError(`Unsupported model loader input type '${this.currentInputType}'`);
        }
      }

      const message = `loading entities from ${APP_NAME} [${this.replace ? `potentially affected ` : ''} ${entities.length} entities]`;
      yield sdlcClient.updateEntities(this.editorStore.sdlcState.currentProjectId, this.editorStore.sdlcState.currentWorkspaceId, { replace: this.replace, entities, message });
      window.location.reload(); // hard refresh after
    } catch (error) {
      Log.error(LOG_EVENT.MODEL_LOADER_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isLoadingModel = false;
      this.editorStore.setBlockingAlert(undefined);
    }
  });

  getImportConfiguration(type: string): ImportConfigurationDescription {
    return guaranteeNonNullable(this.modelImportDescriptions.find(config => config.key === type), `Can't find configuration description for import type '${type}'`);
  }

  fetchAvailableModelImportDescriptions = flow(function* (this: ModelLoaderState) {
    try {
      const schemaImportDescriptions = ((yield executionClient.getAvailableSchemaImportDescriptions()) as unknown as ImportConfigurationDescription[]).map(gen => ({ ...gen, modelImportMode: MODEL_IMPORT_MODE.SCHEMA_IMPORT }));
      const codeImportDescriptions = ((yield executionClient.getAvailableCodeImportDescriptions()) as unknown as ImportConfigurationDescription[]).map(gen => ({ ...gen, modelImportMode: MODEL_IMPORT_MODE.CODE_IMPORT }));
      this.modelImportDescriptions = [...schemaImportDescriptions, ...codeImportDescriptions];
    } catch (error) {
      Log.error(LOG_EVENT.MODEL_LOADER_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  })
}
