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

import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { hashValue } from '@finos/legend-shared';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../PackageableElementReference.js';
import type { Profile } from './Profile.js';
import { ReferenceWithOwner } from '../../Reference.js';
import type { Stereotype } from './Stereotype.js';

export abstract class StereotypeReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Profile>;
  value: Stereotype;

  protected constructor(
    ownerReference: PackageableElementReference<Profile>,
    value: Stereotype,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.STEREOTYPE_POINTER,
      this.value.value,
      this.ownerReference.valueForSerialization ?? '',
    ]
      .map(hashValue)
      .join(',');
  }
}

export class StereotypeExplicitReference extends StereotypeReference {
  override readonly ownerReference: PackageableElementExplicitReference<Profile>;

  private constructor(value: Stereotype) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Stereotype): StereotypeExplicitReference {
    return new StereotypeExplicitReference(value);
  }
}

export class StereotypeImplicitReference extends StereotypeReference {
  override readonly ownerReference: PackageableElementImplicitReference<Profile>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Profile>,
    value: Stereotype,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Profile>,
    value: Stereotype,
  ): StereotypeImplicitReference {
    return new StereotypeImplicitReference(ownerReference, value);
  }
}
