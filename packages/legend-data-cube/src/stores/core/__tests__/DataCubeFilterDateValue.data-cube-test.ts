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
  V1_AppliedFunction,
  V1_CDateTime,
  V1_CStrictDate,
  matchFunctionName,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  DataCubeFunction,
  DataCubeOperationAdvancedValueType,
  getCurrentMomentValueType,
  isDateTimeType,
  _defaultPrimitiveTypeValue,
} from '../DataCubeQueryEngine.js';
import { _value } from '../DataCubeQueryBuilderUtils.js';
import { _operationValue } from '../DataCubeSnapshotBuilderUtils.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import type { DataCubeQueryFilterOperation } from '../filter/DataCubeQueryFilterOperation.js';
import { DataCubeQueryFilterOperation__Equal } from '../filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__NotEqual } from '../filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__GreaterThan } from '../filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from '../filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__LessThan } from '../filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from '../filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';

// [value type, expected pure function, column type the value applies to]
const CURRENT_MOMENT_VALUES: [string, DataCubeFunction, string][] = [
  [
    DataCubeOperationAdvancedValueType.TODAY,
    DataCubeFunction.TODAY,
    PRIMITIVE_TYPE.STRICTDATE,
  ],
  [
    DataCubeOperationAdvancedValueType.NOW,
    DataCubeFunction.NOW,
    PRIMITIVE_TYPE.DATETIME,
  ],
];

// every column type which carries a date, i.e. which a filter can compare
// against a moment - note that `Date` is the super type of both, and that a
// timestamp is spelled 2 ways: the precise primitive and the relational type
const DATE_COLUMN_TYPES = [
  PRIMITIVE_TYPE.DATE,
  PRIMITIVE_TYPE.STRICTDATE,
  PRIMITIVE_TYPE.DATETIME,
  PRECISE_PRIMITIVE_TYPE.STRICTDATE,
  PRECISE_PRIMITIVE_TYPE.DATETIME,
  PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
];

describe(
  unitTest(`Filter value: current-moment functions build to zero-arg calls`),
  () => {
    test.each(CURRENT_MOMENT_VALUES)(
      `%s builds to a zero-arg applied function`,
      (valueType, func) => {
        const expression = _value({ type: valueType });
        expect(expression).toBeInstanceOf(V1_AppliedFunction);
        const appliedFunc = expression as V1_AppliedFunction;
        expect(matchFunctionName(appliedFunc.function, func)).toBe(true);
        expect(appliedFunc.parameters).toHaveLength(0);
      },
    );

    test.each(CURRENT_MOMENT_VALUES)(
      `%s round-trips through the value builder`,
      (valueType) => {
        const columnGetter = (name: string): never => {
          throw new Error(`Unexpected column lookup for '${name}'`);
        };
        const value = _operationValue(
          _value({ type: valueType }),
          columnGetter,
        );
        expect(value.type).toBe(valueType);
        expect(value.value).toBeUndefined();
      },
    );
  },
);

