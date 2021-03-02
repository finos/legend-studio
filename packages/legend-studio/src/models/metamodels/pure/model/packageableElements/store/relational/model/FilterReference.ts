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
import type { Database } from '../../../../../model/packageableElements/store/relational/model/Database';
import type { Filter } from '../../../../../model/packageableElements/store/relational/model/Filter';

export abstract class FilterReference extends ReferenceWithOwner {
  readonly ownerReference: PackageableElementReference<Database>;
  value: Filter;

  protected constructor(
    ownerReference: PackageableElementReference<Database>,
    value: Filter,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: Filter): void {
    this.value = value;
    this.ownerReference.setValue(value.owner);
  }
}

export class FilterExplicitReference extends FilterReference {
  readonly ownerReference: PackageableElementExplicitReference<Database>;

  private constructor(value: Filter) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Filter): FilterExplicitReference {
    return new FilterExplicitReference(value);
  }
}

export class FilterImplicitReference extends FilterReference {
  readonly ownerReference: PackageableElementImplicitReference<Database>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Filter,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Filter,
  ): FilterImplicitReference {
    return new FilterImplicitReference(ownerReference, value);
  }
}
