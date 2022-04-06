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

import { assertType } from '@finos/legend-shared';
import type { PackageableElement } from './PackageableElement';
import type { Section } from './section/Section';
import { RequiredReference, OptionalReference } from '../Reference';

export abstract class PackageableElementReference<
  T extends PackageableElement,
> extends RequiredReference {
  value: T;

  protected constructor(value: T) {
    super();
    this.value = value;
  }

  abstract get valueForSerialization(): string | undefined;

  get hashValue(): string {
    return this.valueForSerialization ?? '';
  }
}

export class PackageableElementExplicitReference<
  T extends PackageableElement,
> extends PackageableElementReference<T> {
  private constructor(value: T) {
    super(value);
  }

  static create<V extends PackageableElement>(
    value: V,
  ): PackageableElementExplicitReference<V> {
    return new PackageableElementExplicitReference(value);
  }

  get valueForSerialization(): string | undefined {
    return this.value.path;
  }
}

/**
 * Explicit references should only be created when the value stored in the reference
 * is not obtained through resolution, usually this happens when the user
 * direclty modifies the graph and creates these references in the process.
 * Implicit references are used when we build the metamodel graph from protocols.
 * In other words, they are references whose values are obtained through resolution process.
 * An implicit reference comprises the resolved value and the
 * original input value in the protocol model(s). This way when we
 * transform the metamodel graph back to protocol, we keep the input as is.
 * This is needed to maintain hash-computation and round-trip stability.
 */
export class PackageableElementImplicitReference<
  T extends PackageableElement,
> extends PackageableElementReference<T> {
  readonly initialResolvedPath: string;
  readonly input?: string | undefined;
  /**
   * Parent section information is only needed when the reference is resolved
   * by scanning the section imports.
   */
  readonly parentSection?: Section | undefined;
  /**
   * This flag is set to `true` when section check is not needed when resolving the reference
   * For example: when the element is implied in context, when the element is imported
   * via auto imports, etc.
   */
  readonly skipSectionCheck?: boolean | undefined;

  private constructor(
    value: T,
    input: string | undefined,
    parentSection: Section | undefined,
    skipSectionCheck: boolean | undefined,
  ) {
    super(value);

    this.initialResolvedPath = value.path;
    this.input = input;
    this.parentSection = parentSection;
    this.skipSectionCheck = skipSectionCheck;
  }

  static create<V extends PackageableElement>(
    value: V,
    input: string | undefined,
  ): PackageableElementImplicitReference<V> {
    return new PackageableElementImplicitReference(
      value,
      input,
      undefined,
      true,
    );
  }

  static resolveFromSection<V extends PackageableElement>(
    value: V,
    input: string,
    parentSection: Section | undefined,
  ): PackageableElementImplicitReference<V> {
    return new PackageableElementImplicitReference(
      value,
      input,
      parentSection,
      false,
    );
  }

  get valueForSerialization(): string | undefined {
    const currentElementPath = this.value.path;
    // NOTE: `skipSectionCheck` flag's effect should only kick in if the value
    // is not different than the original value
    if (
      this.skipSectionCheck &&
      this.initialResolvedPath === currentElementPath
    ) {
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
  value?: T | undefined;

  protected constructor(value: T | undefined) {
    super();
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
  readonly initialResolvedPath?: string | undefined;
  readonly input?: string | undefined;
  readonly parentSection?: Section | undefined;
  readonly skipSectionCheck?: boolean | undefined;

  private constructor(
    value: T | undefined,
    input: string | undefined,
    parentSection: Section | undefined,
    skipSectionCheck: boolean | undefined,
  ) {
    super(value);
    this.initialResolvedPath = value?.path;
    this.input = input;
    this.parentSection = parentSection;
    this.skipSectionCheck = skipSectionCheck;
  }

  static create<V extends PackageableElement>(
    value: V | undefined,
    input: string | undefined,
  ): OptionalPackageableElementImplicitReference<V> {
    return new OptionalPackageableElementImplicitReference(
      value,
      input,
      undefined,
      true,
    );
  }

  /**
   * Use this creator method when the reference is created by
   * resolving imports using section majorly when building the graph.
   */
  static resolveFromSection<V extends PackageableElement>(
    value: V | undefined,
    input: string | undefined,
    parentSection: Section | undefined,
  ): OptionalPackageableElementImplicitReference<V> {
    return new OptionalPackageableElementImplicitReference(
      value,
      input,
      parentSection,
      false,
    );
  }

  get valueForSerialization(): string | undefined {
    const currentElementPath = this.value?.path;
    // NOTE: `skipSectionCheck` flag's effect should only kick in if the value
    // is not different than the original value
    if (
      this.skipSectionCheck &&
      this.initialResolvedPath === currentElementPath
    ) {
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

export const toOptionalPackageableElementReference = <
  V extends PackageableElement,
>(
  reference: PackageableElementReference<V> | undefined,
): OptionalPackageableElementReference<V> => {
  if (!reference || reference instanceof PackageableElementExplicitReference) {
    return OptionalPackageableElementExplicitReference.create(reference?.value);
  }
  assertType(reference, PackageableElementImplicitReference);
  if (reference.skipSectionCheck) {
    return OptionalPackageableElementImplicitReference.create(
      reference.value,
      reference.input,
    );
  }
  return OptionalPackageableElementImplicitReference.resolveFromSection(
    reference.value,
    reference.input,
    reference.parentSection,
  );
};
