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

import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import type { ExecutionPlan } from '../../../../../../../../graph/metamodel/pure/executionPlan/ExecutionPlan.js';
import type { ExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/ExecutionNode.js';
import { RelationalTDSInstantiationExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalInstantiationExecutionNode.js';
import { SQLExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/SQLExecutionNode.js';
import type { SQLResultColumn } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/SQLResultColumn.js';
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
  RelationalDataType,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import type { V1_ExecutionNode } from '../../../../model/executionPlan/nodes/V1_ExecutionNode.js';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode.js';
import { V1_SQLExecutionNode } from '../../../../model/executionPlan/nodes/V1_SQLExecutionNode.js';
import { V1_SQLResultColumn } from '../../../../model/executionPlan/nodes/V1_SQLResultColumn.js';
import type { V1_ExecutionPlan } from '../../../../model/executionPlan/V1_ExecutionPlan.js';
import type { V1_GraphTransformerContext } from '../V1_GraphTransformerContext.js';
import type { V1_ResultType } from '../../../../model/executionPlan/results/V1_ResultType.js';
import type { ResultType } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/ResultType.js';
import { V1_DataTypeResultType } from '../../../../model/executionPlan/results/V1_DataTypeResultType.js';
import { V1_TDSResultType } from '../../../../model/executionPlan/results/V1_TDSResultType.js';
import { DataTypeResultType } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/DataTypeResultType.js';
import { TDSResultType } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/TDSResultType.js';
import type { TDSColumn } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/TDSColumn.js';
import { V1_TDSColumn } from '../../../../model/executionPlan/results/V1_TDSColumn.js';
import { V1_SimpleExecutionPlan } from '../../../../model/executionPlan/V1_SimpleExecutionPlan.js';
import { V1_Protocol } from '../../../../model/V1_Protocol.js';
import { V1_transformMultiplicity } from '../V1_CoreTransformerHelper.js';
import { V1_transformConnection } from '../V1_ConnectionTransformer.js';
import { V1_DatabaseConnection } from '../../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection.js';
import { PureClientVersion } from '../../../../../../../../graphManager/GraphManagerUtils.js';

const stringifyDataType = (dataType: RelationalDataType): string => {
  if (dataType instanceof Integer) {
    return 'INTEGER';
  } else if (dataType instanceof Float) {
    return 'FLOAT';
  } else if (dataType instanceof Double) {
    return 'DOUBLE';
  } else if (dataType instanceof Real) {
    return 'REAL';
  } else if (dataType instanceof Timestamp) {
    return 'TIMESTAMP';
  } else if (dataType instanceof Date) {
    return 'DATE';
  } else if (dataType instanceof BigInt) {
    return 'BIGINT';
  } else if (dataType instanceof SmallInt) {
    return 'SMALLINT';
  } else if (dataType instanceof TinyInt) {
    return 'TINYINT';
  } else if (dataType instanceof Bit) {
    return 'BIT';
  } else if (dataType instanceof Other) {
    return 'OTHER';
  } else if (dataType instanceof VarChar) {
    return `VARCHAR(${dataType.size})`;
  } else if (dataType instanceof Char) {
    return `CHAR(${dataType.size})`;
  } else if (dataType instanceof VarBinary) {
    return `VARBINARY(${dataType.size})`;
  } else if (dataType instanceof Binary) {
    return `BINARY(${dataType.size})`;
  } else if (dataType instanceof Decimal) {
    return `DECIMAL(${dataType.precision},${dataType.scale})`;
  } else if (dataType instanceof Numeric) {
    return `NUMERIC(${dataType.precision},${dataType.scale})`;
  }
  throw new UnsupportedOperationError(
    `Can't stringify relational data type`,
    dataType,
  );
};

// ---------------------------------------- Result Type ----------------------------------------

const transformDataTypeResultType = (
  metamodel: DataTypeResultType,
  context: V1_GraphTransformerContext,
): V1_DataTypeResultType => {
  const protocol = new V1_DataTypeResultType();
  protocol.dataType = metamodel.type.valueForSerialization ?? '';
  return protocol;
};

const transformTDSColumn = (
  metamodel: TDSColumn,
  context: V1_GraphTransformerContext,
): V1_TDSColumn => {
  const protocol = new V1_TDSColumn();
  protocol.name = metamodel.name;
  protocol.doc = metamodel.documentation;
  protocol.type = metamodel.type?.valueForSerialization ?? '';
  protocol.relationalType =
    metamodel.sourceDataType instanceof RelationalDataType
      ? stringifyDataType(metamodel.sourceDataType)
      : undefined;
  return protocol;
};

const transformTDSResultType = (
  metamodel: TDSResultType,
  context: V1_GraphTransformerContext,
): V1_TDSResultType => {
  const protocol = new V1_TDSResultType();
  protocol.tdsColumns = metamodel.tdsColumns.map((column) =>
    transformTDSColumn(column, context),
  );
  return protocol;
};

const transformResultType = (
  metamodel: ResultType,
  context: V1_GraphTransformerContext,
): V1_ResultType => {
  if (metamodel instanceof DataTypeResultType) {
    return transformDataTypeResultType(metamodel, context);
  } else if (metamodel instanceof TDSResultType) {
    return transformTDSResultType(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform execution node result type`,
    metamodel,
  );
};

// ---------------------------------------- Execution Node ----------------------------------------

const transformSQLResultColumn = (
  metamodel: SQLResultColumn,
): V1_SQLResultColumn => {
  const protocol = new V1_SQLResultColumn();
  protocol.label = metamodel.label;
  protocol.dataType = metamodel.dataType
    ? stringifyDataType(metamodel.dataType)
    : ''; // this is to make sure to be consistent with the way Pure generates plan protocol
  return protocol;
};

const transformBaseExecutionNode = (
  metamodel: ExecutionNode,
  protocol: V1_ExecutionNode,
  context: V1_GraphTransformerContext,
): void => {
  protocol.resultSizeRange = metamodel.resultSizeRange
    ? V1_transformMultiplicity(metamodel.resultSizeRange)
    : undefined;
  protocol.resultType = transformResultType(metamodel.resultType, context);
  protocol.executionNodes = metamodel.executionNodes.map((node) =>
    V1_transformExecutionNode(node, context),
  );
};

const transformSQLExecutionNode = (
  metamodel: SQLExecutionNode,
  context: V1_GraphTransformerContext,
): V1_SQLExecutionNode => {
  const protocol = new V1_SQLExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.sqlQuery = metamodel.sqlQuery;
  protocol.onConnectionCloseCommitQuery =
    metamodel.onConnectionCloseCommitQuery;
  protocol.onConnectionCloseRollbackQuery =
    metamodel.onConnectionCloseRollbackQuery;
  protocol.connection = guaranteeType(
    V1_transformConnection(metamodel.connection, true, context),
    V1_DatabaseConnection,
    'SQL execution node connection must be of type database connection',
  );
  protocol.resultColumns = metamodel.resultColumns.map(
    transformSQLResultColumn,
  );
  return protocol;
};

const transformRelationalTDSInstantiationExecutionNode = (
  metamodel: RelationalTDSInstantiationExecutionNode,
  context: V1_GraphTransformerContext,
): V1_RelationalTDSInstantiationExecutionNode => {
  const protocol = new V1_RelationalTDSInstantiationExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  return protocol;
};

export function V1_transformExecutionNode(
  metamodel: ExecutionNode,
  context: V1_GraphTransformerContext,
): V1_ExecutionNode {
  if (metamodel instanceof SQLExecutionNode) {
    return transformSQLExecutionNode(metamodel, context);
  } else if (metamodel instanceof RelationalTDSInstantiationExecutionNode) {
    return transformRelationalTDSInstantiationExecutionNode(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform execution node`,
    metamodel,
  );
}

// ---------------------------------------- Execution Plan ----------------------------------------

export const V1_transformExecutionPlan = (
  metamodel: ExecutionPlan,
  context: V1_GraphTransformerContext,
): V1_ExecutionPlan => {
  const protocol = new V1_SimpleExecutionPlan();
  protocol.serializer = new V1_Protocol('pure', PureClientVersion.VX_X_X);
  protocol.authDependent = metamodel.authDependent;
  protocol.kerberos = metamodel.kerberos;
  protocol.templateFunctions = metamodel.processingTemplateFunctions;
  protocol.rootExecutionNode = V1_transformExecutionNode(
    metamodel.rootExecutionNode,
    context,
  );
  return protocol;
};
