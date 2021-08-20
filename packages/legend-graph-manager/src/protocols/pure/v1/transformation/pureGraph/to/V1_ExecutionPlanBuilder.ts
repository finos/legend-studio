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
import { ExecutionPlan } from '../../../../../../metamodels/pure/model/executionPlan/ExecutionPlan';
import type { ExecutionNode } from '../../../../../../metamodels/pure/model/executionPlan/nodes/ExecutionNode';
import { RelationalTDSInstantiationExecutionNode } from '../../../../../../metamodels/pure/model/executionPlan/nodes/RelationalInstantiationExecutionNode';
import { SQLExecutionNode } from '../../../../../../metamodels/pure/model/executionPlan/nodes/SQLExecutionNode';
import { SQLResultColumn } from '../../../../../../metamodels/pure/model/executionPlan/nodes/SQLResultColumn';
import { DatabaseConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
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
import type { DataType } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
import type { V1_ExecutionNode } from '../../../model/executionPlan/nodes/V1_ExecutionNode';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode';
import { V1_SQLExecutionNode } from '../../../model/executionPlan/nodes/V1_SQLExecutionNode';
import type { V1_SQLResultColumn } from '../../../model/executionPlan/nodes/V1_SQLResultColumn';
import type { V1_ExecutionPlan } from '../../../model/executionPlan/V1_ExecutionPlan';
import { V1_SimpleExecutionPlan } from '../../../model/executionPlan/V1_SimpleExecutionPlan';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext';
import { V1_ProtocolToMetaModelConnectionBuilder } from './V1_ProtocolToMetaModelConnectionBuilder';
import type { V1_ResultType } from '../../../model/executionPlan/results/V1_ResultType';
import type { ResultType } from '../../../../../../metamodels/pure/model/executionPlan/result/ResultType';
import { V1_DataTypeResultType } from '../../../model/executionPlan/results/V1_DataTypeResultType';
import { V1_TDSResultType } from '../../../model/executionPlan/results/V1_TDSResultType';
import { DataTypeResultType } from '../../../../../../metamodels/pure/model/executionPlan/result/DataTypeResultType';
import { TDSResultType } from '../../../../../../metamodels/pure/model/executionPlan/result/TDSResultType';
import { TDSColumn } from '../../../../../../metamodels/pure/model/executionPlan/result/TDSColumn';
import type { V1_TDSColumn } from '../../../model/executionPlan/results/V1_TDSColumn';
import { CORE_ELEMENT_PATH } from '../../../../../../MetaModelConst';

const parseDataType = (val: string): DataType => {
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
        return new VarChar(getTypeParams(val)[0]);
      } else if (val.match(/^CHAR\(\d+\)$/)) {
        return new Char(getTypeParams(val)[0]);
      } else if (val.match(/^VARBINARY\(\d+\)$/)) {
        return new VarBinary(getTypeParams(val)[0]);
      } else if (val.match(/^BINARY\(\d+\)$/)) {
        return new Binary(getTypeParams(val)[0]);
      } else if (val.match(/^DECIMAL\(\d+\)$/)) {
        const params = getTypeParams(val);
        return new Decimal(params[0], params[1]);
      } else if (val.match(/^NUMERIC\(\d+\)$/)) {
        const params = getTypeParams(val);
        return new Numeric(params[0], params[1]);
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
    'TDS column name is missing',
  );
  metamodel.documentation = protocol.doc;
  metamodel.sourceDataType = protocol.relationalType
    ? parseDataType(protocol.relationalType)
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
  metamodel.type = context.resolveType(CORE_ELEMENT_PATH.ANY);
  metamodel.tdsColumns = protocol.tdsColumns.map((column) =>
    buildTDSColumn(column, context),
  );
  return metamodel;
};

const buildResultType = (
  protocol: V1_ResultType,
  context: V1_GraphBuilderContext,
): ResultType => {
  if (protocol instanceof V1_DataTypeResultType) {
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
    'SQL result column label is missing',
  );
  metamodel.dataType = protocol.dataType
    ? parseDataType(protocol.dataType)
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
};

const buildSQLExecutionNode = (
  protocol: V1_SQLExecutionNode,
  context: V1_GraphBuilderContext,
): SQLExecutionNode => {
  const metamodel = new SQLExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.sqlQuery = guaranteeNonNullable(
    protocol.sqlQuery,
    'SQL execution node SQL query is missing',
  );
  metamodel.onConnectionCloseCommitQuery =
    protocol.onConnectionCloseCommitQuery;
  metamodel.onConnectionCloseRollbackQuery =
    protocol.onConnectionCloseRollbackQuery;
  metamodel.connection = guaranteeType(
    protocol.connection.accept_ConnectionVisitor(
      new V1_ProtocolToMetaModelConnectionBuilder(context),
    ),
    DatabaseConnection,
    'SQL execution node connection must be of type database connection',
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
  if (protocol instanceof V1_SQLExecutionNode) {
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
      'Single execution plan authentication dependent flag is missing',
    );
    metamodel.kerberos = protocol.kerberos;
    metamodel.processingTemplateFunctions = protocol.templateFunctions;
    metamodel.rootExecutionNode = buildExecutionNode(
      protocol.rootExecutionNode,
      context,
    );
    return metamodel;
  }
  throw new UnsupportedOperationError(`Can't build execution plan`, protocol);
};
