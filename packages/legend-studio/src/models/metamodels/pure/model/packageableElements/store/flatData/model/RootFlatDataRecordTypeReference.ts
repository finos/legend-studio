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
} from '../../../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../../../model/packageableElements/PackageableElementReference';
import { ReferenceWithOwner } from '../../../../../model/Reference';
import type { RootFlatDataRecordType } from '../../../../../model/packageableElements/store/flatData/model/FlatDataDataType';
import type { FlatData } from '../../../../../model/packageableElements/store/flatData/model/FlatData';

export abstract class RootFlatDataRecordTypeReference extends ReferenceWithOwner {
  readonly ownerReference: PackageableElementReference<FlatData>;
  value: RootFlatDataRecordType;

  protected constructor(
    ownerReference: PackageableElementReference<FlatData>,
    value: RootFlatDataRecordType,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: RootFlatDataRecordType): void {
    this.value = value;
    this.ownerReference.setValue(value.owner.owner);
  }
}

export class RootFlatDataRecordTypeExplicitReference extends RootFlatDataRecordTypeReference {
  readonly ownerReference: PackageableElementExplicitReference<FlatData>;

  private constructor(value: RootFlatDataRecordType) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.owner.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    value: RootFlatDataRecordType,
  ): RootFlatDataRecordTypeExplicitReference {
    return new RootFlatDataRecordTypeExplicitReference(value);
  }
}

export class RootFlatDataRecordTypeImplicitReference extends RootFlatDataRecordTypeReference {
  readonly ownerReference: PackageableElementImplicitReference<FlatData>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<FlatData>,
    value: RootFlatDataRecordType,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<FlatData>,
    value: RootFlatDataRecordType,
  ): RootFlatDataRecordTypeImplicitReference {
    return new RootFlatDataRecordTypeImplicitReference(ownerReference, value);
  }
}
