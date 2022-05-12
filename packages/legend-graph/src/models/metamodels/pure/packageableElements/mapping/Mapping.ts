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

import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { EnumerationMapping } from './EnumerationMapping';
import type { SetImplementation } from './SetImplementation';
import type { AssociationImplementation } from './AssociationImplementation';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import type { MappingTest } from './MappingTest';
import type { MappingInclude } from './MappingInclude';

export class Mapping extends PackageableElement implements Hashable {
  includes: MappingInclude[] = [];
  classMappings: SetImplementation[] = [];
  enumerationMappings: EnumerationMapping[] = [];
  associationMappings: AssociationImplementation[] = [];
  tests: MappingTest[] = [];

  // TODO: to be simplified out of metamodel
  get allOwnClassMappings(): SetImplementation[] {
    return this.classMappings;
  }

  // TODO: to be simplified out of metamodel
  get allOwnEnumerationMappings(): EnumerationMapping[] {
    return this.enumerationMappings;
  }

  // TODO: to be simplified out of metamodel
  /**
   * Get all included mappings, accounted for loop and duplication (which should be caught by compiler)
   */
  get allIncludedMappings(): Mapping[] {
    const visited = new Set<Mapping>();
    visited.add(this);
    const resolveIncludes = (_mapping: Mapping): void => {
      _mapping.includes.forEach((incMapping) => {
        if (!visited.has(incMapping.included.value)) {
          visited.add(incMapping.included.value);
          resolveIncludes(incMapping.included.value);
        }
      });
    };
    resolveIncludes(this);
    visited.delete(this);
    return Array.from(visited);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING,
      this.path,
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.associationMappings),
      hashArray(this.tests),
      hashArray(this.includes),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Mapping(this);
  }
}
