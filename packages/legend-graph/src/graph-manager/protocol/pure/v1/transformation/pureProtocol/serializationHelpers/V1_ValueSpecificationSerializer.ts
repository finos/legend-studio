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
  primitive,
  serialize,
  SKIP,
  list,
  custom,
  deserialize,
  optional,
  type ModelSchema,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
  guaranteeIsString,
  isString,
  isPlainObject,
  optionalCustom,
} from '@finos/legend-shared';
import { V1_Variable } from '../../../model/valueSpecification/V1_Variable.js';
import { V1_RootGraphFetchTree } from '../../../model/valueSpecification/raw/classInstance/graph/V1_RootGraphFetchTree.js';
import { V1_Lambda } from '../../../model/valueSpecification/raw/V1_Lambda.js';
import { V1_EnumValue } from '../../../model/valueSpecification/raw/V1_EnumValue.js';
import { V1_Path } from '../../../model/valueSpecification/raw/classInstance/path/V1_Path.js';
import { V1_AppliedFunction } from '../../../model/valueSpecification/application/V1_AppliedFunction.js';
import { V1_Collection } from '../../../model/valueSpecification/raw/V1_Collection.js';
import { V1_CDecimal } from '../../../model/valueSpecification/raw/V1_CDecimal.js';
import { V1_CInteger } from '../../../model/valueSpecification/raw/V1_CInteger.js';
import { V1_CString } from '../../../model/valueSpecification/raw/V1_CString.js';
import { V1_CFloat } from '../../../model/valueSpecification/raw/V1_CFloat.js';
import { V1_CDateTime } from '../../../model/valueSpecification/raw/V1_CDateTime.js';
import { V1_CStrictDate } from '../../../model/valueSpecification/raw/V1_CStrictDate.js';
import { V1_CStrictTime } from '../../../model/valueSpecification/raw/V1_CStrictTime.js';
import { V1_CLatestDate } from '../../../model/valueSpecification/raw/V1_CLatestDate.js';
import { V1_CBoolean } from '../../../model/valueSpecification/raw/V1_CBoolean.js';
import { V1_AggregateValue } from '../../../model/valueSpecification/raw/classInstance/V1_AggregateValue.js';
import { V1_Pair } from '../../../model/valueSpecification/raw/classInstance/V1_Pair.js';
import { V1_RuntimeInstance } from '../../../model/valueSpecification/raw/classInstance/V1_RuntimeInstance.js';
import { V1_ExecutionContextInstance } from '../../../model/valueSpecification/raw/classInstance/V1_ExecutionContextInstance.js';
import { V1_PropertyGraphFetchTree } from '../../../model/valueSpecification/raw/classInstance/graph/V1_PropertyGraphFetchTree.js';
import { V1_SubTypeGraphFetchTree } from '../../../model/valueSpecification/raw/classInstance/graph/V1_SubTypeGraphFetchTree.js';
import { V1_SerializationConfig } from '../../../model/valueSpecification/raw/classInstance/V1_SerializationConfig.js';
import { V1_KeyExpression } from '../../../model/valueSpecification/raw/V1_KeyExpression.js';
import { V1_PureList } from '../../../model/valueSpecification/raw/classInstance/V1_PureList.js';
import { V1_TDSAggregateValue } from '../../../model/valueSpecification/raw/classInstance/V1_TDSAggregateValue.js';
import { V1_TDSColumnInformation } from '../../../model/valueSpecification/raw/classInstance/V1_TDSColumnInformation.js';
import { V1_TDSSortInformation } from '../../../model/valueSpecification/raw/classInstance/V1_TDSSortInformation.js';
import { V1_TDSOlapRank } from '../../../model/valueSpecification/raw/classInstance/V1_TDSOlapRank.js';
import { V1_TDSOlapAggregation } from '../../../model/valueSpecification/raw/classInstance/V1_TDSOlapAggregation.js';
import { V1_ColSpecArray } from '../../../model/valueSpecification/raw/classInstance/relation/V1_ColSpecArray.js';
import { V1_ColSpec } from '../../../model/valueSpecification/raw/classInstance/relation/V1_ColSpec.js';
import {
  V1_DataProductAccessor,
  V1_RelationStoreAccessor,
} from '../../../model/valueSpecification/raw/classInstance/relation/V1_RelationStoreAccessor.js';
import { V1_multiplicityModelSchema } from './V1_CoreSerializationHelper.js';
import type {
  V1_ValueSpecification,
  V1_ValueSpecificationVisitor,
} from '../../../model/valueSpecification/V1_ValueSpecification.js';
import { V1_PropertyPathElement } from '../../../model/valueSpecification/raw/classInstance/path/V1_PropertyPathElement.js';
import type { V1_PathElement } from '../../../model/valueSpecification/raw/classInstance/path/V1_PathElement.js';
import { V1_AppliedProperty } from '../../../model/valueSpecification/application/V1_AppliedProperty.js';
import { V1_serializeRuntime } from './V1_RuntimeSerializationHelper.js';
import type { V1_ExecutionContext } from '../../../model/valueSpecification/raw/executionContext/V1_ExecutionContext.js';
import { V1_AnalyticsExecutionContext } from '../../../model/valueSpecification/raw/executionContext/V1_AnalyticsExecutionContext.js';
import { V1_BaseExecutionContext } from '../../../model/valueSpecification/raw/executionContext/V1_BaseExecutionContext.js';
import type { V1_GraphFetchTree } from '../../../model/valueSpecification/raw/classInstance/graph/V1_GraphFetchTree.js';
import { V1_PackageableElementPtr } from '../../../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../../../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import { V1_EngineRuntime } from '../../../model/packageableElements/runtime/V1_Runtime.js';
import { V1_GenericTypeInstance } from '../../../model/valueSpecification/raw/V1_GenericTypeInstance.js';
import type { V1_PrimitiveValueSpecification } from '../../../model/valueSpecification/raw/V1_PrimitiveValueSpecification.js';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import { V1_ClassInstance } from '../../../model/valueSpecification/raw/V1_ClassInstance.js';
import { V1_CByteArray } from '../../../model/valueSpecification/raw/V1_CByteArray.js';
import {
  V1_deserializeGenericType,
  V1_genericTypeModelSchema,
} from './V1_TypeSerializationHelper.js';
import { V1_createGenericTypeWithElementPath } from '../../../helpers/V1_DomainHelper.js';

