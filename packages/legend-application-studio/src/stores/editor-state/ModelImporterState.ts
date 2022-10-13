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
  action,
  flow,
  makeObservable,
  computed,
  flowResult,
} from 'mobx';
import { EditorState } from './EditorState.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  UnsupportedOperationError,
  isNonNullable,
  ActionState,
  assertTrue,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import type { EditorStore } from '../EditorStore.js';
import type { Entity } from '@finos/legend-storage';
import { TAB_SIZE } from '@finos/legend-application';
import type {
  ModelImporterExtensionConfiguration,
  LegendStudioApplicationPlugin,
} from '../LegendStudioApplicationPlugin.js';
import {
  type ExternalFormatDescription,
  type PureModel,
  SchemaSet,
  observe_SchemaSet,
} from '@finos/legend-graph';
import {
  externalFormat_schemaSet_setFormat,
  externalFormat_schemaSet_setSchemas,
} from '../shared/modifier/DSL_ExternalFormat_GraphModifierHelper.js';
import { InnerSchemaSetEditorState } from './element-editor-state/external-format/DSL_ExternalFormat_SchemaSetEditorState.js';

export enum MODEL_IMPORT_NATIVE_INPUT_TYPE {
  ENTITIES = 'ENTITIES',
  PURE_PROTOCOL = 'PURE_PROTOCOL',
  PURE_GRAMMAR = 'PURE_GRAMMAR',
}

export enum MODEL_IMPORT_TYPE {
  NATIVE = 'NATIVE',
  EXTERNAL_FORMAT = 'EXTERNAL_FORMAT',
  EXTENSIONS = 'EXTENSIONS',
}

export abstract class ModelImporterEditorState {
  readonly editorStore: EditorStore;
  readonly modelImporterState: ModelImporterState;
  readonly loadModelActionState = ActionState.create();

  constructor(modelImporterState: ModelImporterState) {
    this.editorStore = modelImporterState.editorStore;
    this.modelImporterState = modelImporterState;
  }

  abstract get label(): string;

  abstract get allowHardReplace(): boolean;

  abstract get isLoadingDisabled(): boolean;

  abstract loadModel(): Promise<void>;
}

export class NativeModelImporterEditorState extends ModelImporterEditorState {
  nativeType = MODEL_IMPORT_NATIVE_INPUT_TYPE.ENTITIES;
  modelText: string;
  loadCurrentProjectActionState = ActionState.create();

  constructor(modelImporterState: ModelImporterState) {
    super(modelImporterState);
    this.modelText = this.getExampleEntitiesInputText();
    makeObservable(this, {
      nativeType: observable,
      modelText: observable,
      loadModelActionState: observable,
      setModelText: action,
      setNativeImportType: action,
      isLoadingDisabled: computed,
      loadModel: flow,
      loadCurrentProjectEntities: flow,
    });
  }

  get label(): string {
    return this.nativeType;
  }

  get allowHardReplace(): boolean {
    return true;
  }

  get isLoadingDisabled(): boolean {
    return this.loadCurrentProjectActionState.isInProgress;
  }

  setModelText(val: string): void {
    this.modelText = val;
  }

  setNativeImportType(nativeImportType: MODEL_IMPORT_NATIVE_INPUT_TYPE): void {
    if (this.nativeType !== nativeImportType) {
      this.nativeType = nativeImportType;
      this.modelText = this.getNativeImportExampleText(nativeImportType);
    }
  }

  getNativeImportExampleText(
    inputType: MODEL_IMPORT_NATIVE_INPUT_TYPE,
  ): string {
    switch (inputType) {
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_PROTOCOL:
        return this.getExamplePureProtocolInputText();
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.ENTITIES:
        return this.getExampleEntitiesInputText();
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_GRAMMAR:
        return this.getExamplePureGrammarText();
      default:
        return '';
    }
  }

  async loadEntites(): Promise<Entity[]> {
    switch (this.nativeType) {
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_PROTOCOL: {
        return this.editorStore.graphManagerState.graphManager.pureProtocolTextToEntities(
          this.modelText,
        );
      }
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.ENTITIES: {
        return JSON.parse(this.modelText) as Entity[];
      }
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_GRAMMAR: {
        return this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
          this.modelText,
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't load model for input of type '${this.nativeType}'`,
        );
    }
  }

