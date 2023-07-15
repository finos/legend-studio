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

import { type Hashable, hashArray } from '@finos/legend-shared';
import type { V1_RawLambda } from '@finos/legend-graph';
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';

export class V1_PropertyPath implements Hashable {
  property!: string;
  filter!: V1_RawLambda;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.PROPERTY_PATH,
      this.property,
      this.filter,
    ]);
  }
}
