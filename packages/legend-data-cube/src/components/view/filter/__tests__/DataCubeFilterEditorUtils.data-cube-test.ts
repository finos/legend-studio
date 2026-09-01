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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { DataCubeOperationAdvancedValueType } from '../../../../stores/core/DataCubeQueryEngine.js';
import {
  buildDateValue,
  DataCubeDateValueMode,
  getDateValueFormats,
  getDateValueMode,
  getDateValueModes,
} from '../DataCubeFilterEditorUtils.js';

describe(unitTest(`Filter date value: format of a value`), () => {
  test(`a date is stored and displayed the same way`, () => {
    expect(getDateValueFormats(PRIMITIVE_TYPE.STRICTDATE)).toEqual({
      valueFormat: DATE_FORMAT,
      displayFormat: DATE_FORMAT,
    });
  });

  test(`a date-time is displayed down to the second, without the time zone it is stored with`, () => {
    const formats = getDateValueFormats(PRIMITIVE_TYPE.DATETIME);
    expect(formats.valueFormat).toBe(DATE_TIME_FORMAT);
    expect(formats.displayFormat).toBe("yyyy-MM-dd'T'HH:mm:ss");
    expect(getDateValueFormats(PRECISE_PRIMITIVE_TYPE.TIMESTAMP)).toEqual(
      formats,
    );
    expect(getDateValueFormats(PRECISE_PRIMITIVE_TYPE.DATETIME)).toEqual(
      formats,
    );
  });
});

describe(unitTest(`Filter date value: mode of a value`), () => {
  test.each([
    [PRIMITIVE_TYPE.STRICTDATE, DataCubeDateValueMode.ABSOLUTE_DATE],
    // `Date` says nothing about whether a time of day is meant, so a value
    // typed with it is taken to specify only a date, like it is stored
    [PRIMITIVE_TYPE.DATE, DataCubeDateValueMode.ABSOLUTE_DATE],
    [PRIMITIVE_TYPE.DATETIME, DataCubeDateValueMode.ABSOLUTE_DATE_TIME],
    [
      PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
      DataCubeDateValueMode.ABSOLUTE_DATE_TIME,
    ],
    [
      DataCubeOperationAdvancedValueType.TODAY,
      DataCubeDateValueMode.TODAY as DataCubeDateValueMode,
    ],
    [DataCubeOperationAdvancedValueType.NOW, DataCubeDateValueMode.NOW],
  ])(`%s -> %s`, (valueType, mode) => {
    expect(getDateValueMode({ type: valueType, value: '2020-01-01' })).toBe(
      mode,
    );
  });
});

describe(unitTest(`Filter date value: modes offered for a column`), () => {
  test.each([
    PRIMITIVE_TYPE.DATE,
    PRIMITIVE_TYPE.STRICTDATE,
    PRIMITIVE_TYPE.DATETIME,
    PRECISE_PRIMITIVE_TYPE.STRICTDATE,
    PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
  ])(`a %s column offers every mode`, (columnType) => {
    expect(getDateValueModes(columnType)).toEqual([
      DataCubeDateValueMode.ABSOLUTE_DATE,
      DataCubeDateValueMode.ABSOLUTE_DATE_TIME,
      DataCubeDateValueMode.TODAY,
      DataCubeDateValueMode.NOW,
    ]);
  });

  test.each([
    PRIMITIVE_TYPE.STRICTTIME,
    PRECISE_PRIMITIVE_TYPE.STRICTTIME,
    PRIMITIVE_TYPE.STRING,
    PRIMITIVE_TYPE.INTEGER,
  ])(`a %s column, which carries no date, offers none`, (columnType) => {
    expect(getDateValueModes(columnType)).toEqual([]);
  });
});

describe(unitTest(`Filter date value: switching mode`), () => {
  const DATE_VALUE = {
    type: PRIMITIVE_TYPE.STRICTDATE,
    value: '2020-06-15',
  };

  test(`a current-moment function carries no value`, () => {
    expect(buildDateValue(DataCubeDateValueMode.TODAY, DATE_VALUE)).toEqual({
      type: DataCubeOperationAdvancedValueType.TODAY,
    });
    expect(buildDateValue(DataCubeDateValueMode.NOW, DATE_VALUE)).toEqual({
      type: DataCubeOperationAdvancedValueType.NOW,
    });
  });

  test(`the moment currently specified is kept`, () => {
    const dateTimeValue = buildDateValue(
      DataCubeDateValueMode.ABSOLUTE_DATE_TIME,
      DATE_VALUE,
    );
    expect(dateTimeValue.type).toBe(PRIMITIVE_TYPE.DATETIME);
    expect(dateTimeValue.value).toMatch(/^2020-06-15T00:00:00/);

    // and back, dropping the time of day
    // NOTE: the moment is specified without a time zone so that the date it
    // falls on does not depend on the one the test runs in
    expect(
      buildDateValue(DataCubeDateValueMode.ABSOLUTE_DATE, {
        type: PRIMITIVE_TYPE.DATETIME,
        value: '2020-06-15T13:45:30',
      }),
    ).toEqual({ type: PRIMITIVE_TYPE.STRICTDATE, value: '2020-06-15' });
  });

  test(`a value which specifies no moment falls back to the current one`, () => {
    const value = buildDateValue(DataCubeDateValueMode.ABSOLUTE_DATE, {
      type: DataCubeOperationAdvancedValueType.TODAY,
    });
    expect(value.type).toBe(PRIMITIVE_TYPE.STRICTDATE);
    expect(value.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
