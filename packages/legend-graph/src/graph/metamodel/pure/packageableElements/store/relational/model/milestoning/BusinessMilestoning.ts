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

import { CORE_HASH_STRUCTURE } from '../../../../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';
import { TemporalMilestoning } from './Milestoning.js';

export class BusinessMilestoning extends TemporalMilestoning {
  // from and to are columns in mm. We will use string for now until we add resolvement of columns
  from!: string;
  thru!: string;
  thruIsInclusive!: boolean;

  constructor(from: string, thru: string, thruIsInclusive: boolean) {
    super();
    this.from = from;
    this.thru = thru;
    this.thruIsInclusive = thruIsInclusive;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.BUSINESS_MILESTONING,
      this.infinityDate ?? '',
      this.from,
      this.thru,
      this.thruIsInclusive.toString(),
    ]);
  }
}
