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
import { hashString } from '@finos/legend-shared';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../../../PackageableElementReference';
import type { Database } from './Database';
import type { View } from './View';
import { NamedRelationalReference } from './TableReference';
import { SELF_JOIN_SCHEMA_NAME, SELF_JOIN_TABLE_NAME } from './Join';

export abstract class ViewReference extends NamedRelationalReference {
  value: View;

  protected constructor(
    ownerReference: PackageableElementReference<Database>,
    value: View,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
      setValue: action,
      pointerHashCode: computed,
    });

    this.value = value;
  }

  setValue(value: View): void {
    this.value = value;
    this.ownerReference.setValue(value.schema.owner);
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_POINTER,
      this.ownerReference.hashValue,
      this.value.schema.name,
      this.value.name,
    ]
      .map(hashString)
      .join(',');
  }

  get selJoinPointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.RELATIONAL_OPERATION_TABLE_POINTER,
      this.ownerReference.hashValue,
      SELF_JOIN_SCHEMA_NAME,
      SELF_JOIN_TABLE_NAME,
    ]
      .map(hashString)
      .join(',');
  }
}

export class ViewExplicitReference extends ViewReference {
  override readonly ownerReference: PackageableElementExplicitReference<Database>;

  private constructor(value: View) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.schema.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: View): ViewExplicitReference {
    return new ViewExplicitReference(value);
  }
}

export class ViewImplicitReference extends ViewReference {
  override readonly ownerReference: PackageableElementImplicitReference<Database>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: View,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: View,
  ): ViewImplicitReference {
    return new ViewImplicitReference(ownerReference, value);
  }
}
