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
  isNonNullable,
  AssertionError,
} from '@finos/legend-shared';
import {
  Database,
  INTERNAL__LakehouseGeneratedDatabase,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import {
  getAllIncludedDatabases,
  getColumn,
  getFilter,
  getJoinType,
  getSchema,
  getView,
} from '../../../../../../../../graph/helpers/STO_Relational_Helper.js';
import { Schema } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Schema.js';
import { Table } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
import { Column } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
import { View } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/View.js';
import {
  Join,
  SELF_JOIN_TABLE_NAME,
  SELF_JOIN_ALIAS_PREFIX,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Join.js';
import { Filter } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Filter.js';
import {
  type JoinType,
  type RelationalOperationElement,
  type Relation,
  Literal,
  LiteralList,
  DynaFunction,
  TableAlias,
  TableAliasColumn,
  JoinTreeNode,
  RelationalOperationElementWithJoin,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import {
  type RelationalDataType,
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
  SemiStructured,
  Json,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import { ColumnMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/ColumnMapping.js';
import { GroupByMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/GroupByMapping.js';
import type { JoinReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/JoinReference.js';
import {
  ColumnImplicitReference,
  ColumnExplicitReference,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/ColumnReference.js';
import { TableReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/TableReference.js';
import { ViewReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/ViewReference.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_Schema } from '../../../../model/packageableElements/store/relational/model/V1_Schema.js';
import type { V1_Table } from '../../../../model/packageableElements/store/relational/model/V1_Table.js';
import type { V1_Column } from '../../../../model/packageableElements/store/relational/model/V1_Column.js';
import {
  type V1_RelationalDataType,
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
  V1_SemiStructured,
  V1_Json,
} from '../../../../model/packageableElements/store/relational/model/V1_RelationalDataType.js';
import type { V1_View } from '../../../../model/packageableElements/store/relational/model/V1_View.js';
import type { V1_Join } from '../../../../model/packageableElements/store/relational/model/V1_Join.js';
import {
  V1_RelationalOperationElement,
  V1_TableAliasColumn,
  V1_ElementWithJoins,
  V1_DynaFunc,
  V1_Literal,
  V1_LiteralList,
} from '../../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement.js';
import type { V1_JoinPointer } from '../../../../model/packageableElements/store/relational/model/V1_JoinPointer.js';
import type { V1_Filter } from '../../../../model/packageableElements/store/relational/model/V1_Filter.js';
import { V1_buildMilestoning } from './V1_MilestoningBuilderHelper.js';
import { DEFAULT_DATABASE_SCHEMA_NAME } from '../../../../../../../../graph/MetaModelConst.js';
import { FilterMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/FilterMapping.js';
import type { V1_FilterMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_FilterMapping.js';
import { FilterImplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/FilterReference.js';
import { PackageableElementImplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { V1_TablePtr } from '../../../../model/packageableElements/store/relational/model/V1_TablePtr.js';
import { TablePtr } from '../../../../../../../../graph/metamodel/pure/packageableElements/service/TablePtr.js';
import type { TabularFunction } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/TabularFunction.js';
import type { V1_TabularFunction } from '../../../../model/packageableElements/store/relational/model/V1_TabularFunction.js';
import { V1_buildTaggedValue } from './V1_DomainBuilderHelper.js';
import type { IncludeStore } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/IncludeStore.js';
import {
  buildGeneratedIndex,
  getOrCreateSchemaFromGeneratedDatabase,
  getOrCreateTableFromGeneratedSchema,
} from '../../../../../../../../graph/helpers/STO_Internal_Relational_Helper.js';

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

const V1_findSchemaInGeneratedDatabase = (
  schemaName: string,
  db: INTERNAL__LakehouseGeneratedDatabase,
): Schema | undefined => {
  let schema = db.schemas.find((s) => s.name === schemaName);
  if (!schema) {
    schema = new Schema(schemaName, db);
    db.schemas.push(schema);
  }
  db.schemas.push(schema);
  return schema;
};

export const V1_findSchema = (database: Database, _schema: string): void => {
  if (schemaExists(database, _schema)) {
    return;
  } else if (database instanceof INTERNAL__LakehouseGeneratedDatabase) {
    V1_findSchemaInGeneratedDatabase(_schema, database);
    return;
  }
  throw new AssertionError(
    `Can't find schema '${_schema}' in database '${database}'`,
  );
};

function findRelationInSchema(
  schema: Schema,
  tableName: string,
): Relation | undefined {
  let relation: Relation | undefined = schema.tables.find(
    (table) => table.name === tableName,
  );
  if (!relation) {
    relation = schema.views.find((view) => view.name === tableName);
  }
  if (!relation) {
    relation = schema.tabularFunctions.find(
      (tabularFunction) => tabularFunction.name === tableName,
    );
  }
  return relation;
}

export const V1_initInternalLakehouseGeneratedDatabase = (
  includedStore: IncludeStore,
  owner: Database,
): INTERNAL__LakehouseGeneratedDatabase => {
  const generatedDatabase = new INTERNAL__LakehouseGeneratedDatabase(
    includedStore.packageableElementPointer.value,
    owner,
  );
  const defaultSchema = new Schema(
    DEFAULT_DATABASE_SCHEMA_NAME,
    generatedDatabase,
  );
  generatedDatabase.schemas.push(defaultSchema);
  includedStore.generatedDatabase = generatedDatabase;
  return generatedDatabase;
};

export const V1_findRelation = (
  database: Database,
  schemaName: string,
  tableName: string,
): Relation | undefined => {
  if (database instanceof INTERNAL__LakehouseGeneratedDatabase) {
    const schema = getOrCreateSchemaFromGeneratedDatabase(schemaName, database);
    return getOrCreateTableFromGeneratedSchema(tableName, schema);
  }
  const relations: Relation[] = [];
  getAllIncludedDatabases(database).forEach((db) => {
    const schema = db.schemas.find((_schema) => _schema.name === schemaName);
    if (schema) {
      const relation = findRelationInSchema(schema, tableName);
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
  V1_findSchema(db, schemaName);
  return guaranteeNonNullable(
    V1_findRelation(db, schemaName, relationName),
    `Can't find table '${relationName}' in schema '${schemaName}' and database '${db.path}'`,
  );
};

const buildJoinTreeNode = (
  joins: { joinReference: JoinReference; joinType?: JoinType | undefined }[],
  context: V1_GraphBuilderContext,
): JoinTreeNode => {
  const joinWithJoinType = guaranteeNonNullable(
    joins[0],
    `Can't build join tree node: at least one child node is expected`,
  );
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
  tableAliasIndex: Map<string, TableAlias>,
  selfJoinTargets: TableAliasColumn[],
  generatedDbs?: Map<string, INTERNAL__LakehouseGeneratedDatabase> | undefined,
  allowImplicitToGeneratedDatabase?: boolean | undefined,
): RelationalOperationElement => {
  if (operationalElement instanceof V1_TableAliasColumn) {
    if (operationalElement.table.table === SELF_JOIN_TABLE_NAME) {
      const selfJoin = new TableAliasColumn();
      selfJoin.columnName = operationalElement.column;
      selfJoinTargets.push(selfJoin);
      return selfJoin;
    }
    const relation = context.resolveRelation(
      operationalElement.table,
      generatedDbs,
      allowImplicitToGeneratedDatabase,
    );
    const aliasName = `${operationalElement.table.schema}.${operationalElement.tableAlias}`;
    if (!tableAliasIndex.has(aliasName)) {
      const tAlias = new TableAlias();
      tAlias.relation = relation;
      tAlias.name = operationalElement.tableAlias;
      tableAliasIndex.set(aliasName, tAlias);
    }
    const columnReference = ColumnImplicitReference.create(
      context.resolveDatabase(operationalElement.table.database, generatedDbs),
      getColumn(relation.value, operationalElement.column),
    );
    const tableAliasColumn = new TableAliasColumn();
    tableAliasColumn.alias = guaranteeNonNullable(
      tableAliasIndex.get(aliasName),
    );
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
          generatedDbs,
        );
    }
    return elementWithJoins;
  } else if (operationalElement instanceof V1_DynaFunc) {
    const dynFunc = new DynaFunction(operationalElement.funcName);
    dynFunc.parameters = operationalElement.parameters.map((parameter) =>
      V1_buildRelationalOperationElement(
        parameter,
        context,
        tableAliasIndex,
        selfJoinTargets,
        generatedDbs,
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
          tableAliasIndex,
          selfJoinTargets,
          generatedDbs,
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
            tableAliasIndex,
            selfJoinTargets,
            generatedDbs,
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
): RelationalDataType => {
  if (dataType instanceof V1_VarChar) {
    assertNonNullable(
      dataType.size,
      `Relational data type VARCHAR 'size' field is missing`,
    );
    return new VarChar(dataType.size);
  } else if (dataType instanceof V1_Char) {
    assertNonNullable(
      dataType.size,
      `Relational data type CHAR 'size' field is missing`,
    );
    return new Char(dataType.size);
  } else if (dataType instanceof V1_VarBinary) {
    assertNonNullable(
      dataType.size,
      `Relational data type VARBINARY 'size' field is missing`,
    );
    return new VarBinary(dataType.size);
  } else if (dataType instanceof V1_Binary) {
    assertNonNullable(
      dataType.size,
      `Relational data type BINARY 'size' field is missing`,
    );
    return new Binary(dataType.size);
  } else if (dataType instanceof V1_Bit) {
    return new Bit();
  } else if (dataType instanceof V1_Numeric) {
    assertNonNullable(
      dataType.precision,
      `Relational data type NUMBERIC 'precision' field is missing`,
    );
    assertNonNullable(
      dataType.scale,
      `Relational data type NUMBERIC 'scale' field is missing`,
    );
    return new Numeric(dataType.precision, dataType.scale);
  } else if (dataType instanceof V1_Decimal) {
    assertNonNullable(
      dataType.precision,
      `Relational data type DECIMAL 'precision' field is missing`,
    );
    assertNonNullable(
      dataType.scale,
      `Relational data type DECIMAL 'scale' field is missing`,
    );
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
  } else if (dataType instanceof V1_SemiStructured) {
    return new SemiStructured();
  } else if (dataType instanceof V1_Json) {
    return new Json();
  }
  throw new UnsupportedOperationError(
    `Can't transform relational data type`,
    dataType,
  );
};

const buildColumn = (
  column: V1_Column,
  table: Table,
  context: V1_GraphBuilderContext,
): Column => {
  assertNonEmptyString(column.name, `Column 'name' field is missing or empty`);
  const col = new Column();
  col.name = column.name;
  col.type = V1_transformDatabaseDataType(column.type);
  col.owner = table;
  col.nullable = column.nullable;
  col.stereotypes = column.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  col.taggedValues = column.taggedValues
    .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  return col;
};

const buildDatabaseTable = (
  srcTable: V1_Table,
  schema: Schema,
  context: V1_GraphBuilderContext,
): Table => {
  assertNonEmptyString(srcTable.name, `Table 'name' field is missing or empty`);
  const table = new Table(srcTable.name, schema);
  const columns = srcTable.columns.map((column) =>
    buildColumn(column, table, context),
  );
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
  table.stereotypes = srcTable.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  table.taggedValues = srcTable.taggedValues
    .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  return table;
};

const buildDatabaseTabularFunction = (
  srcTabularFunction: V1_TabularFunction,
  schema: Schema,
  context: V1_GraphBuilderContext,
): TabularFunction => {
  assertNonEmptyString(
    srcTabularFunction.name,
    `TabularFunction 'name' field is missing or empty`,
  );
  const tabularFunction = new Table(srcTabularFunction.name, schema);
  const columns = srcTabularFunction.columns.map((column) =>
    buildColumn(column, tabularFunction, context),
  );
  tabularFunction.columns = columns;
  return tabularFunction;
};

export const V1_buildSchema = (
  srcSchema: V1_Schema,
  database: Database,
  context: V1_GraphBuilderContext,
): Schema => {
  assertNonEmptyString(
    srcSchema.name,
    `Schema 'name' field is missing or empty`,
  );
  const schema = new Schema(srcSchema.name, database);
  schema.tables = srcSchema.tables.map((table) =>
    buildDatabaseTable(table, schema, context),
  );
  schema.tabularFunctions = srcSchema.tabularFunctions.map((tabularFunction) =>
    buildDatabaseTabularFunction(tabularFunction, schema, context),
  );
  schema.stereotypes = srcSchema.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  schema.taggedValues = srcSchema.taggedValues
    .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  return schema;
};

const buildViewFirstPass = (
  srcView: V1_View,
  schema: Schema,
  context: V1_GraphBuilderContext,
): View => {
  assertNonEmptyString(srcView.name, `View 'name' field is missing or empty`);
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
  view.stereotypes = srcView.stereotypes
    .map((stereotype) => context.resolveStereotype(stereotype))
    .filter(isNonNullable);
  view.taggedValues = srcView.taggedValues
    .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
    .filter(isNonNullable);
  return view;
};

const processFilterMapping = (
  srcFilterMapping: V1_FilterMapping,
  ownerDb: Database,
  context: V1_GraphBuilderContext,
): FilterMapping | undefined => {
  const srcFilter = srcFilterMapping.filter;
  const filter = getFilter(ownerDb, srcFilter.name);
  const filterMapping = new FilterMapping(
    ownerDb,
    srcFilter.name,
    FilterImplicitReference.create(
      PackageableElementImplicitReference.create(filter.owner, srcFilter.db),
      filter,
    ),
  );
  if (srcFilterMapping.joins) {
    filterMapping.joinTreeNode = V1_buildElementWithJoinsJoinTreeNode(
      srcFilterMapping.joins,
      context,
    );
  }
  return filterMapping;
};

const buildViewSecondPass = (
  srcView: V1_View,
  context: V1_GraphBuilderContext,
  schema: Schema,
): View => {
  const view = getView(schema, srcView.name);
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
  if (srcView.filter) {
    const filterPtr = srcView.filter.filter;
    const db = filterPtr.db
      ? context.resolveDatabase(filterPtr.db).value
      : view.schema._OWNER;
    view.filter = processFilterMapping(srcView.filter, db, context);
  }
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
  const schema = getSchema(database, srcSchema.name);
  schema.views = srcSchema.views.map((view) =>
    buildViewFirstPass(view, schema, context),
  );
  return schema;
};

export const V1_buildDatabaseSchemaViewsSecondPass = (
  srcSchema: V1_Schema,
  context: V1_GraphBuilderContext,
  database: Database,
): Schema => {
  const schema = getSchema(database, srcSchema.name);
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
  assertNonEmptyString(srcJoin.name, `Join 'name' field is missing or empty`);
  const tableAliasIndex = new Map<string, TableAlias>();
  const selfJoinTargets: TableAliasColumn[] = [];
  const join = new Join(
    srcJoin.name,
    V1_buildRelationalOperationElement(
      srcJoin.operation,
      context,
      tableAliasIndex,
      selfJoinTargets,
      buildGeneratedIndex(database),
    ),
  );
  const aliases = Array.from(tableAliasIndex.values());
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
    const existingAlias = aliases[0] as TableAlias;
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
      } else if (database instanceof INTERNAL__LakehouseGeneratedDatabase) {
        col = new Column();
        col.name = columnName as string;
      }
      assertNonNullable(col, `Can't find column '${columnName}' in the table`);
      // NOTE: this should be `implicit` because we do some inferencing
      // but we need to test the impact of changing it to `implicit`.
      // This might cause bugs in the future.
      selfJoinTarget.column = ColumnExplicitReference.create(col);
    });
  }
  join.aliases = [
    new Pair<TableAlias, TableAlias>(
      aliases[0] as TableAlias,
      aliases[1] as TableAlias,
    ),
    new Pair<TableAlias, TableAlias>(
      aliases[1] as TableAlias,
      aliases[0] as TableAlias,
    ),
  ];
  join.owner = database;
  return join;
};

export const V1_buildDatabaseFilter = (
  srcFilter: V1_Filter,
  context: V1_GraphBuilderContext,
  database: Database,
): Filter => {
  assertNonEmptyString(
    srcFilter.name,
    `Filter 'name' field is missing or empty`,
  );
  const tableAliasIndex = new Map<string, TableAlias>();
  const op = V1_buildRelationalOperationElement(
    srcFilter.operation,
    context,
    tableAliasIndex,
    [],
    buildGeneratedIndex(database),
  );
  // TODO handle multi-grain filters?
  const filter = new Filter(srcFilter.name, op);
  filter.owner = database;
  return filter;
};

export const V1_buildTablePtr = (protocol: V1_TablePtr): TablePtr => {
  const tablePtr = new TablePtr();
  tablePtr.database = protocol.database;
  tablePtr.schema = protocol.schema;
  tablePtr.table = protocol.table;
  tablePtr.mainTableDb = protocol.mainTableDb;
  return tablePtr;
};
