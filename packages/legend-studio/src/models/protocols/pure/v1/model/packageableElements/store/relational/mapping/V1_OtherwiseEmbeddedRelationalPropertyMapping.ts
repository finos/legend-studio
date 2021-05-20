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

import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';
import { V1_EmbeddedRelationalPropertyMapping } from './V1_EmbeddedRelationalPropertyMapping';
import type { V1_RelationalPropertyMapping } from './V1_RelationalPropertyMapping';
import type { V1_PropertyMappingVisitor } from '../../../../../model/packageableElements/mapping/V1_PropertyMapping';

export class V1_OtherwiseEmbeddedRelationalPropertyMapping
  extends V1_EmbeddedRelationalPropertyMapping
  implements Hashable
{
  otherwisePropertyMapping!: V1_RelationalPropertyMapping;

  accept_PropertyMappingVisitor<T>(visitor: V1_PropertyMappingVisitor<T>): T {
    return visitor.visit_OtherwiseEmbeddedRelationalPropertyMapping(this);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OTHERWISE_EMBEDDED_REALTIONAL_PROPERTY_MAPPPING,
      super.hashCode,
      this.otherwisePropertyMapping,
    ]);
  }
}
