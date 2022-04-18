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
} from '../PackageableElementReference';
import type { Mapping } from './Mapping';
import type { SetImplementation } from './SetImplementation';
import { ReferenceWithOwner } from '../../Reference';

export abstract class SetImplementationReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Mapping>;
  value: SetImplementation;

  protected constructor(
    ownerReference: PackageableElementReference<Mapping>,
    value: SetImplementation,
  ) {
    super(ownerReference);
    this.ownerReference = ownerReference;
    this.value = value;
  }
}

export class SetImplementationExplicitReference extends SetImplementationReference {
  override readonly ownerReference: PackageableElementExplicitReference<Mapping>;

  private constructor(value: SetImplementation) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.parent,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: SetImplementation): SetImplementationExplicitReference {
    return new SetImplementationExplicitReference(value);
  }
}

export class SetImplementationImplicitReference extends SetImplementationReference {
  override readonly ownerReference: PackageableElementImplicitReference<Mapping>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Mapping>,
    value: SetImplementation,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Mapping>,
    value: SetImplementation,
  ): SetImplementationImplicitReference {
    return new SetImplementationImplicitReference(ownerReference, value);
  }
}
