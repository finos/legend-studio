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

import {
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Database } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Database';
import type { DataType } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
import {
  Real,
  Binary,
  Bit,
  Other,
  Date,
  Timestamp,
  Numeric,
  Decimal,
  VarBinary,
  Char,
  VarChar,
  Double,
  Float,
  Integer,
  TinyInt,
  SmallInt,
  BigInt,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
import type { TableAlias } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import {
  RelationalOperationElement,
  TableAliasColumn,
  DynaFunction,
  Literal,
  LiteralList,
  RelationalOperationElementWithJoin,
  extractLine,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import type { Table } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Table';
import type { Column } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Column';
import type { Filter } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Filter';
import type { GroupByMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/GroupByMapping';
import type { Join } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Join';
import {
  SELF_JOIN_SCHEMA_NAME,
  SELF_JOIN_TABLE_NAME,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Join';
import type { ColumnMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ColumnMapping';
import type { View } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/View';
import type { Schema } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Schema';
import type { V1_RelationalDataType } from '../../../model/packageableElements/store/relational/model/V1_RelationalDataType';
import {
  V1_VarChar,
  V1_SmallInt,
  V1_Integer,
  V1_Decimal,
  V1_Numeric,
  V1_BigInt,
  V1_Bit,
  V1_Char,
  V1_Date,
  V1_Double,
  V1_Float,
  V1_Real,
  V1_Timestamp,
  V1_TinyInt,
  V1_VarBinary,
  V1_Binary,
  V1_Other,
} from '../../../model/packageableElements/store/relational/model/V1_RelationalDataType';
import { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import type { V1_RelationalOperationElement } from '../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import {
  V1_ElementWithJoins,
  V1_LiteralList,
  V1_Literal,
  V1_TableAliasColumn,
  V1_DynaFunc,
} from '../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr';
import { V1_JoinPointer } from '../../../model/packageableElements/store/relational/model/V1_JoinPointer';
import { V1_ColumnMapping } from '../../../model/packageableElements/store/relational/model/V1_ColumnMapping';
import { V1_Column } from '../../../model/packageableElements/store/relational/model/V1_Column';
import { V1_Filter } from '../../../model/packageableElements/store/relational/model/V1_Filter';
import { V1_Join } from '../../../model/packageableElements/store/relational/model/V1_Join';
import { V1_View } from '../../../model/packageableElements/store/relational/model/V1_View';
import { V1_Schema } from '../../../model/packageableElements/store/relational/model/V1_Schema';
import { V1_Table } from '../../../model/packageableElements/store/relational/model/V1_Table';
import { V1_transformMilestoning } from './V1_MilestoningTransformer';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';

const transformRelationalDataType = (type: DataType): V1_RelationalDataType => {
  if (type instanceof VarChar) {
    const protocol = new V1_VarChar();
    protocol.size = type.size;
    return protocol;
  } else if (type instanceof Char) {
    const protocol = new V1_Char();
    protocol.size = type.size;
    return protocol;
  } else if (type instanceof VarBinary) {
    const protocol = new V1_VarBinary();
    protocol.size = type.size;
    return protocol;
  } else if (type instanceof Binary) {
    const protocol = new V1_Binary();
    protocol.size = type.size;
    return protocol;
  } else if (type instanceof Bit) {
    return new V1_Bit();
  } else if (type instanceof Numeric) {
    const protocol = new V1_Numeric();
    protocol.precision = type.precision;
    protocol.scale = type.scale;
    return protocol;
  } else if (type instanceof Decimal) {
    const protocol = new V1_Decimal();
    protocol.precision = type.precision;
    protocol.scale = type.scale;
    return protocol;
  } else if (type instanceof Double) {
    return new V1_Double();
  } else if (type instanceof Float) {
    return new V1_Float();
  } else if (type instanceof Real) {
    return new V1_Real();
  } else if (type instanceof Integer) {
    return new V1_Integer();
  } else if (type instanceof BigInt) {
    return new V1_BigInt();
  } else if (type instanceof SmallInt) {
    return new V1_SmallInt();
  } else if (type instanceof TinyInt) {
    return new V1_TinyInt();
  } else if (type instanceof Date) {
    return new V1_Date();
  } else if (type instanceof Timestamp) {
    return new V1_Timestamp();
  } else if (type instanceof Other) {
    return new V1_Other();
  }
  throw new UnsupportedOperationError(
    `Can't serialize relational data type of type '${getClass(type).name}'`,
  );
};

export const V1_transformTableAliasToTablePointer = (
  tableAlias: TableAlias,
): V1_TablePtr => {
  const tablePtr = new V1_TablePtr();
  tablePtr.database = tableAlias.relation.ownerReference.valueForSerialization;
  /* @MARKER: GRAMMAR ROUNDTRIP --- omit this information during protocol transformation as it can be interpreted while building the graph */
  tablePtr.mainTableDb = tablePtr.database;
  tablePtr.schema = tableAlias.isSelfJoinTarget
    ? SELF_JOIN_SCHEMA_NAME
    : tableAlias.relation.value.schema.name;
  tablePtr.table = tableAlias.isSelfJoinTarget
    ? SELF_JOIN_TABLE_NAME
    : tableAlias.relation.value.name;
  return tablePtr;
};

export const V1_transformTableToTablePointer = (table: Table): V1_TablePtr => {
  const tablePtr = new V1_TablePtr();
  tablePtr.database = table.schema.owner.path;
  /* @MARKER: GRAMMAR ROUNDTRIP --- omit this information during protocol transformation as it can be interpreted while building the graph */
  tablePtr.mainTableDb = tablePtr.database;
  tablePtr.schema = table.schema.name;
  tablePtr.table = table.name;
  return tablePtr;
};

export const V1_transformRelationalOperationElement = (
  operation: RelationalOperationElement,
): V1_RelationalOperationElement => {
  if (operation instanceof DynaFunction) {
    const _dynaFunc = new V1_DynaFunc();
    _dynaFunc.funcName = operation.name;
    _dynaFunc.parameters = operation.parameters.map(
      V1_transformRelationalOperationElement,
    );
    return _dynaFunc;
  } else if (operation instanceof TableAliasColumn) {
    const _tableAliasCol = new V1_TableAliasColumn();
    _tableAliasCol.column = operation.column.value.name;
    _tableAliasCol.table = V1_transformTableAliasToTablePointer(
      operation.alias,
    );
    _tableAliasCol.tableAlias = operation.alias.isSelfJoinTarget
      ? SELF_JOIN_TABLE_NAME
      : operation.alias.name;
    return _tableAliasCol;
  } else if (operation instanceof Literal) {
    const _literal = new V1_Literal();
    _literal.value =
      operation.value instanceof RelationalOperationElement
        ? V1_transformRelationalOperationElement(operation.value)
        : operation.value;
    return _literal;
  } else if (operation instanceof LiteralList) {
    const _literalList = new V1_LiteralList();
    _literalList.values = operation.values.map(
      (val) => V1_transformRelationalOperationElement(val) as V1_Literal,
    );
    return _literalList;
  } else if (operation instanceof RelationalOperationElementWithJoin) {
    const elementWithJoin = new V1_ElementWithJoins();
    elementWithJoin.joins = operation.joinTreeNode
      ? extractLine(operation.joinTreeNode).map((node) => {
          const joinPtr = new V1_JoinPointer();
          joinPtr.db = node.join.ownerReference.valueForSerialization;
          joinPtr.joinType = node.joinType;
          joinPtr.name = node.join.value.name;
          return joinPtr;
        })
      : [];
    elementWithJoin.relationalElement = operation.relationalOperationElement
      ? V1_transformRelationalOperationElement(
          operation.relationalOperationElement,
        )
      : undefined;
    return elementWithJoin;
  }
  throw new UnsupportedOperationError(
    `Can't serialize relational operation element of type '${
      getClass(operation).name
    }'`,
  );
};

export const V1_transformGroupByMapping = (
  groupByMapping: GroupByMapping | undefined,
): V1_RelationalOperationElement[] =>
  groupByMapping?.columns.map(V1_transformRelationalOperationElement) ?? [];
const transformColumnMapping = (element: ColumnMapping): V1_ColumnMapping => {
  const colMapping = new V1_ColumnMapping();
  colMapping.name = element.columnName;
  colMapping.operation = V1_transformRelationalOperationElement(
    element.relationalOperationElement,
  );
  return colMapping;
};

const transformColumn = (element: Column): V1_Column => {
  const column = new V1_Column();
  column.name = element.name;
  if (element.nullable !== undefined) {
    column.nullable = element.nullable;
  }
  column.type = transformRelationalDataType(element.type);
  return column;
};

const transformTable = (
  element: Table,
  plugins: PureProtocolProcessorPlugin[],
): V1_Table => {
  const table = new V1_Table();
  table.columns = element.columns.map((val) => transformColumn(val as Column));
  table.name = element.name;
  table.primaryKey = element.primaryKey.map((e) => e.name);
  if (element.milestoning.length) {
    table.milestoning = element.milestoning.map((milestoning) =>
      V1_transformMilestoning(milestoning, plugins),
    );
  }
  return table;
};

const transformJoin = (element: Join): V1_Join => {
  const join = new V1_Join();
  join.name = element.name;
  join.operation = V1_transformRelationalOperationElement(element.operation);
  return join;
};

const transformFilter = (element: Filter): V1_Filter => {
  const filter = new V1_Filter();
  filter.name = element.name;
  filter.operation = V1_transformRelationalOperationElement(element.operation);
  return filter;
};

const transformView = (element: View): V1_View => {
  const view = new V1_View();
  view.name = element.name;
  view.distinct = element.distinct;
  view.primaryKey = element.primaryKey.map((v) => v.name);
  view.columnMappings = element.columnMappings.map(transformColumnMapping);
  view.groupBy = V1_transformGroupByMapping(element.groupBy);
  return view;
};

const transformSchema = (
  element: Schema,
  plugins: PureProtocolProcessorPlugin[],
): V1_Schema => {
  const schema = new V1_Schema();
  schema.name = element.name;
  schema.tables = element.tables.map((table) => transformTable(table, plugins));
  schema.views = element.views.map(transformView);
  return schema;
};

export const V1_transformDatabase = (
  element: Database,
  plugins: PureProtocolProcessorPlugin[],
): V1_Database => {
  const database = new V1_Database();
  V1_initPackageableElement(database, element);
  database.filters = element.filters.map(transformFilter);
  database.joins = element.joins.map(transformJoin);
  database.schemas = element.schemas.map((schema) =>
    transformSchema(schema, plugins),
  );
  database.includedStores = element.includes.map(V1_transformElementReference);
  return database;
};