  *loadCurrentProjectEntities(): GeneratorFn<void> {
    this.loadCurrentProjectActionState.inProgress();
    switch (this.nativeType) {
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_PROTOCOL: {
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
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.ENTITIES: {
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
      case MODEL_IMPORT_NATIVE_INPUT_TYPE.PURE_GRAMMAR: {
        this.modelText =
          (yield this.editorStore.graphManagerState.graphManager.graphToPureCode(
            this.editorStore.graphManagerState.graph,
          )) as string;
        break;
      }
      default:
        this.loadCurrentProjectActionState.fail();
        throw new UnsupportedOperationError(
          `Can't load current project entities for input type of type '${this.nativeType}'`,
        );
    }
    this.loadCurrentProjectActionState.complete();
  }

  private getExampleEntitiesInputText(): string {
    return `${JSON.stringify(
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
    return `${this.editorStore.graphManagerState.graphManager.getExamplePureProtocolText()}`;
  }

  private getExamplePureGrammarText(): string {
    return `###Pure\n Class model::A\n {\n\n}`;
  }

  async loadModel(): Promise<void> {
    try {
      this.loadModelActionState.inProgress();
      this.editorStore.applicationStore.setBlockingAlert({
        message: 'Loading model...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      const entities = await this.loadEntites();
      const message = `loading entities from ${
        this.editorStore.applicationStore.config.appName
      } [${this.modelImporterState.replace ? `potentially affected ` : ''} ${
        entities.length
      } entities]`;
      await this.editorStore.sdlcServerClient.updateEntities(
        this.editorStore.sdlcState.activeProject.projectId,
        this.editorStore.sdlcState.activeWorkspace,
        { replace: this.modelImporterState.replace, entities, message },
      );
      this.editorStore.applicationStore.navigator.reload({
        ignoreBlocking: true,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.MODEL_LOADER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.loadModelActionState.complete();
      this.editorStore.applicationStore.setBlockingAlert(undefined);
    }
  }
}

export abstract class ExtensionModelImportRendererState {
  importerState: ModelImporterState;

  constructor(importerState: ModelImporterState) {
    this.importerState = importerState;
  }
}
export class ExtensionModelImporterEditorState extends ModelImporterEditorState {
  config: ModelImporterExtensionConfiguration;
  rendererState: ExtensionModelImportRendererState;

  constructor(
    config: ModelImporterExtensionConfiguration,
    rendererState: ExtensionModelImportRendererState,
    modelImporterState: ModelImporterState,
  ) {
    super(modelImporterState);
    this.config = config;
    this.rendererState = rendererState;
    makeObservable(this, {
      config: observable,
      modelImporterState: observable,
      loadModelActionState: observable,
      rendererState: observable,
      isLoadingDisabled: computed,
      setExtension: action,
      loadModel: flow,
    });
  }

  get label(): string {
    return this.config.label ?? this.config.key;
  }

  get allowHardReplace(): boolean {
    return Boolean(this.config.allowHardReplace);
  }

  get isLoadingDisabled(): boolean {
    return false;
  }

  setExtension(
    extensionConfiguration: ModelImporterExtensionConfiguration,
  ): void {
    this.config = extensionConfiguration;
  }

  async loadModel(): Promise<void> {
    await this.config.loadModel(this.rendererState);
  }
}

const DEFAULT_SCHEMA_PACKAGE = '__internal__';
const DEFAULT_SCHEMA_NAME = 'MyShemaSet';

export class ExternalFormatModelImporterState extends ModelImporterEditorState {
  schemaSet: SchemaSet;
  schemaSetEditorState: InnerSchemaSetEditorState;
  description: ExternalFormatDescription;
  isolatedSchemaGraph: PureModel;

  constructor(
    description: ExternalFormatDescription,
    modelImporterState: ModelImporterState,
  ) {
    super(modelImporterState);
    this.description = description;
    this.schemaSet = new SchemaSet(DEFAULT_SCHEMA_NAME);
    this.schemaSet.format = description.name;

    observe_SchemaSet(this.schemaSet);
    const emptyGraph = this.editorStore.graphManagerState.createEmptyGraph();
    emptyGraph.addElement(this.schemaSet, DEFAULT_SCHEMA_PACKAGE);
    this.isolatedSchemaGraph = emptyGraph;
    this.schemaSetEditorState = new InnerSchemaSetEditorState(
      false,
      this.schemaSet,
      this.editorStore,
      this.isolatedSchemaGraph,
    );
    makeObservable(this, {
      schemaSet: observable,
      schemaSetEditorState: observable,
      loadModelActionState: observable,
      description: observable,
      isolatedSchemaGraph: observable,
      setExternalFormat: action,
      setDescription: action,
      isLoadingDisabled: computed,
      loadModel: flow,
    });
  }

  get allowHardReplace(): boolean {
    return true;
  }
  get label(): string {
    return this.schemaSet.format;
  }

  get isLoadingDisabled(): boolean {
    return (
      !this.schemaSetEditorState.schemaSetModelGenerationState.canGenerate ||
      this.schemaSetEditorState.schemaSetModelGenerationState
        .generatingModelsState.isInProgress ||
      this.schemaSetEditorState.schemaSetModelGenerationState
        .importGeneratedElementsState.isInProgress
    );
  }

  setDescription(val: ExternalFormatDescription): void {
    this.description = val;
  }

  setExternalFormat(description: ExternalFormatDescription): void {
    if (description !== this.description) {
      this.setDescription(description);
      externalFormat_schemaSet_setFormat(this.schemaSet, this.description.name);
      externalFormat_schemaSet_setSchemas(this.schemaSet, []);
      this.schemaSetEditorState.reset();
    }
  }

  async loadModel(): Promise<void> {
    this.loadModelActionState.inProgress();
    try {
      this.loadModelActionState.inProgress();
      this.editorStore.applicationStore.setBlockingAlert({
        message: 'Loading model...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      const modelgenerationstate =
        this.schemaSetEditorState.schemaSetModelGenerationState;
      const entities = await flowResult(
        modelgenerationstate.getImportEntities(),
      );
      if (modelgenerationstate.targetBinding) {
        const schemaEntity =
          this.editorStore.graphManagerState.graphManager.elementToEntity(
            this.schemaSet,
          );
        entities.push(schemaEntity);
      }
      assertTrue(Boolean(entities.length), 'No entities to load');
      const message = `loading entities from ${
        this.editorStore.applicationStore.config.appName
      } [${this.modelImporterState.replace ? `potentially affected ` : ''} ${
        entities.length
      } entities]`;
      await this.editorStore.sdlcServerClient.updateEntities(
        this.editorStore.sdlcState.activeProject.projectId,
        this.editorStore.sdlcState.activeWorkspace,
        { replace: this.modelImporterState.replace, entities, message },
      );
      this.editorStore.applicationStore.navigator.reload({
        ignoreBlocking: true,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.loadModelActionState.complete();
      this.editorStore.applicationStore.setBlockingAlert(undefined);
    }
  }
}

export class ModelImporterState extends EditorState {
  replace = true;
  modelImportEditorState: ModelImporterEditorState;
  extensionConfigs: ModelImporterExtensionConfiguration[] = [];

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      replace: observable,
      modelImportEditorState: observable,
      extensionConfigs: observable,
      setReplaceFlag: action,
      setModelImporterExtension: action,
      setNativeImportType: action,
      setExternalFormatImportFormat: action,
      setImportEditorState: action,
    });
    this.modelImportEditorState = new NativeModelImporterEditorState(this);
    this.extensionConfigs = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin: LegendStudioApplicationPlugin) =>
          plugin.getExtraModelImporterExtensionConfigurations?.() ?? [],
      )
      .filter(isNonNullable);
  }

  get headerName(): string {
    return 'Model Importer';
  }
  setReplaceFlag(val: boolean): void {
    this.replace = val;
  }
  setImportEditorState(val: ModelImporterEditorState): void {
    this.modelImportEditorState = val;
  }
  setNativeImportType(
    nativeImportType: MODEL_IMPORT_NATIVE_INPUT_TYPE,
  ): NativeModelImporterEditorState {
    const nativeEditorState =
      this.modelImportEditorState instanceof NativeModelImporterEditorState
        ? this.modelImportEditorState
        : new NativeModelImporterEditorState(this);
    nativeEditorState.setNativeImportType(nativeImportType);
    this.setImportEditorState(nativeEditorState);
    return nativeEditorState;
  }
  setExternalFormatImportFormat(
    externalFormat: ExternalFormatDescription,
  ): ExternalFormatModelImporterState {
    const extensionEditorState =
      this.modelImportEditorState instanceof ExternalFormatModelImporterState
        ? this.modelImportEditorState
        : new ExternalFormatModelImporterState(externalFormat, this);
    extensionEditorState.setExternalFormat(externalFormat);
    this.setImportEditorState(extensionEditorState);
    return extensionEditorState;
  }
  setModelImporterExtension(
    extension: ModelImporterExtensionConfiguration,
  ): ExtensionModelImporterEditorState {
    if (
      this.modelImportEditorState instanceof
        ExtensionModelImporterEditorState &&
      this.modelImportEditorState.config === extension
    ) {
      return this.modelImportEditorState;
    } else {
      const modelImporterEditorState = new ExtensionModelImporterEditorState(
        extension,
        extension.getExtensionModelImportRendererStateCreator(this),
        this,
      );
      this.setImportEditorState(modelImporterEditorState);
      return modelImporterEditorState;
    }
  }
}
