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
  computed,
  action,
  makeObservable,
  observable,
  flow,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  readFileAsText,
  assertErrorThrown,
  LogEvent,
  addUniqueEntry,
  deepEqual,
  guaranteeType,
  isEmpty,
  ActionState,
  deleteEntry,
} from '@finos/legend-shared';
import {
  type GenerationProperty,
  type PackageableElement,
  type ExternalFormatDescription,
  CompilationError,
  ConfigurationProperty,
  GenerationPropertyItemType,
  ExternalFormatSchema as Schema,
  SchemaSet,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import { type EntityChange, EntityChangeType } from '@finos/legend-server-sdlc';
import type { EditorStore } from '../../../EditorStore';
import { ElementEditorState } from '../ElementEditorState';
import { LEGEND_STUDIO_LOG_EVENT_TYPE } from '../../../LegendStudioLogEvent';

export enum SCHEMA_SET_TAB_TYPE {
  GENERAL = 'GENERAL',
  MODEL_GENERATION = 'MODEL_GENERATION',
}

export class SchemaSetModelGenerationState {
  isGenerating = false;
  isImportingGeneratedElements = false;
  schemaSetEditorState: SchemaSetEditorState;
  configurationProperties: ConfigurationProperty[] = [];
  generationValue = '';

  constructor(schemaSetEditorState: SchemaSetEditorState) {
    this.schemaSetEditorState = schemaSetEditorState;

    makeObservable(this, {
      configurationProperties: observable,
      isGenerating: observable,
      generationValue: observable,
      setConfigurationProperty: action,
      setGenerationValue: action,
      generateModel: flow,
      importGrammar: flow,
    });
  }

  setConfigurationProperty(val: ConfigurationProperty[]): void {
    this.configurationProperties = val;
  }

  get description(): ExternalFormatDescription {
    return this.schemaSetEditorState.editorStore.graphState.graphGenerationState.externalFormatState.getTypeDescription(
      this.schemaSetEditorState.schemaSet.format,
    );
  }

  get modelGenerationProperties(): GenerationProperty[] {
    return this.description.modelGenerationProperties;
  }

  getConfigValue(name: string): unknown | undefined {
    return this.getConfig(name)?.value;
  }

  getConfig(name: string): ConfigurationProperty | undefined {
    return this.configurationProperties.find(
      (property) => name === property.name,
    );
  }

  setGenerationValue(val: string): void {
    this.generationValue = val;
  }

  updateGenerationParameters(
    generationProperty: GenerationProperty,
    newValue: unknown,
  ): void {
    if (generationProperty.type === GenerationPropertyItemType.MAP) {
      if (
        !newValue ||
        isEmpty(newValue) ||
        deepEqual(newValue, generationProperty.defaultValue)
      ) {
        this.configurationProperties = this.configurationProperties.filter(
          (e) => e.name !== generationProperty.name,
        );
      } else {
        const configProperty = this.getConfig(generationProperty.name);
        if (configProperty) {
          configProperty.setValue({ ...(newValue as object) });
        } else {
          const newItem = new ConfigurationProperty(
            generationProperty.name,
            newValue,
          );
          addUniqueEntry(this.configurationProperties, newItem);
        }
      }
    } else {
      const configProperty = this.getConfig(generationProperty.name);
      let useDefaultValue = generationProperty.defaultValue === newValue;
      if (generationProperty.type === GenerationPropertyItemType.BOOLEAN) {
        useDefaultValue =
          (generationProperty.defaultValue === 'true') ===
          (newValue as boolean);
      }
      const newConfigValue = useDefaultValue ? undefined : newValue;
      if (newConfigValue !== undefined) {
        if (configProperty) {
          configProperty.setValue(newConfigValue);
        } else {
          const newItem = new ConfigurationProperty(
            generationProperty.name,
            newConfigValue,
          );
          addUniqueEntry(this.configurationProperties, newItem);
        }
      } else {
        this.configurationProperties = this.configurationProperties.filter(
          (e) => e.name !== generationProperty.name,
        );
      }
    }
  }

  *generateModel(): GeneratorFn<void> {
    this.isGenerating = true;
    try {
      const SCHEMA_SET_PROPERTY_NAME = 'sourceSchemaSet';
      const SCHEMA_FORMAT_PROPERTY_NAME = 'format';
      const properties = [...this.configurationProperties];
      if (!properties.find((e) => e.name === SCHEMA_SET_PROPERTY_NAME)) {
        const genProperty = new ConfigurationProperty(
          SCHEMA_SET_PROPERTY_NAME,
          this.schemaSetEditorState.schemaSet.path,
        );
        properties.push(genProperty);
      }
      if (!properties.find((e) => e.name === SCHEMA_FORMAT_PROPERTY_NAME)) {
        const genProperty = new ConfigurationProperty(
          SCHEMA_FORMAT_PROPERTY_NAME,
          this.schemaSetEditorState.schemaSet.format,
        );
        properties.push(genProperty);
      }
      const val =
        (yield this.schemaSetEditorState.editorStore.graphManagerState.graphManager.generateModelFromExternalFormat(
          properties,
          this.schemaSetEditorState.editorStore.graphManagerState.graph,
        )) as string;
      this.setGenerationValue(val);
    } catch (error) {
      assertErrorThrown(error);
      this.schemaSetEditorState.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.schemaSetEditorState.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGenerating = false;
    }
  }

  *importGrammar(): GeneratorFn<void> {
    try {
      this.isImportingGeneratedElements = true;
      const entities =
        (yield this.schemaSetEditorState.editorStore.graphManagerState.graphManager.pureCodeToEntities(
          this.generationValue,
        )) as Entity[];
      const newEntities: EntityChange[] = entities.map((e) => ({
        type: EntityChangeType.CREATE,
        entityPath: e.path,
        content: e.content,
      }));
      yield flowResult(
        this.schemaSetEditorState.editorStore.graphState.loadEntityChangesToGraph(
          newEntities,
          undefined,
        ),
      );
      this.schemaSetEditorState.editorStore.applicationStore.notifySuccess(
        'Generated elements imported into project',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.schemaSetEditorState.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.schemaSetEditorState.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isImportingGeneratedElements = false;
    }
  }
}
export class ImportSchemaContentState {
  editorStore: EditorStore;
  schemaSetEditorState: SchemaSetEditorState;
  loadingSchemaContentState = ActionState.create();
  files: File[] | undefined;
  importSchemaModal = false;
  constructor(
    schemaSetEditorState: SchemaSetEditorState,
    editorStore: EditorStore,
  ) {
    this.editorStore = editorStore;
    this.schemaSetEditorState = schemaSetEditorState;
    makeObservable(this, {
      schemaSetEditorState: false,
      editorStore: false,
      files: observable,
      importSchemaModal: observable,
      loadingSchemaContentState: observable,
      removeFile: action,
      closeModal: action,
      importSchemas: flow,
    });
  }

  setImportSchemaModal(val: boolean): void {
    this.importSchemaModal = val;
  }

  setFiles(files: File[] | undefined): void {
    this.files = files;
  }

  removeFile(file: File): void {
    if (this.files) {
      deleteEntry(this.files, file);
    }
  }

  closeModal(): void {
    this.files = undefined;
    this.setImportSchemaModal(false);
  }

  *importSchemas(files: File[]): GeneratorFn<void> {
    try {
      this.loadingSchemaContentState.inProgress();
      const schemaSet = this.schemaSetEditorState.schemaSet;
      yield Promise.all(
        files.map((file) =>
          readFileAsText(file).then((content) => {
            const _schema = new Schema();
            _schema.location = file.name;
            _schema.content = content;
            // https://stackoverflow.com/questions/4250364
            _schema.id = file.name.replace(/\.[^/.]+$/, '');
            schemaSet.schemas.push(_schema);
          }),
        ),
      );
      if (schemaSet.schemas.length) {
        this.schemaSetEditorState.setCurrentSchema(schemaSet.schemas[0]);
      }
      this.loadingSchemaContentState.complete();
      this.closeModal();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(
        `Can't load patch: Error: ${error.message}`,
      );
      this.loadingSchemaContentState.fail();
    }
  }
}

export class SchemaSetEditorState extends ElementEditorState {
  currentSchema?: Schema | undefined;
  selectedTab = SCHEMA_SET_TAB_TYPE.GENERAL;
  schemaValidationError?: CompilationError;
  importSchemaContentState: ImportSchemaContentState;

  schemaSetModelGenerationState: SchemaSetModelGenerationState;
  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      schemaValidationError: observable,
      currentSchema: observable,
      selectedTab: observable,
      schemaSet: computed,
      setSelectedTab: action,
      setCurrentSchema: action,
      reprocess: action,
      setSchemaValidationerror: action,
      validateSchema: flow,
    });

    if (this.schemaSet.schemas.length !== 0) {
      this.currentSchema =
        this.schemaSet.schemas[this.schemaSet.schemas.length - 1];
    }
    this.schemaSetModelGenerationState = new SchemaSetModelGenerationState(
      this,
    );
    this.importSchemaContentState = new ImportSchemaContentState(
      this,
      this.editorStore,
    );
  }

  get schemaSet(): SchemaSet {
    return guaranteeType(
      this.element,
      SchemaSet,
      'Element inside schema set element editor state must be a SchemaSet',
    );
  }

  setCurrentSchema(value: Schema | undefined): void {
    this.currentSchema = value;
  }

  setSelectedTab(tab: SCHEMA_SET_TAB_TYPE): void {
    this.selectedTab = tab;
  }

  setSchemaValidationerror(error: CompilationError): void {
    this.schemaValidationError = error;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const schemaSetEditorState = new SchemaSetEditorState(
      editorStore,
      newElement,
    );
    return schemaSetEditorState;
  }

  *validateSchema(currentSchema: Schema): GeneratorFn<void> {
    try {
      const _schemaSet = new SchemaSet(this.schemaSet.name);
      _schemaSet.format = this.schemaSet.format;
      _schemaSet.schemas = [currentSchema];
      const newGraph = this.editorStore.graphManagerState.createEmptyGraph();
      _schemaSet.package = newGraph.getOrCreatePackage(
        this.schemaSet.package?.path ?? '',
      );
      newGraph.addElement(_schemaSet);
      yield this.editorStore.graphManagerState.graphManager.compileGraph(
        newGraph,
        {
          keepSourceInformation: true,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      if (error instanceof CompilationError) {
        this.setSchemaValidationerror(error);
      }
    }
  }
}
