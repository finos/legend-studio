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

import { V1_PropertyGraphFetchTree } from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../../../../../graph/metamodel/DSL_DataQuality_HashUtils.js';

export class V1_DataQualityPropertyGraphFetchTree
  extends V1_PropertyGraphFetchTree
  implements Hashable
{
  constraints: string[] = [];

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE,
      hashArray(this.subTrees),
      this.property,
      this.alias ?? '',
      this.subType ?? '',
      hashArray(this.constraints),
    ]);
  }
}
