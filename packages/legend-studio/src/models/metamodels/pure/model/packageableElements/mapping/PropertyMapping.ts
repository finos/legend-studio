/**
 * Copyright 2020 Goldman Sachs
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

import { observable, makeObservable } from 'mobx';
import {
  UnsupportedOperationError,
  hashArray,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PropertyReference } from '../../../model/packageableElements/domain/PropertyReference';
import type { PropertyMappingsImplementation } from '../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { SetImplementation } from './SetImplementation';
import type { Stubable } from '../../../model/Stubable';
import type { PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import type { FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import type { EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../model/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../model/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import type { AggregationAwarePropertyMapping } from '../../../model/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export interface PropertyMappingVisitor<T> {
  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): T;
  visit_FlatDataPropertyMapping(propertyMapping: FlatDataPropertyMapping): T;
  visit_EmbeddedFlatDataPropertyMapping(
    propertyMapping: EmbeddedFlatDataPropertyMapping,
  ): T;
  visit_RelationalPropertyMapping(
    propertyMapping: RelationalPropertyMapping,
  ): T;
  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: EmbeddedRelationalInstanceSetImplementation,
  ): T;
  visit_InlineEmbeddedRelationalPropertyMapping(
    propertyMapping: InlineEmbeddedRelationalInstanceSetImplementation,
  ): T;
  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: OtherwiseEmbeddedRelationalInstanceSetImplementation,
  ): T;
  visit_AggregationAwarePropertyMapping(
    propertyMapping: AggregationAwarePropertyMapping,
  ): T;
}

export abstract class PropertyMapping implements Hashable, Stubable {
  isEmbedded = false;
  property: PropertyReference;
  owner: PropertyMappingsImplementation; // the immediate parent instance set implementation that holds the property mappings
  // NOTE: in case the holder of this property mapping is an embedded property mapping, that embedded property mapping is considered the source
  // otherwise, it is always the top/root `InstanceSetImplementation` that is considered the source implementation
  sourceSetImplementation: SetImplementation;
  // NOTE: in Pure, we actually only store `targetId` and `sourceId` instead of the reference
  // but for convenience and graph completeness validation purpose we will resolve to the actual set implementations here
  targetSetImplementation?: SetImplementation;
  // localMappingProperty?: boolean;
  // localMappingPropertyType?: Type;
  // localMappingPropertyMultiplicity?: Multiplicity;
  // store?: Store;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    source: SetImplementation,
    target?: SetImplementation,
  ) {
    makeObservable(this, {
      owner: observable,
      sourceSetImplementation: observable,
      targetSetImplementation: observable,
    });

    this.owner = owner;
    this.sourceSetImplementation = source;
    this.targetSetImplementation = target;
    this.property = property;
  }

  get isStub(): boolean {
    throw new UnsupportedOperationError();
  }
  get lambdaId(): string {
    throw new UnsupportedOperationError();
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROPERTY_MAPPING,
      this.property.pointerHashCode,
      this.targetSetImplementation?.id.value ?? '',
    ]);
  }

  abstract accept_PropertyMappingVisitor<T>(
    visitor: PropertyMappingVisitor<T>,
  ): T;
}
