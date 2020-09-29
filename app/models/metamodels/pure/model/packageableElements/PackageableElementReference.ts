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

import { observable, action, computed } from 'mobx';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Section } from 'MM/model/packageableElements/section/Section';
import { RequiredReference, OptionalReference } from 'MM/model/Reference';

export abstract class PackageableElementReference<T extends PackageableElement> extends RequiredReference {
  @observable value: T;

  protected constructor(value: T) {
    super();
    this.value = value;
  }

  @action setValue(value: T): void { this.value = value }

  abstract get valueForSerialization(): string
}

export class PackageableElementExplicitReference<T extends PackageableElement> extends PackageableElementReference<T> {
  static create<T extends PackageableElement>(value: T): PackageableElementExplicitReference<T> {
    return new PackageableElementExplicitReference(value);
  }

  @computed get valueForSerialization(): string {
    return this.value.path;
  }
}

export class PackageableElementImplicitReference<T extends PackageableElement> extends PackageableElementReference<T> {
  readonly initialResolvedPath: string;
  readonly input: string;
  readonly parentSection?: Section;
  readonly isResolvedFromAutoImports?: boolean;

  private constructor(value: T, input: string, parentSection: Section | undefined, isResolvedFromAutoImports: boolean | undefined) {
    super(value);
    this.initialResolvedPath = value.path;
    this.input = input;
    this.parentSection = parentSection;
    this.isResolvedFromAutoImports = isResolvedFromAutoImports;
  }

  static create<T extends PackageableElement>(value: T, input: string, parentSection: Section | undefined, isResolvedFromAutoImports: boolean | undefined): PackageableElementImplicitReference<T> {
    return new PackageableElementImplicitReference(value, input, parentSection, isResolvedFromAutoImports);
  }

  @computed get valueForSerialization(): string {
    const currentElementPath = this.value.path;
    if (this.isResolvedFromAutoImports) {
      return this.input;
    }
    // when the parent section does not exist or has been deleted
    if (this.parentSection === undefined || this.parentSection.parent.isDeleted) {
      return currentElementPath;
    }
    // the current element is the same as the inferred one
    if (this.initialResolvedPath === currentElementPath) {
      return this.input;
    }
    return currentElementPath;
  }
}

export abstract class OptionalPackageableElementReference<T extends PackageableElement> extends OptionalReference {
  @observable value?: T;

  protected constructor(value: T | undefined) {
    super();
    this.value = value;
  }

  @action setValue(value: T | undefined): void { this.value = value }

  abstract get valueForSerialization(): string | undefined
}

export class OptionalPackageableElementExplicitReference<T extends PackageableElement> extends OptionalPackageableElementReference<T> {
  static create<T extends PackageableElement>(value: T | undefined): OptionalPackageableElementExplicitReference<T> {
    return new OptionalPackageableElementExplicitReference(value);
  }

  @computed get valueForSerialization(): string | undefined {
    return this.value?.path;
  }
}

export class OptionalPackageableElementImplicitReference<T extends PackageableElement> extends OptionalPackageableElementReference<T> {
  readonly initialResolvedPath?: string;
  readonly input?: string;
  readonly parentSection?: Section;
  readonly isResolvedFromAutoImports?: boolean;

  private constructor(value: T | undefined, input: string | undefined, parentSection: Section | undefined, isResolvedFromAutoImports: boolean | undefined) {
    super(value);
    this.initialResolvedPath = value?.path;
    this.input = input;
    this.parentSection = parentSection;
    this.isResolvedFromAutoImports = isResolvedFromAutoImports;
  }

  static create<T extends PackageableElement>(value: T | undefined, input: string | undefined, parentSection: Section | undefined, isResolvedFromAutoImports: boolean | undefined): OptionalPackageableElementImplicitReference<T> {
    return new OptionalPackageableElementImplicitReference(value, input, parentSection, isResolvedFromAutoImports);
  }

  @computed get valueForSerialization(): string | undefined {
    const currentElementPath = this.value?.path;
    if (this.isResolvedFromAutoImports) {
      return this.input;
    }
    // when the parent section does not exist or has been deleted
    if (this.parentSection === undefined || this.parentSection.parent.isDeleted) {
      return currentElementPath;
    }
    // the current element is the same as the inferred one
    if (this.initialResolvedPath === currentElementPath) {
      return this.input;
    }
    return currentElementPath;
  }
}
