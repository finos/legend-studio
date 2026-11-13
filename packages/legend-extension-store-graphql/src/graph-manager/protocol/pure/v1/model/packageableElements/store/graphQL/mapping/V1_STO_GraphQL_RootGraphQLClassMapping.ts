/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import {
  V1_ClassMapping,
  type V1_ClassMappingVisitor,
} from '@finos/legend-graph';
import { GRAPHQL_STORE_HASH_STRUCTURE } from '../../../../../../../../../graph/STO_GraphQL_HashUtils.js';

export class V1_RootGraphQLClassMapping
  extends V1_ClassMapping
  implements Hashable
{
  storePath!: string;
  typeName!: string;
  bindingPath!: string;
  joinAccessorQualifiedProperty?: string | undefined;

  override get hashCode(): string {
    return hashArray([
      GRAPHQL_STORE_HASH_STRUCTURE.ROOT_GRAPHQL_CLASS_MAPPING,
      this.id ?? '',
      this.class ?? '',
      this.root.toString(),
      this.storePath,
      this.typeName,
      this.bindingPath,
      this.joinAccessorQualifiedProperty ?? '',
    ]);
  }

  accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T {
    return visitor.visit_ClassMapping(this);
  }
}
