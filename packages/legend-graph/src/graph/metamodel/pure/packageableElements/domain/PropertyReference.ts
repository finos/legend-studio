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

import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { hashValue } from '@finos/legend-shared';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../PackageableElementReference.js';
import { ReferenceWithOwner } from '../../Reference.js';
import type { AbstractProperty, PropertyOwner } from './AbstractProperty.js';

export abstract class PropertyReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<PropertyOwner>;
  value: AbstractProperty;

  protected constructor(
    ownerReference: PackageableElementReference<PropertyOwner>,
    value: AbstractProperty,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.PROPERTY_POINTER,
      this.value.name,
      this.ownerReference.valueForSerialization ?? '',
    ]
      .map(hashValue)
      .join(',');
  }
}

export class PropertyExplicitReference extends PropertyReference {
  override readonly ownerReference: PackageableElementExplicitReference<PropertyOwner>;

  private constructor(value: AbstractProperty) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(property: AbstractProperty): PropertyExplicitReference {
    return new PropertyExplicitReference(property);
  }
}

export class PropertyImplicitReference extends PropertyReference {
  override readonly ownerReference: PackageableElementImplicitReference<PropertyOwner>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<PropertyOwner>,
    value: AbstractProperty,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<PropertyOwner>,
    value: AbstractProperty,
  ): PropertyImplicitReference {
    return new PropertyImplicitReference(ownerReference, value);
  }
}
