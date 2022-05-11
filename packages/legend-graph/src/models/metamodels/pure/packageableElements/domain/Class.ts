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
  hashArray,
  uniqBy,
  IllegalStateError,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  CORE_PURE_PATH,
} from '../../../../../MetaModelConst';
import { Type } from './Type';
import type { Property } from './Property';
import type { Constraint } from './Constraint';
import type { DerivedProperty } from './DerivedProperty';
import type { AbstractProperty } from './AbstractProperty';
import type { PackageableElementVisitor } from '../PackageableElement';
import type { StereotypeReference } from './StereotypeReference';
import type { TaggedValue } from './TaggedValue';
import type { GenericTypeReference } from './GenericTypeReference';

export class Class extends Type implements Hashable {
  /**
   * We can also call this `specifications` (i.e. vs. `generalizations`)
   *
   * If this belongs to immutable elements: i.e. in system, project dependency, etc.
   * we have to make sure to remove of disposed classes from this when we reprocess the graph
   *
   * @risk memory-leak
   */
  _subclasses: Class[] = [];
  /**
   * To store the abstract properties generated while processing the milestoning properties. The properties
   * generated are `allVersions`, `allVersionsInRange` and derived property with date parameter.
   */
  _generatedMilestonedProperties: AbstractProperty[] = [];

  properties: Property[] = [];
  // derivedPropertiesFromAssociations: DerivedProperty[] = [];
  propertiesFromAssociations: Property[] = [];
  derivedProperties: DerivedProperty[] = [];
  generalizations: GenericTypeReference[] = [];
  constraints: Constraint[] = [];
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

  /**
   * Get class and its supertypes' properties recursively, duplications and loops are handled (Which should be caught by compiler)
   */
  getAllProperties = (): Property[] =>
    uniqBy(
      this.allSuperclasses
        .concat(this)
        .map((_class) =>
          _class.propertiesFromAssociations.concat(_class.properties),
        )
        .flat(),
      (p) => p.name,
    );

  getProperty = (name: string): Property =>
    guaranteeNonNullable(
      this.getAllProperties().find((p) => p.name === name),
      `Can't find property '${name}' in class '${this.path}'`,
    );

  getAllDerivedProperties = (): DerivedProperty[] =>
    uniqBy(
      this.allSuperclasses
        .concat(this)
        .map((_class) => _class.derivedProperties)
        .flat(),
      (p) => p.name,
    );

  getAllOwnedProperties = (): AbstractProperty[] =>
    this.properties
      .concat(this.propertiesFromAssociations)
      .concat(this.derivedProperties);

  getOwnedProperty = (name: string): AbstractProperty =>
    guaranteeNonNullable(
      this.getAllOwnedProperties().find((p) => p.name === name),
      `Can't find property '${name}' in class '${this.path}'`,
    );

  // Perhaps we don't need to care about deduping constraints here like for properties
  getAllConstraints = (): Constraint[] =>
    this.allSuperclasses
      .concat(this)
      .map((_class) => _class.constraints)
      .flat();

  isSuperType(type: Type): boolean {
    return (
      type.path === CORE_PURE_PATH.ANY ||
      (type instanceof Class && type.allSuperclasses.includes(this))
    );
  }

  isSubType(type: Type): boolean {
    return (
      this.path === CORE_PURE_PATH.ANY ||
      (type instanceof Class && type.allSubclasses.includes(this))
    );
  }

  /**
   * Get all super types of a class, accounted for loop and duplication (which should be caught by compiler)
   * NOTE: we intentionally leave out `Any`
   */
  get allSuperclasses(): Class[] {
    const visitedClasses = new Set<Class>();
    visitedClasses.add(this);
    const resolveSuperTypes = (_class: Class): void => {
      _class.generalizations.forEach((gen) => {
        const superType = gen.value.getRawType(Class);
        if (!visitedClasses.has(superType)) {
          visitedClasses.add(superType);
          resolveSuperTypes(superType);
        }
      });
    };
    resolveSuperTypes(this);
    visitedClasses.delete(this);
    return Array.from(visitedClasses);
  }

  /**
   * Get all subclasses of a class, accounted for loop and duplication (which should be caught by compiler)
   * NOTE: we intentionally leave out `Any`
   *
   * When this is an immutable class such as project dependency or system we need to remember to remove the classes from the sub-types array.
   * And rerun this computation to avoid potenial memory leak
   *
   * @risk memory-leak
   */
  get allSubclasses(): Class[] {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    const visitedClasses = new Set<Class>();
    visitedClasses.add(this);
    const resolveSubclasses = (_class: Class): void => {
      if (_class._isDisposed) {
        return;
      }
      _class._subclasses.forEach((subclass) => {
        if (!visitedClasses.has(subclass)) {
          visitedClasses.add(subclass);
          resolveSubclasses(subclass);
        }
      });
    };
    resolveSubclasses(this);
    visitedClasses.delete(this);
    return Array.from(visitedClasses);
  }

  /**
   * Make sure to remove the disposed class from being referenced in other elements
   * e.g. subclass analytics is great, but it causes the class being referred to by classes
   * coming from system or dependencies
   */
  override dispose(): void {
    super.dispose();
    this._subclasses = []; // call this before setting `disposed` flag to avoid triggering errors if something is using this during disposal
    // cleanup subclasses analytics on superclasses
    this.allSuperclasses.forEach((superclass) => {
      if (!superclass._isDisposed) {
        superclass._subclasses = superclass._subclasses.filter(
          (subclass) => !subclass._isDisposed,
        );
      }
    });
    try {
      this.allSubclasses;
    } catch {
      /* do nothing */
    } // trigger recomputation on `allSubclasses` so it removes itself from all observables it previously observed
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CLASS,
      this.path,
      hashArray(this.properties),
      hashArray(this.derivedProperties),
      hashArray(
        this.generalizations.map((gen) => gen.ownerReference.hashValue),
      ),
      hashArray(this.constraints),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Class(this);
  }
}
