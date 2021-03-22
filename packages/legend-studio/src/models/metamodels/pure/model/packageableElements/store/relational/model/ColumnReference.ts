/**
 * Copyright Goldman Sachs
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
import type { Column } from '../../../../../model/packageableElements/store/relational/model/Column';
import { getSchemaFromRelation } from '../../../../../model/packageableElements/store/relational/model/RelationReference';

export abstract class ColumnReference extends ReferenceWithOwner {
  readonly ownerReference: PackageableElementReference<Database>;
  value: Column;

  protected constructor(
    ownerReference: PackageableElementReference<Database>,
    value: Column,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }

  setValue(value: Column): void {
    this.value = value;
    this.ownerReference.setValue(getSchemaFromRelation(value.owner).owner);
  }
}

export class ColumnExplicitReference extends ColumnReference {
  readonly ownerReference: PackageableElementExplicitReference<Database>;

  private constructor(value: Column) {
    const ownerReference = PackageableElementExplicitReference.create(
      getSchemaFromRelation(value.owner).owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Column): ColumnExplicitReference {
    return new ColumnExplicitReference(value);
  }
}

export class ColumnImplicitReference extends ColumnReference {
  readonly ownerReference: PackageableElementImplicitReference<Database>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Column,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Column,
  ): ColumnImplicitReference {
    return new ColumnImplicitReference(ownerReference, value);
  }
}
