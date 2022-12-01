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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_MappingInclude } from '../../../model/packageableElements/mapping/V1_MappingInclude.js';
import type { V1_ClassMapping } from '../../../model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_AssociationMapping } from '../../../model/packageableElements/mapping/V1_AssociationMapping.js';
import type { V1_EnumerationMapping } from '../../../model/packageableElements/mapping/V1_EnumerationMapping.js';
import {
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_DEPRECATED__MappingTest } from './V1_DEPRECATED__MappingTest.js';
import type { V1_TestSuite } from '../../test/V1_TestSuite.js';

export class V1_Mapping extends V1_PackageableElement implements Hashable {
  includedMappings: V1_MappingInclude[] = [];
  enumerationMappings: V1_EnumerationMapping[] = [];
  classMappings: V1_ClassMapping[] = [];
  associationMappings: V1_AssociationMapping[] = [];
  tests: V1_DEPRECATED__MappingTest[] = [];
  testSuites: V1_TestSuite[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING,
      this.path,
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.associationMappings),
      hashArray(this.tests),
      hashArray(this.includedMappings),
      hashArray(this.testSuites),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Mapping(this);
  }
}