enum V1_ExecutionContextType {
  BASE_EXECUTION_CONTEXT = 'BaseExecutionContext',
  ANALYTICS_EXECUTION_CONTEXT = 'AnalyticsExecutionContext',
}

enum V1_PathElementType {
  PROPERTY_PATH_ELEMENT = 'propertyPath',
}

export enum V1_GraphFetchTreeType {
  PROPERTY_GRAPH_FETCH_TREE = 'propertyGraphFetchTree',
}

export enum V1_ClassInstanceType {
  ROOT_GRAPH_FETCH_TREE = 'rootGraphFetchTree',
  SUBTYPE_GRAPH_FETCH_TREE = 'subTypeGraphFetchTree',
  PATH = 'path',

  AGGREGATE_VALUE = 'aggregateValue',
  EXECUTION_CONTEXT_INSTANCE = 'executionContextInstance',
  PAIR = 'pair',
  PURE_LIST = 'listInstance',
  RUNTIME_INSTANCE = 'runtimeInstance',
  SERIALIZATION_CONFIG = 'alloySerializationConfig',

  COL_SPEC = 'colSpec',
  COL_SPEC_ARRAY = 'colSpecArray',
  RELATION_STORE_ACCESSOR = '>',
  INGEST_ACCESSOR = 'I',
  DATA_PRODUCT_ACCESSOR = 'P',

  TDS_AGGREGATE_VALUE = 'tdsAggregateValue',
  TDS_COLUMN_INFORMATION = 'tdsColumnInformation',
  TDS_SORT_INFORMATION = 'tdsSortInformation',
  TDS_OLAP_RANK = 'tdsOlapRank',
  TDS_OLAP_AGGREGATION = 'tdsOlapAggregation',
}

enum V1_ValueSpecificationType {
  VARIABLE = 'var',
  LAMBDA = 'lambda',
  KEY_EXPRESSION = 'keyExpression',

  APPLIED_FUNCTION = 'func',
  APPLIED_PROPERTY = 'property',

  PACKAGEABLE_ELEMENT_PTR = 'packageableElementPtr',
  GENERIC_TYPE_INSTANCE = 'genericTypeInstance',

  ENUM_VALUE = 'enumValue',
  COLLECTION = 'collection',
  CINTEGER = 'integer',
  CDECIMAL = 'decimal',
  CSTRING = 'string',
  CBOOLEAN = 'boolean',
  CBYTEARRAY = 'byteArray',
  CFLOAT = 'float',
  CDATETIME = 'dateTime',
  CSTRICTDATE = 'strictDate',
  CSTRICTTIME = 'strictTime',
  CLATESTDATE = 'latestDate',

  CLASS_INSTANCE = 'classInstance',

  // ------------------------------ DEPRECATED ----------------------------------
  HACKED_CLASS = 'hackedClass',
  HACKED_UNIT = 'hackedUnit',
  UNIT_TYPE = 'unitType',
  PRIMITIVE_TYPE = 'primitiveType',
  CLASS = 'class',
  ENUM = 'enum',
  MAPPING_INSTANCE = 'mappingInstance',
}

// ---------------------------------------- Value Specification --------------------------------------

export const V1_variableModelSchema = createModelSchema(V1_Variable, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.VARIABLE),
  genericType: optionalCustom(
    (val) => serialize(V1_genericTypeModelSchema, val),
    (val) => V1_deserializeGenericType(val),
    {
      beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
        /** @backwardCompatibility */
        if (
          jsonParentValue.class !== undefined &&
          jsonParentValue.genericType === undefined
        ) {
          callback(null, jsonParentValue.class);
        } else {
          callback(null, jsonParentValue.genericType);
        }
      },
    },
  ),
  multiplicity: usingModelSchema(V1_multiplicityModelSchema),
  name: primitive(),
});

