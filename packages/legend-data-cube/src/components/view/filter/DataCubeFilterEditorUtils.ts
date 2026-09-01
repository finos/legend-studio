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
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { formatDate, parseISO } from '@finos/legend-shared';
import {
  DataCubeOperationAdvancedValueType,
  getCurrentMomentValueType,
  isDateTimeType,
  type DataCubeOperationValue,
} from '../../../stores/core/DataCubeQueryEngine.js';

/**
 * The ways a date filter value can be specified: as an absolute moment - a
 * date, or a date and a time of day - or as a function resolved when the query
 * runs.
 */
export enum DataCubeDateValueMode {
  ABSOLUTE_DATE = 'ABSOLUTE_DATE',
  ABSOLUTE_DATE_TIME = 'ABSOLUTE_DATE_TIME',
  TODAY = 'TODAY',
  NOW = 'NOW',
}

export const DATE_VALUE_MODE_LABEL: Record<DataCubeDateValueMode, string> = {
  [DataCubeDateValueMode.ABSOLUTE_DATE]: 'Date',
  [DataCubeDateValueMode.ABSOLUTE_DATE_TIME]: 'Date Time',
  [DataCubeDateValueMode.TODAY]: 'Today',
  [DataCubeDateValueMode.NOW]: 'Now',
};

// NOTE: the wording mirrors the date picker of the query builder, where a
// value specified by the user is an "absolute" one, as opposed to one which
// resolves relative to the moment the query runs.
export const DATE_VALUE_MODE_DESCRIPTION: Record<
  DataCubeDateValueMode,
  string
> = {
  [DataCubeDateValueMode.ABSOLUTE_DATE]: 'Absolute date',
  [DataCubeDateValueMode.ABSOLUTE_DATE_TIME]: 'Absolute date and time',
  [DataCubeDateValueMode.NOW]: 'now()',
  [DataCubeDateValueMode.TODAY]: 'today()',
};

// The format a `datetime-local` input takes: down to the second, and without
// the time zone, which is not part of what the user picks - it is taken from
// the browser when the value is written back out.
const DATE_TIME_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

/**
 * Returns the format the specified date value is stored in, and the format the
 * editor displays it in. These differ for a date-time, whose value - see
 * `_defaultPrimitiveTypeValue()` - carries the time zone, which is more than
 * the editor shows.
 */
export function getDateValueFormats(valueType: string): {
  valueFormat: string;
  displayFormat: string;
} {
  return isDateTimeType(valueType)
    ? { valueFormat: DATE_TIME_FORMAT, displayFormat: DATE_TIME_INPUT_FORMAT }
    : { valueFormat: DATE_FORMAT, displayFormat: DATE_FORMAT };
}

export function getDateValueMode(
  value: DataCubeOperationValue,
): DataCubeDateValueMode {
  switch (value.type) {
    case DataCubeOperationAdvancedValueType.TODAY:
      return DataCubeDateValueMode.TODAY;
    case DataCubeOperationAdvancedValueType.NOW:
      return DataCubeDateValueMode.NOW;
    default:
      return isDateTimeType(value.type)
        ? DataCubeDateValueMode.ABSOLUTE_DATE_TIME
        : DataCubeDateValueMode.ABSOLUTE_DATE;
  }
}

/**
 * Returns the ways a condition on the specified column can specify its value;
 * empty when the column carries no date (e.g. a time-of-day column), where
 * none of these apply.
 *
 * NOTE: every column which carries a date offers all of them, like the query
 * builder does: `Date` is the super type of both `StrictDate` and `DateTime`,
 * so a column typed with it can hold a time of day, and comparing a date
 * against a moment which carries one is meaningful either way around.
 */
export function getDateValueModes(columnType: string): DataCubeDateValueMode[] {
  return getCurrentMomentValueType(columnType)
    ? [
        DataCubeDateValueMode.ABSOLUTE_DATE,
        DataCubeDateValueMode.ABSOLUTE_DATE_TIME,
        DataCubeDateValueMode.TODAY,
        DataCubeDateValueMode.NOW,
      ]
    : [];
}

/**
 * Returns the moment a date value specifies, defaulting to the current one
 * where it specifies none, e.g. when it is `today()`.
 */
function _dateValueMoment(value: DataCubeOperationValue): Date {
  if (typeof value.value === 'string') {
    const moment = parseISO(value.value);
    if (!Number.isNaN(moment.getTime())) {
      return moment;
    }
  }
  return new Date();
}

/**
 * Returns the value a condition takes when switched to the specified mode,
 * keeping the moment it currently specifies.
 *
 * NOTE: an absolute value is built with the primitive type matching what it
 * specifies rather than with the type of the column. The type of a value names
 * the literal it is written as, which the type of the column does not: `Date`
 * says nothing about whether a time of day is meant, and a timestamp column is
 * typed with a relational data type, which no literal can be spelled with.
 * This is also the type the value comes back as when the query it is written
 * to is read again, so a value keeps its shape across a round-trip.
 */
export function buildDateValue(
  mode: DataCubeDateValueMode,
  value: DataCubeOperationValue,
): DataCubeOperationValue {
  switch (mode) {
    case DataCubeDateValueMode.TODAY:
      return { type: DataCubeOperationAdvancedValueType.TODAY };
    case DataCubeDateValueMode.NOW:
      return { type: DataCubeOperationAdvancedValueType.NOW };
    case DataCubeDateValueMode.ABSOLUTE_DATE_TIME:
      return {
        type: PRIMITIVE_TYPE.DATETIME,
        value: formatDate(_dateValueMoment(value), DATE_TIME_FORMAT),
      };
    case DataCubeDateValueMode.ABSOLUTE_DATE:
    default:
      return {
        type: PRIMITIVE_TYPE.STRICTDATE,
        value: formatDate(_dateValueMoment(value), DATE_FORMAT),
      };
  }
}
