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
import {
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type {
  Mapping,
  MappingElementLabel,
} from '../../../../../model/packageableElements/mapping/Mapping';
import { AbstractFlatDataPropertyMapping } from '../../../../../model/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping';
import type {
  PropertyMapping,
  PropertyMappingVisitor,
} from '../../../../../model/packageableElements/mapping/PropertyMapping';
import type {
  SetImplementationVisitor,
  SetImplementation,
} from '../../../../../model/packageableElements/mapping/SetImplementation';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import type { InstanceSetImplementation } from '../../../../../model/packageableElements/mapping/InstanceSetImplementation';
import type { PropertyMappingsImplementation } from '../../../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { PropertyReference } from '../../../../../model/packageableElements/domain/PropertyReference';
import type { InferableMappingElementIdValue } from '../../../../../model/packageableElements/mapping/InferableMappingElementId';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import { InferableMappingElementRootExplicitValue } from '../../../../../model/packageableElements/mapping/InferableMappingElementRoot';

/**
 * We can think of embedded property mappings as a 'gateway' from one set of property mappings to another. They are in a sense
 * both an `InstanceSetImplementation` (since they hold property mappings that map to a class) and a `PropertyMapping` (as it holds a property).
 * The property's owner class belongs to the orginal/root `InstanceSetImplementation`. The property's type is the class mapped as part of the embedded property mapping
 *
 * NOTE: We model this class differently than what we do in Pure metamodel. We make it only implement `SetImplementation`, not extending it for 2 reasons:
 * 1. Javascript only support single inheritance unlike Pure
 * 2. In the general mental model, it is more sensible to think of embedded property mapping as a property mapping rather than a class mapping because
 * despite the fact that it has the shape similar to a class mapping and it can contain multiple property mappings, it itselt is not a class mapping, it must
 * exsit "embedded" within a property mapping.
 */
export class EmbeddedFlatDataPropertyMapping
  extends AbstractFlatDataPropertyMapping
  implements InstanceSetImplementation, Hashable
{
  root = InferableMappingElementRootExplicitValue.create(false);
  isEmbedded = true;
  class: PackageableElementReference<Class>;
  id: InferableMappingElementIdValue;
  propertyMappings: PropertyMapping[] = [];
  rootInstanceSetImplementation: InstanceSetImplementation; // in Pure we call this `setMappingOwner`
  parent: Mapping;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: InstanceSetImplementation,
    source: SetImplementation,
    _class: PackageableElementReference<Class>,
    id: InferableMappingElementIdValue,
    target?: SetImplementation,
  ) {
    super(owner, property, source, target);

    makeObservable(this, {
      id: observable,
      propertyMappings: observable,
      rootInstanceSetImplementation: observable,
      parent: observable,
      label: computed,
      setPropertyMappings: action,
      lambdaId: computed,
      isStub: computed,
      hashCode: computed,
    });

    this.class = _class;
    this.id = id;
    this.rootInstanceSetImplementation = rootInstanceSetImplementation;
    this.parent = rootInstanceSetImplementation.parent;
  }

  setId(value: string): void {
    throw new UnsupportedOperationError();
  }
  setRoot(value: boolean): void {
    throw new UnsupportedOperationError();
  }

  get label(): MappingElementLabel {
    return {
      value: `${this.class.value.name} [${this.property.value.name}]`,
      root: this.root.value,
      tooltip: this.class.value.path,
    };
  }

  setPropertyMappings(
    propertyMappings: AbstractFlatDataPropertyMapping[],
  ): void {
    this.propertyMappings = propertyMappings;
  }

  get lambdaId(): string {
    throw new UnsupportedOperationError();
  }
  // As of now, there is no stub cases of Embedded Flat Property Mapping since they are created with an existing property mapping
  get isStub(): boolean {
    return false;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EMBEDDED_FLAT_DATA_PROPERTY_MAPPING,
      super.hashCode,
      this.id.valueForSerialization ?? '',
      this.class.value.path,
      // skip `root` since we disregard it in embedded property mappings
      hashArray(
        this.propertyMappings.filter(
          (propertyMapping) => !propertyMapping.isStub,
        ),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_EmbeddedFlatDataSetImplementation(this);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_EmbeddedFlatDataPropertyMapping(this);
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    const embeddedPropertyMappings = this.propertyMappings.filter(
      (propertyMapping): propertyMapping is EmbeddedFlatDataPropertyMapping =>
        propertyMapping instanceof EmbeddedFlatDataPropertyMapping,
    );
    return embeddedPropertyMappings
      .map((embeddedPropertyMapping) =>
        embeddedPropertyMapping.getEmbeddedSetImplmentations(),
      )
      .flat()
      .concat(embeddedPropertyMappings);
  }

  findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): AbstractFlatDataPropertyMapping | undefined {
    let properties = undefined;
    properties = this.propertyMappings.filter(
      (propertyMapping) => propertyMapping.property.value.name === propertyName,
    );
    if (targetId === undefined || properties.length === 1) {
      return properties[0];
    }
    return properties.find(
      (propertyMapping) =>
        propertyMapping.targetSetImplementation &&
        propertyMapping.targetSetImplementation.id.value === targetId,
    );
  }
}
