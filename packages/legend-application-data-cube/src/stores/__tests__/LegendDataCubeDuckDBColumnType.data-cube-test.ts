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
  V1_Other,
  V1_SemiStructured,
  V1_SmallInt,
  V1_Timestamp,
  V1_TinyInt,
  V1_VarBinary,
  V1_VarChar,
} from '@finos/legend-graph';
import { TimeUnit } from 'apache-arrow';
import {
  getCacheColumnType,
  getDuckDBBlobCsvValue,
  getHexFromDuckDBBlob,
  getNumberFromDuckDBDecimal,
  getTimeStringFromDuckDBTime,
  getRelationalDataTypeFromDuckDBType,
} from '../LegendDataCubeDuckDBColumnType.js';

describe(unitTest('DuckDB column type to relational data type'), () => {
  test.each([
    ['BIT', V1_Bit],
    ['BOOLEAN', V1_Bit],
    ['DATE', V1_Date],
    ['TIME', V1_Other],
    ['BLOB', V1_VarBinary],
    ['DOUBLE', V1_Double],
    ['FLOAT', V1_Float],
    ['INTEGER', V1_Integer],
    ['TINYINT', V1_TinyInt],
    ['UTINYINT', V1_SmallInt],
    ['SMALLINT', V1_SmallInt],
    ['USMALLINT', V1_Integer],
    ['UINTEGER', V1_BigInt],
    ['BIGINT', V1_BigInt],
    ['TIMESTAMP', V1_Timestamp],
    ['TIMESTAMP_MS', V1_Timestamp],
    ['TIMESTAMP WITH TIME ZONE', V1_Timestamp],
    ['VARCHAR', V1_VarChar],
  ])('maps DuckDB type %s', (duckDBType, expectedDataType) => {
    expect(getRelationalDataTypeFromDuckDBType(duckDBType)).toBeInstanceOf(
      expectedDataType,
    );
  });

  test('keeps the precision and scale of a DuckDB decimal type', () => {
    const dataType = getRelationalDataTypeFromDuckDBType('DECIMAL(18,4)');
    expect(dataType).toBeInstanceOf(V1_Decimal);
    expect((dataType as V1_Decimal).precision).toBe(18);
    expect((dataType as V1_Decimal).scale).toBe(4);
  });

  test('specifies the size of a varchar', () => {
    expect(
      (getRelationalDataTypeFromDuckDBType('VARCHAR') as V1_VarChar).size,
    ).toBe(16777216);
  });

  test('maps UBIGINT to a decimal which holds its range', () => {
    const dataType = getRelationalDataTypeFromDuckDBType('UBIGINT');
    expect(dataType).toBeInstanceOf(V1_Decimal);
    expect((dataType as V1_Decimal).precision).toBe(20);
    expect((dataType as V1_Decimal).scale).toBe(0);
  });

  test.each([
    'HUGEINT', // exceeds the max precision of DECIMAL
    'UUID',
    'DECIMAL',
    'DECIMAL(40,2)',
  ])(
    'rejects DuckDB type %s which has no relational equivalent',
    (duckDBType) => {
      expect(() => getRelationalDataTypeFromDuckDBType(duckDBType)).toThrow(
        `failed to find matching relational data type for DuckDB type '${duckDBType}'`,
      );
    },
  );
});

