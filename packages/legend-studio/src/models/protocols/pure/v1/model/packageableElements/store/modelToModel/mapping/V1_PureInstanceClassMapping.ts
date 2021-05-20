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
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import type { V1_ClassMappingVisitor } from '../../../../../model/packageableElements/mapping/V1_ClassMapping';
import { V1_ClassMapping } from '../../../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_PropertyMapping } from '../../../../../model/packageableElements/mapping/V1_PropertyMapping';
import type { V1_RawLambda } from '../../../../../model/rawValueSpecification/V1_RawLambda';

export class V1_PureInstanceClassMapping
  extends V1_ClassMapping
  implements Hashable
{
  srcClass?: string;
  propertyMappings: V1_PropertyMapping[] = [];
  filter?: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PURE_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.srcClass ?? '',
      this.filter ?? '',
      hashArray(this.propertyMappings),
    ]);
  }

  accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T {
    return visitor.visit_PureInstanceClassMapping(this);
  }
}
