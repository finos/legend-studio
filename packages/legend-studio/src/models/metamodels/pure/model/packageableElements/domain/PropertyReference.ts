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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { hashString } from '@finos/legend-studio-shared';
import type {
  PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Stubable } from '../../../model/Stubable';
import { ReferenceWithOwner } from '../../../model/Reference';
import type { AbstractProperty } from '../../../model/packageableElements/domain/AbstractProperty';
import type { Class } from '../../../model/packageableElements/domain/Class';
import { Association } from '../../../model/packageableElements/domain/Association';

export abstract class PropertyReference
  extends ReferenceWithOwner
  implements Stubable
{
  readonly ownerReference: PackageableElementReference<Class>;
  value: AbstractProperty;

  protected constructor(
    ownerReference: PackageableElementReference<Class>,
    value: AbstractProperty,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
      isStub: computed,
      pointerHashCode: computed,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: AbstractProperty): void {
    this.value = value;
    this.ownerReference.setValue(
      value.owner instanceof Association
        ? value.owner.getPropertyAssociatedClass(this.value)
        : value.owner,
    );
  }

  get isStub(): boolean {
    return !this.value.isStub;
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.PROPERTY_POINTER,
      this.value.name,
      this.ownerReference.valueForSerialization,
    ]
      .map(hashString)
      .join(',');
  }
}

export class PropertyExplicitReference extends PropertyReference {
  readonly ownerReference: PackageableElementExplicitReference<Class>;

  private constructor(value: AbstractProperty) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.owner instanceof Association
        ? value.owner.getPropertyAssociatedClass(value)
        : value.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(property: AbstractProperty): PropertyExplicitReference {
    return new PropertyExplicitReference(property);
  }
}

export class PropertyImplicitReference extends PropertyReference {
  readonly ownerReference: PackageableElementImplicitReference<Class>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Class>,
    value: AbstractProperty,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Class>,
    value: AbstractProperty,
  ): PropertyImplicitReference {
    return new PropertyImplicitReference(ownerReference, value);
  }
}
