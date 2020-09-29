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

import { observable } from 'mobx';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { PropertyReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { PropertyMappingsImplementation } from 'MM/model/packageableElements/mapping/PropertyMappingsImplementation';
import { SetImplementation } from './SetImplementation';
import { Stubable } from 'MM/Stubable';
import { PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export interface PropertyMappingVisitor<T> {
  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): T;
}

export abstract class PropertyMapping implements Hashable, Stubable {
  isEmbedded = false;
  property: PropertyReference;
  @observable owner: PropertyMappingsImplementation; // the immediate parent instance set implementation that holds the property mappings
  // NOTE: in case the holder of this property mapping is an embedded property mapping, that embedded property mapping is considered the source
  // otherwise, it is always the top/root `InstanceSetImplementation` that is considered the source implementation
  @observable sourceSetImplementation: SetImplementation;
  // NOTE: in Pure, we actually only store `targetId` and `sourceId` instead of the reference
  // but for convenience and graph completeness validation purpose we will resolve to the actual set implementations here
  @observable targetSetImplementation?: SetImplementation;
  // localMappingProperty?: boolean;
  // localMappingPropertyType?: Type;
  // localMappingPropertyMultiplicity?: Multiplicity;
  // store?: Store;

  constructor(owner: PropertyMappingsImplementation, property: PropertyReference, source: SetImplementation, target?: SetImplementation) {
    this.owner = owner;
    this.sourceSetImplementation = source;
    this.targetSetImplementation = target;
    this.property = property;
  }

  get isStub(): boolean { throw new UnsupportedOperationError() }
  get lambdaId(): string { throw new UnsupportedOperationError() }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PROPERTY_MAPPING,
      this.property.pointerHashCode,
      this.targetSetImplementation?.id.value ?? ''
    ]);
  }

  abstract accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T
}
