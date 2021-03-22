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

import { observable, action, makeObservable } from 'mobx';
import type {
  PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Mapping } from '../../../model/packageableElements/mapping/Mapping';
import type { SetImplementation } from '../../../model/packageableElements/mapping/SetImplementation';
import { ReferenceWithOwner } from '../../../model/Reference';

export abstract class SetImplementationReference extends ReferenceWithOwner {
  readonly ownerReference: PackageableElementReference<Mapping>;
  value: SetImplementation;

  protected constructor(
    ownerReference: PackageableElementReference<Mapping>,
    value: SetImplementation,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: SetImplementation): void {
    this.value = value;
    this.ownerReference.setValue(value.parent);
  }
}

export class SetImplementationExplicitReference extends SetImplementationReference {
  readonly ownerReference: PackageableElementExplicitReference<Mapping>;

  private constructor(value: SetImplementation) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.parent,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: SetImplementation): SetImplementationExplicitReference {
    return new SetImplementationExplicitReference(value);
  }
}

export class SetImplementationImplicitReference extends SetImplementationReference {
  readonly ownerReference: PackageableElementImplicitReference<Mapping>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Mapping>,
    value: SetImplementation,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Mapping>,
    value: SetImplementation,
  ): SetImplementationImplicitReference {
    return new SetImplementationImplicitReference(ownerReference, value);
  }
}
