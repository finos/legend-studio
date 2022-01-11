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
import {
  type Hashable,
  hashArray,
  uniqBy,
  IllegalStateError,
  guaranteeNonNullable,
  UnsupportedOperationError,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
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
import { type Stubable, isStubArray } from '../../../../../helpers/Stubable';
import type { PackageableElementVisitor } from '../PackageableElement';
import { PrimitiveType } from './PrimitiveType';
import { Enumeration } from './Enumeration';
import { Measure, Unit } from './Measure';
import type { StereotypeReference } from './StereotypeReference';
import type { TaggedValue } from './TaggedValue';
import type { GenericTypeReference } from './GenericTypeReference';

export class Class extends Type implements Hashable, Stubable {
  properties: Property[] = [];
  // derivedPropertiesFromAssociations: DerivedProperty[] = [];
  propertiesFromAssociations: Property[] = [];
  derivedProperties: DerivedProperty[] = [];
  generalizations: GenericTypeReference[] = [];
  /**
   * @MARKER MEMORY-SENSITIVE
   * if this belongs to immutable elements: i.e. in system, project dependency, etc.
   * we have to make sure to remove of disposed classes from this when we reprocess the graph
   */
  _subclasses: Class[] = [];
  constraints: Constraint[] = [];
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

  constructor(name: string) {
    super(name);

    makeObservable<Class, '_elementHashCode'>(this, {
      properties: observable,
      propertiesFromAssociations: observable,
      derivedProperties: observable,
      generalizations: observable,
      _subclasses: observable,
      constraints: observable,
      stereotypes: observable,
      taggedValues: observable,
      deleteProperty: action,
      addProperty: action,
      deleteDerivedProperty: action,
      addDerivedProperty: action,
      addConstraint: action,
      deleteConstraint: action,
      changeConstraint: action,
      addSuperType: action,
      deleteSuperType: action,
      addSubclass: action,
      deleteSubclass: action,
      deleteTaggedValue: action,
      addTaggedValue: action,
      deleteStereotype: action,
      changeStereotype: action,
      addStereotype: action,
      allSuperclasses: computed,
      allSubclasses: computed({ keepAlive: true }),
      dispose: override,
      isStub: computed,
      _elementHashCode: override,
    });
  }

  deleteProperty(val: Property): void {
    deleteEntry(this.properties, val);
  }
  addProperty(val: Property): void {
    addUniqueEntry(this.properties, val);
  }
  deleteDerivedProperty(val: DerivedProperty): void {
    deleteEntry(this.derivedProperties, val);
  }
  addDerivedProperty(val: DerivedProperty): void {
    addUniqueEntry(this.derivedProperties, val);
  }
  addConstraint(val: Constraint): void {
    addUniqueEntry(this.constraints, val);
  }
  deleteConstraint(val: Constraint): void {
    deleteEntry(this.constraints, val);
  }
  changeConstraint(val: Constraint, newVal: Constraint): void {
    changeEntry(this.constraints, val, newVal);
  }
  addSuperType(val: GenericTypeReference): void {
    addUniqueEntry(this.generalizations, val);
  }
  deleteSuperType(val: GenericTypeReference): void {
    deleteEntry(this.generalizations, val);
  }
  addSubclass(val: Class): void {
    addUniqueEntry(this._subclasses, val);
  }
  deleteSubclass(val: Class): void {
    deleteEntry(this._subclasses, val);
  }
  deleteTaggedValue(val: TaggedValue): void {
    deleteEntry(this.taggedValues, val);
  }
  addTaggedValue(val: TaggedValue): void {
    addUniqueEntry(this.taggedValues, val);
  }
  deleteStereotype(val: StereotypeReference): void {
    deleteEntry(this.stereotypes, val);
  }
  changeStereotype(
    oldVal: StereotypeReference,
    newVal: StereotypeReference,
  ): void {
    changeEntry(this.stereotypes, oldVal, newVal);
  }
  addStereotype(val: StereotypeReference): void {
    addUniqueEntry(this.stereotypes, val);
  }

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
   * @MARKER MEMORY-SENSITIVE
   * When this is an immutable class such as project dependency or system we need to remember to remove the classes from the sub-types array.
   * And rerun this computation to avoid potenial memory leak
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
   * @MARKER MEMORY-SENSITIVE
   * Since `keepAlive` can cause memory-leak, we need to dispose it manually when we are about to discard the graph
   * in order to avoid leaking.
   * See https://mobx.js.org/best/pitfalls.html#computed-values-run-more-often-than-expected
   * See https://medium.com/terria/when-and-why-does-mobxs-keepalive-cause-a-memory-leak-8c29feb9ff55
   */
  override dispose(): void {
    this._subclasses = []; // call this before setting `disposed` flag to avoid triggering errors if something is using this during disposal
    this._isDisposed = true;
    // dispose hash computation
    try {
      this.hashCode;
    } catch {
      /* do nothing */
    } // trigger recomputation on `hashCode` so it removes itself from all observables it previously observed
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

  static createStub = (): Class => new Class('');
  override get isStub(): boolean {
    return (
      super.isStub &&
      isStubArray(this.properties) &&
      isStubArray(this.derivedProperties) &&
      isStubArray(this.constraints) &&
      isStubArray(this.generalizations) &&
      isStubArray(this.stereotypes) &&
      isStubArray(this.taggedValues)
    );
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

export enum CLASS_PROPERTY_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  MEASURE = 'MEASURE',
  UNIT = 'UNIT',
  PRIMITIVE = 'PRIMITIVE',
}

export const getClassPropertyType = (type: Type): CLASS_PROPERTY_TYPE => {
  if (type instanceof PrimitiveType) {
    return CLASS_PROPERTY_TYPE.PRIMITIVE;
  } else if (type instanceof Enumeration) {
    return CLASS_PROPERTY_TYPE.ENUMERATION;
  } else if (type instanceof Class) {
    return CLASS_PROPERTY_TYPE.CLASS;
  } else if (type instanceof Unit) {
    return CLASS_PROPERTY_TYPE.UNIT;
  } else if (type instanceof Measure) {
    return CLASS_PROPERTY_TYPE.MEASURE;
  }
  throw new UnsupportedOperationError(`Can't classify class property`, type);
};
