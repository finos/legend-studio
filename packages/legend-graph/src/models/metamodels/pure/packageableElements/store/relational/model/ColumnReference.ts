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
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../../../PackageableElementReference';
import { ReferenceWithOwner } from '../../../../Reference';
import type { Database } from './Database';
import type { Column } from './Column';
import { getSchemaFromRelation } from './RelationReference';
import { setPackageableElementReferenceValue } from '../../../../../../DomainModifierHelper';

export abstract class ColumnReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Database>;
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
    setPackageableElementReferenceValue(
      this.ownerReference,
      getSchemaFromRelation(value.owner).owner,
    );
  }
}

export class ColumnExplicitReference extends ColumnReference {
  override readonly ownerReference: PackageableElementExplicitReference<Database>;

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
  override readonly ownerReference: PackageableElementImplicitReference<Database>;

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
