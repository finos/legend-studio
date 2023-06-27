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
import { RelationalDataType } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import { FunctionParametersValidationNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/FunctionParametersValidationNode.js';
import type { ParameterValidationContext } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/ParameterValidationContext.js';
import { EnumValidationContext } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/EnumValidationContext.js';
import type { VariableExpression } from '../../../../../../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import { AllocationExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/AllocationExecutionNode.js';
import { ConstantExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/ConstantExecutionNode.js';
import { SequenceExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/SequenceExecutionNode.js';
import type { V1_ExecutionNode } from '../../../../model/executionPlan/nodes/V1_ExecutionNode.js';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode.js';
import { V1_SQLExecutionNode } from '../../../../model/executionPlan/nodes/V1_SQLExecutionNode.js';
import { V1_SQLResultColumn } from '../../../../model/executionPlan/nodes/V1_SQLResultColumn.js';
import { V1_FunctionParametersValidationNode } from '../../../../model/executionPlan/nodes/V1_FunctionParametersValidationNode.js';
import { V1_Variable } from '../../../../model/valueSpecification/V1_Variable.js';
import type { V1_ParameterValidationContext } from '../../../../model/executionPlan/nodes/V1_ParameterValidationContext.js';
import { V1_EnumValidationContext } from '../../../../model/executionPlan/nodes/V1_EnumValidationContext.js';
import { V1_AllocationExecutionNode } from '../../../../model/executionPlan/nodes/V1_AllocationExecutionNode.js';
import { V1_ConstantExecutionNode } from '../../../../model/executionPlan/nodes/V1_ConstantExecutionNode.js';
import { V1_SequenceExecutionNode } from '../../../../model/executionPlan/nodes/V1_SequenceExecutionNode.js';
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
import { PureClientVersion } from '../../../../../../../../graph-manager/GraphManagerUtils.js';
import { V1_PureGraphManager } from '../../../../V1_PureGraphManager.js';
import { stringifyDataType } from '../../../../../../../../graph/helpers/STO_Relational_Helper.js';
import { V1_INTERNAL__UnknownResultType } from '../../../../model/executionPlan/results/V1_INTERNAL__UnknownResultType.js';
import { INTERNAL__UnknownResultType } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/INTERNAL__UnknownResultType.js';
import { INTERNAL__UnknownExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/INTERNAL__UnknownExecutionNode.js';
import { V1_INTERNAL__UnknownExecutionNode } from '../../../../model/executionPlan/nodes/V1_INTERNAL__UnknownExecutionNode.js';
import type { JavaClass } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/JavaClass.js';
import { V1_JavaClass } from '../../../../model/executionPlan/nodes/V1_JavaClass.js';
import type { PlatformImplementation } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/PlatformImplementation.js';
import type { V1_PlatformImplementation } from '../../../../model/executionPlan/nodes/V1_PlatformImplementation.js';
import { JavaPlatformImplementation } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/JavaPlatformImplementation.js';
import { V1_JavaPlatformImplementation } from '../../../../model/executionPlan/nodes/V1_JavaPlatformImplementation.js';

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
  if (metamodel instanceof INTERNAL__UnknownResultType) {
    const protocol = new V1_INTERNAL__UnknownResultType();
    protocol.content = metamodel.content;
    return protocol;
  } else if (metamodel instanceof DataTypeResultType) {
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

const transformParameterValidationContext = (
  metamodel: ParameterValidationContext,
): V1_ParameterValidationContext => {
  if (metamodel instanceof EnumValidationContext) {
    const protocol = new V1_EnumValidationContext();
    protocol.varName = metamodel.varName;
    protocol.validEnumValues = metamodel.validEnumValues;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Unknown parameter validation context type`,
    metamodel,
  );
};

const transformFunctionParameters = (
  metamodel: VariableExpression,
): V1_Variable => {
  const protocol = new V1_Variable();
  protocol.name = metamodel.name;
  protocol.multiplicity = V1_transformMultiplicity(metamodel.multiplicity);
  protocol.class = metamodel.genericType?.value.rawType.name;
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
  protocol.implementation = metamodel.implementation;
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

const transformFunctionParametersValidationExecutionNode = (
  metamodel: FunctionParametersValidationNode,
  context: V1_GraphTransformerContext,
): V1_FunctionParametersValidationNode => {
  const protocol = new V1_FunctionParametersValidationNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.functionParameters = metamodel.functionParameters.map(
    transformFunctionParameters,
  );
  protocol.parameterValidationContext =
    metamodel.parameterValidationContext.map(
      transformParameterValidationContext,
    );
  return protocol;
};

const transformAllocationExecutionNode = (
  metamodel: AllocationExecutionNode,
  context: V1_GraphTransformerContext,
): V1_AllocationExecutionNode => {
  const protocol = new V1_AllocationExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.varName = metamodel.varName;
  protocol.realizeInMemory = metamodel.realizeInMemory;
  return protocol;
};

const transformConstantExecutionNode = (
  metamodel: ConstantExecutionNode,
  context: V1_GraphTransformerContext,
): V1_ConstantExecutionNode => {
  const protocol = new V1_ConstantExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.values = metamodel.values;
  return protocol;
};

const transformSequenceExecutionNode = (
  metamodel: SequenceExecutionNode,
  context: V1_GraphTransformerContext,
): V1_SequenceExecutionNode => {
  const protocol = new V1_SequenceExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
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
  if (metamodel instanceof INTERNAL__UnknownExecutionNode) {
    const protocol = new V1_INTERNAL__UnknownExecutionNode();
    transformBaseExecutionNode(metamodel, protocol, context);
    protocol.content = metamodel.content;
    return protocol;
  } else if (metamodel instanceof SQLExecutionNode) {
    return transformSQLExecutionNode(metamodel, context);
  } else if (metamodel instanceof RelationalTDSInstantiationExecutionNode) {
    return transformRelationalTDSInstantiationExecutionNode(metamodel, context);
  } else if (metamodel instanceof FunctionParametersValidationNode) {
    return transformFunctionParametersValidationExecutionNode(
      metamodel,
      context,
    );
  } else if (metamodel instanceof AllocationExecutionNode) {
    return transformAllocationExecutionNode(metamodel, context);
  } else if (metamodel instanceof ConstantExecutionNode) {
    return transformConstantExecutionNode(metamodel, context);
  } else if (metamodel instanceof SequenceExecutionNode) {
    return transformSequenceExecutionNode(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform execution node`,
    metamodel,
  );
}

// ---------------------------------------- Execution Plan ----------------------------------------

function transformJavaClass(metamodel: JavaClass): V1_JavaClass {
  const protocol = new V1_JavaClass();
  protocol.name = metamodel.name;
  protocol.package = metamodel.package;
  protocol.source = metamodel.source;
  protocol.byteCode = metamodel.byteCode;
  return protocol;
}

function transformPlatformImplementation(
  metamodel: PlatformImplementation,
): V1_PlatformImplementation {
  if (metamodel instanceof JavaPlatformImplementation) {
    const protocol = new V1_JavaPlatformImplementation();
    protocol.classes = metamodel.classes.map(transformJavaClass);
    protocol.executionClassFullName = metamodel.executionClassFullName;
    protocol.executionMethodName = metamodel.executionMethodName;
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform platform implementation`,
    metamodel,
  );
}

export const V1_transformExecutionPlan = (
  metamodel: ExecutionPlan,
  context: V1_GraphTransformerContext,
): V1_ExecutionPlan => {
  const protocol = new V1_SimpleExecutionPlan();
  protocol.serializer = new V1_Protocol(
    V1_PureGraphManager.PURE_PROTOCOL_NAME,
    PureClientVersion.VX_X_X,
  );
  protocol.authDependent = metamodel.authDependent;
  protocol.kerberos = metamodel.kerberos;
  protocol.templateFunctions = metamodel.processingTemplateFunctions;
  protocol.rootExecutionNode = V1_transformExecutionNode(
    metamodel.rootExecutionNode,
    context,
  );
  if (metamodel.globalImplementationSupport) {
    protocol.globalImplementationSupport = transformPlatformImplementation(
      metamodel.globalImplementationSupport,
    );
  }
  return protocol;
};
