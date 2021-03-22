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
import type { V1_RawLambda } from '../../../../../model/rawValueSpecification/V1_RawLambda';
import type { V1_AbstractFlatDataPropertyMapping } from './V1_AbstractFlatDataPropertyMapping';

export class V1_RootFlatDataClassMapping
  extends V1_ClassMapping
  implements Hashable {
  flatData!: string;
  sectionName!: string;
  filter?: V1_RawLambda;
  propertyMappings: V1_AbstractFlatDataPropertyMapping[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.flatData,
      this.sectionName,
      this.filter ?? '',
      hashArray(this.propertyMappings),
    ]);
  }

  accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T {
    return visitor.visit_RootFlatDataClassMapping(this);
  }
}
