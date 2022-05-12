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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import type { Stereotype } from './Stereotype';
import type { Tag } from './Tag';

export class Profile extends PackageableElement implements Hashable {
  stereotypes: Stereotype[] = [];
  tags: Tag[] = [];

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