describe(unitTest('Pure type to cache column type'), () => {
  test.each([
    [PRECISE_PRIMITIVE_TYPE.TINY_INT, 'TINYINT', V1_TinyInt],
    [PRECISE_PRIMITIVE_TYPE.U_TINY_INT, 'UTINYINT', V1_SmallInt],
    [PRECISE_PRIMITIVE_TYPE.SMALL_INT, 'SMALLINT', V1_SmallInt],
    [PRECISE_PRIMITIVE_TYPE.U_SMALL_INT, 'USMALLINT', V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.INT, 'INTEGER', V1_Integer],
    [PRECISE_PRIMITIVE_TYPE.U_INT, 'UINTEGER', V1_BigInt],
    [PRECISE_PRIMITIVE_TYPE.BIG_INT, 'BIGINT', V1_BigInt],
    [PRECISE_PRIMITIVE_TYPE.U_BIG_INT, 'UBIGINT', V1_Decimal],
    [PRIMITIVE_TYPE.INTEGER, 'BIGINT', V1_BigInt],
    [PRECISE_PRIMITIVE_TYPE.FLOAT, 'FLOAT', V1_Float],
    [PRECISE_PRIMITIVE_TYPE.DOUBLE, 'DOUBLE', V1_Double],
    [PRIMITIVE_TYPE.FLOAT, 'DOUBLE', V1_Double],
    // NOTE: DuckDB defaults a DECIMAL to (18,3) which would truncate, so we use its widest decimal
    [PRIMITIVE_TYPE.DECIMAL, 'DECIMAL(38,18)', V1_Decimal],
    [PRIMITIVE_TYPE.NUMBER, 'DOUBLE', V1_Double],
    // size unknown, e.g. the result of a set operation over columns of different sizes
    [PRECISE_PRIMITIVE_TYPE.NUMERIC, 'DECIMAL(38,18)', V1_Decimal],
    [PRECISE_PRIMITIVE_TYPE.VARCHAR, 'VARCHAR', V1_VarChar],
    [PRIMITIVE_TYPE.STRING, 'VARCHAR', V1_VarChar],
    [PRECISE_PRIMITIVE_TYPE.DATETIME, 'TIMESTAMP', V1_Timestamp],
    [PRIMITIVE_TYPE.DATETIME, 'TIMESTAMP', V1_Timestamp],
    // legacy relational timestamp type
    [PRECISE_PRIMITIVE_TYPE.TIMESTAMP, 'TIMESTAMP', V1_Timestamp],
    [PRIMITIVE_TYPE.STRICTDATE, 'DATE', V1_Date],
    // NOTE: `Date` can carry a time of day, which a DuckDB `DATE` would drop
    [PRIMITIVE_TYPE.DATE, 'TIMESTAMP', V1_Timestamp],
    [PRIMITIVE_TYPE.STRICTTIME, 'TIME', V1_Other],
    [PRIMITIVE_TYPE.BYTE, 'BLOB', V1_VarBinary],
    [CORE_PURE_PATH.NIL, 'VARCHAR', V1_VarChar],
    [PRIMITIVE_TYPE.BOOLEAN, 'BOOLEAN', V1_Bit],
    [CORE_PURE_PATH.VARIANT, 'JSON', V1_SemiStructured],
  ])('maps Pure type %s', (type, duckDBType, relationalType) => {
    const columnType = getCacheColumnType({ type });
    expect(columnType.duckDBType).toBe(duckDBType);
    expect(columnType.relationalType).toBeInstanceOf(relationalType);
  });

  test('keeps the precision and scale of a Numeric column', () => {
    const columnType = getCacheColumnType({
      type: PRECISE_PRIMITIVE_TYPE.NUMERIC,
      typeVariableValues: [18, 4],
    });
    // NOTE: stored with the max precision so values wider than declared still fit
    expect(columnType.duckDBType).toBe('DECIMAL(38,4)');
    expect(columnType.relationalType).toBeInstanceOf(V1_Decimal);
    expect((columnType.relationalType as V1_Decimal).precision).toBe(18);
    expect((columnType.relationalType as V1_Decimal).scale).toBe(4);
  });

  test('falls back to DOUBLE for a Numeric column DuckDB cannot hold', () => {
    expect(
      getCacheColumnType({
        type: PRECISE_PRIMITIVE_TYPE.NUMERIC,
        typeVariableValues: [40, 2],
      }).duckDBType,
    ).toBe('DOUBLE');
  });

  test('keeps the size of a Varchar column', () => {
    expect(
      (
        getCacheColumnType({
          type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
          typeVariableValues: [200],
        }).relationalType as V1_VarChar
      ).size,
    ).toBe(200);
  });

  test.each([
    PRIMITIVE_TYPE.BINARY, // not a type the engine reports, binary columns are `Byte`
    CORE_PURE_PATH.ANY,
    'my::model::Status', // an enumeration (or class) can't be told apart by its path
  ])('rejects Pure type %s which has no DuckDB equivalent', (type) => {
    expect(() => getCacheColumnType({ type })).toThrow(
      `failed to find matching DuckDB type for Pure type '${type}'`,
    );
  });
});

describe(unitTest('DuckDB binary and time values'), () => {
  test('converts a hex string to the escaped form DuckDB decodes into a BLOB', () => {
    expect(getDuckDBBlobCsvValue('deadbeef')).toBe('\\xde\\xad\\xbe\\xef');
    expect(getDuckDBBlobCsvValue('')).toBe('');
    expect(() => getDuckDBBlobCsvValue('xyz')).toThrow(
      `expected a hex string but got 'xyz'`,
    );
    expect(() => getDuckDBBlobCsvValue('abc')).toThrow(
      `expected a hex string but got 'abc'`,
    );
  });

  test('converts the bytes of a BLOB to a lowercase hex string', () => {
    expect(getHexFromDuckDBBlob(new Uint8Array([222, 173, 0, 1]))).toBe(
      'dead0001',
    );
  });

  test.each([
    [0n, TimeUnit.MICROSECOND, '00:00:00'],
    // as returned by DuckDB for TIME '12:30:45.123'
    [45045123000n, TimeUnit.MICROSECOND, '12:30:45.123'],
    [45045000000n, TimeUnit.MICROSECOND, '12:30:45'],
    [86399999999n, TimeUnit.MICROSECOND, '23:59:59.999999'],
    [45045, TimeUnit.SECOND, '12:30:45'],
    [45045123, TimeUnit.MILLISECOND, '12:30:45.123'],
    [45045123000000n, TimeUnit.NANOSECOND, '12:30:45.123'],
  ])('converts DuckDB time %s (%s) to %s', (value, unit, expected) => {
    expect(getTimeStringFromDuckDBTime(value, unit)).toBe(expected);
  });
});

describe(unitTest('DuckDB decimal value to number'), () => {
  // NOTE: DuckDB returns decimal values as Arrow big numbers whose string
  // representation is the unscaled value, e.g. 1.2345 is 12345 for DECIMAL(18,4)
  test.each([
    ['12345', 4, 1.2345],
    ['-12345', 4, -1.2345],
    ['5', 4, 0.0005],
    ['-5', 4, -0.0005],
    ['1', 0, 1],
    // values whose unscaled value is not a safe integer
    ['123456789012345678901', 4, 12345678901234567.8901],
    [
      '170141183460469231731687303715884105727',
      0,
      170141183460469231731687303715884105727,
    ],
  ])('converts unscaled value %s with scale %s', (digits, scale, expected) => {
    expect(getNumberFromDuckDBDecimal({ toString: () => digits }, scale)).toBe(
      expected,
    );
  });
});
