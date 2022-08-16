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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { hashValue } from '@finos/legend-shared';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
  type PackageableElementImplicitReference,
} from '../../../PackageableElementReference.js';
import { ReferenceWithOwner } from '../../../../Reference.js';
import type { FlatData } from './FlatData.js';
import type { FlatDataSection } from './FlatDataSection.js';

export abstract class FlatDataSectionReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<FlatData>;
  value: FlatDataSection;

  protected constructor(
    ownerReference: PackageableElementReference<FlatData>,
    value: FlatDataSection,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }

  get pointerHashCode(): string {
    return [
      CORE_HASH_STRUCTURE.FLAT_DATA_SECTION_POINTER,
      this.ownerReference.valueForSerialization ?? '',
      this.value.name,
    ]
      .map(hashValue)
      .join(',');
  }
}

export class FlatDataSectionExplicitReference extends FlatDataSectionReference {
  override readonly ownerReference: PackageableElementExplicitReference<FlatData>;

  private constructor(value: FlatDataSection) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: FlatDataSection): FlatDataSectionExplicitReference {
    return new FlatDataSectionExplicitReference(value);
  }
}

export class FlatDataSectionImplicitReference extends FlatDataSectionReference {
  override readonly ownerReference: PackageableElementImplicitReference<FlatData>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<FlatData>,
    value: FlatDataSection,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<FlatData>,
    value: FlatDataSection,
  ): FlatDataSectionImplicitReference {
    return new FlatDataSectionImplicitReference(ownerReference, value);
  }
}
