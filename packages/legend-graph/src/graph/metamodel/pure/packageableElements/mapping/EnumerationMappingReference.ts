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
  type PackageableElementReference,
  PackageableElementExplicitReference,
} from '../PackageableElementReference.js';
import type { Mapping } from './Mapping.js';
import type { EnumerationMapping } from './EnumerationMapping.js';
import { ReferenceWithOwner } from '../../Reference.js';

export abstract class EnumerationMappingReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Mapping>;
  value: EnumerationMapping;

  protected constructor(
    ownerReference: PackageableElementReference<Mapping>,
    value: EnumerationMapping,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  abstract get valueForSerialization(): string | undefined;
}

export class EnumerationMappingExplicitReference extends EnumerationMappingReference {
  override readonly ownerReference: PackageableElementReference<Mapping>;

  private constructor(value: EnumerationMapping) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._PARENT,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    value: EnumerationMapping,
  ): EnumerationMappingExplicitReference {
    return new EnumerationMappingExplicitReference(value);
  }

  get valueForSerialization(): string {
    return this.value.id.value;
  }
}
