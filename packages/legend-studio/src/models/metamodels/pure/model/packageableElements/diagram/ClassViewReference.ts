/**
 * Copyright 2020 Goldman Sachs
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

import { observable, action, makeObservable } from 'mobx';
import type {
  PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Diagram } from '../../../model/packageableElements/diagram/Diagram';
import type { ClassView } from '../../../model/packageableElements/diagram/ClassView';
import { ReferenceWithOwner } from '../../../model/Reference';

export abstract class ClassViewReference extends ReferenceWithOwner {
  readonly ownerReference: PackageableElementReference<Diagram>;
  value: ClassView;

  protected constructor(
    ownerReference: PackageableElementReference<Diagram>,
    value: ClassView,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: ClassView): void {
    this.value = value;
    this.ownerReference.setValue(value.owner);
  }
}

export class ClassViewExplicitReference extends ClassViewReference {
  readonly ownerReference: PackageableElementExplicitReference<Diagram>;

  private constructor(value: ClassView) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: ClassView): ClassViewExplicitReference {
    return new ClassViewExplicitReference(value);
  }
}

export class ClassViewImplicitReference extends ClassViewReference {
  readonly ownerReference: PackageableElementImplicitReference<Diagram>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Diagram>,
    value: ClassView,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Diagram>,
    value: ClassView,
  ): ClassViewImplicitReference {
    return new ClassViewImplicitReference(ownerReference, value);
  }
}
