/**
 * Copyright Goldman Sachs
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
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_MappingInclude } from '../../../model/packageableElements/mapping/V1_MappingInclude';
import type { V1_ClassMapping } from '../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_AssociationMapping } from '../../../model/packageableElements/mapping/V1_AssociationMapping';
import type { V1_EnumerationMapping } from '../../../model/packageableElements/mapping/V1_EnumerationMapping';
import type { V1_PackageableElementVisitor } from '../../../model/packageableElements/V1_PackageableElement';
import { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_MappingTest } from '../../../model/packageableElements/mapping/V1_MappingTest';

export class V1_Mapping extends V1_PackageableElement implements Hashable {
  includedMappings: V1_MappingInclude[] = [];
  enumerationMappings: V1_EnumerationMapping[] = [];
  classMappings: V1_ClassMapping[] = [];
  associationMappings: V1_AssociationMapping[] = [];
  tests: V1_MappingTest[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING,
      super.hashCode,
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.associationMappings),
      hashArray(this.tests),
      hashArray(this.includedMappings),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Mapping(this);
  }
}