describe(
  unitTest(
    `Filter condition: current-moment functions round-trip per operator`,
  ),
  () => {
    const COLUMN_NAME = 'Dob';
    const operations: [string, DataCubeQueryFilterOperation][] = [
      ['==', new DataCubeQueryFilterOperation__Equal()],
      ['!=', new DataCubeQueryFilterOperation__NotEqual()],
      ['>', new DataCubeQueryFilterOperation__GreaterThan()],
      ['>=', new DataCubeQueryFilterOperation__GreaterThanOrEqual()],
      ['<', new DataCubeQueryFilterOperation__LessThan()],
      ['<=', new DataCubeQueryFilterOperation__LessThanOrEqual()],
    ];

    const cases = operations.flatMap(([label, operation]) =>
      CURRENT_MOMENT_VALUES.map(
        ([valueType, , columnType]): [
          string,
          DataCubeQueryFilterOperation,
          string,
          string,
        ] => [`${label} ${valueType}`, operation, valueType, columnType],
      ),
    );

    test.each(cases)(`%s`, (_label, operation, valueType, columnType) => {
      const column: DataCubeColumn = { name: COLUMN_NAME, type: columnType };
      const columnGetter = (name: string): DataCubeColumn => {
        if (name !== COLUMN_NAME) {
          throw new Error(`Unexpected column lookup for '${name}'`);
        }
        return column;
      };
      const condition = {
        ...column,
        operator: operation.operator,
        value: { type: valueType },
      };

      // snapshot -> expression
      const expression = operation.buildConditionExpression(condition);
      expect(expression).toBeInstanceOf(V1_AppliedFunction);

      // expression -> snapshot
      const roundtrip = operation.buildConditionSnapshot(
        expression as V1_AppliedFunction,
        columnGetter,
      );
      expect(roundtrip).toBeDefined();
      expect(roundtrip?.name).toBe(COLUMN_NAME);
      expect(roundtrip?.operator).toBe(operation.operator);
      expect(roundtrip?.value.type).toBe(valueType);
      expect(roundtrip?.value.value).toBeUndefined();
    });

    test.each(
      operations.flatMap(([label, operation]) =>
        CURRENT_MOMENT_VALUES.map(
          ([valueType]): [string, DataCubeQueryFilterOperation, string] => [
            `${label} ${valueType}`,
            operation,
            valueType,
          ],
        ),
      ),
    )(
      `%s is rejected for columns which carry no date`,
      (_label, operation, valueType) => {
        // a current-moment value can only be compared against a column which
        // carries a date, e.g. `$x.Name == today()` is not supported
        const column: DataCubeColumn = {
          name: COLUMN_NAME,
          type: PRIMITIVE_TYPE.STRING,
        };
        const expression = operation.buildConditionExpression({
          ...column,
          operator: operation.operator,
          value: { type: valueType },
        });
        expect(
          operation.buildConditionSnapshot(
            expression as V1_AppliedFunction,
            () => column,
          ),
        ).toBeUndefined();
      },
    );
  },
);

describe(
  unitTest(`Filter value: current-moment value type of a column`),
  () => {
    test.each([
      [PRIMITIVE_TYPE.DATE, DataCubeOperationAdvancedValueType.TODAY],
      [PRIMITIVE_TYPE.STRICTDATE, DataCubeOperationAdvancedValueType.TODAY],
      [
        PRECISE_PRIMITIVE_TYPE.STRICTDATE,
        DataCubeOperationAdvancedValueType.TODAY,
      ],
      [PRIMITIVE_TYPE.DATETIME, DataCubeOperationAdvancedValueType.NOW],
      [PRECISE_PRIMITIVE_TYPE.DATETIME, DataCubeOperationAdvancedValueType.NOW],
      [
        PRECISE_PRIMITIVE_TYPE.TIMESTAMP,
        DataCubeOperationAdvancedValueType.NOW,
      ],
      // columns which carry no date have no current-moment value
      [PRIMITIVE_TYPE.STRICTTIME, undefined],
      [PRECISE_PRIMITIVE_TYPE.STRICTTIME, undefined],
      [PRIMITIVE_TYPE.STRING, undefined],
      [PRIMITIVE_TYPE.INTEGER, undefined],
    ])(`%s -> %s`, (columnType, valueType) => {
      expect(getCurrentMomentValueType(columnType)).toBe(valueType);
    });
  },
);

describe(
  unitTest(`Filter value: absolute date values build to date literals`),
  () => {
    test.each(DATE_COLUMN_TYPES)(
      `the default value of a %s column builds to the matching date literal`,
      (columnType) => {
        const expression = _value({
          type: columnType,
          value: _defaultPrimitiveTypeValue(columnType),
        });
        expect(expression).toBeInstanceOf(
          isDateTimeType(columnType) ? V1_CDateTime : V1_CStrictDate,
        );
      },
    );

    test.each(DATE_COLUMN_TYPES)(
      `a date-time value of a %s column round-trips as a date-time`,
      (columnType) => {
        const column: DataCubeColumn = {
          name: 'LastUpdated',
          type: columnType,
        };
        const operation = new DataCubeQueryFilterOperation__Equal();
        const expression = operation.buildConditionExpression({
          ...column,
          operator: operation.operator,
          value: {
            type: PRIMITIVE_TYPE.DATETIME,
            value: '2020-06-15T13:45:30',
          },
        });
        const roundtrip = operation.buildConditionSnapshot(
          expression,
          () => column,
        );
        // NOTE: a date literal always reads back as the primitive type it
        // spells, never as the type of the column it is compared against
        expect(roundtrip?.value).toEqual({
          type: PRIMITIVE_TYPE.DATETIME,
          value: '2020-06-15T13:45:30',
        });
      },
    );
  },
);
