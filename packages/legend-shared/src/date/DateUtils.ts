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
  format as formatDate,
  formatDistanceToNow,
  addDays,
  formatDuration,
  intervalToDuration,
  parseISO,
} from 'date-fns';

export { formatDate, formatDistanceToNow, addDays, parseISO };

const COMMON_TIME_UNIT_HOURS = 'hours';
const COMMON_TIME_UNIT_SECONDS = 'seconds';
const COMMON_TIME_UNIT_MINUTES = 'minutes';
const MS_SECOND_INTERVAL = 1000;
export const prettyDuration = (
  msTime: number,
  options?: {
    ms?: boolean;
  },
): string => {
  const format = formatDuration(
    intervalToDuration({
      start: 0,
      end: msTime,
    }),
    {
      format: [
        COMMON_TIME_UNIT_HOURS,
        COMMON_TIME_UNIT_MINUTES,
        COMMON_TIME_UNIT_SECONDS,
      ],
    },
  );
  if (!options?.ms) {
    return format;
  }
  const ms = msTime % MS_SECOND_INTERVAL;
  const msLabel = `${ms} ms`;
  if (!format) {
    return msLabel;
  }
  return `${format}${ms > 0 ? ` ${msLabel}` : ''}`;
};
