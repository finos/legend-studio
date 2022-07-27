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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { Type } from './Type.js';
import type { Property } from './Property.js';
import type { Constraint } from './Constraint.js';
import type { DerivedProperty } from './DerivedProperty.js';
import type { AbstractProperty } from './AbstractProperty.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import type { GenericTypeReference } from './GenericTypeReference.js';

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
   *
   * TODO: process new property added while editing the graph
   */
  _generatedMilestonedProperties: AbstractProperty[] = [];

  properties: Property[] = [];
  propertiesFromAssociations: Property[] = [];
  derivedProperties: DerivedProperty[] = [];
  // derivedPropertiesFromAssociations: DerivedProperty[] = [];
  generalizations: GenericTypeReference[] = [];
  constraints: Constraint[] = [];

  /**
   * Make sure to remove the disposed class from being referenced in other elements
   * e.g. subclass analytics is great, but it causes the class being referred to by classes
   * coming from system or dependencies
   *
   * This logic is specific to the codebase and this is not part of the native metamodel.
   * If needed, we can probably move this out as an utility or do type declaration merge
   * and define this externally using `Object.defineProperty`.
   *
   * @internal model logic
   */
  override dispose(): void {
    super.dispose();
    this._subclasses = [];
    // cleanup subclasses analytics on superclasses
    this.generalizations.forEach((genericType) => {
      const superclass = genericType.value.rawType as Class;
      if (!superclass._isDisposed) {
        superclass._subclasses = superclass._subclasses.filter(
          (subclass) => !subclass._isDisposed,
        );
      }
    });
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CLASS,
      this.path,
      hashArray(this.properties),
      hashArray(this.derivedProperties),
      hashArray(
        this.generalizations.map(
          (gen) => gen.ownerReference.valueForSerialization ?? '',
        ),
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
