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
import { Tag } from 'MM/model/packageableElements/domain/Tag';
import { Stubable } from 'MM/Stubable';
import { ReferenceWithOwner } from 'MM/model/Reference';

export abstract class TagReference extends ReferenceWithOwner implements Stubable {
  readonly ownerReference: PackageableElementReference<Profile>;
  @observable value: Tag;

  protected constructor(ownerReference: PackageableElementReference<Profile>, value: Tag) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  @action setValue(value: Tag): void {
    this.value = value;
    this.ownerReference.setValue(value.owner);
  }

  @computed get isStub(): boolean { return !this.value.isStub }

  @computed get pointerHashCode(): string {
    return [
      HASH_STRUCTURE.TAG_POINTER,
      this.value.value,
      this.ownerReference.valueForSerialization,
    ].map(hashString).join(',');
  }
}

export class TagExplicitReference extends TagReference {
  readonly ownerReference: PackageableElementExplicitReference<Profile>;

  private constructor(value: Tag) {
    const ownerReference = PackageableElementExplicitReference.create(value.owner);
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Tag): TagExplicitReference {
    return new TagExplicitReference(value);
  }
}

export class TagImplicitReference extends TagReference {
  readonly ownerReference: PackageableElementImplicitReference<Profile>;

  private constructor(ownerReference: PackageableElementImplicitReference<Profile>, value: Tag) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(ownerReference: PackageableElementImplicitReference<Profile>, value: Tag): TagImplicitReference {
    return new TagImplicitReference(ownerReference, value);
  }
}
