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
  deepEqual,
  guaranteeType,
  isEmpty,
  ActionState,
  deleteEntry,
  assertTrue,
  generateEnumerableNameFromToken,
} from '@finos/legend-shared';
import {
  type GenerationProperty,
  type PackageableElement,
  GenerationPropertyItemType,
  type ExternalFormatDescription,
  type PureModel,
  CompilationError,
  ConfigurationProperty,
  ExternalFormatSchema as Schema,
  SchemaSet,
  isValidFullPath,
  resolvePackagePathAndElementName,
  Package,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { type EntityChange, EntityChangeType } from '@finos/legend-server-sdlc';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import {
  configurationProperty_addConfigurationProperty,
  configurationProperty_setValue,
} from '../../../../graph-modifier/DSL_Generation_GraphModifierHelper.js';

export enum SCHEMA_SET_TAB_TYPE {
  SCHEMAS = 'SCHEMAS',
  GENERATE_MODEL = 'GENERATE_MODEL',
}

const DEFAULT_SCHEMA_NAME = 'MyShemaSet';

export class SchemaSetModelGenerationState {
  readonly editorStore: EditorStore;
  readonly schemaSet: SchemaSet;
  generatingModelsState = ActionState.create();
  importGeneratedElementsState = ActionState.create();

  configurationProperties: ConfigurationProperty[] = [];
  generationValue = '';
  targetBinding = '';
  isolatedGraph: PureModel | undefined;

  constructor(
    schemaSet: SchemaSet,
    editorStore: EditorStore,
    graph?: PureModel | undefined,
  ) {
    this.schemaSet = schemaSet;
    this.editorStore = editorStore;
    makeObservable(this, {
      configurationProperties: observable,
      generatingModelsState: observable,
      importGeneratedElementsState: observable,
      generationValue: observable,
      targetBinding: observable,
      setConfigurationProperty: action,
      setGenerationValue: action,
      setTargetBindingPath: action,
      handleTargetBindingPathChange: action,
      updateGenerationParameters: action,
      canGenerate: computed,
      generate: flow,
      importGeneratedModelsIntoGraph: flow,
      getImportEntities: flow,
    });
    this.isolatedGraph = graph;
    assertTrue(this.isolatedGraph !== this.editorStore.graphManagerState.graph);
  }

  setConfigurationProperty(val: ConfigurationProperty[]): void {
    this.configurationProperties = val;
  }

  get description(): ExternalFormatDescription | undefined {
    return this.editorStore.graphState.graphGenerationState.externalFormatState.getTypeDescription(
      this.schemaSet.format,
    );
  }

  get modelGenerationProperties(): GenerationProperty[] {
    return this.description?.modelGenerationProperties ?? [];
  }

  get canGenerate(): boolean {
    if (this.targetBinding === '') {
      return true;
    }
    return isValidFullPath(this.targetBinding);
  }

  setTargetBindingPath(val: string): void {
    this.targetBinding = val;
  }

  getConfigValue(name: string): unknown {
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

  handleTargetBindingPathChange(): void {
    const isolatedGraph = this.isolatedGraph;
    if (isolatedGraph && isValidFullPath(this.targetBinding)) {
      try {
        const [packagePath, bindingName] = resolvePackagePathAndElementName(
          this.targetBinding,
        );
        const schemaName = `${DEFAULT_SCHEMA_NAME}For${bindingName}`;
        const _package =
          this.editorStore.graphManagerState.graph.getNullableElement(
            packagePath,
            true,
          );
        let reservedNames: string[] = [];
        if (_package instanceof Package) {
          reservedNames = _package.children.map((e) => e.name);
        }
        const newSchemaName = reservedNames.includes(schemaName)
          ? generateEnumerableNameFromToken(reservedNames, schemaName)
          : schemaName;
        const newPath = `${packagePath}::${newSchemaName}`;
        if (newPath !== this.schemaSet.path) {
          isolatedGraph.renameElement(
            this.schemaSet,
            `${packagePath}::${newSchemaName}`,
          );
        }
      } catch (error) {
        assertErrorThrown(error);
      }
    }
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
          configurationProperty_setValue(configProperty, {
            ...(newValue as object),
          });
        } else {
          const newItem = new ConfigurationProperty(
            generationProperty.name,
            newValue,
          );
          configurationProperty_addConfigurationProperty(
            this.configurationProperties,
            newItem,
          );
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
      const newConfigValue =
        useDefaultValue && !generationProperty.required ? undefined : newValue;
      if (newConfigValue !== undefined) {
        if (configProperty) {
          configurationProperty_setValue(configProperty, newConfigValue);
        } else {
          const newItem = new ConfigurationProperty(
            generationProperty.name,
            newConfigValue,
          );
          configurationProperty_addConfigurationProperty(
            this.configurationProperties,
            newItem,
          );
        }
      } else {
        this.configurationProperties = this.configurationProperties.filter(
          (e) => e.name !== generationProperty.name,
        );
      }
    }
  }

  addInferredConfigurationProperties(
    properties: ConfigurationProperty[],
  ): void {
    const modelGenerationProperties = this.modelGenerationProperties;
    const SCHEMA_FORMAT_PROPERTY_NAME = 'format';
    if (!properties.find((e) => e.name === SCHEMA_FORMAT_PROPERTY_NAME)) {
      const genProperty = new ConfigurationProperty(
        SCHEMA_FORMAT_PROPERTY_NAME,
        this.schemaSet.format,
      );
      properties.push(genProperty);
    }
    modelGenerationProperties
      .filter(
        (property) =>
          property.required &&
          property.defaultValue &&
          !properties.find((pv) => pv.name === property.name),
      )
      .forEach((toAdd) => {
        const value = new ConfigurationProperty(toAdd.name, toAdd.defaultValue);
        configurationProperty_addConfigurationProperty(properties, value);
      });
  }

  *generate(): GeneratorFn<boolean> {
    this.generatingModelsState.inProgress();
    this.editorStore.applicationStore.notificationService.setNotification(
      undefined,
    );
    try {
      const properties = [...this.configurationProperties];
      this.addInferredConfigurationProperties(properties);
      const val =
        (yield this.editorStore.graphManagerState.graphManager.generateModelFromExternalFormat(
          this.schemaSet,
          this.targetBinding,
          properties,
          this.isolatedGraph ?? this.editorStore.graphManagerState.graph,
        )) as string;
      this.setGenerationValue(val);
      return true;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.setGenerationValue('');
      return false;
    } finally {
      this.generatingModelsState.complete();
    }
  }

  *importGeneratedModelsIntoGraph(): GeneratorFn<void> {
    try {
      this.importGeneratedElementsState.inProgress();
      const entities = (yield flowResult(this.getImportEntities())) as Entity[];
      const newEntities: EntityChange[] = entities.map((e) => ({
        type: EntityChangeType.CREATE,
        entityPath: e.path,
        content: e.content,
      }));
      yield flowResult(
        this.editorStore.graphState.loadEntityChangesToGraph(
          newEntities,
          undefined,
        ),
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        'Generated elements imported into project',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.importGeneratedElementsState.complete();
    }
  }

  *getImportEntities(): GeneratorFn<Entity[]> {
    try {
      this.importGeneratedElementsState.inProgress();
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
          this.generationValue,
        )) as Entity[];
      return entities;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      throw error;
    } finally {
      this.importGeneratedElementsState.complete();
    }
  }
}

