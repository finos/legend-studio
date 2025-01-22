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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { PropertyReference } from '../domain/PropertyReference.js';
import type { PropertyMappingsImplementation } from './PropertyMappingsImplementation.js';
import type { PurePropertyMapping } from '../store/modelToModel/mapping/PurePropertyMapping.js';
import type { FlatDataPropertyMapping } from '../store/flatData/mapping/FlatDataPropertyMapping.js';
import type { FlatDataAssociationPropertyMapping } from '../store/flatData/mapping/FlatDataAssociationPropertyMapping.js';
import type { EmbeddedFlatDataPropertyMapping } from '../store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import type { RelationalPropertyMapping } from '../store/relational/mapping/RelationalPropertyMapping.js';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
import type { EmbeddedRelationalInstanceSetImplementation } from '../store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation.js';
import type { AggregationAwarePropertyMapping } from './aggregationAware/AggregationAwarePropertyMapping.js';
import type { XStorePropertyMapping } from './xStore/XStorePropertyMapping.js';
import type { LocalMappingPropertyInfo } from './LocalMappingPropertyInfo.js';
import type { SetImplementationReference } from './SetImplementationReference.js';
import type { INTERNAL__UnknownPropertyMapping } from './INTERNAL__UnknownPropertyMapping.js';
import type { RelationFunctionPropertyMapping } from './relationFunction/RelationFunctionPropertyMapping.js';

export interface PropertyMappingVisitor<T> {
  visit_PropertyMapping(propertyMapping: PropertyMapping): T;
  visit_INTERNAL__UnknownPropertyMapping(
    propertyMapping: INTERNAL__UnknownPropertyMapping,
  ): T;

  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): T;
  visit_FlatDataAssociationPropertyMapping(
    propertyMapping: FlatDataAssociationPropertyMapping,
  ): T;
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
  visit_XStorePropertyMapping(propertyMapping: XStorePropertyMapping): T;
  visit_RelationFunctionPropertyMapping(propertyMapping: RelationFunctionPropertyMapping): T;
}

export abstract class PropertyMapping implements Hashable {
  /**
   * the immediate parent instance set implementation that holds the property mappings
   */
  readonly _OWNER: PropertyMappingsImplementation;
  readonly _isEmbedded: boolean = false;

  property: PropertyReference;
  /**
   * In Pure, these fields are defined as string and not properly resolved, perhaps because of
   * the fact that in Pure, we allow mappings which contain class mapping IDs pointing at
   * another mapping's class mappings. In Pure/Engine, we let this pass compilation phase.
   * In Studio, we disallow this. This makes it hard for users to migrate to Studio.
   * We should think of a strategy to make things loadable in Studio, but disallow users
   * to make changes if they have this kind of error in their graph.
   *
   * See https://github.com/finos/legend-studio/issues/880
   *
   * NOTE: We might not be able to resolve `targetSetImplementation` for all `target` IDs hence
   * defined as optional for now. We might need to come back and re-visit this decision. Note that
   * one quirky thing is that the metamodel in Pure has these fields as string pointers, even
   * when these are not resolvable, the field is set to empty string. We should solidify our
   * understand about these fields.
   *
   * @discrepancy model
   */
  sourceSetImplementation: SetImplementationReference;
  targetSetImplementation?: SetImplementationReference | undefined;
  localMappingProperty?: LocalMappingPropertyInfo | undefined;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    source: SetImplementationReference,
    target: SetImplementationReference | undefined,
  ) {
    this._OWNER = owner;
    this.sourceSetImplementation = source;
    this.property = property;
    this.targetSetImplementation = target;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROPERTY_MAPPING,
      this.property.pointerHashCode,
      this.targetSetImplementation?.valueForSerialization ?? '',
      this.localMappingProperty ?? '',
    ]);
  }

  abstract accept_PropertyMappingVisitor<T>(
    visitor: PropertyMappingVisitor<T>,
  ): T;
}
