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
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { ExecutionPlan } from '../../../../../../../graph/metamodel/pure/executionPlan/ExecutionPlan.js';
import type { ExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/ExecutionNode.js';
import { RelationalTDSInstantiationExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalInstantiationExecutionNode.js';
import { SQLExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/SQLExecutionNode.js';
import { SQLResultColumn } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/SQLResultColumn.js';
import { DatabaseConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';
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
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import type { V1_ExecutionNode } from '../../../model/executionPlan/nodes/V1_ExecutionNode.js';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode.js';
import { V1_SQLExecutionNode } from '../../../model/executionPlan/nodes/V1_SQLExecutionNode.js';
import type { V1_SQLResultColumn } from '../../../model/executionPlan/nodes/V1_SQLResultColumn.js';
import type { V1_ExecutionPlan } from '../../../model/executionPlan/V1_ExecutionPlan.js';
import { V1_SimpleExecutionPlan } from '../../../model/executionPlan/V1_SimpleExecutionPlan.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';
import { V1_buildConnection } from './helpers/V1_ConnectionBuilderHelper.js';
import type { V1_ResultType } from '../../../model/executionPlan/results/V1_ResultType.js';
import type { ResultType } from '../../../../../../../graph/metamodel/pure/executionPlan/result/ResultType.js';
import { V1_DataTypeResultType } from '../../../model/executionPlan/results/V1_DataTypeResultType.js';
import { V1_TDSResultType } from '../../../model/executionPlan/results/V1_TDSResultType.js';
import { DataTypeResultType } from '../../../../../../../graph/metamodel/pure/executionPlan/result/DataTypeResultType.js';
import { TDSResultType } from '../../../../../../../graph/metamodel/pure/executionPlan/result/TDSResultType.js';
import { TDSColumn } from '../../../../../../../graph/metamodel/pure/executionPlan/result/TDSColumn.js';
import type { V1_TDSColumn } from '../../../model/executionPlan/results/V1_TDSColumn.js';
import { CORE_PURE_PATH } from '../../../../../../../graph/MetaModelConst.js';
import { V1_INTERNAL__UnknownResultType } from '../../../model/executionPlan/results/V1_INTERNAL__UnknownResultType.js';
import { INTERNAL__UnknownResultType } from '../../../../../../../graph/metamodel/pure/executionPlan/result/INTERNAL__UnknownResultType.js';
import { V1_INTERNAL__UnknownExecutionNode } from '../../../model/executionPlan/nodes/V1_INTERNAL__UnknownExecutionNode.js';
import { INTERNAL__UnknownExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/INTERNAL__UnknownExecutionNode.js';

export const V1_parseDataType = (val: string): RelationalDataType => {
  const getTypeParams = (typeVal: string): number[] =>
    typeVal
      .replace(/^.*\((?<params>.*)\)$/u, '$<params>')
      .split(',')
      .map((v) => Number(v))
      .filter((v) => !isNaN(v));
  switch (val) {
    case 'INTEGER':
      return new Integer();
    case 'FLOAT':
      return new Float();
    case 'DOUBLE':
      return new Double();
    case 'REAL':
      return new Real();
    case 'TIMESTAMP':
      return new Timestamp();
    case 'DATE':
      return new Date();
    case 'BIGINT':
      return new BigInt();
    case 'SMALLINT':
      return new SmallInt();
    case 'TINYINT':
      return new TinyInt();
    case 'BIT':
      return new Bit();
    case 'ARRAY':
    case 'OTHER':
      return new Other();
    default: {
      if (val.match(/^VARCHAR\(\d+\)$/)) {
        return new VarChar(
          guaranteeNonNullable(
            getTypeParams(val)[0],
            `VARCHAR type size is missing`,
          ),
        );
      } else if (val.match(/^CHAR\(\d+\)$/)) {
        return new Char(
          guaranteeNonNullable(
            getTypeParams(val)[0],
            `VAR type size is missing`,
          ),
        );
      } else if (val.match(/^VARBINARY\(\d+\)$/)) {
        return new VarBinary(
          guaranteeNonNullable(
            getTypeParams(val)[0],
            `VARBINARY type size is missing`,
          ),
        );
      } else if (val.match(/^BINARY\(\d+\)$/)) {
        return new Binary(
          guaranteeNonNullable(
            getTypeParams(val)[0],
            `BINARY type size is missing`,
          ),
        );
      } else if (val.match(/^DECIMAL\(\d+,*\d+\)$/)) {
        const params = getTypeParams(val);
        return new Decimal(
          guaranteeNonNullable(params[0], `Decimal type precision is missing`),
          guaranteeNonNullable(params[1], `Decimal type scale is missing`),
        );
      } else if (val.match(/^NUMERIC\(\d+,*\d+\)$/)) {
        const params = getTypeParams(val);
        return new Numeric(
          guaranteeNonNullable(params[0], `Numeric type precision is missing`),
          guaranteeNonNullable(params[1], `Numeric type scale is missing`),
        );
      }
      throw new UnsupportedOperationError(`Can't parse data type '${val}'`);
    }
  }
};

// ---------------------------------------- Result Type ----------------------------------------

const buildDataTypeResultType = (
  protocol: V1_DataTypeResultType,
  context: V1_GraphBuilderContext,
): DataTypeResultType => {
  const metamodel = new DataTypeResultType();
  metamodel.type = context.resolveType(protocol.dataType);
  return metamodel;
};

const buildTDSColumn = (
  protocol: V1_TDSColumn,
  context: V1_GraphBuilderContext,
): TDSColumn => {
  const metamodel = new TDSColumn();
  metamodel.name = guaranteeNonNullable(
    protocol.name,
    `TDS column 'name' field is missing`,
  );
  metamodel.documentation = protocol.doc;
  metamodel.sourceDataType = protocol.relationalType
    ? V1_parseDataType(protocol.relationalType)
    : undefined;
  metamodel.type = protocol.type
    ? context.resolveDataType(protocol.type)
    : undefined;
  // TODO: metamodel.enumMappingId
  // TODO: metamodel.offset
  return metamodel;
};

const buildTDSResultType = (
  protocol: V1_TDSResultType,
  context: V1_GraphBuilderContext,
): TDSResultType => {
  const metamodel = new TDSResultType();
  metamodel.type = context.resolveType(CORE_PURE_PATH.ANY);
  metamodel.tdsColumns = protocol.tdsColumns.map((column) =>
    buildTDSColumn(column, context),
  );
  return metamodel;
};

const buildResultType = (
  protocol: V1_ResultType,
  context: V1_GraphBuilderContext,
): ResultType => {
  if (protocol instanceof V1_INTERNAL__UnknownResultType) {
    const metamodel = new INTERNAL__UnknownResultType();
    metamodel.type = context.resolveType(CORE_PURE_PATH.ANY);
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_DataTypeResultType) {
    return buildDataTypeResultType(protocol, context);
  } else if (protocol instanceof V1_TDSResultType) {
    return buildTDSResultType(protocol, context);
  }
  throw new UnsupportedOperationError(
    `Can't build execution node result type`,
    protocol,
  );
};

// ---------------------------------------- Execution Node ----------------------------------------

const buildSQLResultColumn = (
  protocol: V1_SQLResultColumn,
): SQLResultColumn => {
  const metamodel = new SQLResultColumn();
  metamodel.label = guaranteeNonNullable(
    protocol.label,
    `SQL result column 'label' field is missing`,
  );
  metamodel.dataType = protocol.dataType
    ? V1_parseDataType(protocol.dataType)
    : undefined;
  return metamodel;
};

const buildBaseExecutionNode = (
  metamodel: ExecutionNode,
  protocol: V1_ExecutionNode,
  context: V1_GraphBuilderContext,
): void => {
  metamodel.resultSizeRange = protocol.resultSizeRange
    ? context.graph.getMultiplicity(
        protocol.resultSizeRange.lowerBound,
        protocol.resultSizeRange.upperBound,
      )
    : undefined;
  metamodel.resultType = buildResultType(protocol.resultType, context);
  metamodel.executionNodes = protocol.executionNodes.map((node) =>
    buildExecutionNode(node, context),
  );
  metamodel.implementation = protocol.implementation;
};

const buildSQLExecutionNode = (
  protocol: V1_SQLExecutionNode,
  context: V1_GraphBuilderContext,
): SQLExecutionNode => {
  const metamodel = new SQLExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.sqlQuery = guaranteeNonNullable(
    protocol.sqlQuery,
    `SQL execution node 'sqlQuery' field is missing`,
  );
  metamodel.onConnectionCloseCommitQuery =
    protocol.onConnectionCloseCommitQuery;
  metamodel.onConnectionCloseRollbackQuery =
    protocol.onConnectionCloseRollbackQuery;
  metamodel.connection = guaranteeType(
    V1_buildConnection(protocol.connection, context),
    DatabaseConnection,
    'SQL execution node connection must be a database connection',
  );
  metamodel.resultColumns = protocol.resultColumns.map(buildSQLResultColumn);
  return metamodel;
};

const buildRelationalTDSInstantiationExecutionNode = (
  protocol: V1_RelationalTDSInstantiationExecutionNode,
  context: V1_GraphBuilderContext,
): RelationalTDSInstantiationExecutionNode => {
  const metamodel = new RelationalTDSInstantiationExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  return metamodel;
};

function buildExecutionNode(
  protocol: V1_ExecutionNode,
  context: V1_GraphBuilderContext,
): ExecutionNode {
  if (protocol instanceof V1_INTERNAL__UnknownExecutionNode) {
    const metamodel = new INTERNAL__UnknownExecutionNode();
    buildBaseExecutionNode(metamodel, protocol, context);
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_SQLExecutionNode) {
    return buildSQLExecutionNode(protocol, context);
  } else if (protocol instanceof V1_RelationalTDSInstantiationExecutionNode) {
    return buildRelationalTDSInstantiationExecutionNode(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build execution node`, protocol);
}

// ---------------------------------------- Execution Plan ----------------------------------------

export const V1_buildExecutionPlan = (
  protocol: V1_ExecutionPlan,
  context: V1_GraphBuilderContext,
): ExecutionPlan => {
  if (protocol instanceof V1_SimpleExecutionPlan) {
    const metamodel = new ExecutionPlan();
    metamodel.authDependent = guaranteeNonNullable(
      protocol.authDependent,
      `Single execution plan 'authDependent' field is missing`,
    );
    metamodel.kerberos = protocol.kerberos;
    metamodel.processingTemplateFunctions = protocol.templateFunctions;
    metamodel.rootExecutionNode = buildExecutionNode(
      protocol.rootExecutionNode,
      context,
    );
    metamodel.globalImplementationSupport =
      protocol.globalImplementationSupport;
    return metamodel;
  }
  throw new UnsupportedOperationError(`Can't build execution plan`, protocol);
};
