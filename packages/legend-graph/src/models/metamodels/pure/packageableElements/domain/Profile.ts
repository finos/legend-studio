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
  type Hashable,
  guaranteeNonNullable,
  hashArray,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import type { Stereotype } from './Stereotype';
import type { Tag } from './Tag';
import { type Stubable, isStubArray } from '../../../../../helpers/Stubable';

export class Profile extends PackageableElement implements Hashable, Stubable {
  stereotypes: Stereotype[] = [];
  tags: Tag[] = [];

  getTag = (value: string): Tag =>
    guaranteeNonNullable(
      this.tags.find((tag) => tag.value === value),
      `Can't find tag '${value}' in profile '${this.path}'`,
    );

  getStereotype = (value: string): Stereotype =>
    guaranteeNonNullable(
      this.stereotypes.find((stereotype) => stereotype.value === value),
      `Can't find stereotype '${value}' in profile '${this.path}'`,
    );

  static createStub = (): Profile => new Profile('');
  override get isStub(): boolean {
    return (
      super.isStub && isStubArray(this.stereotypes) && isStubArray(this.tags)
    );
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROFILE,
      this.path,
      hashArray(this.stereotypes.map((st) => st.value)),
      hashArray(this.tags.map((st) => st.value)),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Profile(this);
  }
}
