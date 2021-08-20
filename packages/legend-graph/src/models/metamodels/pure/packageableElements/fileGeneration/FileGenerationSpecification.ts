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
  guaranteeNonNullable,
  hashArray,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
} from '@finos/legend-shared';
import { observable, action, makeObservable, override } from 'mobx';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type {
  PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import { PackageableElementReference } from '../PackageableElementReference';
import { AbstractGenerationSpecification } from '../generationSpecification/AbstractGenerationSpecification';
import type { ConfigurationProperty } from './ConfigurationProperty';

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

    makeObservable<FileGenerationSpecification, '_elementHashCode'>(this, {
      type: observable,
      generationOutputPath: observable,
      scopeElements: observable,
      configurationProperties: observable,
      setGenerationOutputPath: action,
      setType: action,
      setScopeElements: action,
      addScopeElement: action,
      deleteScopeElement: action,
      changeScopeElement: action,
      _elementHashCode: override,
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

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FILE_GENERATION,
      this.path,
      this.type,
      this.generationOutputPath ?? '',
      hashArray(
        this.scopeElements.map((element) =>
          element instanceof PackageableElementReference
            ? element.hashValue
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
