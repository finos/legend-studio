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
import type { Tag } from './Tag.js';
import { ReferenceWithOwner } from '../../Reference.js';

export abstract class TagReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Profile>;
  value: Tag;

  protected constructor(
    ownerReference: PackageableElementReference<Profile>,
    value: Tag,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.TAG_POINTER,
      this.value.value,
      this.ownerReference.valueForSerialization ?? '',
    ]
      .map(hashValue)
      .join(',');
  }
}

export class TagExplicitReference extends TagReference {
  override readonly ownerReference: PackageableElementExplicitReference<Profile>;

  private constructor(value: Tag) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: Tag): TagExplicitReference {
    return new TagExplicitReference(value);
  }
}

export class TagImplicitReference extends TagReference {
  override readonly ownerReference: PackageableElementImplicitReference<Profile>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Profile>,
    value: Tag,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Profile>,
    value: Tag,
  ): TagImplicitReference {
    return new TagImplicitReference(ownerReference, value);
  }
}
