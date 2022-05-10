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
  type Writable,
  guaranteeNonNullable,
  guaranteeType,
  assertTrue,
  UnsupportedOperationError,
  hashArray,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import { Property } from './Property';
import { type Stubable, isStubArray } from '../../../../../helpers/Stubable';
import { Class } from './Class';
import type { AnnotatedElement } from './AnnotatedElement';
import type { TaggedValue } from './TaggedValue';
import type { StereotypeReference } from './StereotypeReference';
import { DerivedProperty } from './DerivedProperty';
import type { AbstractProperty } from './AbstractProperty';

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
 * TODO: We probably should change backend to do compilation check whether association refers
 * to a class from a different project. Here, while building the graph, we can make use of the
 * root package to verify this in the UI and make this a validation error in a way.
 */
export class Association
  extends PackageableElement
  implements AnnotatedElement, Hashable, Stubable
{
  /**
   * To store the abstract properties generated while processing the milestoning properties. The properties
   * generated are `allVersions`, `allVersionsInRange` and derived property with date parameter.
   */
  _generatedMilestonedProperties: AbstractProperty[] = [];

  properties!: [Property, Property];
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  derivedProperties: DerivedProperty[] = [];

  constructor(name: string) {
    super(name);

    // NOTE: we might want to revisit this decision to initialize to association properties to stubs
    const properties: [Property, Property] = [
      Property.createStub(Class.createStub(), Class.createStub()),
      Property.createStub(Class.createStub(), Class.createStub()),
    ];
    (properties[0] as Writable<Property>)._OWNER = this;
    (properties[1] as Writable<Property>)._OWNER = this;
    this.properties = properties;
  }

  getFirstProperty = (): Property => guaranteeNonNullable(this.properties[0]);
  getSecondProperty = (): Property => guaranteeNonNullable(this.properties[1]);
  getOtherProperty = (property: Property): Property => {
    const idx = this.properties.findIndex((p) => p === property);
    assertTrue(
      idx !== -1,
      `Can't find property '${property.name}' in association '${this.path}'`,
    );
    return guaranteeNonNullable(this.properties[(idx + 1) % 2]);
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
      `Can't get associated class of property`,
      property,
    );
  };

  getProperty = (name: string): Property =>
    guaranteeNonNullable(
      this.properties.find((p) => p.name === name),
      `Can't find property '${name}' in class '${this.path}'`,
    );

  override get isStub(): boolean {
    return super.isStub && isStubArray(this.properties);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ASSOCIATION,
      this.path,
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