export const V1_lambdaModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Lambda> =>
  createModelSchema(V1_Lambda, {
    _type: usingConstantValueSchema(V1_ValueSpecificationType.LAMBDA),
    body: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
    parameters: list(usingModelSchema(V1_variableModelSchema)),
  });

const keyExpressionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_KeyExpression> =>
  createModelSchema(V1_KeyExpression, {
    _type: usingConstantValueSchema(V1_ValueSpecificationType.KEY_EXPRESSION),
    add: optional(primitive()),
    expression: custom(
      (val) => V1_serializeValueSpecification(val, plugins),
      (val) => V1_deserializeValueSpecification(val, plugins),
    ),
    key: custom(
      (val) => V1_serializeValueSpecification(val, plugins),
      (val) => V1_deserializeValueSpecification(val, plugins),
    ),
  });

const appliedFunctionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AppliedFunction> =>
  createModelSchema(V1_AppliedFunction, {
    _type: usingConstantValueSchema(V1_ValueSpecificationType.APPLIED_FUNCTION),
    function: primitive(),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
  });

const appliedPropertyModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AppliedProperty> =>
  createModelSchema(V1_AppliedProperty, {
    _type: usingConstantValueSchema(V1_ValueSpecificationType.APPLIED_PROPERTY),
    class: optional(primitive()),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
    property: primitive(),
  });

export const V1_packageableElementPtrSchema = (isType?: boolean) =>
  createModelSchema(V1_PackageableElementPtr, {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.PACKAGEABLE_ELEMENT_PTR,
    ),
    fullPath: primitive(),
  });

const genericTypeInstanceSchema = (plugins: PureProtocolProcessorPlugin[]) =>
  createModelSchema(V1_GenericTypeInstance, {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.GENERIC_TYPE_INSTANCE,
    ),
    genericType: custom(
      (val) => serialize(V1_genericTypeModelSchema, val),
      (val) => V1_deserializeGenericType(val),
      {
        beforeDeserialize: function (callback, jsonValue, jsonParentValue) {
          /** @backwardCompatibility */
          if (
            jsonParentValue.fullPath !== undefined &&
            jsonParentValue.genericType === undefined
          ) {
            callback(null, jsonParentValue.fullPath);
          } else {
            callback(null, jsonParentValue.genericType);
          }
        },
      },
    ),
  });

/** @backwardCompatibility */
const deserializeHackedUnit = (json: PlainObject): V1_GenericTypeInstance => {
  const protocol = new V1_GenericTypeInstance();
  if (isString(json.unitType)) {
    protocol.genericType = V1_createGenericTypeWithElementPath(json.unitType);
  } else {
    protocol.genericType = V1_createGenericTypeWithElementPath(
      guaranteeIsString(
        json.fullPath,
        `Can't deserialize hacked unit: either field 'fullPath' or 'unitType' must be a non-empty string`,
      ),
    );
  }
  return protocol;
};

/** @backwardCompatibility */
const deserializeHackedClass = (json: PlainObject): V1_GenericTypeInstance => {
  const protocol = new V1_GenericTypeInstance();
  protocol.genericType = V1_createGenericTypeWithElementPath(
    guaranteeIsString(
      json.fullPath,
      `Can't deserialize hacked class: field 'fullPath' must be a non-empty string`,
    ),
  );
  return protocol;
};

const collectionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Collection> =>
  createModelSchema(V1_Collection, {
    _type: usingConstantValueSchema(V1_ValueSpecificationType.COLLECTION),
    multiplicity: usingModelSchema(V1_multiplicityModelSchema),
    values: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
  });

const enumValueModelSchema = createModelSchema(V1_EnumValue, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.ENUM_VALUE),
  fullPath: primitive(),
  value: primitive(),
});

const CDecimalModelSchema = createModelSchema(V1_CDecimal, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CDECIMAL),
  value: primitive(),
});

const CIntegerModelSchema = createModelSchema(V1_CInteger, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CINTEGER),
  value: primitive(),
});

const CStringModelSchema = createModelSchema(V1_CString, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CSTRING),
  value: primitive(),
});

const CFloatModelSchema = createModelSchema(V1_CFloat, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CFLOAT),
  value: primitive(),
});

const CDateTimeModelSchema = createModelSchema(V1_CDateTime, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CDATETIME),
  value: primitive(),
});

const CStrictTimeModelSchema = createModelSchema(V1_CStrictTime, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CSTRICTTIME),
  value: primitive(),
});

const CStrictDateModelSchema = createModelSchema(V1_CStrictDate, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CSTRICTDATE),
  value: primitive(),
});

const CLatestDateModelSchema = createModelSchema(V1_CLatestDate, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CLATESTDATE),
});

const CBooleanModelSchema = createModelSchema(V1_CBoolean, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CBOOLEAN),
  value: primitive(),
});

const CByteArrayModelSchema = createModelSchema(V1_CByteArray, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CBYTEARRAY),
  value: primitive(),
});

