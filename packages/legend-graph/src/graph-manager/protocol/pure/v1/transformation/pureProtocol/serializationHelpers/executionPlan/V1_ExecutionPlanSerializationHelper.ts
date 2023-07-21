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
  createModelSchema,
  deserialize,
  custom,
  serialize,
  primitive,
  list,
  optional,
  raw,
} from 'serializr';
import {
  type PlainObject,
  optionalCustom,
  deserializeMap,
  serializeMap,
  usingModelSchema,
  usingConstantValueSchema,
  UnsupportedOperationError,
  customList,
  optionalCustomList,
} from '@finos/legend-shared';
import type { V1_ExecutionPlan } from '../../../../model/executionPlan/V1_ExecutionPlan.js';
import { V1_SimpleExecutionPlan } from '../../../../model/executionPlan/V1_SimpleExecutionPlan.js';
import { V1_Protocol } from '../../../../model/V1_Protocol.js';
import { V1_DataTypeResultType } from '../../../../model/executionPlan/results/V1_DataTypeResultType.js';
import { V1_TDSResultType } from '../../../../model/executionPlan/results/V1_TDSResultType.js';
import { V1_TDSColumn } from '../../../../model/executionPlan/results/V1_TDSColumn.js';
import type { V1_ResultType } from '../../../../model/executionPlan/results/V1_ResultType.js';
import { V1_multiplicityModelSchema } from '../V1_CoreSerializationHelper.js';
import { V1_RelationalTDSInstantiationExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalTDSInstantiationExecutionNode.js';
import { V1_SQLExecutionNode } from '../../../../model/executionPlan/nodes/V1_SQLExecutionNode.js';
import { V1_SQLResultColumn } from '../../../../model/executionPlan/nodes/V1_SQLResultColumn.js';
import { V1_FunctionParametersValidationNode } from '../../../../model/executionPlan/nodes/V1_FunctionParametersValidationNode.js';
import { V1_EnumValidationContext } from '../../../../model/executionPlan/nodes/V1_EnumValidationContext.js';
import { V1_AllocationExecutionNode } from '../../../../model/executionPlan/nodes/V1_AllocationExecutionNode.js';
import { V1_ConstantExecutionNode } from '../../../../model/executionPlan/nodes/V1_ConstantExecutionNode.js';
import { V1_SequenceExecutionNode } from '../../../../model/executionPlan/nodes/V1_SequenceExecutionNode.js';
import {
  V1_deserializeDatabaseConnectionValue,
  V1_serializeDatabaseConnectionValue,
} from '../V1_ConnectionSerializationHelper.js';
import { V1_INTERNAL__UnknownResultType } from '../../../../model/executionPlan/results/V1_INTERNAL__UnknownResultType.js';
import { V1_INTERNAL__UnknownExecutionNode } from '../../../../model/executionPlan/nodes/V1_INTERNAL__UnknownExecutionNode.js';
import type { V1_ExecutionNode } from '../../../../model/executionPlan/nodes/V1_ExecutionNode.js';
import { V1_JavaPlatformImplementation } from '../../../../model/executionPlan/nodes/V1_JavaPlatformImplementation.js';
import { V1_JavaClass } from '../../../../model/executionPlan/nodes/V1_JavaClass.js';
import {
  V1_variableModelSchema,
  V1_deserializeGraphFetchTree,
  V1_deserializeValueSpecification,
  V1_serializeGraphFetchTree,
  V1_serializeValueSpecification,
} from '../V1_ValueSpecificationSerializer.js';
import { V1_StoreMappingGlobalGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_StoreMappingGlobalGraphFetchExecutionNode.js';
import { V1_SetImplementationPtr } from '../../../../model/executionPlan/results/V1_SetImplementationPtr.js';
import { V1_PropertyMapping } from '../../../../model/executionPlan/results/V1_PropertyMapping.js';
import { V1_PropertyWithParameters } from '../../../../model/executionPlan/results/V1_PropertyWithParameters.js';
import { V1_PartialClassResultType } from '../../../../model/executionPlan/results/V1_PartialClassResultType.js';
import { V1_GlobalGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_GlobalGraphFetchExecutionNode.js';
import { V1_RelationalClassQueryTempTableGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalClassQueryTempTableGraphFetchExecutionNode.js';
import { V1_RelationalRootQueryTempTableGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalRootQueryTempTableGraphFetchExecutionNode.js';
import type { V1_TempTableStrategy } from '../../../../model/executionPlan/nodes/V1_TempTableStrategy.js';
import { V1_PureExpressionPlatformExecutionNode } from '../../../../model/executionPlan/nodes/V1_PureExpressionPlatformExecutionNode.js';
import { V1_InMemoryPropertyGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_InMemoryPropertyGraphFetchExecutionNode.js';
import { V1_InMemoryRootGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_InMemoryRootGraphFetchExecutionNode.js';
import { V1_LoadFromResultSetAsValueTuplesTempTableStrategy } from '../../../../model/executionPlan/nodes/V1_LoadFromResultSetAsValueTuplesTempTableStrategy.js';
import { V1_LoadFromSubQueryTempTableStrategy } from '../../../../model/executionPlan/nodes/V1_LoadFromSubQueryTempTableStrategy.js';
import { V1_LoadFromTempFileTempTableStrategy } from '../../../../model/executionPlan/nodes/V1_LoadFromTempFileTempTableStrategy.js';
import { V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode } from '../../../../model/executionPlan/nodes/V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode.js';
import { V1_XStorePropertyFetchDetails } from '../../../../model/packageableElements/mapping/xStore/V1_XStorePropertyFetchDetails.js';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification.js';

// ---------------------------------------- Result Type ----------------------------------------

export enum V1_ExecutionResultTypeType {
  DATA_TYPE = 'dataType',
  TDS = 'tds',
  CLASS = 'class',
  PARTIAL_CLASS = 'partialClass',
  VOID = 'void',
}

const dataTypeResultTypeModelSchema = createModelSchema(V1_DataTypeResultType, {
  _type: usingConstantValueSchema(V1_ExecutionResultTypeType.DATA_TYPE),
  dataType: primitive(),
});

const TDSColumnModelSchema = createModelSchema(V1_TDSColumn, {
  doc: optional(primitive()),
  enumMapping: optionalCustom(
    (val) => serializeMap(val, (v) => v),
    (val) => deserializeMap(val, (v) => v),
  ),
  name: primitive(),
  relationalType: optional(primitive()),
  type: optional(primitive()),
});

const TDSResultTypeModelSchema = createModelSchema(V1_TDSResultType, {
  _type: usingConstantValueSchema(V1_ExecutionResultTypeType.TDS),
  tdsColumns: list(usingModelSchema(TDSColumnModelSchema)),
});

const propertyMappingModelSchema = createModelSchema(V1_PropertyMapping, {
  type: optional(primitive()),
  property: optional(primitive()),
  enumMapping: optionalCustom(
    (val) => serializeMap(val, (v) => v),
    (val) => deserializeMap(val, (v) => v),
  ),
});

const propertyWithParametersModelSchema = createModelSchema(
  V1_PropertyWithParameters,
  {
    property: optional(primitive()),
    parameters: optionalCustomList(
      (value: V1_ValueSpecification) =>
        V1_serializeValueSpecification(value, []),
      (value) => V1_deserializeValueSpecification(value, []),
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
  },
);

const setImplementationPtrModelSchema = createModelSchema(
  V1_SetImplementationPtr,
  {
    class: primitive(),
    id: optional(primitive()),
    mapping: optional(primitive()),
    propertyMappings: list(usingModelSchema(propertyMappingModelSchema)),
  },
);

const partialClassResultTypeModelSchema = createModelSchema(
  V1_PartialClassResultType,
  {
    _type: usingConstantValueSchema(V1_ExecutionResultTypeType.PARTIAL_CLASS),
    class: primitive(),
    setImplementations: list(usingModelSchema(setImplementationPtrModelSchema)),
    propertiesWithParameters: list(
      usingModelSchema(propertyWithParametersModelSchema),
    ),
  },
);

const V1_serializeResultType = (
  protocol: V1_ResultType,
): PlainObject<V1_ResultType> => {
  if (protocol instanceof V1_INTERNAL__UnknownResultType) {
    return protocol.content;
  } else if (protocol instanceof V1_DataTypeResultType) {
    return serialize(dataTypeResultTypeModelSchema, protocol);
  } else if (protocol instanceof V1_TDSResultType) {
    return serialize(TDSResultTypeModelSchema, protocol);
  } else if (protocol instanceof V1_PartialClassResultType) {
    return serialize(partialClassResultTypeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution result type`,
    protocol,
  );
};

const V1_deserializeResultType = (
  json: PlainObject<V1_ResultType>,
): V1_ResultType => {
  switch (json._type) {
    case V1_ExecutionResultTypeType.DATA_TYPE:
      return deserialize(dataTypeResultTypeModelSchema, json);
    case V1_ExecutionResultTypeType.TDS:
      return deserialize(TDSResultTypeModelSchema, json);
    case V1_ExecutionResultTypeType.PARTIAL_CLASS:
      return deserialize(partialClassResultTypeModelSchema, json);
    default: {
      // Fall back to create unknown stub if not supported
      const protocol = new V1_INTERNAL__UnknownResultType();
      protocol.content = json;
      return protocol;
    }
  }
};

// ---------------------------------------- Node ----------------------------------------

export enum V1_ExecutionNodeType {
  RELATIONAL_TDS_INSTANTIATION = 'relationalTdsInstantiation',
  SQL = 'sql',
  GLOBAL_GRAPH_FETCH = 'graphFetchExecutionNode',
  STORE_MAPPING_GLOBAL_GRAPH_FETCH = 'storeMappingGlobalGraphFetchExecutionNode',
  RELATIONAL_CROSS_ROOT_QUERY_TEMP_TABLE_GRAPH_FETCH = 'relationalCrossRootQueryTempTableGraphFetch',
  RELATIONAL_ROOT_QUERY_TEMP_TABLE_GRAPH_FETCH = 'relationalRootQueryTempTableGraphFetch',
  RELATIONAL_CLASS_QUERY_TEMP_TABLE_GRAPH_FETCH = 'relationalClassQueryTempTableGraphFetch',
  PURE_EXPRESSION_PLATFORM = 'platform',
  FUNCTION_PARAMETERS_VALIDATION = 'function-parameters-validation',
  ALLOCATION = 'allocation',
  CONSTANT = 'constant',
  SEQUENCE = 'sequence',
  IN_MEMORY_PROPERTY_GRAPH_FETCH = 'inMemoryPropertyGraphFetch',
  IN_MEMORY_ROOT_GRAPH_FETCH = 'inMemoryRootGraphFetch',
}

const enum V1_PlatformImplementationType {
  JAVA = 'java',
}

const relationalTDSInstantationExecutionNodeModelSchema = createModelSchema(
  V1_RelationalTDSInstantiationExecutionNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.RELATIONAL_TDS_INSTANTIATION,
    ),
    authDependent: optional(primitive()),
    executionNodes: list(
      custom(V1_serializeExecutionNode, V1_deserializeExecutionNode),
    ),
    resultSizeRange: usingModelSchema(V1_multiplicityModelSchema),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const SQLResultColumnModelSchema = createModelSchema(V1_SQLResultColumn, {
  dataType: primitive(),
  label: primitive(),
});

const javaClassModelSchema = createModelSchema(V1_JavaClass, {
  byteCode: optional(primitive()),
  name: primitive(),
  package: primitive(),
  source: primitive(),
});

const javaPlatformImplementationModelSchema = createModelSchema(
  V1_JavaPlatformImplementation,
  {
    _type: usingConstantValueSchema(V1_PlatformImplementationType.JAVA),
    classes: optionalCustomList(
      (value: V1_JavaClass) => serialize(javaClassModelSchema, value),
      (value) => deserialize(javaClassModelSchema, value),
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
    executionClassFullName: optional(primitive()),
    executionMethodName: optional(primitive()),
  },
);

const SQLExecutionNodeModelSchema = createModelSchema(V1_SQLExecutionNode, {
  _type: usingConstantValueSchema(V1_ExecutionNodeType.SQL),
  authDependent: optional(primitive()),
  connection: custom(
    V1_serializeDatabaseConnectionValue,
    V1_deserializeDatabaseConnectionValue,
  ),
  executionNodes: customList(
    V1_serializeExecutionNode,
    V1_deserializeExecutionNode,
  ),
  implementation: optional(
    usingModelSchema(javaPlatformImplementationModelSchema),
  ),
  onConnectionCloseCommitQuery: optional(primitive()),
  onConnectionCloseRollbackQuery: optional(primitive()),
  resultColumns: list(usingModelSchema(SQLResultColumnModelSchema)),
  resultSizeRange: usingModelSchema(V1_multiplicityModelSchema),
  resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  sqlQuery: primitive(),
});

const globalGraphFetchExecutionNodeModelSchema = createModelSchema(
  V1_GlobalGraphFetchExecutionNode,
  {
    _type: usingConstantValueSchema(V1_ExecutionNodeType.GLOBAL_GRAPH_FETCH),
    authDependent: optional(primitive()),
    checked: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    enableConstraints: optional(primitive()),
    graphFetchTree: custom(
      (val) => V1_serializeGraphFetchTree(val, []),
      (val) => V1_deserializeGraphFetchTree(val, []),
    ),
    localGraphFetchExecutionNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    children: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    parentIndex: optional(primitive()),
    localTreeIndices: list(primitive()),
    dependencyIndices: optional(list(primitive())),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const xStorePropertyFetchDetailsModelSchema = createModelSchema(
  V1_XStorePropertyFetchDetails,
  {
    propertyPath: primitive(),
    sourceMappingId: primitive(),
    sourceSetId: primitive(),
    subTree: primitive(),
    supportsCaching: primitive(),
    targetMappingId: primitive(),
    targetPropertiesOrdered: list(primitive()),
    targetSetId: primitive(),
  },
);

const storeMappingGlobalGraphFetchExecutionNodeModelSchema = createModelSchema(
  V1_StoreMappingGlobalGraphFetchExecutionNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.STORE_MAPPING_GLOBAL_GRAPH_FETCH,
    ),
    authDependent: optional(primitive()),
    checked: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    enableConstraints: optional(primitive()),
    graphFetchTree: custom(
      (val) => V1_serializeGraphFetchTree(val, []),
      (val) => V1_deserializeGraphFetchTree(val, []),
    ),
    localGraphFetchExecutionNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    children: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    parentIndex: optional(primitive()),
    localTreeIndices: list(primitive()),
    dependencyIndices: optional(list(primitive())),
    resultSizeRange: usingModelSchema(V1_multiplicityModelSchema),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
    store: primitive(),
    xStorePropertyFetchDetails: optional(
      usingModelSchema(xStorePropertyFetchDetailsModelSchema),
    ),
    xStorePropertyMapping: optional(raw()),
  },
);

export enum V1_TempTableStrategyType {
  LOAD_FROM_RESULT_SET_AS_VALUE = 'resultSet',
  LOAD_FROM_SUB_QUERY = 'subQuery',
  LOAD_FROM_TEMP_FILE = 'tempFile',
}

const loadFromResultSetAsValueTuplesTempTableStrategyModelSchema =
  createModelSchema(V1_LoadFromResultSetAsValueTuplesTempTableStrategy, {
    _type: usingConstantValueSchema(
      V1_TempTableStrategyType.LOAD_FROM_RESULT_SET_AS_VALUE,
    ),
    tupleBatchSize: optional(primitive()),
    createTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    loadTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    dropTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
  });

const loadFromLoadFromSubQueryTempTableStrategyModelSchema = createModelSchema(
  V1_LoadFromSubQueryTempTableStrategy,
  {
    _type: usingConstantValueSchema(
      V1_TempTableStrategyType.LOAD_FROM_SUB_QUERY,
    ),
    createTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    loadTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    dropTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
  },
);

const loadFromTempFileTempTableStrategyModelSchema = createModelSchema(
  V1_LoadFromTempFileTempTableStrategy,
  {
    _type: usingConstantValueSchema(
      V1_TempTableStrategyType.LOAD_FROM_TEMP_FILE,
    ),
    createTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    loadTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    dropTempTableNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
  },
);

const V1_serializeTempTableStrategy = (
  protocol: V1_TempTableStrategy,
): PlainObject<V1_TempTableStrategy> => {
  if (protocol instanceof V1_LoadFromResultSetAsValueTuplesTempTableStrategy) {
    return serialize(
      loadFromResultSetAsValueTuplesTempTableStrategyModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_LoadFromSubQueryTempTableStrategy) {
    return serialize(
      loadFromLoadFromSubQueryTempTableStrategyModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_LoadFromTempFileTempTableStrategy) {
    return serialize(loadFromTempFileTempTableStrategyModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize temp table strategy`,
    protocol,
  );
};

const V1_deserializeTempTableStrategy = (
  json: PlainObject<V1_TempTableStrategy>,
): V1_TempTableStrategy => {
  switch (json._type) {
    case V1_TempTableStrategyType.LOAD_FROM_RESULT_SET_AS_VALUE:
      return deserialize(
        loadFromResultSetAsValueTuplesTempTableStrategyModelSchema,
        json,
      );
    case V1_TempTableStrategyType.LOAD_FROM_SUB_QUERY:
      return deserialize(
        loadFromLoadFromSubQueryTempTableStrategyModelSchema,
        json,
      );
    case V1_TempTableStrategyType.LOAD_FROM_TEMP_FILE:
      return deserialize(loadFromTempFileTempTableStrategyModelSchema, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize temp table strategy`,
        json,
      );
    }
  }
};

const parameterValidationContextSchema = createModelSchema(
  V1_EnumValidationContext,
  {
    validEnumValues: list(primitive()),
    varName: primitive(),
  },
);

const functionParametersValidationNodeModelSchema = createModelSchema(
  V1_FunctionParametersValidationNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.FUNCTION_PARAMETERS_VALIDATION,
    ),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    functionParameters: list(usingModelSchema(V1_variableModelSchema)),
    parameterValidationContext: list(
      usingModelSchema(parameterValidationContextSchema),
    ),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const allocationExecutionNodeModelSchema = createModelSchema(
  V1_AllocationExecutionNode,
  {
    _type: usingConstantValueSchema(V1_ExecutionNodeType.ALLOCATION),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    realizeInMemory: optional(primitive()),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
    varName: primitive(),
  },
);

const constantExecutionNodeModelSchema = createModelSchema(
  V1_ConstantExecutionNode,
  {
    _type: usingConstantValueSchema(V1_ExecutionNodeType.CONSTANT),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
    values: raw(),
  },
);

const sequenceExecutionNodeModelSchema = createModelSchema(
  V1_SequenceExecutionNode,
  {
    _type: usingConstantValueSchema(V1_ExecutionNodeType.SEQUENCE),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const relationalClassQueryTempTableGraphFetchExecutionNodeModelSchema =
  createModelSchema(V1_RelationalClassQueryTempTableGraphFetchExecutionNode, {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.RELATIONAL_CLASS_QUERY_TEMP_TABLE_GRAPH_FETCH,
    ),
    authDependent: optional(primitive()),
    checked: optional(primitive()),
    children: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    columns: list(usingModelSchema(SQLResultColumnModelSchema)),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    graphFetchTree: custom(
      (val) => V1_serializeGraphFetchTree(val, []),
      (val) => V1_deserializeGraphFetchTree(val, []),
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    nodeIndex: primitive(),
    processedTempTableName: optional(primitive()),
    parentIndex: optional(primitive()),
    resultSizeRange: usingModelSchema(V1_multiplicityModelSchema),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
    tempTableName: primitive(),
    tempTableStrategy: optionalCustom(
      V1_serializeTempTableStrategy,
      V1_deserializeTempTableStrategy,
    ),
  });

const relationalRootQueryTempTableGraphFetchExecutionNodeModelSchema =
  createModelSchema(V1_RelationalRootQueryTempTableGraphFetchExecutionNode, {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.RELATIONAL_ROOT_QUERY_TEMP_TABLE_GRAPH_FETCH,
    ),
    authDependent: optional(primitive()),
    batchSize: optional(primitive()),
    checked: primitive(),
    children: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    columns: list(usingModelSchema(SQLResultColumnModelSchema)),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    graphFetchTree: custom(
      (val) => V1_serializeGraphFetchTree(val, []),
      (val) => V1_deserializeGraphFetchTree(val, []),
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    nodeIndex: primitive(),
    processedTempTableName: optional(primitive()),
    parentIndex: optional(primitive()),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
    tempTableName: primitive(),
    tempTableStrategy: optionalCustom(
      V1_serializeTempTableStrategy,
      V1_deserializeTempTableStrategy,
    ),
  });

const relationalCrossRootQueryTempTableGraphFetchExecutionNodeModelSchema =
  createModelSchema(
    V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode,
    {
      _type: usingConstantValueSchema(
        V1_ExecutionNodeType.RELATIONAL_CROSS_ROOT_QUERY_TEMP_TABLE_GRAPH_FETCH,
      ),
      authDependent: optional(primitive()),
      parentTempTableStrategy: optionalCustom(
        V1_serializeTempTableStrategy,
        V1_deserializeTempTableStrategy,
      ),
      parentTempTableName: primitive(),
      processedParentTempTableName: optional(primitive()),
      parentTempTableColumns: list(
        usingModelSchema(SQLResultColumnModelSchema),
      ),
      children: customList(
        V1_serializeExecutionNode,
        V1_deserializeExecutionNode,
      ),
      columns: list(usingModelSchema(SQLResultColumnModelSchema)),
      executionNodes: customList(
        V1_serializeExecutionNode,
        V1_deserializeExecutionNode,
      ),
      graphFetchTree: custom(
        (val) => V1_serializeGraphFetchTree(val, []),
        (val) => V1_deserializeGraphFetchTree(val, []),
      ),
      implementation: optional(
        usingModelSchema(javaPlatformImplementationModelSchema),
      ),
      nodeIndex: primitive(),
      processedTempTableName: optional(primitive()),
      parentIndex: optional(primitive()),
      resultSizeRange: usingModelSchema(V1_multiplicityModelSchema),
      resultType: custom(V1_serializeResultType, V1_deserializeResultType),
      tempTableName: primitive(),
      tempTableStrategy: optionalCustom(
        V1_serializeTempTableStrategy,
        V1_deserializeTempTableStrategy,
      ),
    },
  );

const pureExpressionPlatformExecutionNodeModelSchema = createModelSchema(
  V1_PureExpressionPlatformExecutionNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.PURE_EXPRESSION_PLATFORM,
    ),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    pure: raw(),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const inMemoryPropertyGraphFetchExecutionNodeModelSchema = createModelSchema(
  V1_InMemoryPropertyGraphFetchExecutionNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.IN_MEMORY_PROPERTY_GRAPH_FETCH,
    ),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    nodeIndex: primitive(),
    parentIndex: optional(primitive()),
    graphFetchTree: custom(
      (val) => V1_serializeGraphFetchTree(val, []),
      (val) => V1_deserializeGraphFetchTree(val, []),
    ),
    children: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

const inMemoryRootGraphFetchExecutionNodeModelSchema = createModelSchema(
  V1_InMemoryRootGraphFetchExecutionNode,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionNodeType.IN_MEMORY_ROOT_GRAPH_FETCH,
    ),
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    nodeIndex: primitive(),
    parentIndex: optional(primitive()),
    graphFetchTree: custom(
      (val) => V1_serializeGraphFetchTree(val, []),
      (val) => V1_deserializeGraphFetchTree(val, []),
    ),
    children: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    batchSize: optional(primitive()),
    checked: optional(primitive()),
    filter: optional(primitive()),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

export function V1_serializeExecutionNode(
  protocol: V1_ExecutionNode,
): PlainObject<V1_ExecutionNode> {
  if (protocol instanceof V1_INTERNAL__UnknownExecutionNode) {
    return protocol.content;
  } else if (protocol instanceof V1_RelationalTDSInstantiationExecutionNode) {
    return serialize(
      relationalTDSInstantationExecutionNodeModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_SQLExecutionNode) {
    return serialize(SQLExecutionNodeModelSchema, protocol);
  } else if (protocol instanceof V1_StoreMappingGlobalGraphFetchExecutionNode) {
    return serialize(
      storeMappingGlobalGraphFetchExecutionNodeModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_GlobalGraphFetchExecutionNode) {
    return serialize(globalGraphFetchExecutionNodeModelSchema, protocol);
  } else if (
    protocol instanceof
    V1_RelationalCrossRootQueryTempTableGraphFetchExecutionNode
  ) {
    return serialize(
      relationalCrossRootQueryTempTableGraphFetchExecutionNodeModelSchema,
      protocol,
    );
  } else if (
    protocol instanceof V1_RelationalRootQueryTempTableGraphFetchExecutionNode
  ) {
    return serialize(
      relationalRootQueryTempTableGraphFetchExecutionNodeModelSchema,
      protocol,
    );
  } else if (
    protocol instanceof V1_RelationalClassQueryTempTableGraphFetchExecutionNode
  ) {
    return serialize(
      relationalClassQueryTempTableGraphFetchExecutionNodeModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_PureExpressionPlatformExecutionNode) {
    return serialize(pureExpressionPlatformExecutionNodeModelSchema, protocol);
  } else if (protocol instanceof V1_FunctionParametersValidationNode) {
    return serialize(functionParametersValidationNodeModelSchema, protocol);
  } else if (protocol instanceof V1_AllocationExecutionNode) {
    return serialize(allocationExecutionNodeModelSchema, protocol);
  } else if (protocol instanceof V1_ConstantExecutionNode) {
    return serialize(constantExecutionNodeModelSchema, protocol);
  } else if (protocol instanceof V1_SequenceExecutionNode) {
    return serialize(sequenceExecutionNodeModelSchema, protocol);
  } else if (protocol instanceof V1_InMemoryRootGraphFetchExecutionNode) {
    return serialize(inMemoryRootGraphFetchExecutionNodeModelSchema, protocol);
  } else if (protocol instanceof V1_InMemoryPropertyGraphFetchExecutionNode) {
    return serialize(
      inMemoryPropertyGraphFetchExecutionNodeModelSchema,
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution node`,
    protocol,
  );
}

const V1_INTERNAL__UnknownExecutionNodeModelSchema = createModelSchema(
  V1_INTERNAL__UnknownExecutionNode,
  {
    authDependent: optional(primitive()),
    executionNodes: customList(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    implementation: raw(),
    resultSizeRange: optional(usingModelSchema(V1_multiplicityModelSchema)),
    resultType: custom(V1_serializeResultType, V1_deserializeResultType),
  },
);

export function V1_deserializeExecutionNode(
  json: PlainObject<V1_ExecutionNode>,
): V1_ExecutionNode {
  switch (json._type) {
    case V1_ExecutionNodeType.RELATIONAL_TDS_INSTANTIATION:
      return deserialize(
        relationalTDSInstantationExecutionNodeModelSchema,
        json,
      );
    case V1_ExecutionNodeType.SQL:
      return deserialize(SQLExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.STORE_MAPPING_GLOBAL_GRAPH_FETCH:
      return deserialize(
        storeMappingGlobalGraphFetchExecutionNodeModelSchema,
        json,
      );
    case V1_ExecutionNodeType.GLOBAL_GRAPH_FETCH:
      return deserialize(globalGraphFetchExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.RELATIONAL_CROSS_ROOT_QUERY_TEMP_TABLE_GRAPH_FETCH:
      return deserialize(
        relationalCrossRootQueryTempTableGraphFetchExecutionNodeModelSchema,
        json,
      );
    case V1_ExecutionNodeType.RELATIONAL_ROOT_QUERY_TEMP_TABLE_GRAPH_FETCH:
      return deserialize(
        relationalRootQueryTempTableGraphFetchExecutionNodeModelSchema,
        json,
      );
    case V1_ExecutionNodeType.RELATIONAL_CLASS_QUERY_TEMP_TABLE_GRAPH_FETCH:
      return deserialize(
        relationalClassQueryTempTableGraphFetchExecutionNodeModelSchema,
        json,
      );
    case V1_ExecutionNodeType.PURE_EXPRESSION_PLATFORM:
      return deserialize(pureExpressionPlatformExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.FUNCTION_PARAMETERS_VALIDATION:
      return deserialize(functionParametersValidationNodeModelSchema, json);
    case V1_ExecutionNodeType.ALLOCATION:
      return deserialize(allocationExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.CONSTANT:
      return deserialize(constantExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.SEQUENCE:
      return deserialize(sequenceExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.IN_MEMORY_ROOT_GRAPH_FETCH:
      return deserialize(inMemoryRootGraphFetchExecutionNodeModelSchema, json);
    case V1_ExecutionNodeType.IN_MEMORY_PROPERTY_GRAPH_FETCH:
      return deserialize(
        inMemoryPropertyGraphFetchExecutionNodeModelSchema,
        json,
      );
    default: {
      // Fall back to create unknown stub if not supported
      const protocol = deserialize(
        V1_INTERNAL__UnknownExecutionNodeModelSchema,
        json,
      );
      protocol.content = json;
      return protocol;
    }
  }
}

// ---------------------------------------- Plan ----------------------------------------

export enum V1_ExecutionPlanType {
  SINGLE = 'simple',
  COMPOSITE = 'composite',
}

const SimpleExecutionPlanModelSchema = createModelSchema(
  V1_SimpleExecutionPlan,
  {
    _type: usingConstantValueSchema(V1_ExecutionPlanType.SINGLE),
    authDependent: optional(primitive()),
    globalImplementationSupport: optional(
      usingModelSchema(javaPlatformImplementationModelSchema),
    ),
    kerberos: optional(primitive()),
    rootExecutionNode: custom(
      V1_serializeExecutionNode,
      V1_deserializeExecutionNode,
    ),
    serializer: usingModelSchema(V1_Protocol.serialization.schema),
    templateFunctions: list(primitive()),
  },
);

export const V1_serializeExecutionPlan = (
  protocol: V1_ExecutionPlan,
): PlainObject<V1_ExecutionPlan> => {
  if (protocol instanceof V1_SimpleExecutionPlan) {
    return serialize(SimpleExecutionPlanModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize execution plan`,
    protocol,
  );
};

export const V1_deserializeExecutionPlan = (
  json: PlainObject<V1_ExecutionPlan>,
): V1_ExecutionPlan => {
  switch (json._type) {
    case V1_ExecutionPlanType.SINGLE:
    default:
      return deserialize(SimpleExecutionPlanModelSchema, json);
  }
};
