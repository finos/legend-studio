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
  UnsupportedOperationError,
  assertErrorThrown,
} from '@finos/legend-shared';
import type { PureModel } from '../PureModel.js';
import { CORE_PURE_PATH, PRECISE_PRIMITIVE_TYPE } from '../MetaModelConst.js';
import { Column } from '../metamodel/pure/packageableElements/store/relational/model/Column.js';
import { Table } from '../metamodel/pure/packageableElements/store/relational/model/Table.js';
import type { View } from '../metamodel/pure/packageableElements/store/relational/model/View.js';
import {
  type RelationalDataType,
  BigInt,
  Binary,
  Bit,
  Char,
  Date,
  Decimal,
  Double,
  Float,
  Integer,
  Json,
  Numeric,
  Other,
  Real,
  SemiStructured,
  SmallInt,
  Timestamp,
  TinyInt,
  VarBinary,
  VarChar,
} from '../metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import {
  RelationColumn,
  RelationType,
} from '../metamodel/pure/packageableElements/relation/RelationType.js';
import { GenericType } from '../metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { Multiplicity } from '../metamodel/pure/packageableElements/domain/Multiplicity.js';
import { PrimitiveType } from '../metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { createPrimitiveInstance_Integer } from './ValueSpecificationHelper.js';

/**
 * Why the engine types a column differently from what its declaration says.
 * Each one mirrors an engine defect; see
 * {@link buildRelationTypeFromRelationalRelation}.
 */
export enum RELATIONAL_COLUMN_TYPE_NOTE {
  /**
   * `CHAR(n)` is typed `Varchar(1)`, whatever `n` is. The declared length is
   * still on the column's `Char` type.
   */
  CHAR_LENGTH_DROPPED = 'CHAR_LENGTH_DROPPED',
  /**
   * Every view column is typed `Varchar(0)[0..1]`, whatever the column it
   * reads from.
   */
  VIEW_COLUMN_UNTYPED = 'VIEW_COLUMN_UNTYPED',
  /**
   * `OTHER` (and `ARRAY`, parsed as `OTHER`) is typed `String`, but its values
   * may not be strings.
   */
  TYPE_UNKNOWN = 'TYPE_UNKNOWN',
}

export type RelationalRelationTypeResult = {
  relationType: RelationType;
  /**
   * By relation column name: the columns whose type comes from an engine
   * defect.
   */
  columnNotes: Map<string, RELATIONAL_COLUMN_TYPE_NOTE>;
};

const PRECISE_TIMESTAMP_PATH = 'meta::pure::precisePrimitives::Timestamp';

/**
 * The store keeps a quoted column name with its quotes (`"first name"`); the
 * engine strips one surrounding pair.
 */
const getRelationColumnName = (column: Column): string =>
  column.name.length > 1 &&
  column.name.startsWith('"') &&
  column.name.endsWith('"')
    ? column.name.slice(1, -1)
    : column.name;

const buildGenericType = (
  graph: PureModel,
  path: string,
  typeVariableValues?: number[] | undefined,
): GenericType => {
  const genericType = new GenericType(graph.getType(path));
  if (typeVariableValues) {
    genericType.typeVariableValues = typeVariableValues.map((value) =>
      createPrimitiveInstance_Integer(value),
    );
  }
  return genericType;
};

const buildTableColumnGenericType = (
  dataType: RelationalDataType | undefined,
  graph: PureModel,
): { genericType: GenericType; note?: RELATIONAL_COLUMN_TYPE_NOTE } => {
  if (dataType instanceof VarChar) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.VARCHAR, [
        dataType.size,
      ]),
    };
  }
  if (dataType instanceof Char) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.VARCHAR, [1]),
      note: RELATIONAL_COLUMN_TYPE_NOTE.CHAR_LENGTH_DROPPED,
    };
  }
  if (dataType instanceof Integer) {
    return { genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.INT) };
  }
  if (dataType instanceof BigInt) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.BIG_INT),
    };
  }
  if (dataType instanceof SmallInt) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.SMALL_INT),
    };
  }
  if (dataType instanceof TinyInt) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.TINY_INT),
    };
  }
  if (dataType instanceof Float) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.FLOAT),
    };
  }
  if (dataType instanceof Double || dataType instanceof Real) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.DOUBLE),
    };
  }
  if (dataType instanceof Decimal || dataType instanceof Numeric) {
    return {
      genericType: buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.NUMERIC, [
        dataType.precision,
        dataType.scale,
      ]),
    };
  }
  if (dataType instanceof Date) {
    return { genericType: new GenericType(PrimitiveType.STRICTDATE) };
  }
  if (dataType instanceof Timestamp) {
    return { genericType: buildGenericType(graph, PRECISE_TIMESTAMP_PATH) };
  }
  if (dataType instanceof Bit) {
    return { genericType: new GenericType(PrimitiveType.BOOLEAN) };
  }
  if (dataType instanceof Other) {
    return {
      genericType: new GenericType(PrimitiveType.STRING),
      note: RELATIONAL_COLUMN_TYPE_NOTE.TYPE_UNKNOWN,
    };
  }
  if (dataType instanceof SemiStructured || dataType instanceof Json) {
    return { genericType: buildGenericType(graph, CORE_PURE_PATH.VARIANT) };
  }
  throw new UnsupportedOperationError(
    dataType instanceof Binary || dataType instanceof VarBinary
      ? `the engine can't type a BINARY or VARBINARY column, and fails the whole relation`
      : `the column has no type`,
  );
};