/** @backwardCompatibility */
const deserializePrimitiveValueSpecification = <
  T extends V1_PrimitiveValueSpecification,
>(
  json: PlainObject,
  plugins: PureProtocolProcessorPlugin[],
  deserializer: (json: PlainObject<T>) => T,
): V1_ValueSpecification => {
  if (Array.isArray(json.values)) {
    if (json.values.length === 0) {
      const collection = new V1_Collection();
      collection.multiplicity = V1_Multiplicity.ZERO;
      return collection;
    } else if (json.values.length === 1) {
      return deserializer({
        ...json,
        value: json.values[0],
      });
    } else {
      return V1_deserializeValueSpecification(
        {
          ...json,
          _type: V1_ValueSpecificationType.COLLECTION,
        },
        plugins,
      );
    }
  }
  return deserializer(json);
};

// ---------------------------------------- Class Instance --------------------------------------

const classInstanceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ClassInstance> =>
  createModelSchema(V1_ClassInstance, {
    _type: usingConstantValueSchema(V1_ValueSpecificationType.CLASS_INSTANCE),
    multiplicity: usingModelSchema(V1_multiplicityModelSchema),
    type: primitive(),
    value: custom(
      (val) => V1_serializeClassInstanceValue(val, plugins),
      (val, context) =>
        V1_deserializeClassInstanceValue(val, context.json.type, plugins),
    ),
  });

// path

const propertyPathElementModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PropertyPathElement> =>
  createModelSchema(V1_PropertyPathElement, {
    _type: usingConstantValueSchema(V1_PathElementType.PROPERTY_PATH_ELEMENT),
    property: primitive(),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
  });

function V1_serializePathElement(
  protocol: V1_PathElement,
  plugins: PureProtocolProcessorPlugin[],
): V1_PathElement | PlainObject<V1_PathElement> | typeof SKIP {
  if (protocol instanceof V1_PropertyPathElement) {
    return serialize(propertyPathElementModelSchema(plugins), protocol);
  }
  return SKIP;
}

function V1_deserializePathElement(
  json: PlainObject<V1_PathElement>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PathElement | typeof SKIP {
  switch (json._type) {
    case V1_PathElementType.PROPERTY_PATH_ELEMENT:
      return deserialize(propertyPathElementModelSchema(plugins), json);
    default:
      return SKIP;
  }
}

const pathModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Path> =>
  createModelSchema(V1_Path, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.PATH),
    name: primitive(),
    startType: primitive(),
    path: list(
      custom(
        (val) => V1_serializePathElement(val, plugins),
        (val) => V1_deserializePathElement(val, plugins),
      ),
    ),
  });

// graph fetch tree

const rootGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_RootGraphFetchTree> =>
  createModelSchema(V1_RootGraphFetchTree, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.ROOT_GRAPH_FETCH_TREE),
    class: primitive(),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
    subTypeTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
  });

const propertyGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PropertyGraphFetchTree> =>
  createModelSchema(V1_PropertyGraphFetchTree, {
    _type: usingConstantValueSchema(
      V1_GraphFetchTreeType.PROPERTY_GRAPH_FETCH_TREE,
    ),
    alias: optional(primitive()),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
    property: primitive(),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
    subTypeTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
    subType: optional(primitive()),
  });

const subTypeGraphFetchTreeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_SubTypeGraphFetchTree> =>
  createModelSchema(V1_SubTypeGraphFetchTree, {
    _type: usingConstantValueSchema(
      V1_ClassInstanceType.SUBTYPE_GRAPH_FETCH_TREE,
    ),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val, plugins),
        (val) => V1_deserializeGraphFetchTree(val, plugins),
      ),
    ),
    subTypeClass: primitive(),
  });

