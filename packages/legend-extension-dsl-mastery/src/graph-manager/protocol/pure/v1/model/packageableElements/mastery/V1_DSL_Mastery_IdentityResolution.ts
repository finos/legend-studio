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

import type { V1_RawLambda } from '@finos/legend-graph';
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';

export class V1_IdentityResolution implements Hashable {
  modelClass?: string | undefined;
  resolutionQueries: V1_ResolutionQuery[] = [];

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.IDENTITY_RESOLUTION,
      hashArray(this.resolutionQueries),
    ]);
  }
}

export class V1_ResolutionQuery implements Hashable {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  queries!: V1_RawLambda[];
  keyType!: string;
  precedence!: number;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RESOLUTION_QUERY,
      this.keyType,
      this.precedence.toString(),
      hashArray(this.queries),
    ]);
  }
}
