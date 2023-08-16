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
  hashArray,
  guaranteeType,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';
import { Property } from './Property.js';
import type { DerivedProperty } from './DerivedProperty.js';
import type { AbstractProperty } from './AbstractProperty.js';
import { Class } from './Class.js';
import { Multiplicity } from './Multiplicity.js';
import { GenericTypeExplicitReference } from './GenericTypeReference.js';
import { GenericType } from './GenericType.js';

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
 * to a class from a different projects. Here, while building the graph, we can make use of the
 * root package to verify this in the UI and make this a validation error in a way.
 * See https://github.com/finos/legend-studio/issues/282
 */
export class Association extends PackageableElement implements Hashable {
  /**
   * To store the abstract properties generated while processing the milestoning properties. The properties
   * generated are `allVersions`, `allVersionsInRange` and derived property with date parameter.
   *
   * TODO: process new property added while editing the graph
   */
  _generatedMilestonedProperties: AbstractProperty[] = [];

  properties!: [Property, Property];
  derivedProperties: DerivedProperty[] = [];

  constructor(name: string) {
    super(name);

    // NOTE: we might want to revisit this decision to initialize to association properties to stubs
    const properties: [Property, Property] = [
      new Property(
        '',
        Multiplicity.ONE,
        GenericTypeExplicitReference.create(new GenericType(new Class(''))),
        new Class(''),
      ),
      new Property(
        '',
        Multiplicity.ONE,
        GenericTypeExplicitReference.create(new GenericType(new Class(''))),
        new Class(''),
      ),
    ];
    (properties[0] as Writable<Property>)._OWNER = this;
    (properties[1] as Writable<Property>)._OWNER = this;
    this.properties = properties;
  }

  /**
   * Make sure we clean up the properties added to classes through
   * this association
   *
   * @internal model logic
   */
  override dispose(): void {
    super.dispose();
    // cleanup property classes' properties which were added through this association
    const [propertyA, propertyB] = this.properties;
    if (
      propertyA.genericType.value.rawType instanceof Class &&
      propertyB.genericType.value.rawType instanceof Class
    ) {
      const classA = guaranteeType(propertyA.genericType.value.rawType, Class);
      const classB = guaranteeType(propertyB.genericType.value.rawType, Class);
      classA.propertiesFromAssociations =
        classA.propertiesFromAssociations.filter(
          (property) => property !== propertyB,
        );
      classB.propertiesFromAssociations =
        classB.propertiesFromAssociations.filter(
          (property) => property !== propertyA,
        );
    }
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
