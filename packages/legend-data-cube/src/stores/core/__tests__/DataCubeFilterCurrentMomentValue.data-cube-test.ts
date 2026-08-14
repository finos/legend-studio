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
  matchFunctionName,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  DataCubeFunction,
  DataCubeOperationAdvancedValueType,
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
  },
);
