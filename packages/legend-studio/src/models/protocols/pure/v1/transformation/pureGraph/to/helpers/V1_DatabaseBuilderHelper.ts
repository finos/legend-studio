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
  Pair,
  assertNonEmptyString,
  UnsupportedOperationError,
  guaranteeNonNullable,
  assertNonNullable,
  guaranteeType,
  assertTrue,
} from '@finos/legend-studio-shared';
import { Database } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Database';
import { getAllIncludedDbs } from '../../../../../../../metamodels/pure/model/helpers/store/relational/model/DatabaseHelper';
import { Schema } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Schema';
import { Table } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Table';
import { Column } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Column';
import { View } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/View';
import {
  Join,
  SELF_JOIN_TABLE_NAME,
  SELF_JOIN_ALIAS_PREFIX,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Join';
import { Filter } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Filter';
import type {
  JoinType,
  RelationalOperationElement,
  Relation,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import {
  Literal,
  LiteralList,
  DynaFunction,
  TableAlias,
  TableAliasColumn,
  JoinTreeNode,
  RelationalOperationElementWithJoin,
  getJoinType,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import type { DataType } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
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
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
import { ColumnMapping } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ColumnMapping';
import { GroupByMapping } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/GroupByMapping';
import type { JoinReference } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/JoinReference';
import {
  ColumnImplicitReference,
  ColumnExplicitReference,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ColumnReference';
import { TableReference } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/TableReference';
import { ViewReference } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ViewReference';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_Schema } from '../../../../model/packageableElements/store/relational/model/V1_Schema';
import type { V1_Table } from '../../../../model/packageableElements/store/relational/model/V1_Table';
import type { V1_Column } from '../../../../model/packageableElements/store/relational/model/V1_Column';
import type { V1_RelationalDataType } from '../../../../model/packageableElements/store/relational/model/V1_RelationalDataType';
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
} from '../../../../model/packageableElements/store/relational/model/V1_RelationalDataType';
import type { V1_View } from '../../../../model/packageableElements/store/relational/model/V1_View';
import type { V1_Join } from '../../../../model/packageableElements/store/relational/model/V1_Join';
import {
  V1_RelationalOperationElement,
  V1_TableAliasColumn,
  V1_ElementWithJoins,
  V1_DynaFunc,
  V1_Literal,
  V1_LiteralList,
} from '../../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import type { V1_JoinPointer } from '../../../../model/packageableElements/store/relational/model/V1_JoinPointer';
import type { V1_Filter } from '../../../../model/packageableElements/store/relational/model/V1_Filter';
import { V1_buildMilestoning } from './V1_MilestoningBuilderHelper';
import { DEFAULT_DATABASE_SCHEMA_NAME } from '../../../../../../../MetaModelConst';

const _schemaExists = (
  db: Database,
  schemaName: string,
  visitedDbs: Set<Database>,
): boolean => {
  if (!visitedDbs.has(db)) {
    visitedDbs.add(db);
    if (db.schemas.some((e) => e.name === schemaName)) {
      return true;
    }
    const foundSchema = db.includes.find((includedStore) => {
      if (
        _schemaExists(
          guaranteeType(includedStore.value, Database),
          schemaName,
          visitedDbs,
        )
      ) {
        return true;
      }
      return false;
    });
    if (foundSchema) {
      return true;
    }
  }
  return false;
};

const schemaExists = (database: Database, _schema: string): boolean =>
  DEFAULT_DATABASE_SCHEMA_NAME === _schema ||
  _schemaExists(database, _schema, new Set<Database>());

export const V1_findRelation = (
  database: Database,
  schemaName: string,
  tableName: string,
): Relation | undefined => {
  const relations: Relation[] = [];
  getAllIncludedDbs(database).forEach((db) => {
    const schema = db.schemas.find((schema) => schema.name === schemaName);
    if (schema) {
      let relation: Relation | undefined = schema.tables.find(
        (table) => table.name === tableName,
      );
      if (!relation) {
        relation = schema.views.find((view) => view.name === tableName);
      }
      if (relation) {
        relations.push(relation);
      }
    }
  });
  assertTrue(
    relations.length < 2,
    `Found multiple relations with name '${tableName}' in schema '${schemaName}' of database '${database.path}'`,
  );
  return relations.length === 0 ? undefined : relations[0];
};

export const V1_getRelation = (
  db: Database,
  schemaName: string,
  relationName: string,
): Relation => {
  assertTrue(
    schemaExists(db, schemaName),
    `Can't find schema '${schemaName}' in database '${db}'`,
  );
  return guaranteeNonNullable(
    V1_findRelation(db, schemaName, relationName),
    `Can't find table '${relationName}' in schema '${schemaName}' and database '${db.path}'`,
  );
};

const buildJoinTreeNode = (
  joins: { joinReference: JoinReference; joinType?: JoinType }[],
  context: V1_GraphBuilderContext,
): JoinTreeNode => {
  const joinWithJoinType = joins[0];
  const res = new JoinTreeNode(
    joinWithJoinType.joinReference,
    joinWithJoinType.joinType,
  );
  if (joins.length === 1) {
    return res;
  }
  res.children = [buildJoinTreeNode(joins.slice(1), context)];
  return res;
};

export const V1_buildElementWithJoinsJoinTreeNode = (
  joinPointers: V1_JoinPointer[],
  context: V1_GraphBuilderContext,
): JoinTreeNode | undefined => {
  if (!joinPointers.length) {
    return undefined;
  }
  const newJoins = joinPointers.map((joinPtr) => ({
    joinReference: context.resolveJoin(joinPtr),
    joinType: joinPtr.joinType ? getJoinType(joinPtr.joinType) : undefined,
  }));
  return buildJoinTreeNode(newJoins, context);
};

export const V1_buildRelationalOperationElement = (
  operationalElement: V1_RelationalOperationElement,
  context: V1_GraphBuilderContext,
  aliasMap: Map<string, TableAlias>,
  selfJoinTargets: TableAliasColumn[],
): RelationalOperationElement => {
  if (operationalElement instanceof V1_TableAliasColumn) {
    if (operationalElement.table.table === SELF_JOIN_TABLE_NAME) {
      const selfJoin = new TableAliasColumn();
      selfJoin.columnName = operationalElement.column;
      selfJoinTargets.push(selfJoin);
      return selfJoin;
    }
    const relation = context.resolveRelation(operationalElement.table);
    const aliasName = `${operationalElement.table.schema}.${operationalElement.tableAlias}`;
    if (!aliasMap.has(aliasName)) {
      const tAlias = new TableAlias();
      tAlias.relation = relation;
      tAlias.name = operationalElement.tableAlias;
      aliasMap.set(aliasName, tAlias);
    }
    const columnReference = ColumnImplicitReference.create(
      context.resolveDatabase(operationalElement.table.database),
      relation.value.getColumn(operationalElement.column),
    );
    const tableAliasColumn = new TableAliasColumn();
    tableAliasColumn.alias = guaranteeNonNullable(aliasMap.get(aliasName));
    tableAliasColumn.column = columnReference;
    tableAliasColumn.columnName = columnReference.value.name;
    return tableAliasColumn;
  } else if (operationalElement instanceof V1_ElementWithJoins) {
    const elementWithJoins = new RelationalOperationElementWithJoin();
    elementWithJoins.joinTreeNode = V1_buildElementWithJoinsJoinTreeNode(
      operationalElement.joins,
      context,
    );
    if (operationalElement.relationalElement) {
      elementWithJoins.relationalOperationElement =
        V1_buildRelationalOperationElement(
          operationalElement.relationalElement,
          context,
          new Map<string, TableAlias>(),
          selfJoinTargets,
        );
    }
    return elementWithJoins;
  } else if (operationalElement instanceof V1_DynaFunc) {
    const dynFunc = new DynaFunction(operationalElement.funcName);
    dynFunc.parameters = operationalElement.parameters.map((parameter) =>
      V1_buildRelationalOperationElement(
        parameter,
        context,
        aliasMap,
        selfJoinTargets,
      ),
    );
    return dynFunc;
  } else if (operationalElement instanceof V1_Literal) {
    const value = operationalElement.value;
    if (value instanceof V1_RelationalOperationElement) {
      return new Literal(
        V1_buildRelationalOperationElement(
          value,
          context,
          aliasMap,
          selfJoinTargets,
        ),
      );
    }
    return new Literal(value);
  } else if (operationalElement instanceof V1_LiteralList) {
    const litList = new LiteralList();
    litList.values = operationalElement.values.map((value) => {
      if (value instanceof V1_RelationalOperationElement) {
        return new Literal(
          V1_buildRelationalOperationElement(
            value,
            context,
            aliasMap,
            selfJoinTargets,
          ),
        );
      }
      return new Literal(value);
    });
    return litList;
  }
  throw new UnsupportedOperationError();
};

// Datatypes
export const V1_transformDatabaseDataType = (
  dataType: V1_RelationalDataType,
): DataType => {
  if (dataType instanceof V1_VarChar) {
    assertNonNullable(dataType.size, 'VARCHAR size is missing');
    return new VarChar(dataType.size);
  } else if (dataType instanceof V1_Char) {
    assertNonNullable(dataType.size, 'CHAR size is missing');
    return new Char(dataType.size);
  } else if (dataType instanceof V1_VarBinary) {
    assertNonNullable(dataType.size, 'VARBINARY size is missing');
    return new VarBinary(dataType.size);
  } else if (dataType instanceof V1_Binary) {
    assertNonNullable(dataType.size, 'BINARY size is missing');
    return new Binary(dataType.size);
  } else if (dataType instanceof V1_Bit) {
    return new Bit();
  } else if (dataType instanceof V1_Numeric) {
    assertNonNullable(dataType.precision, 'NUMBERIC precision is missing');
    assertNonNullable(dataType.scale, 'NUMBERIC scale is missing');
    return new Numeric(dataType.precision, dataType.scale);
  } else if (dataType instanceof V1_Decimal) {
    assertNonNullable(dataType.precision, 'DECIMAL precision is missing');
    assertNonNullable(dataType.scale, 'DECIMAL scale is missing');
    return new Decimal(dataType.precision, dataType.scale);
  } else if (dataType instanceof V1_Double) {
    return new Double();
  } else if (dataType instanceof V1_Float) {
    return new Float();
  } else if (dataType instanceof V1_Real) {
    return new Real();
  } else if (dataType instanceof V1_Integer) {
    return new Integer();
  } else if (dataType instanceof V1_BigInt) {
    return new BigInt();
  } else if (dataType instanceof V1_SmallInt) {
    return new SmallInt();
  } else if (dataType instanceof V1_TinyInt) {
    return new TinyInt();
  } else if (dataType instanceof V1_Date) {
    return new Date();
  } else if (dataType instanceof V1_Timestamp) {
    return new Timestamp();
  } else if (dataType instanceof V1_Other) {
    return new Other();
  }
  throw new UnsupportedOperationError(
    `Can't transform relational data type`,
    dataType,
  );
};

const buildColumn = (column: V1_Column, table: Table): Column => {
  assertNonEmptyString(column.name, 'Column name is missing');
  const col = new Column();
  col.name = column.name;
  col.type = V1_transformDatabaseDataType(column.type);
  col.owner = table;
  col.nullable = column.nullable;
  return col;
};

const buildDatabaseTable = (
  srcTable: V1_Table,
  schema: Schema,
  context: V1_GraphBuilderContext,
): Table => {
  assertNonEmptyString(srcTable.name, 'Table name is missing');
  const table = new Table(srcTable.name, schema);
  const columns = srcTable.columns.map((column) => buildColumn(column, table));
  table.columns = columns;
  table.primaryKey = srcTable.primaryKey.map((key) =>
    guaranteeNonNullable(
      columns.find((column) => column.name === key),
      `Can't find primary key for column '${key}'`,
    ),
  );
  table.milestoning = srcTable.milestoning.map((m) =>
    V1_buildMilestoning(m, context),
  );
  return table;
};

export const V1_buildSchema = (
  srcSchema: V1_Schema,
  database: Database,
  context: V1_GraphBuilderContext,
): Schema => {
  assertNonEmptyString(srcSchema.name, 'Schema name is missing');
  const schema = new Schema(srcSchema.name, database);
  schema.tables = srcSchema.tables.map((table) =>
    buildDatabaseTable(table, schema, context),
  );
  return schema;
};

const buildViewFirstPass = (srcView: V1_View, schema: Schema): View => {
  assertNonEmptyString(srcView.name, 'View name is missing');
  const view = new View(srcView.name, schema);
  const columns = srcView.columnMappings.map((colMapping) => {
    const col = new Column();
    col.name = colMapping.name;
    col.type = new VarChar(50);
    col.owner = view;
    return col;
  });
  view.columns = columns;
  view.primaryKey = srcView.primaryKey.map((primaryKey) =>
    guaranteeNonNullable(columns.find((column) => column.name === primaryKey)),
  );
  return view;
};
const buildViewSecondPass = (
  srcView: V1_View,
  context: V1_GraphBuilderContext,
  schema: Schema,
): View => {
  const view = schema.getView(srcView.name);
  const columnMappings = srcView.columnMappings.map(
    (columnMapping) =>
      new ColumnMapping(
        columnMapping.name,
        V1_buildRelationalOperationElement(
          columnMapping.operation,
          context,
          new Map<string, TableAlias>(),
          [],
        ),
      ),
  );
  const groupByColumns = srcView.groupBy.map((groupBy) =>
    V1_buildRelationalOperationElement(
      groupBy,
      context,
      new Map<string, TableAlias>(),
      [],
    ),
  );
  if (groupByColumns.length) {
    const groupBy = new GroupByMapping();
    groupBy.columns = groupByColumns;
    view.groupBy = groupBy;
  }
  view.distinct = srcView.distinct;
  view.columnMappings = columnMappings;
  return view;
};

export const V1_buildDatabaseSchemaViewsFirstPass = (
  srcSchema: V1_Schema,
  database: Database,
  context: V1_GraphBuilderContext,
): Schema => {
  const schema = database.getSchema(srcSchema.name);
  schema.views = srcSchema.views.map((view) =>
    buildViewFirstPass(view, schema),
  );
  return schema;
};

export const V1_buildDatabaseSchemaViewsSecondPass = (
  srcSchema: V1_Schema,
  context: V1_GraphBuilderContext,
  database: Database,
): Schema => {
  const schema = database.getSchema(srcSchema.name);
  schema.views = srcSchema.views.map((view) =>
    buildViewSecondPass(view, context, schema),
  );
  return schema;
};

export const V1_buildDatabaseJoin = (
  srcJoin: V1_Join,
  context: V1_GraphBuilderContext,
  database: Database,
): Join => {
  assertNonEmptyString(srcJoin.name, 'Join name is missing');
  const aliasMap = new Map<string, TableAlias>();
  const selfJoinTargets: TableAliasColumn[] = [];
  const join = new Join(
    srcJoin.name,
    V1_buildRelationalOperationElement(
      srcJoin.operation,
      context,
      aliasMap,
      selfJoinTargets,
    ),
  );
  const aliases = Array.from(aliasMap.values());
  assertTrue(aliases.length > 0, `Can't build join with no table`);
  assertTrue(
    aliases.length <= 2,
    `Can't build join of more than 2 tables. Please use V1_Join chains (using '>') in your mapping in order to compose them`,
  );
  if (aliases.length === 2) {
    const target = aliases.filter((alias) => alias.name === srcJoin.target);
    if (target.length) {
      join.target = target[target.length - 1];
    }
  } else if (aliases.length === 1) {
    assertTrue(
      selfJoinTargets.length !== 0,
      `Can't build join of 1 table, unless it is a self-join. Please use the '{target}' notation in order to define a directed self-join`,
    );
    const existingAlias = aliases[0];
    const existingAliasName = existingAlias.name;
    const existingRelationalElement = existingAlias.relation;
    const tableAlias = new TableAlias();
    tableAlias.name = SELF_JOIN_ALIAS_PREFIX + existingAliasName;
    tableAlias.relation = existingRelationalElement;
    tableAlias.isSelfJoinTarget = true;
    aliases.push(tableAlias);
    join.target = tableAlias;
    selfJoinTargets.forEach((selfJoinTarget) => {
      selfJoinTarget.alias = tableAlias;
      const columnName = selfJoinTarget.columnName;
      let col: Column | undefined;
      if (
        existingRelationalElement instanceof TableReference ||
        existingRelationalElement instanceof ViewReference
      ) {
        col = existingRelationalElement.value.columns.find(
          (c) => c instanceof Column && c.name === columnName,
        ) as Column | undefined;
      }
      assertNonNullable(col, `Can't find column '${columnName}' in the table`);
      selfJoinTarget.column = ColumnExplicitReference.create(col);
    });
  }
  join.aliases = [
    new Pair<TableAlias, TableAlias>(aliases[0], aliases[1]),
    new Pair<TableAlias, TableAlias>(aliases[1], aliases[0]),
  ];
  join.owner = database;
  return join;
};

export const V1_buildDatabaseFilter = (
  srcFilter: V1_Filter,
  context: V1_GraphBuilderContext,
  database: Database,
): Filter => {
  assertNonEmptyString(srcFilter.name, 'Filter name is missing');
  const aliasMap = new Map<string, TableAlias>();
  const op = V1_buildRelationalOperationElement(
    srcFilter.operation,
    context,
    aliasMap,
    [],
  );
  // TODO handle multi-grain filters?
  const filter = new Filter(srcFilter.name, op);
  filter.owner = database;
  return filter;
};
