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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping.js';
import type { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping.js';
import type { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping.js';
import type { V1_MappingClass } from './V1_MappingClass.js';
import type { V1_OperationClassMapping } from './V1_OperationClassMapping.js';
import type { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping.js';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping.js';
import type { V1_MergeOperationClassMapping } from './V1_MergeOperationClassMapping.js';
import type { V1_INTERNAL__UnknownClassMapping } from './V1_INTERNAL__UnknownClassMapping.js';
import type { V1_RelationFunctionClassMapping } from './V1_RelationFunctionClassMapping.js';

export interface V1_ClassMappingVisitor<T> {
  visit_ClassMapping(classMapping: V1_ClassMapping): T;
  visit_INTERNAL__UnknownClassMapping(
    classMapping: V1_INTERNAL__UnknownClassMapping,
  ): T;

  visit_MergeOperationClassMapping(
    classMapping: V1_MergeOperationClassMapping,
  ): T;
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
  visit_RelationFunctionClassMapping(
    classMapping: V1_RelationFunctionClassMapping,
  ): T;
}

export abstract class V1_ClassMapping implements Hashable {
  id?: string | undefined;
  // NOTE: In Pure protocol, this property is required, but for cases like embedded property mapping,
  // this should not be set, so most likely we will change Pure protocol to match this eventually.
  class?: string | undefined;
  root!: boolean;
  mappingClass?: V1_MappingClass | undefined;
  extendsClassMappingId?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SET_IMPLEMENTATION,
      this.id ?? '',
      this.class ?? '',
      this.root.toString(),
      this.extendsClassMappingId ?? '',
    ]);
  }

  abstract accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T;
}
