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

import { observable, computed, action, makeObservable } from 'mobx';
import type { Hashable } from '@finos/legend-studio-shared';
import {
  getClass,
  IllegalStateError,
  guaranteeNonNullable,
  guaranteeType,
  assertTrue,
  UnsupportedOperationError,
  hashArray,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { PackageableElement } from '../../../model/packageableElements/PackageableElement';
import { Property } from '../../../model/packageableElements/domain/Property';
import type { Stubable } from '../../../model/Stubable';
import { isStubArray } from '../../../model/Stubable';
import { GenericType } from './GenericType';
import { Class } from './Class';
import type { AnnotatedElement } from '../../../model/packageableElements/domain/AnnotatedElement';
import type { TaggedValue } from '../../../model/packageableElements/domain/TaggedValue';
import type { StereotypeReference } from '../../../model/packageableElements/domain/StereotypeReference';
import { DerivedProperty } from '../../../model/packageableElements/domain/DerivedProperty';
import type { AbstractProperty } from '../../../model/packageableElements/domain/AbstractProperty';

// NOTE: we might want to revisit this decision to initialize to association properties to stubs
const initAssociationProperties = (
  association: Association,
): [Property, Property] => {
  const properties: [Property, Property] = [
    Property.createStub(Class.createStub(), Class.createStub()),
    Property.createStub(Class.createStub(), Class.createStub()),
  ];
  properties[0].owner = association;
  properties[1].owner = association;
  return properties;
};

/**
 * Assocation needs exactly 2 properties (for 2 classes, not enumeration, not primitive), e.g.
 *    employees: Person[*]
 *    firm: Firm[1]
 * -> inside of Person, we will see a property firm: Firm[1] and vice versa
 *
 * NOTE: This is a very important note on the usage of `Association`. Association allows a very
 * nice trick that is without modifying some classes that you don't own, you can `create` property
 * on them by using association, but this can also be misused and accidentally create tangled cycles
 * of dependency between project. Imagine we create association between classes in project and system
 * or project dependencies. As such, in the app, we have to make it very clear that we prohibits this.
 *
 * TODO: we must change backend to do compilation check whether association refers to a class from a different
 * project
 * FIXME: we can make use of the root package to verify this in the UI and make this a validation error in a way.
 */
export class Association
  extends PackageableElement
  implements AnnotatedElement, Hashable, Stubable
{
  properties: [Property, Property] = initAssociationProperties(this);
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  derivedProperties: DerivedProperty[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      properties: observable,
      stereotypes: observable,
      taggedValues: observable,
      derivedProperties: observable,
      setProperties: action,
      deleteTaggedValue: action,
      addTaggedValue: action,
      deleteStereotype: action,
      changeStereotype: action,
      addStereotype: action,
      isStub: computed,
      hashCode: computed({ keepAlive: true }),
    });
  }

  getFirstProperty = (): Property => guaranteeNonNullable(this.properties[0]);
  getSecondProperty = (): Property => guaranteeNonNullable(this.properties[1]);
  getOtherProperty = (property: Property): Property => {
    const idx = this.properties.findIndex((p) => p === property);
    assertTrue(
      idx !== -1,
      `Can't find property '${property.name}' in association '${this.path}'`,
    );
    return this.properties[(idx + 1) % 2];
  };
  getPropertyAssociatedClass = (property: AbstractProperty): Class => {
    if (property instanceof Property) {
      return guaranteeType(
        this.getOtherProperty(property).genericType.ownerReference.value,
        Class,
        `Association property '${property.name}' must be of type 'class'`,
      );
    } else if (property instanceof DerivedProperty) {
      throw new UnsupportedOperationError(
        `Derived property is not currently supported in association`,
      );
    }
    throw new UnsupportedOperationError(
      `Can't get association property of type '${getClass(property).name}'`,
    );
  };

  getProperty = (name: string): Property =>
    guaranteeNonNullable(
      this.properties.find((p) => p.name === name),
      `Can't find property '${name}' in class '${this.path}'`,
    );

  changePropertyType = (property: Property, type: Class): void => {
    const otherProperty = this.getOtherProperty(property);
    // remove other property from current parent class of the to-be-changed property
    const otherPropertyAssociatedClass = guaranteeType(
      property.genericType.ownerReference.value,
      Class,
      `Association property '${property.name}' must be of type 'class'`,
    );
    // don't invoke deletion if the class is a stub (otherProperty is not present)
    if (!otherPropertyAssociatedClass.isStub) {
      assertTrue(
        deleteEntry(
          otherPropertyAssociatedClass.propertiesFromAssociations,
          otherProperty,
        ),
        `Can't find property '${otherProperty.name}' from association '${this.path}' in associated class '${otherPropertyAssociatedClass.path}'`,
      );
    }
    // set up the relationship between the other property and the new class
    addUniqueEntry(type.propertiesFromAssociations, otherProperty);
    // set new type for the property
    property.genericType.setValue(new GenericType(type));
  };

  setProperties(val: [Property, Property]): void {
    this.properties = val;
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

  get isStub(): boolean {
    return super.isStub && isStubArray(this.properties);
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.ASSOCIATION,
      super.hashCode,
      hashArray(this.properties),
      hashArray(this.derivedProperties),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Association(this);
  }
}
