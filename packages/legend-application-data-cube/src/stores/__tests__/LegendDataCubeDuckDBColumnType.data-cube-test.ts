/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  V1_BigInt,
  V1_Bit,
  V1_Date,
  V1_Decimal,
  V1_Double,
  V1_Float,
  V1_Integer,
  V1_SmallInt,
  V1_Timestamp,
  V1_TinyInt,
  V1_VarChar,
} from '@finos/legend-graph';
import { getRelationalDataTypeFromDuckDBType } from '../LegendDataCubeDuckDBColumnType.js';

describe(unitTest('DuckDB column type to relational data type'), () => {
  test.each([
    ['BIT', V1_Bit],
    ['BOOLEAN', V1_VarChar],
    ['DATE', V1_Date],
    ['DECIMAL', V1_Decimal],
    ['DOUBLE', V1_Double],
    ['FLOAT', V1_Float],
    ['INTEGER', V1_Integer],
    ['TINYINT', V1_TinyInt],
    ['SMALLINT', V1_SmallInt],
    ['BIGINT', V1_BigInt],
    ['TIMESTAMP', V1_Timestamp],
    ['VARCHAR', V1_VarChar],
  ])('maps DuckDB type %s', (duckDBType, expectedDataType) => {
    expect(getRelationalDataTypeFromDuckDBType(duckDBType)).toBeInstanceOf(
      expectedDataType,
    );
  });

  test('rejects a DuckDB type with no relational equivalent', () => {
    expect(() => getRelationalDataTypeFromDuckDBType('HUGEINT')).toThrow(
      "failed to find matching relational data type for DuckDB type 'HUGEINT'",
    );
  });
});