/**
 * Types a table's or view's columns the way the engine types a relational
 * store accessor (`#>{db.schema.TABLE}#`), so that a query built from these
 * types is one the engine compiles.
 *
 * This copies the engine exactly, including its defects, which are noted per
 * column in `columnNotes`. It matches the engine's `RelationalCompilerExtension`
 * at the commit the `engine-roundtrip` test group runs, and that group checks
 * it against the engine column by column. When the engine fixes one of these,
 * that test fails and this function follows.
 *
 * | Column type | Type | Engine defect |
 * | --- | --- | --- |
 * | `VARCHAR(n)` | `Varchar(n)` | |
 * | `CHAR(n)` | `Varchar(1)` | `n` is dropped (`CHAR_LENGTH_DROPPED`) |
 * | `INTEGER`, `BIGINT`, `SMALLINT`, `TINYINT` | `Int`, `BigInt`, `SmallInt`, `TinyInt` | |
 * | `FLOAT` | `Float4` | |
 * | `DOUBLE`, `REAL` | `Double` | |
 * | `DECIMAL(p,s)`, `NUMERIC(p,s)` | `Numeric(p,s)` | |
 * | `DATE` | `StrictDate` | |
 * | `TIMESTAMP` | `Timestamp` | |
 * | `BIT` | `Boolean` | |
 * | `OTHER` | `String` | values may not be strings (`TYPE_UNKNOWN`) |
 * | `SEMISTRUCTURED`, `JSON` | `Variant` | |
 * | `BINARY`, `VARBINARY` | throws | the engine fails the whole relation |
 * | any view column | `Varchar(0)[0..1]` | `VIEW_COLUMN_UNTYPED` |
 *
 * A table column is `[0..1]` only when declared nullable; a view column is
 * always `[0..1]`. A column without a type, as in a generated Lakehouse table,
 * makes this throw. Column names lose one pair of surrounding quotes, and
 * column stereotypes and tagged values are kept.
 *
 * Unlike {@link mapRelationalDataTypeToPrimitiveType}, which returns a standard
 * primitive type, this returns the precise types the engine uses.
 */
export const buildRelationTypeFromRelationalRelation = (
  relation: Table | View,
  graph: PureModel,
): RelationalRelationTypeResult => {
  const relationType = new RelationType(RelationType.ID);
  const columnNotes = new Map<string, RELATIONAL_COLUMN_TYPE_NOTE>();
  const isTable = relation instanceof Table;
  relationType.columns = relation.columns
    .filter((column): column is Column => column instanceof Column)
    .map((column) => {
      const name = getRelationColumnName(column);
      let genericType: GenericType;
      let note: RELATIONAL_COLUMN_TYPE_NOTE | undefined;
      if (isTable) {
        try {
          ({ genericType, note } = buildTableColumnGenericType(
            column.type as RelationalDataType | undefined,
            graph,
          ));
        } catch (error) {
          assertErrorThrown(error);
          throw new UnsupportedOperationError(
            `Can't type column '${column.name}' of table '${relation.schema.name}.${relation.name}' as the engine does: ${error.message}`,
          );
        }
      } else {
        // the engine types every view column this way, whatever it reads
        genericType = buildGenericType(graph, PRECISE_PRIMITIVE_TYPE.VARCHAR, [
          0,
        ]);
        note = RELATIONAL_COLUMN_TYPE_NOTE.VIEW_COLUMN_UNTYPED;
      }
      if (note) {
        columnNotes.set(name, note);
      }
      const relationColumn = new RelationColumn(
        name,
        GenericTypeExplicitReference.create(genericType),
      );
      relationColumn.multiplicity =
        isTable && column.nullable !== true
          ? Multiplicity.ONE
          : Multiplicity.ZERO_ONE;
      relationColumn.stereotypes = [...column.stereotypes];
      relationColumn.taggedValues = [...column.taggedValues];
      return relationColumn;
    });
  return { relationType, columnNotes };
};
