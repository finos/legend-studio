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

import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { hashString } from '@finos/legend-shared';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../PackageableElementReference';
import { ReferenceWithOwner } from '../../Reference';
import type { AbstractProperty } from './AbstractProperty';
import type { Class } from './Class';
import { Association } from './Association';
import { getAssociatedPropertyClass } from '../../../../../helpers/DomainHelper';

export abstract class PropertyReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<
    Class | Association
  >;
  value: AbstractProperty;

  protected constructor(
    ownerReference: PackageableElementReference<Class | Association>,
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
      this.ownerReference.hashValue,
    ]
      .map(hashString)
      .join(',');
  }
}

export class PropertyExplicitReference extends PropertyReference {
  override readonly ownerReference: PackageableElementExplicitReference<Class>;

  private constructor(value: AbstractProperty) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER instanceof Association
        ? getAssociatedPropertyClass(value._OWNER, value)
        : value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(property: AbstractProperty): PropertyExplicitReference {
    return new PropertyExplicitReference(property);
  }
}

export class PropertyImplicitReference extends PropertyReference {
  override readonly ownerReference: PackageableElementImplicitReference<
    Class | Association
  >;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Class | Association>,
    value: AbstractProperty,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Class | Association>,
    value: AbstractProperty,
  ): PropertyImplicitReference {
    return new PropertyImplicitReference(ownerReference, value);
  }
}
