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
  type ExternalFormatDescription,
  type GenerationProperty,
  type SchemaSet,
  GenerationOutput,
  ConfigurationProperty,
  ModelUnit,
  observe_ModelUnit,
  GenerationPropertyItemType,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  uuid,
  assertErrorThrown,
  LogEvent,
  isEmpty,
  deepEqual,
  AssertionError,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../EditorStore.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../__lib__/LegendStudioEvent.js';
import { GENERATION_FILE_ROOT_NAME } from '../../utils/FileSystemTreeUtils.js';
import {
  configurationProperty_addConfigurationProperty,
  configurationProperty_setValue,
} from '../../../graph-modifier/DSL_Generation_GraphModifierHelper.js';
import { GeneratedFileStructureState } from '../FileGenerationState.js';
import { ElementEditorState } from './ElementEditorState.js';

export class ExternalFormatConfigurationSpecification {
  configurationProperties: ConfigurationProperty[] = [];
  modelUnit: ModelUnit;

  constructor() {
    makeObservable(this, {
      configurationProperties: observable,
    });
    this.modelUnit = observe_ModelUnit(new ModelUnit());
  }
}

const getNullableFileGenerationConfig = (
  config: ExternalFormatConfigurationSpecification,
  name: string,
): ConfigurationProperty | undefined =>
  config.configurationProperties.find((property) => name === property.name);

export class XTGenerationState extends GeneratedFileStructureState {
  readonly elementXTSchemaGenerationState: ElementXTSchemaGenerationState;
  readonly configSpecification: ExternalFormatConfigurationSpecification;

  constructor(
    elementXTSchemaGenerationState: ElementXTSchemaGenerationState,
    fileGeneration: ExternalFormatConfigurationSpecification,
  ) {
    super(
      GENERATION_FILE_ROOT_NAME,
      elementXTSchemaGenerationState.editorStore,
    );
    makeObservable(this, {
      configSpecification: observable,
      resetGenerator: action,
      updateFileGenerationParameters: action,
      generate: flow,
    });
    this.elementXTSchemaGenerationState = elementXTSchemaGenerationState;
    this.configSpecification = fileGeneration;
  }

  get rootFolder(): string {
    return '';
  }

  get generationParentId(): undefined {
    return undefined;
  }

  resetGenerator(): void {
    this.configSpecification.configurationProperties = [];
  }

  *generate(): GeneratorFn<void> {
    this.generatingAction.inProgress();
    try {
      const modelUnit = this.configSpecification.modelUnit;
      const properties = [...this.configSpecification.configurationProperties];
      this.addInferredConfigurationProperties(properties);
      const result =
        (yield this.editorStore.graphManagerState.graphManager.generateSchemaFromExternalFormatConfig(
          modelUnit,
          undefined,
          properties,
          this.editorStore.graphManagerState.graph,
        )) as SchemaSet[];
      const output = result
        .map((schemaSet) =>
          schemaSet.schemas.map((e) => {
            const o = new GenerationOutput();
            o.content = e.content;
            o.fileName = e.location ?? '';
            o.format = schemaSet.format;
            return o;
          }),
        )
        .flat();
      this.processGenerationResult(output);
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

  addInferredConfigurationProperties(
    properties: ConfigurationProperty[],
  ): void {
    const SCHEMA_FORMAT_PROPERTY_NAME = 'format';
    if (!properties.find((e) => e.name === SCHEMA_FORMAT_PROPERTY_NAME)) {
      const genProperty = new ConfigurationProperty(
        SCHEMA_FORMAT_PROPERTY_NAME,
        this.elementXTSchemaGenerationState.description.name,
      );
      properties.push(genProperty);
    }
    this.elementXTSchemaGenerationState.description.schemaGenerationProperties
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

  updateFileGenerationParameters(
    config: ExternalFormatConfigurationSpecification,
    generationProperty: GenerationProperty,
    newValue: unknown,
  ): void {
    if (generationProperty.type === GenerationPropertyItemType.MAP) {
      if (
        !newValue ||
        isEmpty(newValue) ||
        deepEqual(newValue, generationProperty.defaultValue)
      ) {
        config.configurationProperties = config.configurationProperties.filter(
          (e) => e.name !== generationProperty.name,
        );
      } else {
        const configProperty = getNullableFileGenerationConfig(
          config,
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
            config.configurationProperties,
            newItem,
          );
        }
      }
    } else {
      const configProperty = getNullableFileGenerationConfig(
        config,
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
            config.configurationProperties,
            newItem,
          );
        }
      } else {
        config.configurationProperties = config.configurationProperties.filter(
          (e) => e.name !== generationProperty.name,
        );
      }
    }
  }
}

export class ElementXTSchemaGenerationState {
  readonly uuid = uuid();
  editorStore: EditorStore;
  description: ExternalFormatDescription;
  xtGenerationState: XTGenerationState;

  constructor(
    editorStore: EditorStore,
    description: ExternalFormatDescription,
  ) {
    makeObservable(this, {
      xtGenerationState: observable,
      regenerate: flow,
    });
    this.editorStore = editorStore;
    this.description = description;

    this.xtGenerationState = new XTGenerationState(
      this,
      new ExternalFormatConfigurationSpecification(),
    );
  }

  *regenerate(): GeneratorFn<void> {
    const currentState = this.editorStore.tabManagerState.currentTab;
    if (currentState instanceof ElementEditorState) {
      this.xtGenerationState.configSpecification.modelUnit.packageableElementIncludes =
        [PackageableElementExplicitReference.create(currentState.element)];
      yield flowResult(this.xtGenerationState.generate());
    } else {
      throw new AssertionError(
        'Generation state must have at least an element editor opened',
      );
    }
  }
}
