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
  type OptionalPackageableElementReference,
  OptionalPackageableElementExplicitReference,
} from '../PackageableElementReference.js';
import type { Mapping } from './Mapping.js';
import type { EnumerationMapping } from './EnumerationMapping.js';
import { OptionalReferenceWithOwner } from '../../Reference.js';

export abstract class OptionalEnumerationMappingReference extends OptionalReferenceWithOwner {
  override readonly ownerReference: OptionalPackageableElementReference<Mapping>;
  value?: EnumerationMapping | undefined;

  protected constructor(
    ownerReference: OptionalPackageableElementReference<Mapping>,
    value: EnumerationMapping | undefined,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  abstract get valueForSerialization(): string | undefined;
}

export class OptionalEnumerationMappingExplicitReference extends OptionalEnumerationMappingReference {
  override readonly ownerReference: OptionalPackageableElementReference<Mapping>;

  private constructor(value: EnumerationMapping | undefined) {
    const ownerReference = OptionalPackageableElementExplicitReference.create(
      value?._PARENT,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    value: EnumerationMapping | undefined,
  ): OptionalEnumerationMappingExplicitReference {
    return new OptionalEnumerationMappingExplicitReference(value);
  }

  get valueForSerialization(): string | undefined {
    return this.value?.id.value;
  }
}
