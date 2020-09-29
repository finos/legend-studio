/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed, action } from 'mobx';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { IllegalStateError, guaranteeNonNullable, addUniqueEntry, deleteEntry, changeEntry, guaranteeType, assertTrue, UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { hashArray } from 'Utilities/HashUtil';
import { PackageableElement, PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { Stubable, isStubArray } from 'MM/Stubable';
import { GenericType } from './GenericType';
import { Class } from './Class';
import { AnnotatedElement } from 'MM/model/packageableElements/domain/AnnotatedElement';
import { TaggedValue } from 'MM/model/packageableElements/domain/TaggedValue';
import { StereotypeReference } from 'MM/model/packageableElements/domain/StereotypeReference';
import { DerivedProperty } from 'MM/model/packageableElements/domain/DerivedProperty';
import { AbstractProperty } from 'MM/model/packageableElements/domain/AbstractProperty';

// NOTE: revisit this decision to use stubs
const initAssociationProperties = (association: Association): [Property, Property] => {
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
 * of dependency between projects. Imagine we create association between classes in project and system
 * or project dependencies. As such, in the app, we have to make it very clear that we prohibits this.
 *
 * TODO: we must change backend to do compilation check whether association refers to a class from a different
 * project
 * FIXME: we can make use of the root package to verify this in the UI and make this a validation error in a way.
 */
export class Association extends PackageableElement implements AnnotatedElement, Hashable, Stubable {
  @observable properties: [Property, Property] = initAssociationProperties(this);
  @observable stereotypes: StereotypeReference[] = [];
  @observable taggedValues: TaggedValue[] = [];
  @observable derivedProperties: DerivedProperty[] = [];

  getFirstProperty = (): Property => guaranteeNonNullable(this.properties[0]);
  getSecondProperty = (): Property => guaranteeNonNullable(this.properties[1]);
  getOtherProperty = (property: Property): Property => {
    const idx = this.properties.findIndex(p => p === property);
    assertTrue(idx !== -1, `Can't find property '${property.name}' in association '${this.path}'`);
    return this.properties[(idx + 1) % 2];
  };
  getPropertyAssociatedClass = (property: AbstractProperty): Class => {
    if (property instanceof Property) {
      return guaranteeType(this.getOtherProperty(property).genericType.ownerReference.value, Class, `Association property '${property.name}' must be of type 'class'`);
    } else if (property instanceof DerivedProperty) {
      throw new UnsupportedOperationError(`Derived property is not currently supported in association`);
    }
    throw new UnsupportedOperationError(`Unsupported property type '${property.constructor.name}'`);
  }

  changePropertyType = (property: Property, type: Class): void => {
    const otherProperty = this.getOtherProperty(property);
    // remove other property from current parent class of the to-be-changed property
    const otherPropertyAssociatedClass = guaranteeType(property.genericType.ownerReference.value, Class, `Association property '${property.name}' must be of type 'class'`);
    assertTrue(deleteEntry(otherPropertyAssociatedClass.propertiesFromAssociations, otherProperty), `Can't find property '${otherProperty.name}' from association '${this.path}' in associated class '${otherPropertyAssociatedClass.path}'`);
    // set up the relationship between the other property and the new class
    addUniqueEntry(type.propertiesFromAssociations, otherProperty);
    // set new type for the property
    property.genericType.setValue(new GenericType(type));
  }

  @action setProperties(val: [Property, Property]): void { this.properties = val }
  @action deleteTaggedValue(val: TaggedValue): void { deleteEntry(this.taggedValues, val) }
  @action addTaggedValue(val: TaggedValue): void { addUniqueEntry(this.taggedValues, val) }
  @action deleteStereotype(val: StereotypeReference): void { deleteEntry(this.stereotypes, val) }
  @action changeStereotype(oldVal: StereotypeReference, newVal: StereotypeReference): void { changeEntry(this.stereotypes, oldVal, newVal) }
  @action addStereotype(val: StereotypeReference): void { addUniqueEntry(this.stereotypes, val) }

  @computed get isStub(): boolean { return super.isStub && isStubArray(this.properties) }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.ASSOCIATION,
      super.hashCode,
      hashArray(this.properties),
      hashArray(this.derivedProperties),
      hashArray(this.stereotypes.map(val => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Association(this);
  }
}
