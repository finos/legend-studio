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

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_EmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping';
import type { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping';
import type { V1_InlineEmbeddedPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping';
import type { V1_AggregationAwarePropertyMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping';
import type { V1_RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping';
import type { V1_LocalMappingPropertyInfo } from './V1_LocalMappingPropertyInfo';
import type { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer';
import type { V1_PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping';
import type { V1_FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping';
import type { V1_EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping';
import type { V1_XStorePropertyMapping } from './xStore/V1_XStorePropertyMapping';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export interface V1_PropertyMappingVisitor<T> {
  visit_PurePropertyMapping(propertyMapping: V1_PurePropertyMapping): T;
  visit_FlatDataPropertyMapping(propertyMapping: V1_FlatDataPropertyMapping): T;
  visit_EmbeddedFlatDataPropertyMapping(
    propertyMapping: V1_EmbeddedFlatDataPropertyMapping,
  ): T;
  visit_RelationalPropertyMapping(
    propertyMapping: V1_RelationalPropertyMapping,
  ): T;
  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: V1_EmbeddedRelationalPropertyMapping,
  ): T;
  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: V1_OtherwiseEmbeddedRelationalPropertyMapping,
  ): T;
  visit_InlineEmbeddedPropertyMapping(
    propertyMapping: V1_InlineEmbeddedPropertyMapping,
  ): T;
  visit_AggregationAwarePropertyMapping(
    propertyMapping: V1_AggregationAwarePropertyMapping,
  ): T;
  visit_XStorePropertyMapping(propertyMapping: V1_XStorePropertyMapping): T;
}

export abstract class V1_PropertyMapping implements Hashable {
  property!: V1_PropertyPointer;
  source?: string; // `source` is an information that we actually do not need to care about much as it can derived from the container/holder of the property mapping
  // NOTE: `target` is required in protocol but that doesn't seem right since the value can be empty string,
  // also when we convert this to metamodel, we might not be able to identify the class mapping corresponding to the `target` ID
  // in that case we will handle the logic in Transformer to have `target` as empty, here we use `?:` because the
  // specification in the current protocol is unreasonable and will be should be changed to optional (String[0..1])
  target?: string;
  localMappingProperty?: V1_LocalMappingPropertyInfo;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PROPERTY_MAPPING,
      this.property,
      this.target ?? '',
    ]);
  }

  abstract accept_PropertyMappingVisitor<T>(
    visitor: V1_PropertyMappingVisitor<T>,
  ): T;
}
