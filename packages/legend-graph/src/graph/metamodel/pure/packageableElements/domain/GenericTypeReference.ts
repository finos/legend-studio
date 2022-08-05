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
import { ReferenceWithOwner } from '../../Reference.js';
import type { GenericType } from './GenericType.js';
import type { Type } from './Type.js';

export abstract class GenericTypeReference extends ReferenceWithOwner {
  override readonly ownerReference: PackageableElementReference<Type>;
  value: GenericType;

  protected constructor(
    ownerReference: PackageableElementReference<Type>,
    value: GenericType,
  ) {
    super(ownerReference);

    this.ownerReference = ownerReference;
    this.value = value;
  }
}

export class GenericTypeExplicitReference extends GenericTypeReference {
  override readonly ownerReference: PackageableElementExplicitReference<Type>;

  private constructor(value: GenericType) {
    const ownerReference = PackageableElementExplicitReference.create(
      value.rawType,
    );
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(value: GenericType): GenericTypeExplicitReference {
    return new GenericTypeExplicitReference(value);
  }
}

export class GenericTypeImplicitReference extends GenericTypeReference {
  override readonly ownerReference: PackageableElementImplicitReference<Type>;

  private constructor(
    ownerReference: PackageableElementImplicitReference<Type>,
    value: GenericType,
  ) {
    super(ownerReference, value);
    this.ownerReference = ownerReference;
  }

  static create(
    ownerReference: PackageableElementImplicitReference<Type>,
    value: GenericType,
  ): GenericTypeImplicitReference {
    return new GenericTypeImplicitReference(ownerReference, value);
  }
}
