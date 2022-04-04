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

import { observable, makeObservable } from 'mobx';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../../../PackageableElementReference';
import { ReferenceWithOwner } from '../../../../Reference';
import type { Database } from './Database';
import type { Join } from './Join';

export abstract class JoinReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Database>;
  value: Join;

  protected constructor(
    ownerReference: PackageableElementReference<Database>,
    value: Join,
  ) {
    super(ownerReference);

    makeObservable(this, {
      value: observable,
    });

    this.ownerReference = ownerReference;
    this.value = value;
  }
}

export class JoinExplicitReference extends JoinReference {
  override readonly ownerReference: PackageableElementExplicitReference<Database>;

  private constructor(value: Join) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.owner,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Join): JoinExplicitReference {
    return new JoinExplicitReference(value);
  }
}

export class JoinImplicitReference extends JoinReference {
  override readonly ownerReference: PackageableElementImplicitReference<Database>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Join,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Database>,
    value: Join,
  ): JoinImplicitReference {
    return new JoinImplicitReference(ownerReference, value);
  }
}
