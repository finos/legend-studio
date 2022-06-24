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
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst.js';
import type { FlatDataSection } from './FlatDataSection.js';
import { Store } from '../../Store.js';
import type { PackageableElementVisitor } from '../../../PackageableElement.js';

export class FlatData extends Store implements Hashable {
  sections: FlatDataSection[] = [];

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA,
      this.path,
      hashArray(
        this.includes.map((include) => include.valueForSerialization ?? ''),
      ),
      hashArray(this.sections),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_FlatData(this);
  }
}
