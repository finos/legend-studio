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
import { MASTERY_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Mastery_HashUtils.js';

export abstract class V1_Trigger implements Hashable {
  get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.MASTERY_TRIGGER]);
  }
}

export class V1_ManualTrigger extends V1_Trigger {
  override get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.MANUAL_TRIGGER, super.hashCode]);
  }
}

export class V1_CronTrigger extends V1_Trigger {
  minute!: number;
  hour!: number;
  days?: V1_Day[] | undefined;
  month?: V1_Month | undefined;
  dayOfMonth?: number | undefined;
  year?: number | undefined;
  timeZone!: string;
  frequency?: V1_Frequency | undefined;

  override get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.CRON_TRIGGER,
      this.minute,
      this.hour,
      this.days ? hashArray(this.days) : '',
      this.month ?? '',
      this.dayOfMonth ?? '',
      this.year ?? '',
      this.timeZone,
      this.frequency ?? '',
      super.hashCode,
    ]);
  }
}

export enum V1_Frequency {
  Daily,
  Weekly,
  Intraday,
}

export enum V1_Month {
  January,
  February,
  March,
  April,
  May,
  June,
  July,
  August,
  September,
  October,
  November,
  December,
}

export enum V1_Day {
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday,
  Sunday,
}
