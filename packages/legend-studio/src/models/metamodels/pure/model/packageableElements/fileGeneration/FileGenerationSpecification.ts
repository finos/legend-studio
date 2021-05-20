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
  deepEqual,
  isEmpty,
  IllegalStateError,
  guaranteeNonNullable,
  hashArray,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import { observable, action, computed, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { GenerationProperty } from '../../../action/generation/GenerationConfigurationDescription';
import { GenerationPropertyItemType } from '../../../action/generation/GenerationConfigurationDescription';
import { ConfigurationProperty } from './ConfigurationProperty';
import type {
  PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import { PackageableElementReference } from '../PackageableElementReference';
import { AbstractGenerationSpecification } from '../generationSpecification/AbstractGenerationSpecification';

export type FileGenerationTypeOption = {
  value: string;
  label: string;
};

export enum GenerationMode {
  CODE_GENERATION = 'codeGeneration',
  SCHEMA_GENERATION = 'schemaGeneration',
}

export const getGenerationMode = (value: string): GenerationMode =>
  guaranteeNonNullable(
    Object.values(GenerationMode).find((mode) => mode === value),
    `Encountered unsupported generation mode '${value}'`,
  );

export class FileGenerationSpecification
  extends AbstractGenerationSpecification
  implements Hashable
{
  type!: string;
  generationOutputPath?: string;
  scopeElements: (PackageableElementReference<PackageableElement> | string)[] =
    [];
  configurationProperties: ConfigurationProperty[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      type: observable,
      generationOutputPath: observable,
      scopeElements: observable,
      configurationProperties: observable,
      setType: action,
      setScopeElements: action,
      addScopeElement: action,
      deleteScopeElement: action,
      changeScopeElement: action,
      updateParameters: action,
      handleMapParameterUpdate: action,
      setGenerationOutputPath: action,
      hashCode: computed({ keepAlive: true }),
    });
  }

  setType(value: string): void {
    this.type = value;
  }

  setGenerationOutputPath(val?: string): void {
    this.generationOutputPath = val;
  }

  setScopeElements(
    value: (PackageableElementReference<PackageableElement> | string)[],
  ): void {
    this.scopeElements = value;
  }
  addScopeElement(
    value: PackageableElementReference<PackageableElement> | string,
  ): void {
    addUniqueEntry(this.scopeElements, value);
  }
  deleteScopeElement(
    value: PackageableElementReference<PackageableElement> | string,
  ): void {
    deleteEntry(this.scopeElements, value);
  }
  changeScopeElement(
    oldValue: PackageableElementReference<PackageableElement> | string,
    newValue: PackageableElementReference<PackageableElement> | string,
  ): void {
    changeEntry(this.scopeElements, oldValue, newValue);
  }

  getConfigValue(name: string): unknown | undefined {
    return this.getConfig(name)?.value;
  }
  getConfig(name: string): ConfigurationProperty | undefined {
    return this.configurationProperties.find(
      (property) => name === property.name,
    );
  }

  updateParameters(
    generationProperty: GenerationProperty,
    newValue: unknown,
  ): void {
    if (generationProperty.type === GenerationPropertyItemType.MAP) {
      this.handleMapParameterUpdate(generationProperty, newValue);
    } else {
      const configProperty = this.getConfig(generationProperty.name);
      const newConfigValue = this.compareDefaultValue(
        generationProperty,
        newValue,
      )
        ? undefined
        : newValue;
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

  handleMapParameterUpdate(
    generationProperty: GenerationProperty,
    newValue: unknown,
  ): void {
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
  }

  compareDefaultValue(
    generationProperty: GenerationProperty,
    value: unknown,
  ): boolean {
    if (generationProperty.type === GenerationPropertyItemType.BOOLEAN) {
      return (
        (generationProperty.defaultValue === 'true') === (value as boolean)
      );
    }
    return generationProperty.defaultValue === value;
  }

  createConfig(): Record<PropertyKey, unknown> {
    const config: Record<PropertyKey, unknown> = {};
    config.scopeElements = this.scopeElements.map((element) =>
      element instanceof PackageableElementReference
        ? element.value.path
        : element,
    );
    this.configurationProperties.forEach((property) => {
      config[property.name] = property.value as Record<PropertyKey, unknown>;
    });
    return config;
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.FILE_GENERATION,
      super.hashCode,
      this.type,
      this.generationOutputPath ?? '',
      hashArray(
        this.scopeElements.map((element) =>
          element instanceof PackageableElementReference
            ? element.valueForSerialization
            : element,
        ),
      ),
      hashArray(this.configurationProperties),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_FileGenerationSpecification(this);
  }
}
