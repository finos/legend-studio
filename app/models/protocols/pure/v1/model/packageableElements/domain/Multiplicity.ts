/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { HASH_STRUCTURE, MULTIPLICITY_INFINITE } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';

export class Multiplicity implements Hashable {
  @serializable lowerBound = 0;
  @serializable upperBound?: number;

  get str(): string {
    if (this.lowerBound === this.upperBound) {
      return this.lowerBound.toString();
    } else if (this.lowerBound === 0 && this.upperBound === undefined) {
      return MULTIPLICITY_INFINITE;
    }
    return `${this.lowerBound}..${this.upperBound ?? MULTIPLICITY_INFINITE}`;
  }

  get hashCode(): string {
    return hashArray([HASH_STRUCTURE.MULTIPLICITY, this.str]);
  }
}
