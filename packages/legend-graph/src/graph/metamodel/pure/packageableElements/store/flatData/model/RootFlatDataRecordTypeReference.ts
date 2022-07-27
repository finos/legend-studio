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
} from '../../../PackageableElementReference.js';
import { ReferenceWithOwner } from '../../../../Reference.js';
import type { RootFlatDataRecordType } from './FlatDataDataType.js';
import type { FlatData } from './FlatData.js';

export abstract class RootFlatDataRecordTypeReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<FlatData>;
  value: RootFlatDataRecordType;

  protected constructor(
    ownerReference: PackageableElementReference<FlatData>,
    value: RootFlatDataRecordType,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }
}

export class RootFlatDataRecordTypeExplicitReference extends RootFlatDataRecordTypeReference {
  override readonly ownerReference: PackageableElementExplicitReference<FlatData>;

  private constructor(value: RootFlatDataRecordType) {
    const ownerReference = PackageableElementExplicitReference.create(
      value._OWNER._OWNER,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    value: RootFlatDataRecordType,
  ): RootFlatDataRecordTypeExplicitReference {
    return new RootFlatDataRecordTypeExplicitReference(value);
  }
}

export class RootFlatDataRecordTypeImplicitReference extends RootFlatDataRecordTypeReference {
  override readonly ownerReference: PackageableElementImplicitReference<FlatData>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<FlatData>,
    value: RootFlatDataRecordType,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<FlatData>,
    value: RootFlatDataRecordType,
  ): RootFlatDataRecordTypeImplicitReference {
    return new RootFlatDataRecordTypeImplicitReference(ownerReference, value);
  }
}
