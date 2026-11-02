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

import {
  type V1_Column,
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
import { UnsupportedOperationError } from '@finos/legend-shared';
import { TimeUnit } from 'apache-arrow';
import {
  DEFAULT_VARCHAR_SIZE,
  resolveLegacyColumnType,
} from '@finos/legend-data-cube';

/**
 * NOTE: the mappings below have been checked against the DuckDB bundled with DuckDB-WASM
 * (DuckDB v1.4.0 with @duckdb/duckdb-wasm v1.31.0), loading CSV data the same way the cache does:
 * - DESCRIBE reports the canonical type names (e.g. `INT` -> `INTEGER`, `NUMERIC(10,2)` -> `DECIMAL(10,2)`)
 * - VARCHAR(n) is accepted but its length is ignored (DESCRIBE reports `VARCHAR`)
 * - DECIMAL without precision and scale defaults to DECIMAL(18,3), and the width of a decimal is at most 38
 * - a value which does not fit the declared DECIMAL(p,s) or integer type fails the whole insert
 *   (extra decimals beyond the scale are rounded instead)
 * - a VARCHAR can't be summed, averaged or compared with a number without an explicit cast
 * - a hex string loaded into a BLOB is kept as its ASCII text, only `\xHH` escapes are decoded
 * - DATE and TIMESTAMP columns fail to load year-only (`2020`) and year-month (`2020-05`) values
 *   and DATE drops the time of day
 * - BIT is a bit string (returned as binary), not a boolean
 *
 * See https://duckdb.org/docs/stable/sql/data_types/overview
 */

// See https://duckdb.org/docs/stable/sql/data_types/numeric#fixed-point-decimals
const DUCKDB_MAX_DECIMAL_PRECISION = 38;
// NOTE: the number of digits of the max value of UBIGINT (2^64 - 1)
const UBIGINT_DECIMAL_PRECISION = 20;
// NOTE: used for decimals of unknown precision and scale, as it holds the most digits
// of both the integer and fraction parts of the widest decimal DuckDB allows
const DEFAULT_DECIMAL_PRECISION = 38;
const DEFAULT_DECIMAL_SCALE = 18;

const _varchar = (size?: number | undefined): V1_VarChar => {
  const dataType = new V1_VarChar();
  dataType.size = size ?? DEFAULT_VARCHAR_SIZE;
  return dataType;
};

const _varbinary = (): V1_VarBinary => {
  const dataType = new V1_VarBinary();
  dataType.size = DEFAULT_VARCHAR_SIZE;
  return dataType;
};

const _decimal = (precision: number, scale: number): V1_Decimal => {
  const dataType = new V1_Decimal();
  dataType.precision = precision;
  dataType.scale = scale;
  return dataType;
};

const _defaultDecimal = (): LegendDataCubeCacheColumnType => ({
  duckDBType: `DECIMAL(${DEFAULT_DECIMAL_PRECISION},${DEFAULT_DECIMAL_SCALE})`,
  relationalType: _decimal(DEFAULT_DECIMAL_PRECISION, DEFAULT_DECIMAL_SCALE),
});

const _isValidDecimal = (precision: number, scale: number): boolean =>
  Number.isInteger(precision) &&
  Number.isInteger(scale) &&
  precision >= 1 &&
  precision <= DUCKDB_MAX_DECIMAL_PRECISION &&
  scale >= 0 &&
  scale <= precision;

/**
 * Maps a DuckDB column type name (as reported by the DuckDB catalog) to the
 * relational data type used when synthesizing a table definition for it.
 * The engine then reports the precise primitive matching this relational data type
 * (e.g. `INTEGER` -> `Int`, `DECIMAL(18,4)` -> `Numeric(18,4)`).
 *
 * See https://duckdb.org/docs/sql/data_types/overview.html
 */
export const getRelationalDataTypeFromDuckDBType = (
  duckDBType: string,
): V1_Column['type'] => {
  const decimalMatch = duckDBType.match(
    /^(?:DECIMAL|NUMERIC)\(\s*(?<precision>\d+)\s*,\s*(?<scale>\d+)\s*\)$/u,
  );
  if (decimalMatch?.groups) {
    const precision = Number(decimalMatch.groups.precision);
    const scale = Number(decimalMatch.groups.scale);
    if (_isValidDecimal(precision, scale)) {
      return _decimal(precision, scale);
    }
  }
  switch (duckDBType) {
    // NOTE: relational data types have no boolean type, `BIT` is used for boolean columns
    case 'BOOLEAN':
      return new V1_Bit();
    // NOTE: DuckDB's `BIT` is an arbitrary-length bit string, not a boolean, so mapping it to
    // the relational `BIT` type here is not fully accurate (it can't carry more than one bit),
    // but it is the closest relational data type available and preserves the ability to ingest
    // columns of this (rare) type rather than failing outright
    case 'BIT':
      return new V1_Bit();
    case 'DATE':
      return new V1_Date();
    // NOTE: no relational data type maps to `StrictTime`, so a time is typed as a string
    case 'TIME':
      return new V1_Other();
    case 'BLOB':
      return _varbinary();
    case 'DOUBLE':
      return new V1_Double();
    case 'FLOAT':
      return new V1_Float();
    case 'TINYINT':
      return new V1_TinyInt();
    case 'UTINYINT':
    case 'SMALLINT':
      return new V1_SmallInt();
    case 'USMALLINT':
    case 'INTEGER':
      return new V1_Integer();
    case 'UINTEGER':
    case 'BIGINT':
      return new V1_BigInt();
    case 'UBIGINT':
      // NOTE: no relational integer type can hold the range of UBIGINT
      return _decimal(UBIGINT_DECIMAL_PRECISION, 0);
    case 'TIMESTAMP':
    case 'TIMESTAMP_S':
    case 'TIMESTAMP_MS':
    case 'TIMESTAMP_NS':
    case 'TIMESTAMP WITH TIME ZONE':
      return new V1_Timestamp();
    case 'VARCHAR':
      return _varchar();
    // NOTE: unsupported types include HUGEINT/UHUGEINT (which exceed the max precision of DECIMAL),
    // UUID, INTERVAL, and nested types
    default:
      throw new UnsupportedOperationError(
        `Can't ingest local file data: failed to find matching relational data type for DuckDB type '${duckDBType}' when synthesizing table definition`,
      );
  }
};

export type LegendDataCubeCacheColumnType = {
  /**
   * The DuckDB type used to create the cache table column
   */
  duckDBType: string;
  /**
   * The relational data type used to synthesize the table definition of the cache table,
   * chosen so the engine reports the same (precise) type for the column where possible.
   */
  relationalType: V1_Column['type'];
};

/**
 * Maps the (precise) Pure type of a column to the types used to cache it in DuckDB.
 *
 * NOTE: both the DuckDB table and the synthesized table definition are built from this
 * mapping so the two never disagree. Unsigned integer types and core primitives have
 * no relational data type which maps back to them, so the engine will report the closest
 * precise primitive for them once cached (e.g. `UInt` -> `BigInt`, `UBigInt` -> `Numeric(20,0)`,
 * `Integer` -> `BigInt`). Likewise `StrictTime` is cached as a DuckDB `TIME` but the engine
 * can only report the relational `Other` as a `String`.
 *
 * NOTE: types which are not supported (e.g. enumerations, which can't be told apart from other
 * types by their path alone, and classes) are rejected rather than guessed.
 */
export const getCacheColumnType = (column: {
  type: string;
  typeVariableValues?: readonly number[] | undefined;
}): LegendDataCubeCacheColumnType => {
  // NOTE: resolve legacy types, e.g. the relational `Timestamp` some code paths report
  switch (resolveLegacyColumnType(column.type)) {
    case PRECISE_PRIMITIVE_TYPE.TINY_INT:
      return { duckDBType: 'TINYINT', relationalType: new V1_TinyInt() };
    case PRECISE_PRIMITIVE_TYPE.U_TINY_INT:
      return { duckDBType: 'UTINYINT', relationalType: new V1_SmallInt() };
    case PRECISE_PRIMITIVE_TYPE.SMALL_INT:
      return { duckDBType: 'SMALLINT', relationalType: new V1_SmallInt() };
    case PRECISE_PRIMITIVE_TYPE.U_SMALL_INT:
      return { duckDBType: 'USMALLINT', relationalType: new V1_Integer() };
    case PRECISE_PRIMITIVE_TYPE.INT:
      return { duckDBType: 'INTEGER', relationalType: new V1_Integer() };
    case PRECISE_PRIMITIVE_TYPE.U_INT:
      return { duckDBType: 'UINTEGER', relationalType: new V1_BigInt() };
    case PRECISE_PRIMITIVE_TYPE.BIG_INT:
    case PRIMITIVE_TYPE.INTEGER: // Pure Integer is 64-bit
      return { duckDBType: 'BIGINT', relationalType: new V1_BigInt() };
    case PRECISE_PRIMITIVE_TYPE.U_BIG_INT:
      // NOTE: no relational integer type can hold the range of UBIGINT
      return {
        duckDBType: 'UBIGINT',
        relationalType: _decimal(UBIGINT_DECIMAL_PRECISION, 0),
      };
    case PRECISE_PRIMITIVE_TYPE.FLOAT: // Float4
      return { duckDBType: 'FLOAT', relationalType: new V1_Float() };
    case PRECISE_PRIMITIVE_TYPE.DOUBLE:
    case PRIMITIVE_TYPE.FLOAT: // Pure Float is double precision
      return { duckDBType: 'DOUBLE', relationalType: new V1_Double() };
    case PRECISE_PRIMITIVE_TYPE.NUMERIC: {
      const [precision, scale] = column.typeVariableValues ?? [];
      if (precision === undefined && scale === undefined) {
        // NOTE: the size is unknown (e.g. the result of a set operation over columns of
        // different sizes), and DuckDB would default to DECIMAL(18,3) and truncate values
        return _defaultDecimal();
      }
      if (
        precision !== undefined &&
        scale !== undefined &&
        _isValidDecimal(precision, scale)
      ) {
        // NOTE: the declared precision comes from the store definition (or from columns
        // saved with the DataCube), which may be narrower than the actual data, and DuckDB
        // fails the insert of any value which does not fit, so we store with the max
        // precision while reporting the declared type
        return {
          duckDBType: `DECIMAL(${DUCKDB_MAX_DECIMAL_PRECISION},${scale})`,
          relationalType: _decimal(precision, scale),
        };
      }
      // NOTE: a precision beyond what DECIMAL allows (38) can't be stored as such. VARCHAR would
      // keep every digit but can't be aggregated or compared, so we use DOUBLE instead
      return { duckDBType: 'DOUBLE', relationalType: new V1_Double() };
    }
    case PRIMITIVE_TYPE.DECIMAL:
      return _defaultDecimal();
    case PRIMITIVE_TYPE.NUMBER:
      return { duckDBType: 'DOUBLE', relationalType: new V1_Double() };
    case PRECISE_PRIMITIVE_TYPE.VARCHAR:
      return {
        duckDBType: 'VARCHAR',
        relationalType: _varchar(column.typeVariableValues?.[0]),
      };
    case PRIMITIVE_TYPE.STRING:
      return { duckDBType: 'VARCHAR', relationalType: _varchar() };
    case PRECISE_PRIMITIVE_TYPE.DATETIME: // Timestamp
    case PRIMITIVE_TYPE.DATETIME:
      return { duckDBType: 'TIMESTAMP', relationalType: new V1_Timestamp() };
    case PRIMITIVE_TYPE.STRICTDATE:
      return { duckDBType: 'DATE', relationalType: new V1_Date() };
    case PRIMITIVE_TYPE.DATE:
      // NOTE: `Date` can carry a time of day, which a DuckDB `DATE` would drop
      return { duckDBType: 'TIMESTAMP', relationalType: new V1_Timestamp() };
    case PRIMITIVE_TYPE.STRICTTIME:
      return { duckDBType: 'TIME', relationalType: new V1_Other() };
    case PRIMITIVE_TYPE.BYTE:
      return { duckDBType: 'BLOB', relationalType: _varbinary() };
    case CORE_PURE_PATH.NIL: // a placeholder column, every value is null
      return { duckDBType: 'VARCHAR', relationalType: _varchar() };
    case PRIMITIVE_TYPE.BOOLEAN:
      return { duckDBType: 'BOOLEAN', relationalType: new V1_Bit() };
    case CORE_PURE_PATH.VARIANT:
      return { duckDBType: 'JSON', relationalType: new V1_SemiStructured() };
    default:
      throw new UnsupportedOperationError(
        `Can't initialize cache: failed to find matching DuckDB type for Pure type '${column.type}'`,
      );
  }
};

/**
 * Converts a DuckDB decimal value (returned as an Arrow big number) to a number.
 *
 * NOTE: decimal values are stored unscaled, e.g. 1.2345 is stored as 12345 for DECIMAL(18,4),
 * and converting them with `valueOf()` throws when the unscaled value is not a safe integer
 * (e.g. large sums), so convert them from their exact string representation instead.
 */
export const getNumberFromDuckDBDecimal = (
  value: { toString(): string },
  scale: number,
): number => {
  const digits = value.toString();
  if (!scale) {
    return Number(digits);
  }
  const isNegative = digits.startsWith('-');
  const absDigits = (isNegative ? digits.slice(1) : digits).padStart(
    scale + 1,
    '0',
  );
  return Number(
    `${isNegative ? '-' : ''}${absDigits.slice(0, -scale)}.${absDigits.slice(-scale)}`,
  );
};

/**
 * Converts the hex string the engine returns for a `Byte` value to the form DuckDB
 * decodes into the bytes of a BLOB when loading CSV data (`\xHH` for each byte), since a
 * plain hex string would be kept as its ASCII text.
 */
export const getDuckDBBlobCsvValue = (hex: string): string => {
  if (!/^(?:[0-9a-fA-F]{2})*$/u.test(hex)) {
    throw new UnsupportedOperationError(
      `Can't cache binary value: expected a hex string but got '${hex}'`,
    );
  }
  return hex.replace(/[0-9a-fA-F]{2}/gu, (byte) => `\\x${byte}`);
};

/**
 * Converts the bytes of a DuckDB BLOB to the (lowercase) hex string the engine uses for `Byte` values.
 */
export const getHexFromDuckDBBlob = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Converts a DuckDB `TIME` value (returned as the number of time units since midnight)
 * to the `HH:mm:ss[.fraction]` string used for `StrictTime` values.
 */
export const getTimeStringFromDuckDBTime = (
  value: bigint | number,
  unit: TimeUnit,
): string => {
  const micros = ((): bigint => {
    const raw = BigInt(value);
    switch (unit) {
      case TimeUnit.SECOND:
        return raw * 1_000_000n;
      case TimeUnit.MILLISECOND:
        return raw * 1_000n;
      case TimeUnit.NANOSECOND:
        return raw / 1_000n;
      default:
        return raw;
    }
  })();
  const pad = (num: bigint, length = 2) => num.toString().padStart(length, '0');
  const hours = micros / 3_600_000_000n;
  const minutes = (micros / 60_000_000n) % 60n;
  const seconds = (micros / 1_000_000n) % 60n;
  const fraction = pad(micros % 1_000_000n, 6).replace(/0+$/u, '');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${fraction ? `.${fraction}` : ''}`;
};
