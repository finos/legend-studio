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
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Stubable } from 'MM/Stubable';
import { ReferenceWithOwner } from 'MM/model/Reference';
import { Stereotype } from 'MM/model/packageableElements/domain/Stereotype';

export abstract class StereotypeReference extends ReferenceWithOwner implements Stubable {
  readonly ownerReference: PackageableElementReference<Profile>;
  @observable value: Stereotype;

  protected constructor(ownerReference: PackageableElementReference<Profile>, value: Stereotype) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  @action setValue(value: Stereotype): void {
    this.value = value;
    this.ownerReference.setValue(value.owner);
  }

  @computed get isStub(): boolean { return !this.value.isStub }

  @computed get pointerHashCode(): string {
    return [
      HASH_STRUCTURE.STEREOTYPE_POINTER,
      this.value.value,
      this.ownerReference.valueForSerialization,
    ].map(hashString).join(',');
  }
}

export class StereotypeExplicitReference extends StereotypeReference {
  readonly ownerReference: PackageableElementExplicitReference<Profile>;

  private constructor(value: Stereotype) {
    const ownerReference = PackageableElementExplicitReference.create(value.owner);
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Stereotype): StereotypeExplicitReference {
    return new StereotypeExplicitReference(value);
  }
}

export class StereotypeImplicitReference extends StereotypeReference {
  readonly ownerReference: PackageableElementImplicitReference<Profile>;

  private constructor(ownerReference: PackageableElementImplicitReference<Profile>, value: Stereotype) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(ownerReference: PackageableElementImplicitReference<Profile>, value: Stereotype): StereotypeImplicitReference {
    return new StereotypeImplicitReference(ownerReference, value);
  }
}
