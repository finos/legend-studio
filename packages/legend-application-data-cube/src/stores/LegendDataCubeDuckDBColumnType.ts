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
  type V1_RelationalDataType,
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
import { UnsupportedOperationError } from '@finos/legend-shared';

// NOTE: DuckDB reads a bare `DECIMAL` as `DECIMAL(18,3)`
// See https://duckdb.org/docs/sql/data_types/numeric.html#fixed-point-decimals
const DUCKDB_DEFAULT_DECIMAL_PRECISION = 18;
const DUCKDB_DEFAULT_DECIMAL_SCALE = 3;

// DuckDB reports a decimal column with its width and scale, e.g. `DECIMAL(18,3)`
const DUCKDB_DECIMAL_TYPE_PATTERN =
  /^DECIMAL\((?<precision>\d+)(?:,\s*(?<scale>\d+))?\)$/u;
// NOTE: DuckDB ignores a VARCHAR length and reports a bare `VARCHAR`, so this
// only matches if some other producer of the catalog reports one
const DUCKDB_VARCHAR_TYPE_PATTERN = /^VARCHAR\((?<size>\d+)\)$/u;

const buildDecimalDataType = (precision: number, scale: number): V1_Decimal => {
  const dataType = new V1_Decimal();
  dataType.precision = precision;
  dataType.scale = scale;
  return dataType;
};

/**
 * Maps a DuckDB column type (as reported by the DuckDB catalog, e.g. `DESCRIBE`)
 * to the relational data type used when synthesizing a table definition for it.
 *
 * See https://duckdb.org/docs/sql/data_types/overview.html
 */
export const getRelationalDataTypeFromDuckDBType = (
  duckDBType: string,
): V1_RelationalDataType => {
  const decimalMatch = DUCKDB_DECIMAL_TYPE_PATTERN.exec(duckDBType)?.groups;
  if (decimalMatch) {
    // NOTE: a decimal with no scale has scale 0
    return buildDecimalDataType(
      Number(decimalMatch.precision),
      Number(decimalMatch.scale ?? 0),
    );
  }
  const varcharMatch = DUCKDB_VARCHAR_TYPE_PATTERN.exec(duckDBType)?.groups;
  if (varcharMatch) {
    const dataType = new V1_VarChar();
    dataType.size = Number(varcharMatch.size);
    return dataType;
  }
  switch (duckDBType) {
    case 'BIT':
      return new V1_Bit();
    case 'BOOLEAN':
      // TODO: understand why boolean is not present in relationalDataType
      return new V1_VarChar();
    case 'DATE':
      return new V1_Date();
    case 'DECIMAL':
      return buildDecimalDataType(
        DUCKDB_DEFAULT_DECIMAL_PRECISION,
        DUCKDB_DEFAULT_DECIMAL_SCALE,
      );
    case 'DOUBLE':
      return new V1_Double();
    case 'FLOAT':
      return new V1_Float();
    case 'INTEGER':
      return new V1_Integer();
    case 'TINYINT':
      return new V1_TinyInt();
    case 'SMALLINT':
      return new V1_SmallInt();
    case 'BIGINT':
      return new V1_BigInt();
    case 'TIMESTAMP':
      return new V1_Timestamp();
    case 'VARCHAR':
      return new V1_VarChar();
    default:
      throw new UnsupportedOperationError(
        `Can't ingest local file data: failed to find matching relational data type for DuckDB type '${duckDBType}' when synthesizing table definition`,
      );
  }
};

/**
 * Maps the Pure type of a column of a cached result to the relational data type
 * used when synthesizing the definition of the DuckDB table that caches it.
 *
 * NOTE: this must agree with the DuckDB column types the cache table is created
 * with (see `LegendDataCubeDuckDBEngine.cache()`), e.g. a decimal column is
 * created as a bare `DECIMAL`, i.e. `DECIMAL(18,3)`. The engine reports the
 * precise types of a result without their parameters (e.g. a `Numeric(10,2)`
 * column comes back as `meta::pure::precisePrimitives::Numeric`), so those are
 * only set where the cache table fixes them.
 */
export const getRelationalDataTypeFromCachedPureType = (
  pureType: string | undefined,
): V1_RelationalDataType => {
  switch (pureType) {
    case PRIMITIVE_TYPE.BINARY:
    case PRIMITIVE_TYPE.BOOLEAN:
      return new V1_Bit();
    case PRECISE_PRIMITIVE_TYPE.INT:
    case PRECISE_PRIMITIVE_TYPE.TINY_INT:
    case PRECISE_PRIMITIVE_TYPE.U_TINY_INT:
    case PRECISE_PRIMITIVE_TYPE.SMALL_INT:
    case PRECISE_PRIMITIVE_TYPE.U_SMALL_INT:
    case PRECISE_PRIMITIVE_TYPE.U_INT:
    case PRECISE_PRIMITIVE_TYPE.BIG_INT:
    case PRECISE_PRIMITIVE_TYPE.U_BIG_INT:
    case PRIMITIVE_TYPE.INTEGER:
      return new V1_Integer();
    case PRECISE_PRIMITIVE_TYPE.FLOAT:
    case PRECISE_PRIMITIVE_TYPE.DOUBLE:
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.FLOAT:
      return new V1_Float();
    case PRECISE_PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.DECIMAL:
      return buildDecimalDataType(
        DUCKDB_DEFAULT_DECIMAL_PRECISION,
        DUCKDB_DEFAULT_DECIMAL_SCALE,
      );
    case PRECISE_PRIMITIVE_TYPE.NUMERIC:
      return new V1_Numeric();
    // TODO: there is no relational time type and the cache table stores a time
    // as a TIMESTAMP, so a time column has no faithful relational type here
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRECISE_PRIMITIVE_TYPE.STRICTDATE:
    case PRECISE_PRIMITIVE_TYPE.STRICTTIME:
      return new V1_Date();
    case PRECISE_PRIMITIVE_TYPE.TIMESTAMP:
    case PRECISE_PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.DATETIME:
      return new V1_Timestamp();
    case PRECISE_PRIMITIVE_TYPE.VARCHAR:
    case CORE_PURE_PATH.VARIANT:
    case PRIMITIVE_TYPE.STRING:
      return new V1_VarChar();
    default:
      throw new UnsupportedOperationError(
        `Can't initialize cache: failed to find matching relational data type for Pure type '${pureType}' when synthesizing table definition`,
      );
  }
};
