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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { hashArray, type Hashable } from '@finos/legend-shared';

export class V1_Multiplicity implements Hashable {
  readonly lowerBound: number = 0;
  readonly upperBound?: number | undefined;

  constructor(lowerBound: number, upperBound: number | undefined) {
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MULTIPLICITY,
      this.lowerBound.toString(),
      this.upperBound?.toString() ?? '',
    ]);
  }

  // common multiplicities
  static readonly ZERO = new V1_Multiplicity(0, 0);
  static readonly ZERO_ONE = new V1_Multiplicity(0, 1);
  static readonly ZERO_MANY = new V1_Multiplicity(0, undefined);
  static readonly ONE = new V1_Multiplicity(1, 1);
  static readonly ONE_MANY = new V1_Multiplicity(1, undefined);
}
