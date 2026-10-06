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
  CORE_PURE_PATH,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  V1_BigInt,
  V1_Bit,
  V1_Date,
  V1_Decimal,
  V1_Double,
  V1_Float,
  V1_Integer,
  V1_Numeric,
  V1_SmallInt,
  V1_Timestamp,
  V1_TinyInt,
  V1_VarChar,
} from '@finos/legend-graph';
import {
  getRelationalDataTypeFromCachedPureType,
  getRelationalDataTypeFromDuckDBType,
} from '../LegendDataCubeDuckDBColumnType.js';

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

  test.each([
    // DuckDB reports a decimal column with its width and scale
    ['DECIMAL(18,3)', 18, 3],
    ['DECIMAL(10,2)', 10, 2],
    ['DECIMAL(38, 10)', 38, 10],
    ['DECIMAL(4)', 4, 0],
    // a bare DECIMAL is DECIMAL(18,3) in DuckDB
    ['DECIMAL', 18, 3],
  ])(
    'maps DuckDB type %s to a decimal with its precision and scale',
    (duckDBType, precision, scale) => {
      const dataType = getRelationalDataTypeFromDuckDBType(duckDBType);
      expect(dataType).toBeInstanceOf(V1_Decimal);
      expect(dataType).toEqual(
        expect.objectContaining({ precision, scale }) as unknown,
      );
    },
  );

  test('maps a sized DuckDB VARCHAR to a varchar with its size', () => {
    const dataType = getRelationalDataTypeFromDuckDBType('VARCHAR(20)');
    expect(dataType).toBeInstanceOf(V1_VarChar);
    expect((dataType as V1_VarChar).size).toBe(20);
  });

  test('maps an unsized DuckDB VARCHAR to a varchar with no size', () => {
    const dataType = getRelationalDataTypeFromDuckDBType('VARCHAR');
    expect(dataType).toBeInstanceOf(V1_VarChar);
    expect((dataType as V1_VarChar).size).toBeUndefined();
  });

  test.each(['HUGEINT', 'TIME', 'TIMESTAMP WITH TIME ZONE', 'INTEGER(4)'])(
    'rejects DuckDB type %s which has no relational equivalent',
    (duckDBType) => {
      expect(() => getRelationalDataTypeFromDuckDBType(duckDBType)).toThrow(
        `failed to find matching relational data type for DuckDB type '${duckDBType}'`,
      );
    },
  );
});

describe(unitTest('Cached Pure type to relational data type'), () => {
  test.each([
    [PRIMITIVE_TYPE.BINARY, V1_Bit],
    [PRIMITIVE_TYPE.BOOLEAN, V1_Bit],
    [PRECISE_PRIMITIVE_TYPE.INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.TINY_INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.U_TINY_INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.SMALL_INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.U_SMALL_INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.U_INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.BIG_INT, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.U_BIG_INT, V1_Integer],
    [PRIMITIVE_TYPE.INTEGER, V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.FLOAT, V1_Float],
    [PRECISE_PRIMITIVE_TYPE.DOUBLE, V1_Float],
    [PRIMITIVE_TYPE.NUMBER, V1_Float],
    [PRIMITIVE_TYPE.FLOAT, V1_Float],
    [PRECISE_PRIMITIVE_TYPE.DECIMAL, V1_Decimal],
    [PRIMITIVE_TYPE.DECIMAL, V1_Decimal],
    [PRECISE_PRIMITIVE_TYPE.NUMERIC, V1_Numeric],
    [PRIMITIVE_TYPE.DATE, V1_Date],
    [PRIMITIVE_TYPE.STRICTDATE, V1_Date],
    [PRECISE_PRIMITIVE_TYPE.STRICTDATE, V1_Date],
    [PRECISE_PRIMITIVE_TYPE.STRICTTIME, V1_Date],
    [PRECISE_PRIMITIVE_TYPE.TIMESTAMP, V1_Timestamp],
    [PRECISE_PRIMITIVE_TYPE.DATETIME, V1_Timestamp],
    [PRIMITIVE_TYPE.DATETIME, V1_Timestamp],
    [PRECISE_PRIMITIVE_TYPE.VARCHAR, V1_VarChar],
    [CORE_PURE_PATH.VARIANT, V1_VarChar],
    [PRIMITIVE_TYPE.STRING, V1_VarChar],
  ])('maps Pure type %s', (pureType, expectedDataType) => {
    expect(getRelationalDataTypeFromCachedPureType(pureType)).toBeInstanceOf(
      expectedDataType,
    );
  });

  test.each([PRECISE_PRIMITIVE_TYPE.DECIMAL, PRIMITIVE_TYPE.DECIMAL])(
    'maps Pure type %s to the decimal the cache table stores it as',
    (pureType) => {
      // the cache table stores a decimal as a bare DuckDB DECIMAL, i.e. DECIMAL(18,3)
      expect(getRelationalDataTypeFromCachedPureType(pureType)).toEqual(
        expect.objectContaining({ precision: 18, scale: 3 }) as unknown,
      );
    },
  );

  test('maps a numeric to a numeric with no precision and scale', () => {
    // the engine reports a result's precise types without their parameters
    const dataType = getRelationalDataTypeFromCachedPureType(
      PRECISE_PRIMITIVE_TYPE.NUMERIC,
    ) as V1_Numeric;
    expect(dataType.precision).toBeUndefined();
    expect(dataType.scale).toBeUndefined();
  });

  test.each([PRIMITIVE_TYPE.STRICTTIME, 'my::Class', undefined])(
    'rejects Pure type %s which has no relational equivalent',
    (pureType) => {
      expect(() => getRelationalDataTypeFromCachedPureType(pureType)).toThrow(
        `failed to find matching relational data type for Pure type '${pureType}'`,
      );
    },
  );
});
