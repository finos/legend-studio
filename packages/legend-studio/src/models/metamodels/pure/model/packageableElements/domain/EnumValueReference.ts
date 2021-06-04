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
import type {
  PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Enumeration } from '../../../model/packageableElements/domain/Enumeration';
import type { Enum } from '../../../model/packageableElements/domain/Enum';
import type { Stubable } from '../../../model/Stubable';
import { ReferenceWithOwner } from '../../../model/Reference';

export abstract class EnumValueReference
  extends ReferenceWithOwner
  implements Stubable
{
  readonly ownerReference: PackageableElementReference<Enumeration>;
  value: Enum;

  protected constructor(
    ownerReference: PackageableElementReference<Enumeration>,
    value: Enum,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
      isStub: computed,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: Enum): void {
    this.value = value;
    this.ownerReference.setValue(value.owner);
  }

  get isStub(): boolean {
    return !this.value.isStub;
  }
}

export class EnumValueExplicitReference extends EnumValueReference {
  readonly ownerReference: PackageableElementExplicitReference<Enumeration>;

  private constructor(value: Enum) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Enum): EnumValueExplicitReference {
    return new EnumValueExplicitReference(value);
  }
}

export class EnumValueImplicitReference extends EnumValueReference {
  readonly ownerReference: PackageableElementImplicitReference<Enumeration>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Enumeration>,
    value: Enum,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Enumeration>,
    value: Enum,
  ): EnumValueImplicitReference {
    return new EnumValueImplicitReference(ownerReference, value);
  }
}
