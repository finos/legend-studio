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

import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import type { V1_PackageableElementVisitor } from '../../../model/packageableElements/V1_PackageableElement';
import { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_Section } from './V1_Section';

export class V1_SectionIndex extends V1_PackageableElement implements Hashable {
  sections: V1_Section[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SECTION_INDEX,
      this.path,
      hashArray(this.sections),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_SectionIndex(this);
  }
}
