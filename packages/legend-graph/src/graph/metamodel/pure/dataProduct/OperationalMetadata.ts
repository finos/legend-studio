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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';

export enum DeliveryFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  ON_DEMAND = 'ON_DEMAND',
  INTRA_DAY = 'INTRADAY',
}

export enum Region {
  APAC = 'APAC',
  EMEA = 'EMEA',
  LAMR = 'LAMR',
  NAMR = 'NAMR',
}

export class OperationalMetadata implements Hashable {
  coverageRegions: Region[] | undefined;
  updateFrequency: DeliveryFrequency | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OPERATIONAL_METADATA,
      hashArray(this.coverageRegions ?? []),
      this.updateFrequency ?? '',
    ]);
  }
}
