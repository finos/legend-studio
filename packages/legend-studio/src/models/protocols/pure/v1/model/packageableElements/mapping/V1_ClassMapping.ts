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

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping';
import type { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping';
import type { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping';
import type { V1_MappingClass } from './V1_MappingClass';
import type { V1_OperationClassMapping } from './V1_OperationClassMapping';
import type { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export interface V1_ClassMappingVisitor<T> {
  visit_OperationClassMapping(classMapping: V1_OperationClassMapping): T;
  visit_PureInstanceClassMapping(classMapping: V1_PureInstanceClassMapping): T;
  visit_RootFlatDataClassMapping(classMapping: V1_RootFlatDataClassMapping): T;
  visit_RelationalClassMapping(classMapping: V1_RelationalClassMapping): T;
  visit_RootRelationalClassMapping(
    classMapping: V1_RootRelationalClassMapping,
  ): T;
  visit_AggregationAwareClassMapping(
    classMapping: V1_AggregationAwareClassMapping,
  ): T;
}

export abstract class V1_ClassMapping implements Hashable {
  id?: string;
  // NOTE: In Pure protocol, this property is required, but for cases like embedded property mapping,
  // this should not be set, so most likely we will change Pure protocol to match this eventually.
  class?: string;
  root!: boolean;
  mappingClass?: V1_MappingClass;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SET_IMPLEMENTATION,
      this.id ?? '',
      this.class ?? '',
      this.root.toString(),
    ]);
  }

  abstract accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T;
}
