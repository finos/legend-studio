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
import { FunctionParametersValidationNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/FunctionParametersValidationNode.js';
import { VariableExpression } from '../../../../../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import type { ParameterValidationContext } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/ParameterValidationContext.js';
import { EnumValidationContext } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/EnumValidationContext.js';
import { AllocationExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/AllocationExecutionNode.js';
import { ConstantExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/ConstantExecutionNode.js';
import { SequenceExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/SequenceExecutionNode.js';
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
import { V1_FunctionParametersValidationNode } from '../../../model/executionPlan/nodes/V1_FunctionParametersValidationNode.js';
import type { V1_Variable } from '../../../model/valueSpecification/V1_Variable.js';
import type { V1_ParameterValidationContext } from '../../../model/executionPlan/nodes/V1_ParameterValidationContext.js';
import { V1_EnumValidationContext } from '../../../model/executionPlan/nodes/V1_EnumValidationContext.js';
import { V1_AllocationExecutionNode } from '../../../model/executionPlan/nodes/V1_AllocationExecutionNode.js';
import { V1_ConstantExecutionNode } from '../../../model/executionPlan/nodes/V1_ConstantExecutionNode.js';
import { V1_SequenceExecutionNode } from '../../../model/executionPlan/nodes/V1_SequenceExecutionNode.js';
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
import type { PlatformImplementation } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/PlatformImplementation.js';
import type { V1_PlatformImplementation } from '../../../model/executionPlan/nodes/V1_PlatformImplementation.js';
import { JavaPlatformImplementation } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/JavaPlatformImplementation.js';
import { V1_JavaPlatformImplementation } from '../../../model/executionPlan/nodes/V1_JavaPlatformImplementation.js';
import type { V1_JavaClass } from '../../../model/executionPlan/nodes/V1_JavaClass.js';
import { JavaClass } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/JavaClass.js';
import {
  V1_buildValueSpecification,
  V1_buildGraphFetchTree,
  V1_ValueSpecificationBuilder,
} from './helpers/V1_ValueSpecificationBuilderHelper.js';
import { V1_GlobalGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_GlobalGraphFetchExecutionNode.js';
import { GlobalGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/GlobalGraphFetchExecutionNode.js';
import type { V1_XStorePropertyFetchDetails } from '../../../model/packageableElements/mapping/xStore/V1_XStorePropertyFetchDetails.js';
import { XStorePropertyFetchDetails } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStorePropertyFetchDetails.js';
import { V1_StoreMappingGlobalGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_StoreMappingGlobalGraphFetchExecutionNode.js';
import { StoreMappingGlobalGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/StoreMappingGlobalGraphFetchExecutionNode.js';
import { V1_ProcessingContext } from './helpers/V1_ProcessingContext.js';
import { V1_RelationalClassQueryTempTableGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_RelationalClassQueryTempTableGraphFetchExecutionNode.js';
import { RelationalClassQueryTempTableGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalClassQueryTempTableGraphFetchExecutionNode.js';
import type { LocalGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/LocalGraphFetchExecutionNode.js';
import type { RelationalGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalGraphFetchExecutionNode.js';
import { V1_RelationalRootQueryTempTableGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_RelationalRootQueryTempTableGraphFetchExecutionNode.js';
import { RelationalRootQueryTempTableGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalRootQueryTempTableGraphFetchExecutionNode.js';
import { Class } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { V1_RootGraphFetchTree } from '../../../model/valueSpecification/raw/classInstance/graph/V1_RootGraphFetchTree.js';
import type { V1_TempTableStrategy } from '../../../model/executionPlan/nodes/V1_TempTableStrategy.js';
import type { TempTableStrategy } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/TempTableStrategy.js';
import { PureExpressionPlatformExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/PureExpressionPlatformExecutionNode.js';
import { V1_PureExpressionPlatformExecutionNode } from '../../../model/executionPlan/nodes/V1_PureExpressionPlatformExecutionNode.js';
import { V1_PartialClassResultType } from '../../../model/executionPlan/results/V1_PartialClassResultType.js';
import { PartialClassResultType } from '../../../../../../../graph/metamodel/pure/executionPlan/result/PartialClassResultType.js';
import type { V1_SetImplementationPtr } from '../../../model/executionPlan/results/V1_SetImplementationPtr.js';
import { SetImplementationPtr } from '../../../../../../../graph/metamodel/pure/executionPlan/result/SetImplementationPtr.js';
import { PropertyMapping } from '../../../../../../../graph/metamodel/pure/executionPlan/result/PropertyMapping.js';
import type { V1_PropertyMapping } from '../../../model/executionPlan/results/V1_PropertyMapping.js';
import type { V1_PropertyWithParameters } from '../../../model/executionPlan/results/V1_PropertyWithParameters.js';
import { PropertyWithParameters } from '../../../../../../../graph/metamodel/pure/executionPlan/result/PropertyWithParameters.js';
import { V1_InMemoryRootGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_InMemoryRootGraphFetchExecutionNode.js';
import { InMemoryRootGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/InMemoryRootGraphFetchExecutionNode.js';
import { V1_InMemoryPropertyGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_InMemoryPropertyGraphFetchExecutionNode.js';
import { InMemoryPropertyGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/InMemoryPropertyGraphFetchExecutionNode.js';
import { V1_LoadFromResultSetAsValueTuplesTempTableStrategy } from '../../../model/executionPlan/nodes/V1_LoadFromResultSetAsValueTuplesTempTableStrategy.js';
import { V1_LoadFromSubQueryTempTableStrategy } from '../../../model/executionPlan/nodes/V1_LoadFromSubQueryTempTableStrategy.js';
import { V1_LoadFromTempFileTempTableStrategy } from '../../../model/executionPlan/nodes/V1_LoadFromTempFileTempTableStrategy.js';
import { LoadFromResultSetAsValueTuplesTempTableStrategy } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/LoadFromResultSetAsValueTuplesTempTableStrategy.js';
import { LoadFromSubQueryTempTableStrategy } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/LoadFromSubQueryTempTableStrategy.js';
import { LoadFromTempFileTempTableStrategy } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/LoadFromTempFileTempTableStrategy.js';
import { V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode.js';
import { RelationalCrossRootQueryTempTableGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/RelationalCrossRootQueryTempTableGraphFetchExecutionNode.js';
import type { InMemoryGraphFetchExecutionNode } from '../../../../../../../graph/metamodel/pure/executionPlan/nodes/InMemoryGraphFetchExecutionNode.js';
import { V1_InMemoryGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_InMemoryGraphFetchExecutionNode.js';
import { V1_RelationalGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_RelationalGraphFetchExecutionNode.js';
import type { V1_LocalGraphFetchExecutionNode } from '../../../model/executionPlan/nodes/V1_LocalGraphFetchExecutionNode.js';

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

const buildPropertyMapping = (
  protocol: V1_PropertyMapping,
): PropertyMapping => {
  const metamodel = new PropertyMapping();
  metamodel.property = protocol.property;
  metamodel.type = protocol.type;
  metamodel.enumMapping = protocol.enumMapping;
  return metamodel;
};

const buildSetImplementation = (
  protocol: V1_SetImplementationPtr,
): SetImplementationPtr => {
  const metamodel = new SetImplementationPtr();
  metamodel.class = protocol.class;
  metamodel.mapping = protocol.mapping;
  metamodel.id = protocol.id;
  metamodel.propertyMappings =
    protocol.propertyMappings.map(buildPropertyMapping);
  return metamodel;
};

const buildPropertiesWithParameters = (
  protocol: V1_PropertyWithParameters,
  context: V1_GraphBuilderContext,
): PropertyWithParameters => {
  const metamodel = new PropertyWithParameters();
  metamodel.property = protocol.property;
  metamodel.parameters = protocol.parameters.map((parameter) =>
    parameter.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        context,
        new V1_ProcessingContext(''),
        [],
        false,
      ),
    ),
  );
  return metamodel;
};

const buildPartialClassResultType = (
  protocol: V1_PartialClassResultType,
  context: V1_GraphBuilderContext,
): PartialClassResultType => {
  const metamodel = new PartialClassResultType();
  metamodel.type = context.resolveType(protocol.class);
  metamodel.setImplementations = protocol.setImplementations.map(
    buildSetImplementation,
  );
  metamodel.propertiesWithParameters = protocol.propertiesWithParameters.map(
    (p) => buildPropertiesWithParameters(p, context),
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
  } else if (protocol instanceof V1_PartialClassResultType) {
    return buildPartialClassResultType(protocol, context);
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

const buildParameterValidationContext = (
  protocol: V1_ParameterValidationContext,
): ParameterValidationContext => {
  if (protocol instanceof V1_EnumValidationContext) {
    const metamodel = new EnumValidationContext();
    metamodel.varName = protocol.varName;
    metamodel.validEnumValues = protocol.validEnumValues;
    return metamodel;
  }
  throw new UnsupportedOperationError(
    `Unknown parameter validation context type`,
    protocol,
  );
};

const buildFunctionParameters = (
  protocol: V1_Variable,
  context: V1_GraphBuilderContext,
): VariableExpression =>
  guaranteeType(
    V1_buildValueSpecification(protocol, context),
    VariableExpression,
  );

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
  metamodel.authDependent = protocol.authDependent;
  if (
    protocol.implementation &&
    protocol.implementation instanceof V1_JavaPlatformImplementation
  ) {
    metamodel.implementation = buildPlatformImplementation(
      protocol.implementation,
    );
  }
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

const buildFunctionParametersValidationNode = (
  protocol: V1_FunctionParametersValidationNode,
  context: V1_GraphBuilderContext,
): FunctionParametersValidationNode => {
  const metamodel = new FunctionParametersValidationNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.functionParameters = protocol.functionParameters.map((p) =>
    buildFunctionParameters(p, context),
  );
  metamodel.parameterValidationContext =
    protocol.parameterValidationContext.map(buildParameterValidationContext);
  return metamodel;
};

const buildAllocationExecutionNode = (
  protocol: V1_AllocationExecutionNode,
  context: V1_GraphBuilderContext,
): AllocationExecutionNode => {
  const metamodel = new AllocationExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.varName = protocol.varName;
  metamodel.realizeInMemory = protocol.realizeInMemory;
  return metamodel;
};

const buildConstantExecutionNode = (
  protocol: V1_ConstantExecutionNode,
  context: V1_GraphBuilderContext,
): ConstantExecutionNode => {
  const metamodel = new ConstantExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.values = protocol.values;
  return metamodel;
};

const buildSequenceExecutionNode = (
  protocol: V1_SequenceExecutionNode,
  context: V1_GraphBuilderContext,
): SequenceExecutionNode => {
  const metamodel = new SequenceExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  return metamodel;
};

const buildLoadFromResultSetAsValueTuplesTempTableStrategy = (
  protocol: V1_LoadFromResultSetAsValueTuplesTempTableStrategy,
  context: V1_GraphBuilderContext,
): LoadFromResultSetAsValueTuplesTempTableStrategy => {
  const metamodel = new LoadFromResultSetAsValueTuplesTempTableStrategy();
  metamodel.createTempTableNode = buildExecutionNode(
    protocol.createTempTableNode,
    context,
  );
  metamodel.dropTempTableNode = buildExecutionNode(
    protocol.dropTempTableNode,
    context,
  );
  metamodel.loadTempTableNode = buildExecutionNode(
    protocol.loadTempTableNode,
    context,
  );
  metamodel.tupleBatchSize = protocol.tupleBatchSize;
  return metamodel;
};

const buildLoadFromSubQueryTempTableStrategy = (
  protocol: V1_LoadFromSubQueryTempTableStrategy,
  context: V1_GraphBuilderContext,
): LoadFromSubQueryTempTableStrategy => {
  const metamodel = new LoadFromSubQueryTempTableStrategy();
  metamodel.createTempTableNode = buildExecutionNode(
    protocol.createTempTableNode,
    context,
  );
  metamodel.dropTempTableNode = buildExecutionNode(
    protocol.dropTempTableNode,
    context,
  );
  metamodel.loadTempTableNode = buildExecutionNode(
    protocol.loadTempTableNode,
    context,
  );
  return metamodel;
};

const buildLoadFromTempFileTempTableStrategy = (
  protocol: V1_LoadFromTempFileTempTableStrategy,
  context: V1_GraphBuilderContext,
): LoadFromTempFileTempTableStrategy => {
  const metamodel = new LoadFromTempFileTempTableStrategy();
  metamodel.createTempTableNode = buildExecutionNode(
    protocol.createTempTableNode,
    context,
  );
  metamodel.dropTempTableNode = buildExecutionNode(
    protocol.dropTempTableNode,
    context,
  );
  metamodel.loadTempTableNode = buildExecutionNode(
    protocol.loadTempTableNode,
    context,
  );
  return metamodel;
};

const buildTempTableStrategy = (
  protocol: V1_TempTableStrategy,
  context: V1_GraphBuilderContext,
): TempTableStrategy => {
  if (protocol instanceof V1_LoadFromResultSetAsValueTuplesTempTableStrategy) {
    return buildLoadFromResultSetAsValueTuplesTempTableStrategy(
      protocol,
      context,
    );
  }
  if (protocol instanceof V1_LoadFromSubQueryTempTableStrategy) {
    return buildLoadFromSubQueryTempTableStrategy(protocol, context);
  }
  if (protocol instanceof V1_LoadFromTempFileTempTableStrategy) {
    return buildLoadFromTempFileTempTableStrategy(protocol, context);
  }
  throw new UnsupportedOperationError(
    `Can't build temp table strategy`,
    protocol,
  );
};

const buildRelationalClassQueryTempTableGraphFetchExecutionNode = (
  protocol: V1_RelationalClassQueryTempTableGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): RelationalClassQueryTempTableGraphFetchExecutionNode => {
  const metamodel = new RelationalClassQueryTempTableGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.nodeIndex = protocol.nodeIndex;
  metamodel.parentIndex = protocol.parentIndex;
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildRelationalGraphFetchExecutionNode(child, context, parentClass),
  );
  metamodel.tempTableName = protocol.tempTableName;
  metamodel.processedTempTableName = protocol.tempTableName;
  metamodel.columns = protocol.columns.map(buildSQLResultColumn);
  if (protocol.tempTableStrategy) {
    metamodel.tempTableStrategy = buildTempTableStrategy(
      protocol.tempTableStrategy,
      context,
    );
  }
  return metamodel;
};

const buildRelationalRootQueryTempTableGraphFetchExecutionNode = (
  protocol: V1_RelationalRootQueryTempTableGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): RelationalRootQueryTempTableGraphFetchExecutionNode => {
  const metamodel = new RelationalRootQueryTempTableGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.nodeIndex = protocol.nodeIndex;
  metamodel.parentIndex = protocol.parentIndex;
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildRelationalGraphFetchExecutionNode(child, context, parentClass),
  );
  metamodel.tempTableName = protocol.tempTableName;
  metamodel.processedTempTableName = protocol.tempTableName;
  metamodel.columns = protocol.columns.map(buildSQLResultColumn);
  if (protocol.tempTableStrategy) {
    metamodel.tempTableStrategy = buildTempTableStrategy(
      protocol.tempTableStrategy,
      context,
    );
  }
  metamodel.batchSize = protocol.batchSize;
  metamodel.checked = protocol.checked;
  return metamodel;
};

const buildRelationalCrossRootQueryTempTableGraphFetchExecutionNode = (
  protocol: V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): RelationalCrossRootQueryTempTableGraphFetchExecutionNode => {
  const metamodel =
    new RelationalCrossRootQueryTempTableGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.nodeIndex = protocol.nodeIndex;
  metamodel.parentIndex = protocol.parentIndex;
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildRelationalGraphFetchExecutionNode(child, context, parentClass),
  );
  metamodel.tempTableName = protocol.tempTableName;
  metamodel.processedTempTableName = protocol.tempTableName;
  metamodel.columns = protocol.columns.map(buildSQLResultColumn);
  if (protocol.tempTableStrategy) {
    metamodel.tempTableStrategy = buildTempTableStrategy(
      protocol.tempTableStrategy,
      context,
    );
  }
  metamodel.parentTempTableName = protocol.parentTempTableName;
  metamodel.processedParentTempTableName =
    protocol.processedParentTempTableName;
  metamodel.parentTempTableColumns =
    protocol.parentTempTableColumns.map(buildSQLResultColumn);
  if (protocol.parentTempTableStrategy) {
    metamodel.parentTempTableStrategy = buildTempTableStrategy(
      protocol.parentTempTableStrategy,
      context,
    );
  }
  return metamodel;
};

function buildRelationalGraphFetchExecutionNode(
  protocol: V1_RelationalGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): RelationalGraphFetchExecutionNode {
  if (
    protocol instanceof
    V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode
  ) {
    return buildRelationalCrossRootQueryTempTableGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  } else if (
    protocol instanceof V1_RelationalRootQueryTempTableGraphFetchExecutionNode
  ) {
    return buildRelationalRootQueryTempTableGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  } else if (
    protocol instanceof V1_RelationalClassQueryTempTableGraphFetchExecutionNode
  ) {
    return buildRelationalClassQueryTempTableGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  }
  throw new UnsupportedOperationError(
    `Can't build RelationalGraphFetchExecutionNode`,
    protocol,
  );
}

const buildPureExpressionPlatformExecutionNode = (
  protocol: V1_PureExpressionPlatformExecutionNode,
  context: V1_GraphBuilderContext,
): PureExpressionPlatformExecutionNode => {
  const metamodel = new PureExpressionPlatformExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.pure = protocol.pure;
  return metamodel;
};

const buildInMemoryPropertyGraphFetchExecutionNode = (
  protocol: V1_InMemoryPropertyGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): InMemoryPropertyGraphFetchExecutionNode => {
  const metamodel = new InMemoryPropertyGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.nodeIndex = protocol.nodeIndex;
  metamodel.parentIndex = protocol.parentIndex;
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildInMemoryGraphFetchExecutionNode(child, context, parentClass),
  );
  return metamodel;
};

const buildInMemoryRootGraphFetchExecutionNode = (
  protocol: V1_InMemoryRootGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): InMemoryRootGraphFetchExecutionNode => {
  const metamodel = new InMemoryRootGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  metamodel.nodeIndex = protocol.nodeIndex;
  metamodel.parentIndex = protocol.parentIndex;
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildInMemoryGraphFetchExecutionNode(child, context, parentClass),
  );
  metamodel.batchSize = protocol.batchSize;
  metamodel.checked = protocol.checked;
  metamodel.filter = protocol.filter;
  return metamodel;
};

function buildInMemoryGraphFetchExecutionNode(
  protocol: V1_InMemoryGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): InMemoryGraphFetchExecutionNode {
  if (protocol instanceof V1_InMemoryRootGraphFetchExecutionNode) {
    return buildInMemoryRootGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  } else if (protocol instanceof V1_InMemoryPropertyGraphFetchExecutionNode) {
    return buildInMemoryPropertyGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  }
  throw new UnsupportedOperationError(
    `Can't build InMemoryGraphFetchExecutionNode`,
    protocol,
  );
}

const buildLocalGraphFetchExecutionNode = (
  protocol: V1_LocalGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): LocalGraphFetchExecutionNode => {
  if (protocol instanceof V1_RelationalGraphFetchExecutionNode) {
    return buildRelationalGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  } else if (protocol instanceof V1_InMemoryGraphFetchExecutionNode) {
    return buildInMemoryGraphFetchExecutionNode(protocol, context, parentClass);
  }
  throw new UnsupportedOperationError(
    `Can't transform LocalGraphFetchExecutionNode`,
    protocol,
  );
};

const buildGlobalGraphFetchExecutionNode = (
  protocol: V1_GlobalGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): GlobalGraphFetchExecutionNode => {
  const metamodel = new GlobalGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildGlobalGraphFetchExecutionNodeHelper(child, context, parentClass),
  );
  metamodel.localGraphFetchExecutionNode = buildLocalGraphFetchExecutionNode(
    protocol.localGraphFetchExecutionNode,
    context,
    parentClass,
  );
  metamodel.parentIndex = protocol.parentIndex;
  metamodel.enableConstraints = protocol.enableConstraints;
  metamodel.checked = protocol.checked;
  metamodel.localTreeIndices = protocol.localTreeIndices;
  metamodel.dependencyIndices = protocol.dependencyIndices;
  return metamodel;
};

const buildXStorePropertyFetchDetails = (
  protocol: V1_XStorePropertyFetchDetails,
): XStorePropertyFetchDetails => {
  const metamodel = new XStorePropertyFetchDetails();
  metamodel.supportsCaching = protocol.supportsCaching;
  metamodel.propertyPath = protocol.propertyPath;
  metamodel.sourceMappingId = protocol.sourceMappingId;
  metamodel.sourceSetId = protocol.sourceSetId;
  metamodel.targetMappingId = protocol.targetMappingId;
  metamodel.targetSetId = protocol.targetSetId;
  metamodel.subTree = protocol.subTree;
  metamodel.targetPropertiesOrdered = protocol.targetPropertiesOrdered;
  return metamodel;
};

const buildStoreMappingGlobalGraphFetchExecutionNode = (
  protocol: V1_StoreMappingGlobalGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): StoreMappingGlobalGraphFetchExecutionNode => {
  const metamodel = new StoreMappingGlobalGraphFetchExecutionNode();
  buildBaseExecutionNode(metamodel, protocol, context);
  if (protocol.graphFetchTree instanceof V1_RootGraphFetchTree) {
    parentClass = context.resolveClass(protocol.graphFetchTree.class).value;
  }
  metamodel.graphFetchTree = V1_buildGraphFetchTree(
    protocol.graphFetchTree,
    context,
    guaranteeType(parentClass, Class),
    [],
    new V1_ProcessingContext(''),
    true,
  );
  metamodel.children = protocol.children.map((child) =>
    buildGlobalGraphFetchExecutionNodeHelper(child, context, parentClass),
  );
  metamodel.localGraphFetchExecutionNode = buildLocalGraphFetchExecutionNode(
    protocol.localGraphFetchExecutionNode,
    context,
    parentClass,
  );
  metamodel.parentIndex = protocol.parentIndex;
  metamodel.enableConstraints = protocol.enableConstraints;
  metamodel.checked = protocol.checked;
  metamodel.localTreeIndices = protocol.localTreeIndices;
  metamodel.dependencyIndices = protocol.dependencyIndices;
  metamodel.store = protocol.store;
  if (protocol.xStorePropertyFetchDetails) {
    metamodel.xStorePropertyFetchDetails = buildXStorePropertyFetchDetails(
      protocol.xStorePropertyFetchDetails,
    );
  }
  metamodel.xStorePropertyMapping = protocol.xStorePropertyMapping;
  return metamodel;
};

function buildGlobalGraphFetchExecutionNodeHelper(
  protocol: V1_GlobalGraphFetchExecutionNode,
  context: V1_GraphBuilderContext,
  parentClass?: Class | undefined,
): GlobalGraphFetchExecutionNode {
  if (protocol instanceof V1_StoreMappingGlobalGraphFetchExecutionNode) {
    return buildStoreMappingGlobalGraphFetchExecutionNode(
      protocol,
      context,
      parentClass,
    );
  } else if (protocol instanceof V1_GlobalGraphFetchExecutionNode) {
    return buildGlobalGraphFetchExecutionNode(protocol, context, parentClass);
  }
  throw new UnsupportedOperationError(
    `Can't build GlobalGraphFetchExecutionNode`,
    protocol,
  );
}

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
  } else if (protocol instanceof V1_FunctionParametersValidationNode) {
    return buildFunctionParametersValidationNode(protocol, context);
  } else if (protocol instanceof V1_AllocationExecutionNode) {
    return buildAllocationExecutionNode(protocol, context);
  } else if (protocol instanceof V1_ConstantExecutionNode) {
    return buildConstantExecutionNode(protocol, context);
  } else if (protocol instanceof V1_SequenceExecutionNode) {
    return buildSequenceExecutionNode(protocol, context);
  } else if (protocol instanceof V1_StoreMappingGlobalGraphFetchExecutionNode) {
    return buildStoreMappingGlobalGraphFetchExecutionNode(protocol, context);
  } else if (protocol instanceof V1_GlobalGraphFetchExecutionNode) {
    return buildGlobalGraphFetchExecutionNode(protocol, context);
  } else if (
    protocol instanceof
    V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode
  ) {
    return buildRelationalCrossRootQueryTempTableGraphFetchExecutionNode(
      protocol,
      context,
    );
  } else if (
    protocol instanceof V1_RelationalRootQueryTempTableGraphFetchExecutionNode
  ) {
    return buildRelationalRootQueryTempTableGraphFetchExecutionNode(
      protocol,
      context,
    );
  } else if (
    protocol instanceof V1_RelationalClassQueryTempTableGraphFetchExecutionNode
  ) {
    return buildRelationalClassQueryTempTableGraphFetchExecutionNode(
      protocol,
      context,
    );
  } else if (protocol instanceof V1_PureExpressionPlatformExecutionNode) {
    return buildPureExpressionPlatformExecutionNode(protocol, context);
  } else if (protocol instanceof V1_InMemoryRootGraphFetchExecutionNode) {
    return buildInMemoryRootGraphFetchExecutionNode(protocol, context);
  } else if (protocol instanceof V1_InMemoryPropertyGraphFetchExecutionNode) {
    return buildInMemoryPropertyGraphFetchExecutionNode(protocol, context);
  }
  throw new UnsupportedOperationError(`Can't build execution node`, protocol);
}

// ---------------------------------------- Execution Plan ----------------------------------------

function buildJavaClass(protocol: V1_JavaClass): JavaClass {
  const metamodel = new JavaClass();
  metamodel.name = protocol.name;
  metamodel.package = protocol.package;
  metamodel.source = protocol.source;
  metamodel.byteCode = protocol.byteCode;
  return metamodel;
}

function buildPlatformImplementation(
  protocol: V1_PlatformImplementation,
): PlatformImplementation {
  if (protocol instanceof V1_JavaPlatformImplementation) {
    const metamodel = new JavaPlatformImplementation();
    metamodel.classes = protocol.classes.map(buildJavaClass);
    metamodel.executionClassFullName = protocol.executionClassFullName;
    metamodel.executionMethodName = protocol.executionMethodName;
    return metamodel;
  }
  throw new UnsupportedOperationError(
    `Can't build platform implementation`,
    protocol,
  );
}

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
    if (protocol.globalImplementationSupport) {
      metamodel.globalImplementationSupport = buildPlatformImplementation(
        protocol.globalImplementationSupport,
      );
    }
    return metamodel;
  }
  throw new UnsupportedOperationError(`Can't build execution plan`, protocol);
};