export function V1_serializeGraphFetchTree(
  protocol: V1_GraphFetchTree,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_GraphFetchTree> {
  // we have further subtypes of Property and RootGraph Tree so we should look at the extensions first
  const serializers = plugins.flatMap(
    (plugin) => plugin.V1_getExtraGraphFetchProtocolSerializers?.() ?? [],
  );
  for (const serializer of serializers) {
    const json = serializer(protocol, plugins);
    if (json) {
      return json;
    }
  }
  if (protocol instanceof V1_PropertyGraphFetchTree) {
    return serialize(propertyGraphFetchTreeModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_RootGraphFetchTree) {
    return serialize(rootGraphFetchTreeModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_SubTypeGraphFetchTree) {
    return serialize(subTypeGraphFetchTreeModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize graph fetch tree: no compatible serializer available from plugins`,
    protocol,
  );
}

export function V1_deserializeGraphFetchTree(
  json: PlainObject<V1_GraphFetchTree>,
  plugins: PureProtocolProcessorPlugin[],
): V1_GraphFetchTree {
  switch (json._type) {
    case V1_GraphFetchTreeType.PROPERTY_GRAPH_FETCH_TREE:
      return deserialize(propertyGraphFetchTreeModelSchema(plugins), json);
    case V1_ClassInstanceType.ROOT_GRAPH_FETCH_TREE:
      return deserialize(rootGraphFetchTreeModelSchema(plugins), json);
    case V1_ClassInstanceType.SUBTYPE_GRAPH_FETCH_TREE:
      return deserialize(subTypeGraphFetchTreeModelSchema(plugins), json);
    default: {
      const deserializers = plugins.flatMap(
        (plugin) => plugin.V1_getExtraGraphFetchProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of deserializers) {
        const protocol = deserializer(json, plugins);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize graph fetch tree node of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
}

// execution context

const analyticsExecutionContextModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AnalyticsExecutionContext> =>
  createModelSchema(V1_AnalyticsExecutionContext, {
    _type: usingConstantValueSchema(
      V1_ExecutionContextType.ANALYTICS_EXECUTION_CONTEXT,
    ),
    enableConstraints: optional(primitive()),
    queryTimeOutInSeconds: optional(primitive()),
    toFlowSetFunction: usingModelSchema(V1_lambdaModelSchema(plugins)),
    useAnalytics: primitive(),
  });

const baseExecutionContextModelSchema = createModelSchema(
  V1_BaseExecutionContext,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionContextType.BASE_EXECUTION_CONTEXT,
    ),
    enableConstraints: optional(primitive()),
    queryTimeOutInSeconds: optional(primitive()),
  },
);

function V1_serializeExecutionContext(
  protocol: V1_ExecutionContext,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ExecutionContext> | typeof SKIP {
  if (protocol instanceof V1_AnalyticsExecutionContext) {
    return serialize(analyticsExecutionContextModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_BaseExecutionContext) {
    return serialize(baseExecutionContextModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeExecutionContext(
  json: PlainObject<V1_ExecutionContext>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ExecutionContext | typeof SKIP {
  switch (json._type) {
    case V1_ExecutionContextType.ANALYTICS_EXECUTION_CONTEXT:
      return deserialize(analyticsExecutionContextModelSchema(plugins), json);
    case V1_ExecutionContextType.BASE_EXECUTION_CONTEXT:
      return deserialize(baseExecutionContextModelSchema, json);
    default:
      return SKIP;
  }
}

const executionContextInstanceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ExecutionContextInstance> =>
  createModelSchema(V1_ExecutionContextInstance, {
    _type: usingConstantValueSchema(
      V1_ClassInstanceType.EXECUTION_CONTEXT_INSTANCE,
    ),
    executionContext: custom(
      (val) => V1_serializeExecutionContext(val, plugins),
      (val) => V1_deserializeExecutionContext(val, plugins),
    ),
  });

// others
const aggregationValueModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AggregateValue> =>
  createModelSchema(V1_AggregateValue, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.AGGREGATE_VALUE),
    mapFn: usingModelSchema(V1_lambdaModelSchema(plugins)),
    aggregateFn: usingModelSchema(V1_lambdaModelSchema(plugins)),
  });

const pairModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Pair> =>
  createModelSchema(V1_Pair, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.PAIR),
    first: custom(
      (val) => V1_serializeValueSpecification(val, plugins),
      (val) => V1_deserializeValueSpecification(val, plugins),
    ),
    second: custom(
      (val) => V1_serializeValueSpecification(val, plugins),
      (val) => V1_deserializeValueSpecification(val, plugins),
    ),
  });

const runtimeInstanceModelSchema = createModelSchema(V1_RuntimeInstance, {
  _type: usingConstantValueSchema(V1_ClassInstanceType.RUNTIME_INSTANCE),
  runtime: custom(
    (val) => V1_serializeRuntime(val),
    (val) => deserialize(V1_EngineRuntime, val),
  ),
});

const pureListModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_PureList> =>
  createModelSchema(V1_PureList, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.PURE_LIST),
    values: list(
      custom(
        (val) => V1_serializeValueSpecification(val, plugins),
        (val) => V1_deserializeValueSpecification(val, plugins),
      ),
    ),
  });

const serializationConfigModelSchema = createModelSchema(
  V1_SerializationConfig,
  {
    _type: usingConstantValueSchema(V1_ClassInstanceType.SERIALIZATION_CONFIG),
    includeType: optional(primitive()),
    typeKeyName: primitive(),
    includeEnumTypee: optional(primitive()),
    removePropertiesWithNullValuese: optional(primitive()),
    removePropertiesWithEmptySetse: optional(primitive()),
    fullyQualifiedTypePathe: optional(primitive()),
    includeObjectReferencee: optional(primitive()),
  },
);

// TDS

const tdsAggregrateValueModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TDSAggregateValue> =>
  createModelSchema(V1_TDSAggregateValue, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.TDS_AGGREGATE_VALUE),
    name: primitive(),
    pmapFn: usingModelSchema(V1_lambdaModelSchema(plugins)),
    aggregateFn: usingModelSchema(V1_lambdaModelSchema(plugins)),
  });

const tdsColumnInformationModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TDSColumnInformation> =>
  createModelSchema(V1_TDSColumnInformation, {
    _type: usingConstantValueSchema(
      V1_ClassInstanceType.TDS_COLUMN_INFORMATION,
    ),
    name: primitive(),
    columnFn: usingModelSchema(V1_lambdaModelSchema(plugins)),
  });

const tdsSortInformationModelSchema = createModelSchema(V1_TDSSortInformation, {
  _type: usingConstantValueSchema(V1_ClassInstanceType.TDS_SORT_INFORMATION),
  column: primitive(),
  direction: primitive(),
});

const relationStoreAccessorModelSchema = createModelSchema(
  V1_RelationStoreAccessor,
  {
    path: list(primitive()),
    metadata: optional(primitive()),
  },
);

const dataProductAccessorModelSchema = createModelSchema(
  V1_DataProductAccessor,
  {
    path: list(primitive()),
    parameters: list(primitive()),
  },
);

const colSpecModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ColSpec> =>
  createModelSchema(V1_ColSpec, {
    function1: optional(usingModelSchema(V1_lambdaModelSchema(plugins))),
    function2: optional(usingModelSchema(V1_lambdaModelSchema(plugins))),
    name: primitive(),
    type: optional(primitive()),
  });

const colSpecArrayModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ColSpecArray> =>
  createModelSchema(V1_ColSpecArray, {
    colSpecs: list(usingModelSchema(colSpecModelSchema(plugins))),
  });

const tdsOlapRankModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TDSOlapRank> =>
  createModelSchema(V1_TDSOlapRank, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.TDS_OLAP_RANK),
    function: usingModelSchema(V1_lambdaModelSchema(plugins)),
  });

const tdsOlapAggregationModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TDSOlapAggregation> =>
  createModelSchema(V1_TDSOlapAggregation, {
    _type: usingConstantValueSchema(V1_ClassInstanceType.TDS_OLAP_AGGREGATION),
    function: usingModelSchema(V1_lambdaModelSchema(plugins)),
    columnName: primitive(),
  });

export function V1_deserializeClassInstanceValue(
  json: PlainObject,
  type: string,
  plugins: PureProtocolProcessorPlugin[],
): unknown {
  switch (type) {
    case V1_ClassInstanceType.PATH:
      return deserialize(pathModelSchema(plugins), json);
    case V1_ClassInstanceType.ROOT_GRAPH_FETCH_TREE:
      return deserialize(rootGraphFetchTreeModelSchema(plugins), json);
    case V1_ClassInstanceType.AGGREGATE_VALUE:
      return deserialize(aggregationValueModelSchema(plugins), json);
    case V1_ClassInstanceType.EXECUTION_CONTEXT_INSTANCE:
      return deserialize(executionContextInstanceModelSchema(plugins), json);
    case V1_ClassInstanceType.PAIR:
      return deserialize(pairModelSchema(plugins), json);
    case V1_ClassInstanceType.PURE_LIST:
      return deserialize(pureListModelSchema(plugins), json);
    case V1_ClassInstanceType.RUNTIME_INSTANCE:
      return deserialize(runtimeInstanceModelSchema, json);
    case V1_ClassInstanceType.SERIALIZATION_CONFIG:
      return deserialize(serializationConfigModelSchema, json);
    case V1_ClassInstanceType.TDS_AGGREGATE_VALUE:
      return deserialize(tdsAggregrateValueModelSchema(plugins), json);
    case V1_ClassInstanceType.TDS_COLUMN_INFORMATION:
      return deserialize(tdsColumnInformationModelSchema(plugins), json);
    case V1_ClassInstanceType.TDS_OLAP_AGGREGATION:
      return deserialize(tdsOlapAggregationModelSchema(plugins), json);
    case V1_ClassInstanceType.TDS_OLAP_RANK:
      return deserialize(tdsOlapRankModelSchema(plugins), json);
    case V1_ClassInstanceType.TDS_SORT_INFORMATION:
      return deserialize(tdsSortInformationModelSchema, json);
    case V1_ClassInstanceType.COL_SPEC:
      return deserialize(colSpecModelSchema(plugins), json);
    case V1_ClassInstanceType.COL_SPEC_ARRAY:
      return deserialize(colSpecArrayModelSchema(plugins), json);
    case V1_ClassInstanceType.RELATION_STORE_ACCESSOR:
    case V1_ClassInstanceType.INGEST_ACCESSOR:
      return deserialize(relationStoreAccessorModelSchema, json);
    case V1_ClassInstanceType.DATA_PRODUCT_ACCESSOR:
      return deserialize(dataProductAccessorModelSchema, json);
    default: {
      const deserializers = plugins.flatMap(
        (plugin) =>
          plugin.V1_getExtraClassInstanceValueProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of deserializers) {
        const protocol = deserializer(json, type, plugins);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize value specification of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
}

export function V1_serializeClassInstanceValue(
  protocol: unknown,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject {
  if (protocol instanceof V1_Path) {
    return serialize(pathModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_RootGraphFetchTree) {
    return serialize(rootGraphFetchTreeModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ExecutionContextInstance) {
    return serialize(executionContextInstanceModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_AggregateValue) {
    return serialize(aggregationValueModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_Pair) {
    return serialize(pairModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_PureList) {
    return serialize(pureListModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_RuntimeInstance) {
    return serialize(runtimeInstanceModelSchema, protocol);
  } else if (protocol instanceof V1_SerializationConfig) {
    return serialize(serializationConfigModelSchema, protocol);
  } else if (protocol instanceof V1_TDSAggregateValue) {
    return serialize(tdsAggregrateValueModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_TDSColumnInformation) {
    return serialize(tdsColumnInformationModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_TDSOlapAggregation) {
    return serialize(tdsOlapAggregationModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_TDSOlapRank) {
    return serialize(tdsOlapRankModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_TDSSortInformation) {
    return serialize(tdsSortInformationModelSchema, protocol);
  } else if (protocol instanceof V1_ColSpec) {
    return serialize(colSpecModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ColSpecArray) {
    return serialize(colSpecArrayModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_RelationStoreAccessor) {
    return serialize(relationStoreAccessorModelSchema, protocol);
  } else if (protocol instanceof V1_DataProductAccessor) {
    return serialize(dataProductAccessorModelSchema, protocol);
  }
  const serializers = plugins.flatMap(
    (plugin) =>
      plugin.V1_getExtraClassInstanceValueProtocolSerializers?.() ?? [],
  );
  for (const serializer of serializers) {
    const json = serializer(protocol, plugins);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize class instance value: no compatible serializer available from plugins`,
    protocol,
  );
}

// ---------------------------------------- Serialization Methods --------------------------------------

class V1_ValueSpecificationSerializer
  implements V1_ValueSpecificationVisitor<PlainObject<V1_ValueSpecification>>
{
  readonly plugins: PureProtocolProcessorPlugin[] = [];

  constructor(plugins: PureProtocolProcessorPlugin[]) {
    this.plugins = plugins;
  }

  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): PlainObject<V1_ValueSpecification> {
    return valueSpecification.content;
  }

  visit_Variable(
    valueSpecification: V1_Variable,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(V1_variableModelSchema, valueSpecification);
  }

  visit_Lambda(
    valueSpecification: V1_Lambda,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(V1_lambdaModelSchema(this.plugins), valueSpecification);
  }

  visit_KeyExpression(
    valueSpecification: V1_KeyExpression,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(
      keyExpressionModelSchema(this.plugins),
      valueSpecification,
    );
  }

  visit_PackageableElementPtr(
    valueSpecification: V1_PackageableElementPtr,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(V1_packageableElementPtrSchema(), valueSpecification);
  }

  visit_GenericTypeInstance(
    valueSpecification: V1_GenericTypeInstance,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(
      genericTypeInstanceSchema(this.plugins),
      valueSpecification,
    );
  }

  visit_AppliedFunction(
    valueSpecification: V1_AppliedFunction,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(
      appliedFunctionModelSchema(this.plugins),
      valueSpecification,
    );
  }

  visit_AppliedProperty(
    valueSpecification: V1_AppliedProperty,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(
      appliedPropertyModelSchema(this.plugins),
      valueSpecification,
    );
  }

  visit_Collection(
    valueSpecification: V1_Collection,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(collectionModelSchema(this.plugins), valueSpecification);
  }

  visit_EnumValue(
    valueSpecification: V1_EnumValue,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(enumValueModelSchema, valueSpecification);
  }

  visit_CInteger(
    valueSpecification: V1_CInteger,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CIntegerModelSchema, valueSpecification);
  }

  visit_CDecimal(
    valueSpecification: V1_CDecimal,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CDecimalModelSchema, valueSpecification);
  }

  visit_CString(
    valueSpecification: V1_CString,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CStringModelSchema, valueSpecification);
  }

  visit_CBoolean(
    valueSpecification: V1_CBoolean,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CBooleanModelSchema, valueSpecification);
  }

  visit_CByteArray(
    valueSpecification: V1_CByteArray,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CByteArrayModelSchema, valueSpecification);
  }

  visit_CFloat(
    valueSpecification: V1_CFloat,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CFloatModelSchema, valueSpecification);
  }

  visit_CDateTime(
    valueSpecification: V1_CDateTime,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CDateTimeModelSchema, valueSpecification);
  }

  visit_CStrictDate(
    valueSpecification: V1_CStrictDate,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CStrictDateModelSchema, valueSpecification);
  }

  visit_CStrictTime(
    valueSpecification: V1_CStrictTime,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CStrictTimeModelSchema, valueSpecification);
  }

  visit_CLatestDate(
    valueSpecification: V1_CLatestDate,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(CLatestDateModelSchema, valueSpecification);
  }

  visit_ClassInstance(
    valueSpecification: V1_ClassInstance,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(
      classInstanceModelSchema(this.plugins),
      valueSpecification,
    );
  }
}

