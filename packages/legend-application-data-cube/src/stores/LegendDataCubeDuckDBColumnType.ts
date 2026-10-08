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
import { UnsupportedOperationError } from '@finos/legend-shared';

/**
 * Maps a DuckDB column type name (as reported by the DuckDB catalog) to the
 * relational data type used when synthesizing a table definition for it.
 *
 * See https://duckdb.org/docs/sql/data_types/overview.html
 */
export const getRelationalDataTypeFromDuckDBType = (
  duckDBType: string,
): V1_Column['type'] => {
  switch (duckDBType) {
    case 'BIT':
      return new V1_Bit();
    case 'BOOLEAN':
      // TODO: understand why boolean is not present in relationalDataType
      return new V1_VarChar();
    case 'DATE':
      return new V1_Date();
    case 'DECIMAL':
      return new V1_Decimal();
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
