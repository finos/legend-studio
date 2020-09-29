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
import { PackageableElementReference, PackageableElementExplicitReference, PackageableElementImplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { Stubable } from 'MM/Stubable';
import { ReferenceWithOwner } from 'MM/model/Reference';
import { GenericType } from 'MM/model/packageableElements/domain/GenericType';
import { Type } from './Type';

export abstract class GenericTypeReference extends ReferenceWithOwner implements Stubable {
  readonly ownerReference: PackageableElementReference<Type>;
  @observable value: GenericType;

  protected constructor(ownerReference: PackageableElementReference<Type>, value: GenericType) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  @action setValue(value: GenericType): void {
    this.value = value;
    this.ownerReference.setValue(value.rawType);
  }

  @computed get isStub(): boolean { return !this.value.isStub }
}

export class GenericTypeExplicitReference extends GenericTypeReference {
  readonly ownerReference: PackageableElementExplicitReference<Type>;

  private constructor(value: GenericType) {
    const ownerReference = PackageableElementExplicitReference.create(value.rawType);
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: GenericType): GenericTypeExplicitReference {
    return new GenericTypeExplicitReference(value);
  }
}

export class GenericTypeImplicitReference extends GenericTypeReference {
  readonly ownerReference: PackageableElementImplicitReference<Type>;

  private constructor(ownerReference: PackageableElementImplicitReference<Type>, value: GenericType) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(ownerReference: PackageableElementImplicitReference<Type>, value: GenericType): GenericTypeImplicitReference {
    return new GenericTypeImplicitReference(ownerReference, value);
  }
}
