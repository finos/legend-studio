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

import { addUniqueEntry, deepEqual, IllegalStateError, deleteEntry, changeEntry } from 'Utilities/GeneralUtil';
import { observable, action, computed } from 'mobx';
import { GenerationProperty, GenerationItemType } from 'EXEC/fileGeneration/GenerationProperty';
import { Hashable } from 'MetaModelUtility';
import { hashArray } from 'Utilities/HashUtil';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { isEmpty } from 'lodash';
import { ConfigurationProperty } from './ConfigurationProperty';
import { PackageableElementVisitor, PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

export type FileGenerationTypeOption = {
  value: string;
  label: string;
}

/* @MARKER: NEW FILE GENERATION TYPE SUPPORT --- consider adding new file generation type handler here whenever support for a new file generation type is added to the app */
export enum FILE_GENERATION_MODE {
  CODE_GENERATION = 'codeGeneration',
  SCHEMA_GENERATION = 'schemaGeneration'
}

export class FileGeneration extends PackageableElement implements Hashable {
  @observable type!: string;
  @observable scopeElements: (PackageableElementReference<PackageableElement> | string)[] = [];
  @observable configurationProperties: ConfigurationProperty[] = [];

  @action setType(value: string): void { this.type = value }
  @action setScopeElements(value: (PackageableElementReference<PackageableElement> | string)[]): void { this.scopeElements = value }
  @action addScopeElement(value: PackageableElementReference<PackageableElement> | string): void { addUniqueEntry(this.scopeElements, value) }
  @action deleteScopeElement(value: PackageableElementReference<PackageableElement> | string): void { deleteEntry(this.scopeElements, value) }
  @action changeScopeElement(oldValue: PackageableElementReference<PackageableElement> | string, newValue: PackageableElementReference<PackageableElement> | string): void { changeEntry(this.scopeElements, oldValue, newValue) }

  getConfigValue(name: string): unknown | undefined { return this.getConfig(name)?.value }
  getConfig(name: string): ConfigurationProperty | undefined { return this.configurationProperties.find(property => name === property.name) }

  @action updateParameters(generationProperty: GenerationProperty, newValue: unknown): void {
    if (generationProperty.type === GenerationItemType.MAP) {
      this.handleMapParameterUpdate(generationProperty, newValue);
    } else {
      const configProperty = this.getConfig(generationProperty.name);
      const newConfigValue = this.compareDefaultValue(generationProperty, newValue) ? undefined : newValue;
      if (newConfigValue !== undefined) {
        if (configProperty) {
          configProperty.setValue(newConfigValue);
        } else {
          const newItem = new ConfigurationProperty(generationProperty.name, newConfigValue);
          addUniqueEntry(this.configurationProperties, newItem);
        }
      } else {
        this.configurationProperties = this.configurationProperties.filter(e => e.name !== generationProperty.name);
      }
    }

  }

  @action handleMapParameterUpdate(generationProperty: GenerationProperty, newValue: unknown): void {
    if (!newValue || isEmpty(newValue) || deepEqual(newValue, generationProperty.defaultValue)) {
      this.configurationProperties = this.configurationProperties.filter(e => e.name !== generationProperty.name);
    } else {
      const configProperty = this.getConfig(generationProperty.name);
      if (configProperty) {
        configProperty.setValue({ ...(newValue as object) });
      } else {
        const newItem = new ConfigurationProperty(generationProperty.name, newValue);
        addUniqueEntry(this.configurationProperties, newItem);
      }
    }
  }

  compareDefaultValue(generationProperty: GenerationProperty, value: unknown): boolean {
    if (generationProperty.type === GenerationItemType.BOOLEAN) {
      return (generationProperty.defaultValue === 'true') === (value as boolean);
    }
    return generationProperty.defaultValue === value;
  }

  createConfig(): Record<PropertyKey, unknown> {
    const config: Record<PropertyKey, unknown> = {};
    config.scopeElements = this.scopeElements.map(element => element instanceof PackageableElementReference ? element.value.path : element);
    this.configurationProperties.forEach(property => {
      config[property.name] = property.value as Record<PropertyKey, unknown>;
    });
    return config;
  }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.FILE_GENERATION,
      super.hashCode,
      this.type,
      hashArray(this.scopeElements.map(element => element instanceof PackageableElementReference ? element.valueForSerialization : element)),
      hashArray(this.configurationProperties)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_FileGeneration(this);
  }
}