export function V1_deserializeValueSpecification(
  json: PlainObject<V1_ValueSpecification>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ValueSpecification {
  switch (json._type) {
    case V1_ValueSpecificationType.APPLIED_FUNCTION:
      return deserialize(appliedFunctionModelSchema(plugins), json);
    case V1_ValueSpecificationType.APPLIED_PROPERTY:
      return deserialize(appliedPropertyModelSchema(plugins), json);
    case V1_ValueSpecificationType.VARIABLE:
      return deserialize(V1_variableModelSchema, json);
    case V1_ValueSpecificationType.LAMBDA:
      return deserialize(V1_lambdaModelSchema(plugins), json);
    case V1_ValueSpecificationType.KEY_EXPRESSION:
      return deserialize(keyExpressionModelSchema(plugins), json);
    case V1_ValueSpecificationType.COLLECTION:
      return deserialize(collectionModelSchema(plugins), json);
    case V1_ValueSpecificationType.ENUM_VALUE:
      return deserialize(enumValueModelSchema, json);
    // primitive values
    case V1_ValueSpecificationType.CBOOLEAN:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CBooleanModelSchema, val),
      );
    case V1_ValueSpecificationType.CBYTEARRAY: {
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CByteArrayModelSchema, val),
      );
    }
    case V1_ValueSpecificationType.CDATETIME:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CDateTimeModelSchema, val),
      );
    case V1_ValueSpecificationType.CSTRICTTIME:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CStrictTimeModelSchema, val),
      );
    case V1_ValueSpecificationType.CDECIMAL:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CDecimalModelSchema, val),
      );
    case V1_ValueSpecificationType.CFLOAT:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CFloatModelSchema, val),
      );
    case V1_ValueSpecificationType.CINTEGER:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CIntegerModelSchema, val),
      );
    case V1_ValueSpecificationType.CLATESTDATE:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CLatestDateModelSchema, val),
      );
    case V1_ValueSpecificationType.CSTRICTDATE:
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CStrictDateModelSchema, val),
      );
    case V1_ValueSpecificationType.CSTRING: {
      // This workaround is intended to handle an edge case where CString is sent with empty values
      // we will convert it to an empty string instead
      // See https://github.com/finos/legend-engine/pull/1076
      if (
        Array.isArray(json.values) &&
        !json.values.length &&
        isPlainObject(json.multiplicity) &&
        json.multiplicity.upperBound === 1
      ) {
        const result = new V1_CString();
        result.value = '';
        return result;
      }
      return deserializePrimitiveValueSpecification(json, plugins, (val) =>
        deserialize(CStringModelSchema, val),
      );
    }
    // class instance
    case V1_ValueSpecificationType.CLASS_INSTANCE:
      return deserialize(classInstanceModelSchema(plugins), json);
    /**
     * NOTE: the following types are here for backward compatibility
     * as some of these are used to be value specifications, but now
     * transformed into class instances
     *
     * @backwardCompatibility
     */
    case V1_ClassInstanceType.PAIR:
    case V1_ClassInstanceType.AGGREGATE_VALUE:
    case V1_ClassInstanceType.EXECUTION_CONTEXT_INSTANCE:
    case V1_ClassInstanceType.PATH:
    case V1_ClassInstanceType.ROOT_GRAPH_FETCH_TREE:
    case V1_ClassInstanceType.PURE_LIST:
    case V1_ClassInstanceType.RUNTIME_INSTANCE:
    case V1_ClassInstanceType.SERIALIZATION_CONFIG:
    case V1_ClassInstanceType.TDS_AGGREGATE_VALUE:
    case V1_ClassInstanceType.TDS_COLUMN_INFORMATION:
    case V1_ClassInstanceType.TDS_OLAP_AGGREGATION:
    case V1_ClassInstanceType.TDS_OLAP_RANK:
    case V1_ClassInstanceType.TDS_SORT_INFORMATION:
      return deserialize(classInstanceModelSchema(plugins), {
        _type: V1_ValueSpecificationType.CLASS_INSTANCE,
        type: json._type,
        value: json,
      });
    // packageable element pointer
    case V1_ValueSpecificationType.HACKED_CLASS: // deprecated
      return deserializeHackedClass(json);
    case V1_ValueSpecificationType.UNIT_TYPE: // deprecated
    case V1_ValueSpecificationType.HACKED_UNIT: // deprecated
      return deserializeHackedUnit(json);
    case V1_ValueSpecificationType.PRIMITIVE_TYPE: // deprecated
    case V1_ValueSpecificationType.ENUM: // deprecated
    case V1_ValueSpecificationType.CLASS: // deprecated
    case V1_ValueSpecificationType.MAPPING_INSTANCE: // deprecated
    case V1_ValueSpecificationType.PACKAGEABLE_ELEMENT_PTR:
      return deserialize(V1_packageableElementPtrSchema(), json);
    case V1_ValueSpecificationType.GENERIC_TYPE_INSTANCE:
      return deserialize(genericTypeInstanceSchema(plugins), json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize value specification of type '${json._type}'`,
      );
  }
}

export function V1_serializeValueSpecification(
  protocol: V1_ValueSpecification,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ValueSpecification> {
  return protocol.accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationSerializer(plugins),
  );
}
