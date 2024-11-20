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
import { GlobalGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/GlobalGraphFetchExecutionNode.js';
import { V1_GlobalGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_GlobalGraphFetchExecutionNode.js';
import type { XStorePropertyFetchDetails } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStorePropertyFetchDetails.js';
import { V1_XStorePropertyFetchDetails } from '../../../../model/packageableElements/mapping/xStore/V1_XStorePropertyFetchDetails.js';
import { StoreMappingGlobalGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/StoreMappingGlobalGraphFetchExecutionNode.js';
import { V1_StoreMappingGlobalGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_StoreMappingGlobalGraphFetchExecutionNode.js';
import {
  V1_transformGraphFetchTree,
  V1_transformRootValueSpecification,
} from '../V1_ValueSpecificationTransformer.js';
import type { V1_LocalGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_LocalGraphFetchExecutionNode.js';
import type { V1_RelationalGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalGraphFetchExecutionNode.js';
import { RelationalClassQueryTempTableGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalClassQueryTempTableGraphFetchExecutionNode.js';
import { V1_RelationalClassQueryTempTableGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalClassQueryTempTableGraphFetchExecutionNode.js';
import { RelationalRootQueryTempTableGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalRootQueryTempTableGraphFetchExecutionNode.js';
import { V1_RelationalRootQueryTempTableGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalRootQueryTempTableGraphFetchExecutionNode.js';
import type { TempTableStrategy } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/TempTableStrategy.js';
import type { V1_TempTableStrategy } from '../../../../model/executionPlan/nodes/V1_TempTableStrategy.js';
import { PureExpressionPlatformExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/PureExpressionPlatformExecutionNode.js';
import { V1_PureExpressionPlatformExecutionNode } from '../../../../model/executionPlan/nodes/V1_PureExpressionPlatformExecutionNode.js';
import { V1_PropertyMapping } from '../../../../model/executionPlan/results/V1_PropertyMapping.js';
import type { PropertyMapping } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/PropertyMapping.js';
import type { SetImplementationPtr } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/SetImplementationPtr.js';
import { V1_SetImplementationPtr } from '../../../../model/executionPlan/results/V1_SetImplementationPtr.js';
import { PartialClassResultType } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/PartialClassResultType.js';
import { V1_PartialClassResultType } from '../../../../model/executionPlan/results/V1_PartialClassResultType.js';
import type { PropertyWithParameters } from '../../../../../../../../graph/metamodel/pure/executionPlan/result/PropertyWithParameters.js';
import { V1_PropertyWithParameters } from '../../../../model/executionPlan/results/V1_PropertyWithParameters.js';
import { InMemoryPropertyGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/InMemoryPropertyGraphFetchExecutionNode.js';
import { V1_InMemoryPropertyGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_InMemoryPropertyGraphFetchExecutionNode.js';
import { InMemoryRootGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/InMemoryRootGraphFetchExecutionNode.js';
import { V1_InMemoryRootGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_InMemoryRootGraphFetchExecutionNode.js';
import { InMemoryGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/InMemoryGraphFetchExecutionNode.js';
import type { V1_InMemoryGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_InMemoryGraphFetchExecutionNode.js';
import { LoadFromResultSetAsValueTuplesTempTableStrategy } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/LoadFromResultSetAsValueTuplesTempTableStrategy.js';
import { V1_LoadFromResultSetAsValueTuplesTempTableStrategy } from '../../../../model/executionPlan/nodes/V1_LoadFromResultSetAsValueTuplesTempTableStrategy.js';
import { LoadFromSubQueryTempTableStrategy } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/LoadFromSubQueryTempTableStrategy.js';
import { V1_LoadFromSubQueryTempTableStrategy } from '../../../../model/executionPlan/nodes/V1_LoadFromSubQueryTempTableStrategy.js';
import { LoadFromTempFileTempTableStrategy } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/LoadFromTempFileTempTableStrategy.js';
import { V1_LoadFromTempFileTempTableStrategy } from '../../../../model/executionPlan/nodes/V1_LoadFromTempFileTempTableStrategy.js';
import { RelationalCrossRootQueryTempTableGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalCrossRootQueryTempTableGraphFetchExecutionNode.js';
import { V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode.js';
import type { LocalGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/LocalGraphFetchExecutionNode.js';
import { RelationalGraphFetchExecutionNode } from '../../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalGraphFetchExecutionNode.js';
import { V1_createGenericTypeWithElementPath } from '../V1_DomainTransformer.js';

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

const transformPropertyMapping = (
  metamodel: PropertyMapping,
): V1_PropertyMapping => {
  const protocol = new V1_PropertyMapping();
  protocol.property = metamodel.property;
  protocol.type = metamodel.type;
  protocol.enumMapping = metamodel.enumMapping;
  return protocol;
};

const transformSetImplementation = (
  metamodel: SetImplementationPtr,
): V1_SetImplementationPtr => {
  const protocol = new V1_SetImplementationPtr();
  protocol.class = metamodel.class;
  protocol.mapping = metamodel.mapping;
  protocol.id = metamodel.id;
  protocol.propertyMappings = metamodel.propertyMappings.map(
    transformPropertyMapping,
  );
  return protocol;
};

const transformPropertiesWithParameters = (
  metamodel: PropertyWithParameters,
): V1_PropertyWithParameters => {
  const protocol = new V1_PropertyWithParameters();
  protocol.property = metamodel.property;
  protocol.parameters = metamodel.parameters.map(
    V1_transformRootValueSpecification,
  );
  return protocol;
};

const transformPartialClassResultType = (
  metamodel: PartialClassResultType,
  context: V1_GraphTransformerContext,
): V1_PartialClassResultType => {
  const protocol = new V1_PartialClassResultType();
  protocol.class = metamodel.type.valueForSerialization ?? '';
  protocol.setImplementations = metamodel.setImplementations.map(
    transformSetImplementation,
  );
  protocol.propertiesWithParameters = metamodel.propertiesWithParameters.map(
    transformPropertiesWithParameters,
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
  } else if (metamodel instanceof PartialClassResultType) {
    return transformPartialClassResultType(metamodel, context);
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
  const _class = metamodel.genericType?.value.rawType.name;
  if (_class) {
    protocol.genericType = V1_createGenericTypeWithElementPath(_class);
  }
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
  protocol.authDependent = metamodel.authDependent;
  if (metamodel.implementation) {
    protocol.implementation = transformPlatformImplementation(
      metamodel.implementation,
    );
  }
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

const transformLoadFromResultSetAsValueTuplesTempTableStrategy = (
  metamodel: LoadFromResultSetAsValueTuplesTempTableStrategy,
  context: V1_GraphTransformerContext,
): V1_LoadFromResultSetAsValueTuplesTempTableStrategy => {
  const protocol = new V1_LoadFromResultSetAsValueTuplesTempTableStrategy();
  protocol.createTempTableNode = V1_transformExecutionNode(
    metamodel.createTempTableNode,
    context,
  );
  protocol.dropTempTableNode = V1_transformExecutionNode(
    metamodel.dropTempTableNode,
    context,
  );
  protocol.loadTempTableNode = V1_transformExecutionNode(
    metamodel.loadTempTableNode,
    context,
  );
  protocol.tupleBatchSize = metamodel.tupleBatchSize;
  return protocol;
};

const transformLoadFromSubQueryTempTableStrategy = (
  metamodel: LoadFromSubQueryTempTableStrategy,
  context: V1_GraphTransformerContext,
): V1_LoadFromSubQueryTempTableStrategy => {
  const protocol = new V1_LoadFromSubQueryTempTableStrategy();
  protocol.createTempTableNode = V1_transformExecutionNode(
    metamodel.createTempTableNode,
    context,
  );
  protocol.dropTempTableNode = V1_transformExecutionNode(
    metamodel.dropTempTableNode,
    context,
  );
  protocol.loadTempTableNode = V1_transformExecutionNode(
    metamodel.loadTempTableNode,
    context,
  );
  return protocol;
};

const transformLoadFromTempFileTempTableStrategy = (
  metamodel: LoadFromTempFileTempTableStrategy,
  context: V1_GraphTransformerContext,
): V1_LoadFromTempFileTempTableStrategy => {
  const protocol = new V1_LoadFromTempFileTempTableStrategy();
  protocol.createTempTableNode = V1_transformExecutionNode(
    metamodel.createTempTableNode,
    context,
  );
  protocol.dropTempTableNode = V1_transformExecutionNode(
    metamodel.dropTempTableNode,
    context,
  );
  protocol.loadTempTableNode = V1_transformExecutionNode(
    metamodel.loadTempTableNode,
    context,
  );
  return protocol;
};

const transformTempTableStrategy = (
  metamodel: TempTableStrategy,
  context: V1_GraphTransformerContext,
): V1_TempTableStrategy => {
  if (metamodel instanceof LoadFromResultSetAsValueTuplesTempTableStrategy) {
    return transformLoadFromResultSetAsValueTuplesTempTableStrategy(
      metamodel,
      context,
    );
  }
  if (metamodel instanceof LoadFromSubQueryTempTableStrategy) {
    return transformLoadFromSubQueryTempTableStrategy(metamodel, context);
  }
  if (metamodel instanceof LoadFromTempFileTempTableStrategy) {
    return transformLoadFromTempFileTempTableStrategy(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform temp table strategy`,
    metamodel,
  );
};

const transformRelationalClassQueryTempTableGraphFetchExecutionNode = (
  metamodel: RelationalClassQueryTempTableGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_RelationalClassQueryTempTableGraphFetchExecutionNode => {
  const protocol =
    new V1_RelationalClassQueryTempTableGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.nodeIndex = metamodel.nodeIndex;
  protocol.parentIndex = metamodel.parentIndex;
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformRelationalGraphFetchExecutionNode(child, context),
  );
  protocol.tempTableName = metamodel.tempTableName;
  protocol.processedTempTableName = metamodel.tempTableName;
  protocol.columns = metamodel.columns.map(transformSQLResultColumn);
  if (metamodel.tempTableStrategy) {
    protocol.tempTableStrategy = transformTempTableStrategy(
      metamodel.tempTableStrategy,
      context,
    );
  }
  return protocol;
};

const transformRelationalRootQueryTempTableGraphFetchExecutionNode = (
  metamodel: RelationalRootQueryTempTableGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_RelationalRootQueryTempTableGraphFetchExecutionNode => {
  const protocol = new V1_RelationalRootQueryTempTableGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.nodeIndex = metamodel.nodeIndex;
  protocol.parentIndex = metamodel.parentIndex;
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformRelationalGraphFetchExecutionNode(child, context),
  );
  protocol.tempTableName = metamodel.tempTableName;
  protocol.processedTempTableName = metamodel.tempTableName;
  protocol.columns = metamodel.columns.map(transformSQLResultColumn);
  if (metamodel.tempTableStrategy) {
    protocol.tempTableStrategy = transformTempTableStrategy(
      metamodel.tempTableStrategy,
      context,
    );
  }
  protocol.batchSize = metamodel.batchSize;
  protocol.checked = metamodel.checked;
  return protocol;
};

const transformRelationalCrossRootQueryTempTableGraphFetchExecutionNode = (
  metamodel: RelationalCrossRootQueryTempTableGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode => {
  const protocol =
    new V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.nodeIndex = metamodel.nodeIndex;
  protocol.parentIndex = metamodel.parentIndex;
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformRelationalGraphFetchExecutionNode(child, context),
  );
  protocol.tempTableName = metamodel.tempTableName;
  protocol.processedTempTableName = metamodel.tempTableName;
  protocol.columns = metamodel.columns.map(transformSQLResultColumn);
  if (metamodel.tempTableStrategy) {
    protocol.tempTableStrategy = transformTempTableStrategy(
      metamodel.tempTableStrategy,
      context,
    );
  }
  protocol.parentTempTableName = metamodel.parentTempTableName;
  protocol.processedParentTempTableName =
    metamodel.processedParentTempTableName;
  protocol.parentTempTableColumns = metamodel.parentTempTableColumns.map(
    transformSQLResultColumn,
  );
  if (metamodel.parentTempTableStrategy) {
    protocol.parentTempTableStrategy = transformTempTableStrategy(
      metamodel.parentTempTableStrategy,
      context,
    );
  }
  return protocol;
};

function transformRelationalGraphFetchExecutionNode(
  metamodel: RelationalGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_RelationalGraphFetchExecutionNode {
  if (
    metamodel instanceof
    RelationalCrossRootQueryTempTableGraphFetchExecutionNode
  ) {
    return transformRelationalCrossRootQueryTempTableGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (
    metamodel instanceof RelationalRootQueryTempTableGraphFetchExecutionNode
  ) {
    return transformRelationalRootQueryTempTableGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (
    metamodel instanceof RelationalClassQueryTempTableGraphFetchExecutionNode
  ) {
    return transformRelationalClassQueryTempTableGraphFetchExecutionNode(
      metamodel,
      context,
    );
  }
  throw new UnsupportedOperationError(
    `Can't transform RelationalGraphFetchExecutionNode`,
    metamodel,
  );
}

const transformPureExpressionPlatformExecutionNode = (
  metamodel: PureExpressionPlatformExecutionNode,
  context: V1_GraphTransformerContext,
): V1_PureExpressionPlatformExecutionNode => {
  const protocol = new V1_PureExpressionPlatformExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.pure = metamodel.pure;
  return protocol;
};

const transformInMemoryPropertyGraphFetchExecutionNode = (
  metamodel: InMemoryPropertyGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_InMemoryPropertyGraphFetchExecutionNode => {
  const protocol = new V1_InMemoryPropertyGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.nodeIndex = metamodel.nodeIndex;
  protocol.parentIndex = metamodel.parentIndex;
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformInMemoryGraphFetchExecutionNode(child, context),
  );
  return protocol;
};

const transformInMemoryRootGraphFetchExecutionNode = (
  metamodel: InMemoryRootGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_InMemoryRootGraphFetchExecutionNode => {
  const protocol = new V1_InMemoryRootGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.nodeIndex = metamodel.nodeIndex;
  protocol.parentIndex = metamodel.parentIndex;
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformInMemoryGraphFetchExecutionNode(child, context),
  );
  protocol.batchSize = metamodel.batchSize;
  protocol.checked = metamodel.checked;
  protocol.filter = metamodel.filter;
  return protocol;
};

function transformInMemoryGraphFetchExecutionNode(
  metamodel: InMemoryGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_InMemoryGraphFetchExecutionNode {
  if (metamodel instanceof InMemoryRootGraphFetchExecutionNode) {
    return transformInMemoryRootGraphFetchExecutionNode(metamodel, context);
  } else if (metamodel instanceof InMemoryPropertyGraphFetchExecutionNode) {
    return transformInMemoryPropertyGraphFetchExecutionNode(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform InMemoryGraphFetchExecutionNode`,
  );
}

const transformLocalGraphFetchExecutionNode = (
  metamodel: LocalGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_LocalGraphFetchExecutionNode => {
  if (metamodel instanceof RelationalGraphFetchExecutionNode) {
    return transformRelationalGraphFetchExecutionNode(metamodel, context);
  } else if (metamodel instanceof InMemoryGraphFetchExecutionNode) {
    return transformInMemoryGraphFetchExecutionNode(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform LocalGraphFetchExecutionNode`,
    metamodel,
  );
};

const transformGlobalGraphFetchExecutionNode = (
  metamodel: GlobalGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_GlobalGraphFetchExecutionNode => {
  const protocol = new V1_GlobalGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformGlobalGraphFetchExecutionNodeHelper(child, context),
  );
  protocol.localGraphFetchExecutionNode = transformLocalGraphFetchExecutionNode(
    metamodel.localGraphFetchExecutionNode,
    context,
  );
  protocol.parentIndex = metamodel.parentIndex;
  protocol.enableConstraints = metamodel.enableConstraints;
  protocol.checked = metamodel.checked;
  protocol.localTreeIndices = metamodel.localTreeIndices;
  protocol.dependencyIndices = metamodel.dependencyIndices;
  return protocol;
};

const transformXStorePropertyFetchDetails = (
  metamodel: XStorePropertyFetchDetails,
): V1_XStorePropertyFetchDetails => {
  const protocol = new V1_XStorePropertyFetchDetails();
  protocol.supportsCaching = metamodel.supportsCaching;
  protocol.propertyPath = metamodel.propertyPath;
  protocol.sourceMappingId = metamodel.sourceMappingId;
  protocol.sourceSetId = metamodel.sourceSetId;
  protocol.targetMappingId = metamodel.targetMappingId;
  protocol.targetSetId = metamodel.targetSetId;
  protocol.subTree = metamodel.subTree;
  protocol.targetPropertiesOrdered = metamodel.targetPropertiesOrdered;
  return protocol;
};

const transformStoreMappingGlobalGraphFetchExecutionNode = (
  metamodel: StoreMappingGlobalGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_StoreMappingGlobalGraphFetchExecutionNode => {
  const protocol = new V1_StoreMappingGlobalGraphFetchExecutionNode();
  transformBaseExecutionNode(metamodel, protocol, context);
  protocol.graphFetchTree = V1_transformGraphFetchTree(
    metamodel.graphFetchTree,
    [],
    new Map<string, unknown[]>(),
    false,
    false,
  );
  protocol.children = metamodel.children.map((child) =>
    transformGlobalGraphFetchExecutionNodeHelper(child, context),
  );
  protocol.localGraphFetchExecutionNode = transformLocalGraphFetchExecutionNode(
    metamodel.localGraphFetchExecutionNode,
    context,
  );
  protocol.parentIndex = metamodel.parentIndex;
  protocol.enableConstraints = metamodel.enableConstraints;
  protocol.checked = metamodel.checked;
  protocol.localTreeIndices = metamodel.localTreeIndices;
  protocol.dependencyIndices = metamodel.dependencyIndices;
  protocol.store = metamodel.store;
  if (metamodel.xStorePropertyFetchDetails) {
    protocol.xStorePropertyFetchDetails = transformXStorePropertyFetchDetails(
      metamodel.xStorePropertyFetchDetails,
    );
  }
  protocol.xStorePropertyMapping = metamodel.xStorePropertyMapping;
  return protocol;
};

function transformGlobalGraphFetchExecutionNodeHelper(
  metamodel: GlobalGraphFetchExecutionNode,
  context: V1_GraphTransformerContext,
): V1_GlobalGraphFetchExecutionNode {
  if (metamodel instanceof StoreMappingGlobalGraphFetchExecutionNode) {
    return transformStoreMappingGlobalGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (metamodel instanceof GlobalGraphFetchExecutionNode) {
    return transformGlobalGraphFetchExecutionNode(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform GlobalGraphFetchExecutionNode`,
    metamodel,
  );
}

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
  } else if (metamodel instanceof StoreMappingGlobalGraphFetchExecutionNode) {
    return transformStoreMappingGlobalGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (metamodel instanceof GlobalGraphFetchExecutionNode) {
    return transformGlobalGraphFetchExecutionNode(metamodel, context);
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
  } else if (
    metamodel instanceof
    RelationalCrossRootQueryTempTableGraphFetchExecutionNode
  ) {
    return transformRelationalCrossRootQueryTempTableGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (
    metamodel instanceof RelationalRootQueryTempTableGraphFetchExecutionNode
  ) {
    return transformRelationalRootQueryTempTableGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (
    metamodel instanceof RelationalClassQueryTempTableGraphFetchExecutionNode
  ) {
    return transformRelationalClassQueryTempTableGraphFetchExecutionNode(
      metamodel,
      context,
    );
  } else if (metamodel instanceof PureExpressionPlatformExecutionNode) {
    return transformPureExpressionPlatformExecutionNode(metamodel, context);
  } else if (metamodel instanceof InMemoryRootGraphFetchExecutionNode) {
    return transformInMemoryRootGraphFetchExecutionNode(metamodel, context);
  } else if (metamodel instanceof InMemoryPropertyGraphFetchExecutionNode) {
    return transformInMemoryPropertyGraphFetchExecutionNode(metamodel, context);
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