export class ImportSchemaContentState {
  editorStore: EditorStore;
  schemaSetEditorState: InnerSchemaSetEditorState | SchemaSetEditorState;
  loadingSchemaContentState = ActionState.create();
  files: File[] | undefined;
  importSchemaModal = false;
  constructor(
    schemaSetEditorState: InnerSchemaSetEditorState | SchemaSetEditorState,
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
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't load patch: Error: ${error.message}`,
      );
      this.loadingSchemaContentState.fail();
    }
  }
}

export class InnerSchemaSetEditorState {
  readonly editorStore: EditorStore;
  isReadOnly: boolean;
  schemaSet: SchemaSet;
  currentSchema?: Schema | undefined;
  selectedTab = SCHEMA_SET_TAB_TYPE.SCHEMAS;
  schemaValidationError?: CompilationError;
  importSchemaContentState: ImportSchemaContentState;
  schemaSetModelGenerationState: SchemaSetModelGenerationState;

  constructor(
    isReadOnly: boolean,
    schemaSet: SchemaSet,
    editorStore: EditorStore,
    graph: PureModel,
  ) {
    this.editorStore = editorStore;
    makeObservable(this, {
      schemaValidationError: observable,
      currentSchema: observable,
      selectedTab: observable,
      schemaSet: observable,
      schemaSetModelGenerationState: observable,
      setSelectedTab: action,
      setCurrentSchema: action,
      setSchemaValidationerror: action,
      reset: action,
    });
    this.schemaSet = schemaSet;
    this.isReadOnly = isReadOnly;
    if (this.schemaSet.schemas.length !== 0) {
      this.currentSchema =
        this.schemaSet.schemas[this.schemaSet.schemas.length - 1];
    }
    this.schemaSetModelGenerationState = new SchemaSetModelGenerationState(
      this.schemaSet,
      this.editorStore,
      graph,
    );
    this.importSchemaContentState = new ImportSchemaContentState(
      this,
      this.editorStore,
    );
  }

  reset(): void {
    this.currentSchema = undefined;
    this.selectedTab = SCHEMA_SET_TAB_TYPE.SCHEMAS;
    this.schemaSetModelGenerationState = new SchemaSetModelGenerationState(
      this.schemaSet,
      this.editorStore,
      this.schemaSetModelGenerationState.isolatedGraph,
    );
    this.importSchemaContentState = new ImportSchemaContentState(
      this,
      this.editorStore,
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
}

export class SchemaSetEditorState extends ElementEditorState {
  currentSchema?: Schema | undefined;
  selectedTab = SCHEMA_SET_TAB_TYPE.SCHEMAS;
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
      this.schemaSet,
      this.editorStore,
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
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      newGraph.addElement(_schemaSet, this.schemaSet.package?.path);
      yield this.editorStore.graphManagerState.graphManager.compileGraph(
        newGraph,
        {
          keepSourceInformation: true,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      if (error instanceof CompilationError) {
        this.setSchemaValidationerror(error);
      }
    }
  }
}
