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

import type { V1_PropertyGraphFetchTree } from './V1_PropertyGraphFetchTree.js';
import type { V1_RootGraphFetchTree } from './V1_RootGraphFetchTree.js';
import type { V1_SubTypeGraphFetchTree } from './V1_SubTypeGraphFetchTree.js';
import type { Hashable } from '@finos/legend-shared';

export interface V1_GraphFetchTreeVisitor<T> {
  visit_RootGraphFetchTree(valueSpecification: V1_RootGraphFetchTree): T;
  visit_PropertyGraphFetchTree(
    valueSpecification: V1_PropertyGraphFetchTree,
  ): T;
  visit_SubTypeGraphFetchTree(valueSpecification: V1_SubTypeGraphFetchTree): T;
}

export abstract class V1_GraphFetchTree implements Hashable {
  subTrees: V1_GraphFetchTree[] = [];
  subTypeTrees: V1_SubTypeGraphFetchTree[] = [];

  abstract get hashCode(): string;
  abstract accept_GraphFetchTreeVisitor<T>(
    visitor: V1_GraphFetchTreeVisitor<T>,
  ): T;
}
