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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { Database } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
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
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import {
  type TableAlias,
  RelationalOperationElement,
  TableAliasColumn,
  DynaFunction,
  Literal,
  LiteralList,
  RelationalOperationElementWithJoin,
  extractLine,
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';
import type { Table } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
import type { Column } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
import type { Filter } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Filter.js';
import type { GroupByMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/GroupByMapping.js';
import {
  type Join,
  SELF_JOIN_SCHEMA_NAME,
  SELF_JOIN_TABLE_NAME,
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Join.js';
import type { ColumnMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/ColumnMapping.js';
import type { View } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/View.js';
import type { Schema } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Schema.js';
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
} from '../../../model/packageableElements/store/relational/model/V1_RelationalDataType.js';
import { V1_Database } from '../../../model/packageableElements/store/relational/model/V1_Database.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import {
  type V1_RelationalOperationElement,
  V1_ElementWithJoins,
  V1_LiteralList,
  V1_Literal,
  V1_TableAliasColumn,
  V1_DynaFunc,
} from '../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement.js';
import { V1_TablePtr } from '../../../model/packageableElements/store/relational/model/V1_TablePtr.js';
import { V1_JoinPointer } from '../../../model/packageableElements/store/relational/model/V1_JoinPointer.js';
import { V1_ColumnMapping } from '../../../model/packageableElements/store/relational/model/V1_ColumnMapping.js';
import { V1_Column } from '../../../model/packageableElements/store/relational/model/V1_Column.js';
import { V1_Filter } from '../../../model/packageableElements/store/relational/model/V1_Filter.js';
import { V1_Join } from '../../../model/packageableElements/store/relational/model/V1_Join.js';
import { V1_View } from '../../../model/packageableElements/store/relational/model/V1_View.js';
import { V1_Schema } from '../../../model/packageableElements/store/relational/model/V1_Schema.js';
import { V1_Table } from '../../../model/packageableElements/store/relational/model/V1_Table.js';
import { V1_transformMilestoning } from './V1_MilestoningTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { V1_FilterMapping } from '../../../model/packageableElements/store/relational/mapping/V1_FilterMapping.js';
import { V1_FilterPointer } from '../../../model/packageableElements/store/relational/mapping/V1_FilterPointer.js';
import type { TablePtr } from '../../../../../../../graph/metamodel/pure/packageableElements/service/TablePtr.js';
import {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './V1_DomainTransformer.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { TabularFunction } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/TabularFunction.js';
import { V1_TabularFunction } from '../../../model/packageableElements/store/relational/model/V1_TabularFunction.js';

const transformRelationalDataType = (
  type: RelationalDataType,
): V1_RelationalDataType => {
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
  } else if (type instanceof SemiStructured) {
    return new V1_SemiStructured();
  } else if (type instanceof Json) {
    return new V1_Json();
  }
  throw new UnsupportedOperationError(
    `Can't transform relational data type`,
    type,
  );
};

export const V1_transformTablePointer = (ptr: TablePtr): V1_TablePtr => {
  const tablePtr = new V1_TablePtr();
  tablePtr.database = ptr.database;
  tablePtr.mainTableDb = ptr.mainTableDb;
  tablePtr.schema = ptr.schema;
  tablePtr.table = ptr.table;
  return tablePtr;
};

export const V1_transformTableAliasToTablePointer = (
  tableAlias: TableAlias,
  options?: {
    // TODO?: to be deleted when we delete the option in `V1_transformRelationalOperationElement()`
    TEMPORARY__resolveToFullPath?: boolean;
  },
): V1_TablePtr => {
  const tablePtr = new V1_TablePtr();
  tablePtr.database = options?.TEMPORARY__resolveToFullPath
    ? tableAlias.relation.ownerReference.value.path
    : (tableAlias.relation.ownerReference.valueForSerialization ?? '');
  // NOTE: Sometimes, we interpret this, so to maintain roundtrip stability, we need to handle this differrently
  // See https://github.com/finos/legend-studio/issues/295
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
  tablePtr.database = table.schema._OWNER.path;
  // NOTE: Sometimes, we interpret this, so to maintain roundtrip stability, we need to handle this differrently
  // See https://github.com/finos/legend-studio/issues/295
  tablePtr.mainTableDb = tablePtr.database;
  tablePtr.schema = table.schema.name;
  tablePtr.table = table.name;
  return tablePtr;
};

export const V1_transformRelationalOperationElement = (
  operation: RelationalOperationElement,
  context: V1_GraphTransformerContext,
  options?: {
    /**
     * If this is set to `true`, we will always resolve to full for any paths
     * found within the relational operation element. This is needed in case we
     * don't keep the section index, it should be delete when we officially support
     * storing `SectionIndex`, similar to the rationale for flags like
     * `TEMPORARY__keepSectionIndex`
     */
    TEMPORARY__resolveToFullPath?: boolean;
  },
): V1_RelationalOperationElement => {
  if (operation instanceof DynaFunction) {
    const _dynaFunc = new V1_DynaFunc();
    _dynaFunc.funcName = operation.name;
    _dynaFunc.parameters = operation.parameters.map((param) =>
      V1_transformRelationalOperationElement(param, context, options),
    );
    return _dynaFunc;
  } else if (operation instanceof TableAliasColumn) {
    const _tableAliasCol = new V1_TableAliasColumn();
    _tableAliasCol.column = operation.column.value.name;
    _tableAliasCol.table = V1_transformTableAliasToTablePointer(
      operation.alias,
      options,
    );
    _tableAliasCol.tableAlias = operation.alias.isSelfJoinTarget
      ? SELF_JOIN_TABLE_NAME
      : operation.alias.name;
    return _tableAliasCol;
  } else if (operation instanceof Literal) {
    const _literal = new V1_Literal();
    _literal.value =
      operation.value instanceof RelationalOperationElement
        ? V1_transformRelationalOperationElement(
            operation.value,
            context,
            options,
          )
        : operation.value;
    return _literal;
  } else if (operation instanceof LiteralList) {
    const _literalList = new V1_LiteralList();
    _literalList.values = operation.values.map(
      (val) =>
        V1_transformRelationalOperationElement(
          val,
          context,
          options,
        ) as V1_Literal,
    );
    return _literalList;
  } else if (operation instanceof RelationalOperationElementWithJoin) {
    const elementWithJoin = new V1_ElementWithJoins();
    elementWithJoin.joins = operation.joinTreeNode
      ? extractLine(operation.joinTreeNode).map((node) => {
          const joinPtr = new V1_JoinPointer();
          joinPtr.db = options?.TEMPORARY__resolveToFullPath
            ? node.join.ownerReference.value.path
            : (node.join.ownerReference.valueForSerialization ?? '');
          joinPtr.joinType = node.joinType;
          joinPtr.name = node.join.value.name;
          return joinPtr;
        })
      : [];
    elementWithJoin.relationalElement = operation.relationalOperationElement
      ? V1_transformRelationalOperationElement(
          operation.relationalOperationElement,
          context,
          options,
        )
      : undefined;
    return elementWithJoin;
  }
  throw new UnsupportedOperationError(
    `Can't transform relational operation element`,
    operation,
  );
};

export const V1_transformGroupByMapping = (
  groupByMapping: GroupByMapping | undefined,
  context: V1_GraphTransformerContext,
): V1_RelationalOperationElement[] =>
  groupByMapping?.columns.map((column) =>
    V1_transformRelationalOperationElement(column, context),
  ) ?? [];

const transformColumnMapping = (
  element: ColumnMapping,
  context: V1_GraphTransformerContext,
): V1_ColumnMapping => {
  const colMapping = new V1_ColumnMapping();
  colMapping.name = element.columnName;
  colMapping.operation = V1_transformRelationalOperationElement(
    element.relationalOperationElement,
    context,
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
  column.stereotypes = element.stereotypes.map((stereotype) =>
    V1_transformStereotype(stereotype),
  );
  column.taggedValues = element.taggedValues.map((taggedValue) =>
    V1_transformTaggedValue(taggedValue),
  );
  return column;
};

const transformTable = (
  element: Table,
  context: V1_GraphTransformerContext,
): V1_Table => {
  const table = new V1_Table();
  table.columns = element.columns.map((val) => transformColumn(val as Column));
  table.name = element.name;
  table.primaryKey = element.primaryKey.map((e) => e.name);
  if (element.milestoning.length) {
    table.milestoning = element.milestoning.map((milestoning) =>
      V1_transformMilestoning(milestoning, context),
    );
  }
  table.stereotypes = element.stereotypes.map((stereotype) =>
    V1_transformStereotype(stereotype),
  );
  table.taggedValues = element.taggedValues.map((taggedValue) =>
    V1_transformTaggedValue(taggedValue),
  );
  return table;
};

const transformTabularFunction = (
  element: TabularFunction,
  context: V1_GraphTransformerContext,
): V1_TabularFunction => {
  const tabularFunction = new V1_TabularFunction();
  tabularFunction.columns = element.columns.map((val) =>
    transformColumn(val as Column),
  );
  tabularFunction.name = element.name;
  return tabularFunction;
};

const transformJoin = (
  element: Join,
  context: V1_GraphTransformerContext,
): V1_Join => {
  const join = new V1_Join();
  join.name = element.name;
  join.operation = V1_transformRelationalOperationElement(
    element.operation,
    context,
  );
  return join;
};

const transformFilter = (
  element: Filter,
  context: V1_GraphTransformerContext,
): V1_Filter => {
  const filter = new V1_Filter();
  filter.name = element.name;
  filter.operation = V1_transformRelationalOperationElement(
    element.operation,
    context,
  );
  return filter;
};

const transformView = (
  element: View,
  context: V1_GraphTransformerContext,
): V1_View => {
  const view = new V1_View();
  view.name = element.name;
  view.distinct = element.distinct;
  view.primaryKey = element.primaryKey.map((v) => v.name);
  view.columnMappings = element.columnMappings.map((columnMapping) =>
    transformColumnMapping(columnMapping, context),
  );
  view.groupBy = V1_transformGroupByMapping(element.groupBy, context);
  if (element.filter) {
    const filter = new V1_FilterMapping();
    const filterPointer = new V1_FilterPointer();
    filterPointer.name = element.filter.filterName;
    filter.filter = filterPointer;
    filterPointer.db =
      element.filter.filter.ownerReference.valueForSerialization;
    filter.joins = element.filter.joinTreeNode
      ? extractLine(element.filter.joinTreeNode).map((node) => {
          const joinPtr = new V1_JoinPointer();
          joinPtr.db = node.join.ownerReference.valueForSerialization ?? '';
          joinPtr.joinType = node.joinType;
          joinPtr.name = node.join.value.name;
          return joinPtr;
        })
      : [];
    view.filter = filter;
  }
  view.stereotypes = element.stereotypes.map((stereotype) =>
    V1_transformStereotype(stereotype),
  );
  view.taggedValues = element.taggedValues.map((taggedValue) =>
    V1_transformTaggedValue(taggedValue),
  );
  return view;
};

const transformSchema = (
  element: Schema,
  context: V1_GraphTransformerContext,
): V1_Schema => {
  const schema = new V1_Schema();
  schema.name = element.name;
  schema.tables = element.tables.map((table) => transformTable(table, context));
  schema.views = element.views.map((view) => transformView(view, context));
  schema.tabularFunctions = element.tabularFunctions.map((tabularFunction) =>
    transformTabularFunction(tabularFunction, context),
  );
  schema.stereotypes = element.stereotypes.map((stereotype) =>
    V1_transformStereotype(stereotype),
  );
  schema.taggedValues = element.taggedValues.map((taggedValue) =>
    V1_transformTaggedValue(taggedValue),
  );
  return schema;
};

export const V1_transformDatabase = (
  element: Database,
  context: V1_GraphTransformerContext,
): V1_Database => {
  const database = new V1_Database();
  V1_initPackageableElement(database, element);
  database.filters = element.filters.map((filter) =>
    transformFilter(filter, context),
  );
  database.joins = element.joins.map((join) => transformJoin(join, context));
  database.schemas = element.schemas.map((schema) =>
    transformSchema(schema, context),
  );
  database.stereotypes = element.stereotypes.map((stereotype) =>
    V1_transformStereotype(stereotype),
  );
  database.taggedValues = element.taggedValues.map((taggedValue) =>
    V1_transformTaggedValue(taggedValue),
  );
  database.includedStores = element.includes.map(
    (store) =>
      new V1_PackageableElementPointer(
        PackageableElementPointerType.STORE,
        store.valueForSerialization ?? '',
      ),
  );
  return database;
};
