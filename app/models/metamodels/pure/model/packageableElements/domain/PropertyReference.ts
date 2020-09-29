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
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashString } from 'Utilities/HashUtil';
import { PackageableElementReference, PackageableElementExplicitReference, PackageableElementImplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { Stubable } from 'MM/Stubable';
import { ReferenceWithOwner } from 'MM/model/Reference';
import { AbstractProperty } from 'MM/model/packageableElements/domain/AbstractProperty';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Association } from 'MM/model/packageableElements/domain/Association';

export abstract class PropertyReference extends ReferenceWithOwner implements Stubable {
  readonly ownerReference: PackageableElementReference<Class>;
  @observable value: AbstractProperty;

  protected constructor(ownerReference: PackageableElementReference<Class>, value: AbstractProperty) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  @action setValue(value: AbstractProperty): void {
    this.value = value;
    this.ownerReference.setValue(value.owner instanceof Association ? value.owner.getPropertyAssociatedClass(this.value) : value.owner);
  }

  @computed get isStub(): boolean { return !this.value.isStub }

  @computed get pointerHashCode(): string {
    return [
      HASH_STRUCTURE.PROPERTY_POINTER,
      this.value.name,
      this.ownerReference.valueForSerialization,
    ].map(hashString).join(',');
  }
}

export class PropertyExplicitReference extends PropertyReference {
  readonly ownerReference: PackageableElementExplicitReference<Class>;

  private constructor(value: AbstractProperty) {
    const ownerReference = PackageableElementExplicitReference.create(value.owner instanceof Association ? value.owner.getPropertyAssociatedClass(value) : value.owner);
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(property: AbstractProperty): PropertyExplicitReference {
    return new PropertyExplicitReference(property);
  }
}

export class PropertyImplicitReference extends PropertyReference {
  readonly ownerReference: PackageableElementImplicitReference<Class>;

  private constructor(ownerReference: PackageableElementImplicitReference<Class>, value: AbstractProperty) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(ownerReference: PackageableElementImplicitReference<Class>, value: AbstractProperty): PropertyImplicitReference {
    return new PropertyImplicitReference(ownerReference, value);
  }
}
