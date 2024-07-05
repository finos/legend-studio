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

import {
  V1_GraphFetchTree,
  type V1_GraphFetchTreeVisitor,
} from './V1_GraphFetchTree.js';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';

export class V1_RootGraphFetchTree extends V1_GraphFetchTree {
  class!: string;

  accept_GraphFetchTreeVisitor<T>(visitor: V1_GraphFetchTreeVisitor<T>): T {
    return visitor.visit_RootGraphFetchTree(this);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ROOT_GRAPH_FETCH_TREE,
      hashArray(this.subTrees),
      hashArray(this.subTypeTrees),
      this.class,
    ]);
  }
}
