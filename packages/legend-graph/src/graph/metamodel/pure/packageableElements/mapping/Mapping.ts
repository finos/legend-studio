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

import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { EnumerationMapping } from './EnumerationMapping.js';
import type { SetImplementation } from './SetImplementation.js';
import type { AssociationImplementation } from './AssociationImplementation.js';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';
import type { DEPRECATED__MappingTest } from './DEPRECATED__MappingTest.js';
import type { MappingInclude } from './MappingInclude.js';
import type { MappingTestSuite } from './MappingTestSuite.js';
import type { Testable } from '../../test/Testable.js';

export class Mapping extends PackageableElement implements Hashable, Testable {
  includes: MappingInclude[] = [];
  classMappings: SetImplementation[] = [];
  enumerationMappings: EnumerationMapping[] = [];
  associationMappings: AssociationImplementation[] = [];
  test: DEPRECATED__MappingTest[] = [];
  tests: MappingTestSuite[] = [];

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING,
      this.path,
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.associationMappings),
      hashArray(this.test),
      hashArray(this.includes),
      hashArray(this.tests),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Mapping(this);
  }
}
