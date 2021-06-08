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
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashString } from '@finos/legend-studio-shared';
import type {
  PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../../../model/packageableElements/PackageableElementReference';
import { ReferenceWithOwner } from '../../../../../model/Reference';
import type { Database } from '../../../../../model/packageableElements/store/relational/model/Database';
import type { Table } from '../../../../../model/packageableElements/store/relational/model/Table';
import { SELF_JOIN_SCHEMA_NAME, SELF_JOIN_TABLE_NAME } from './Join';

export abstract class NamedRelationalReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Database>;

  protected constructor(ownerReference: PackageableElementReference<Database>) {
    super(ownerReference);
    this.ownerReference = ownerReference;
  }
}

export abstract class TableReference extends NamedRelationalReference {
  value: Table;

  protected constructor(
    ownerReference: PackageableElementReference<Database>,
    value: Table,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
      pointerHashCode: computed,
      selJoinPointerHashCode: computed,
    });

    this.value = value;
  }

  setValue(value: Table): void {
    this.value = value;
    this.ownerReference.setValue(value.schema.owner);
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_POINTER,
      this.ownerReference.valueForSerialization,
      this.value.schema.name,
      this.value.name,
    ]
      .map(hashString)
      .join(',');
  }

  get selJoinPointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_POINTER,
      this.ownerReference.valueForSerialization,
      SELF_JOIN_SCHEMA_NAME,
      SELF_JOIN_TABLE_NAME,
    ]
      .map(hashString)
      .join(',');
  }
}

export class TableExplicitReference extends TableReference {
  override readonly ownerReference: PackageableElementExplicitReference<Database>;

  private constructor(value: Table) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.schema.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Table): TableExplicitReference {
    return new TableExplicitReference(value);
  }
}

export class TableImplicitReference extends TableReference {
  override readonly ownerReference: PackageableElementImplicitReference<Database>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Table,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Table,
  ): TableImplicitReference {
    return new TableImplicitReference(ownerReference, value);
  }
}
