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

import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../PackageableElementReference.js';
import type { Enumeration } from './Enumeration.js';
import type { Enum } from './Enum.js';
import { ReferenceWithOwner } from '../../Reference.js';

export abstract class EnumValueReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Enumeration>;
  value: Enum;

  protected constructor(
    ownerReference: PackageableElementReference<Enumeration>,
    value: Enum,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }
}

export class EnumValueExplicitReference extends EnumValueReference {
  override readonly ownerReference: PackageableElementExplicitReference<Enumeration>;

  private constructor(value: Enum) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Enum): EnumValueExplicitReference {
    return new EnumValueExplicitReference(value);
  }
}

export class EnumValueImplicitReference extends EnumValueReference {
  override readonly ownerReference: PackageableElementImplicitReference<Enumeration>;

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
