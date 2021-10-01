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

import { observable, action, computed, makeObservable, override } from 'mobx';
import { hashArray, deleteEntry, addUniqueEntry } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-shared';
import type { EnumerationMapping } from './EnumerationMapping';
import type { SetImplementation } from './SetImplementation';
import type { AssociationImplementation } from './AssociationImplementation';
import type { PackageableElementVisitor } from '../PackageableElement';
import { PackageableElement } from '../PackageableElement';
import type { Stubable } from '../../../../../helpers/Stubable';
import { isStubArray } from '../../../../../helpers/Stubable';
import type { MappingTest } from './MappingTest';
import type { MappingInclude } from './MappingInclude';

export class Mapping extends PackageableElement implements Hashable, Stubable {
  includes: MappingInclude[] = [];
  classMappings: SetImplementation[] = [];
  enumerationMappings: EnumerationMapping[] = [];
  associationMappings: AssociationImplementation[] = [];
  tests: MappingTest[] = [];

  constructor(name: string) {
    super(name);

    makeObservable<Mapping, '_elementHashCode'>(this, {
      includes: observable,
      classMappings: observable,
      enumerationMappings: observable,
      associationMappings: observable,
      tests: observable,
      addClassMapping: action,
      deleteClassMapping: action,
      addEnumerationMapping: action,
      deleteEnumerationMapping: action,
      addAssociationMapping: action,
      deleteAssociationMapping: action,
      deleteTest: action,
      addTest: action,
      allOwnClassMappings: computed,
      allOwnEnumerationMappings: computed,
      allIncludedMappings: computed,
      isStub: computed,
      _elementHashCode: override,
    });
  }

  addClassMapping(val: SetImplementation): void {
    addUniqueEntry(this.classMappings, val);
  }

  deleteClassMapping(val: SetImplementation): void {
    deleteEntry(this.classMappings, val);
  }

  addEnumerationMapping(val: EnumerationMapping): void {
    addUniqueEntry(this.enumerationMappings, val);
  }

  deleteEnumerationMapping(val: EnumerationMapping): void {
    deleteEntry(this.enumerationMappings, val);
  }

  addAssociationMapping(val: AssociationImplementation): void {
    addUniqueEntry(this.associationMappings, val);
  }

  deleteAssociationMapping(val: AssociationImplementation): void {
    deleteEntry(this.associationMappings, val);
  }

  deleteTest(val: MappingTest): void {
    deleteEntry(this.tests, val);
  }

  addTest(val: MappingTest): void {
    addUniqueEntry(this.tests, val);
  }

  get allOwnClassMappings(): SetImplementation[] {
    return this.classMappings;
  }

  get allOwnEnumerationMappings(): EnumerationMapping[] {
    return this.enumerationMappings;
  }

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

  static createStub = (): Mapping => new Mapping('');

  override get isStub(): boolean {
    return (
      super.isStub &&
      // && isStubArray(this.includes)
      isStubArray(this.associationMappings) &&
      isStubArray(this.classMappings) &&
      isStubArray(this.enumerationMappings)
    );
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING,
      this.path,
      // TODO mapping include
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

export interface MappingElementLabel {
  value: string;
  root: boolean;
  tooltip: string;
}
