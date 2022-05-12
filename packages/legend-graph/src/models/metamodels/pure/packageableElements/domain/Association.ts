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

import { type Hashable, type Writable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import type { Property } from './Property';
import type { AnnotatedElement } from './AnnotatedElement';
import type { TaggedValue } from './TaggedValue';
import type { StereotypeReference } from './StereotypeReference';
import type { DerivedProperty } from './DerivedProperty';
import type { AbstractProperty } from './AbstractProperty';
import {
  stub_Class,
  stub_Property,
} from '../../../../../graphManager/action/creation/DomainModelCreatorHelper';

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
export class Association
  extends PackageableElement
  implements AnnotatedElement, Hashable
{
  /**
   * To store the abstract properties generated while processing the milestoning properties. The properties
   * generated are `allVersions`, `allVersionsInRange` and derived property with date parameter.
   *
   * TODO: process new property added while editing the graph
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
      stub_Property(stub_Class(), stub_Class()),
      stub_Property(stub_Class(), stub_Class()),
    ];
    (properties[0] as Writable<Property>)._OWNER = this;
    (properties[1] as Writable<Property>)._OWNER = this;
    this.properties = properties;
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
