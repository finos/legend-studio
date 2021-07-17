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

import { observable, action, computed, makeObservable } from 'mobx';
import type { PackageableElement } from '../../model/packageableElements/PackageableElement';
import type { Section } from '../../model/packageableElements/section/Section';
import { RequiredReference, OptionalReference } from '../../model/Reference';

export abstract class PackageableElementReference<
  T extends PackageableElement,
> extends RequiredReference {
  value: T;

  protected constructor(value: T) {
    super();

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.value = value;
  }

  setValue(value: T): void {
    this.value = value;
  }

  abstract get valueForSerialization(): string;
}

export class PackageableElementExplicitReference<
  T extends PackageableElement,
> extends PackageableElementReference<T> {
  private constructor(value: T) {
    super(value);

    makeObservable(this, {
      valueForSerialization: computed,
    });
  }

  static create<V extends PackageableElement>(
    value: V,
  ): PackageableElementExplicitReference<V> {
    return new PackageableElementExplicitReference(value);
  }

  get valueForSerialization(): string {
    return this.value.path;
  }
}

export class PackageableElementImplicitReference<
  T extends PackageableElement,
> extends PackageableElementReference<T> {
  readonly initialResolvedPath: string;
  readonly input: string;
  readonly parentSection?: Section;
  readonly isInferred?: boolean;

  private constructor(
    value: T,
    input: string,
    parentSection: Section | undefined,
    isInferred: boolean | undefined,
  ) {
    super(value);

    makeObservable(this, {
      valueForSerialization: computed,
    });

    this.initialResolvedPath = value.path;
    this.input = input;
    this.parentSection = parentSection;
    this.isInferred = isInferred;
  }

  static create<V extends PackageableElement>(
    value: V,
    input: string,
    parentSection: Section | undefined,
    isResolvedFromAutoImports: boolean | undefined,
  ): PackageableElementImplicitReference<V> {
    return new PackageableElementImplicitReference(
      value,
      input,
      parentSection,
      isResolvedFromAutoImports,
    );
  }

  get valueForSerialization(): string {
    const currentElementPath = this.value.path;
    if (this.isInferred) {
      return this.input;
    }
    // when the parent section does not exist or has been deleted
    if (
      this.parentSection === undefined ||
      this.parentSection.parent.isDeleted
    ) {
      return currentElementPath;
    }
    // the current element is the same as the inferred one
    if (this.initialResolvedPath === currentElementPath) {
      return this.input;
    }
    return currentElementPath;
  }
}

export abstract class OptionalPackageableElementReference<
  T extends PackageableElement,
> extends OptionalReference {
  value?: T;

  protected constructor(value: T | undefined) {
    super();

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.value = value;
  }

  setValue(value: T | undefined): void {
    this.value = value;
  }

  abstract get valueForSerialization(): string | undefined;
}

export class OptionalPackageableElementExplicitReference<
  T extends PackageableElement,
> extends OptionalPackageableElementReference<T> {
  private constructor(value: T | undefined) {
    super(value);

    makeObservable(this, {
      valueForSerialization: computed,
    });
  }

  static create<V extends PackageableElement>(
    value: V | undefined,
  ): OptionalPackageableElementExplicitReference<V> {
    return new OptionalPackageableElementExplicitReference(value);
  }

  get valueForSerialization(): string | undefined {
    return this.value?.path;
  }
}

export class OptionalPackageableElementImplicitReference<
  T extends PackageableElement,
> extends OptionalPackageableElementReference<T> {
  readonly initialResolvedPath?: string;
  readonly input?: string;
  readonly parentSection?: Section;
  readonly isResolvedFromAutoImports?: boolean;

  private constructor(
    value: T | undefined,
    input: string | undefined,
    parentSection: Section | undefined,
    isInferred: boolean | undefined,
  ) {
    super(value);

    makeObservable(this, {
      valueForSerialization: computed,
    });

    this.initialResolvedPath = value?.path;
    this.input = input;
    this.parentSection = parentSection;
    this.isResolvedFromAutoImports = isInferred;
  }

  static create<V extends PackageableElement>(
    value: V | undefined,
    input: string | undefined,
    parentSection: Section | undefined,
    isInferred: boolean | undefined,
  ): OptionalPackageableElementImplicitReference<V> {
    return new OptionalPackageableElementImplicitReference(
      value,
      input,
      parentSection,
      isInferred,
    );
  }

  get valueForSerialization(): string | undefined {
    const currentElementPath = this.value?.path;
    if (this.isResolvedFromAutoImports) {
      return this.input;
    }
    // when the parent section does not exist or has been deleted
    if (
      this.parentSection === undefined ||
      this.parentSection.parent.isDeleted
    ) {
      return currentElementPath;
    }
    // the current element is the same as the inferred one
    if (this.initialResolvedPath === currentElementPath) {
      return this.input;
    }
    return currentElementPath;
  }
}
