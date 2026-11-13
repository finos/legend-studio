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

import {
  type PlainObject,
  hashArray,
  type Hashable,
} from '@finos/legend-shared';
import { type PackageableElementVisitor, Store } from '@finos/legend-graph';
import { GRAPHQL_STORE_HASH_STRUCTURE } from '../../../../../../../STO_GraphQL_HashUtils.js';

export class GraphQLStore extends Store implements Hashable {
  schema?: PlainObject<unknown> | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      GRAPHQL_STORE_HASH_STRUCTURE.GRAPHQL_STORE,
      this.path,
      this.schema ? JSON.stringify(this.schema) : '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
