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
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_Variable } from '../../../model/valueSpecification/V1_Variable.js';
import { V1_RootGraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_RootGraphFetchTree.js';
import { V1_Lambda } from '../../../model/valueSpecification/raw/V1_Lambda.js';
import { V1_EnumValue } from '../../../model/valueSpecification/raw/V1_EnumValue.js';
import { V1_Path } from '../../../model/valueSpecification/raw/path/V1_Path.js';
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
import { V1_AggregateValue } from '../../../model/valueSpecification/raw/V1_AggregateValue.js';
import { V1_Pair } from '../../../model/valueSpecification/raw/V1_Pair.js';
import { V1_RuntimeInstance } from '../../../model/valueSpecification/raw/V1_RuntimeInstance.js';
import { V1_ExecutionContextInstance } from '../../../model/valueSpecification/raw/V1_ExecutionContextInstance.js';
import { V1_PropertyGraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_PropertyGraphFetchTree.js';
import { V1_SerializationConfig } from '../../../model/valueSpecification/raw/V1_SerializationConfig.js';
import { V1_UnitType } from '../../../model/valueSpecification/raw/V1_UnitType.js';
import { V1_KeyExpression } from '../../../model/valueSpecification/raw/V1_KeyExpression.js';
import { V1_PrimitiveType } from '../../../model/valueSpecification/raw/V1_PrimitiveType.js';
import { V1_UnitInstance } from '../../../model/valueSpecification/raw/V1_UnitInstance.js';
import { V1_PureList } from '../../../model/valueSpecification/raw/V1_PureList.js';
import { V1_TDSAggregateValue } from '../../../model/valueSpecification/raw/V1_TDSAggregateValue.js';
import { V1_TDSColumnInformation } from '../../../model/valueSpecification/raw/V1_TDSColumnInformation.js';
import { V1_TDSSortInformation } from '../../../model/valueSpecification/raw/V1_TDSSortInformation.js';
import { V1_TDSOlapRank } from '../../../model/valueSpecification/raw/V1_TDSOlapRank_.js';
import { V1_TDSOlapAggregation } from '../../../model/valueSpecification/raw/V1_TDSOlapAggregation_.js';
import { V1_multiplicitySchema } from './V1_CoreSerializationHelper.js';
import type {
  V1_ValueSpecification,
  V1_ValueSpecificationVisitor,
} from '../../../model/valueSpecification/V1_ValueSpecification.js';
import { V1_PropertyPathElement } from '../../../model/valueSpecification/raw/path/V1_PropertyPathElement.js';
import type { V1_PathElement } from '../../../model/valueSpecification/raw/path/V1_PathElement.js';
import { V1_AppliedProperty } from '../../../model/valueSpecification/application/V1_AppliedProperty.js';
import { V1_serializeRuntime } from './V1_RuntimeSerializationHelper.js';
import type { V1_ExecutionContext } from '../../../model/valueSpecification/raw/executionContext/V1_ExecutionContext.js';
import { V1_AnalyticsExecutionContext } from '../../../model/valueSpecification/raw/executionContext/V1_AnalyticsExecutionContext.js';
import { V1_BaseExecutionContext } from '../../../model/valueSpecification/raw/executionContext/V1_BaseExecutionContext.js';
import type { V1_GraphFetchTree } from '../../../model/valueSpecification/raw/graph/V1_GraphFetchTree.js';
import { V1_PackageableElementPtr } from '../../../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import { V1_HackedClass } from '../../../model/valueSpecification/raw/V1_HackedClass.js';
import { V1_HackedUnit } from '../../../model/valueSpecification/raw/V1_HackedUnit.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../../../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import { V1_EngineRuntime } from '../../../model/packageableElements/runtime/V1_Runtime.js';

enum V1_PathElementType {
  PROPERTY_PATH_ELEMENT = 'propertyPath',
}

enum V1_ExecutionContextType {
  BASE_EXECUTION_CONTEXT = 'BaseExecutionContext',
  ANALYTICS_EXECUTION_CONTEXT = 'AnalyticsExecutionContext',
}

enum V1_ValueSpecificationType {
  PACKAGEABLE_ELEMENT_PTR = 'packageableElementPtr',
  HACKED_CLASS = 'hackedClass',
  HACKED_UNIT = 'hackedUnit',

  ENUM_VALUE = 'enumValue',
  VARIABLE = 'var',
  LAMBDA = 'lambda',
  PATH = 'path',
  APPLIED_FUNCTION = 'func',
  APPLIED_PROPERTY = 'property',
  COLLECTION = 'collection',
  CINTEGER = 'integer',
  CDECIMAL = 'decimal',
  CSTRING = 'string',
  CBOOLEAN = 'boolean',
  CFLOAT = 'float',
  CDATETIME = 'dateTime',
  CSTRICTDATE = 'strictDate',
  CSTRICTTIME = 'strictTime',
  CLATESTDATE = 'latestDate',

  AGGREGATE_VALUE = 'aggregateValue',
  PAIR = 'pair',
  RUNTIME_INSTANCE = 'runtimeInstance',
  EXECUTIONCONTEXT_INSTANCE = 'executionContextInstance',
  PURE_LIST = 'listInstance',
  ROOT_GRAPH_FETCH_TREE = 'rootGraphFetchTree',
  PROPERTY_GRAPH_FETCH_TREE = 'propertyGraphFetchTree',
  SERIALIZATION_CONFIG = 'alloySerializationConfig',
  UNIT_TYPE = 'unitType',
  UNIT_INSTANCE = 'unitInstance',
  KEY_EXPRESSION = 'keyExpression',
  PRIMITIVE_TYPE = 'primitiveType',

  // TDS
  TDS_AGGREGATE_VALUE = 'tdsAggregateValue',
  TDS_COLUMN_INFORMATION = 'tdsColumnInformation',
  TDS_SORT_INFORMATION = 'tdsSortInformation',
  TDS_OLAP_RANK = 'tdsOlapRank',
  TDS_OLAP_AGGREGATION = 'tdsOlapAggregation',

  // ------------------------------ DEPRECATED ----------------------------------
  CLASS = 'class',
  ENUM = 'enum',
  MAPPING_INSTANCE = 'mappingInstance',
  // ----------------------------------------------------------------------------
}

const packageableElementPtrSchema = createModelSchema(
  V1_PackageableElementPtr,
  {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.PACKAGEABLE_ELEMENT_PTR,
    ),
    fullPath: primitive(),
  },
);

const hackedClassSchema = createModelSchema(V1_HackedClass, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.HACKED_CLASS),
  fullPath: primitive(),
});

const hackedUnitSchema = createModelSchema(V1_HackedUnit, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.HACKED_UNIT),
  unitType: primitive(),
});

const variableModelSchema = createModelSchema(V1_Variable, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.VARIABLE),
  class: optional(primitive()),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  name: primitive(),
});

const enumValueModelSchema = createModelSchema(V1_EnumValue, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.ENUM_VALUE),
  fullPath: primitive(),
  value: primitive(),
});

const lambdaModelSchema = createModelSchema(V1_Lambda, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.LAMBDA),
  body: list(
    custom(
      (val) => V1_serializeValueSpecification(val),
      (val) => V1_deserializeValueSpecification(val),
    ),
  ),
  parameters: list(usingModelSchema(variableModelSchema)),
});

const propertyPathElementModelSchema = createModelSchema(
  V1_PropertyPathElement,
  {
    _type: usingConstantValueSchema(V1_PathElementType.PROPERTY_PATH_ELEMENT),
    property: primitive(),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val),
        (val) => V1_deserializeValueSpecification(val),
      ),
    ),
  },
);

const pathModelSchema = createModelSchema(V1_Path, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.PATH),
  name: primitive(),
  startType: primitive(),
  path: list(
    custom(
      (val) => V1_serializePathElement(val),
      (val) => V1_deserializePathElement(val),
    ),
  ),
});

const appliedFunctionModelSchema = createModelSchema(V1_AppliedFunction, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.APPLIED_FUNCTION),
  function: primitive(),
  parameters: list(
    custom(
      (val) => V1_serializeValueSpecification(val),
      (val) => V1_deserializeValueSpecification(val),
    ),
  ),
});

const appliedPropertyModelSchema = createModelSchema(V1_AppliedProperty, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.APPLIED_PROPERTY),
  class: optional(primitive()),
  parameters: list(
    custom(
      (val) => V1_serializeValueSpecification(val),
      (val) => V1_deserializeValueSpecification(val),
    ),
  ),
  property: primitive(),
});

const collectionModelSchema = createModelSchema(V1_Collection, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.COLLECTION),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(
    custom(
      (val) => V1_serializeValueSpecification(val),
      (val) => V1_deserializeValueSpecification(val),
    ),
  ),
});

const cDecimalModelSchema = createModelSchema(V1_CDecimal, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CDECIMAL),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cIntegerModelSchema = createModelSchema(V1_CInteger, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CINTEGER),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cStringModelSchema = createModelSchema(V1_CString, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CSTRING),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cfloatModelSchema = createModelSchema(V1_CFloat, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CFLOAT),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cDateTimeModelSchema = createModelSchema(V1_CDateTime, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CDATETIME),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cStrictTimeModelSchema = createModelSchema(V1_CStrictTime, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CSTRICTTIME),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cStrictDateModelSchema = createModelSchema(V1_CStrictDate, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CSTRICTDATE),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const cLatestDateModelSchema = createModelSchema(V1_CLatestDate, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CLATESTDATE),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
});

const cBooleanModelSchema = createModelSchema(V1_CBoolean, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.CBOOLEAN),
  multiplicity: usingModelSchema(V1_multiplicitySchema),
  values: list(primitive()),
});

const aggregationValueModelSchema = createModelSchema(V1_AggregateValue, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.AGGREGATE_VALUE),
  mapFn: usingModelSchema(lambdaModelSchema),
  aggregateFn: usingModelSchema(lambdaModelSchema),
});

const pairModelSchema = createModelSchema(V1_Pair, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.PAIR),
  first: custom(
    (val) => V1_serializeValueSpecification(val),
    (val) => V1_deserializeValueSpecification(val),
  ),
  second: custom(
    (val) => V1_serializeValueSpecification(val),
    (val) => V1_deserializeValueSpecification(val),
  ),
});

const runtimeInstanceModelSchema = createModelSchema(V1_RuntimeInstance, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.RUNTIME_INSTANCE),
  runtime: custom(
    (val) => V1_serializeRuntime(val),
    (val) => deserialize(V1_EngineRuntime, val),
  ),
});

const analyticsExecutionContextModelSchema = createModelSchema(
  V1_AnalyticsExecutionContext,
  {
    _type: usingConstantValueSchema(
      V1_ExecutionContextType.ANALYTICS_EXECUTION_CONTEXT,
    ),
    enableConstraints: optional(primitive()),
    queryTimeOutInSeconds: optional(primitive()),
    toFlowSetFunction: usingModelSchema(lambdaModelSchema),
    useAnalytics: primitive(),
  },
);

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

const executionContextInstanceModelSchema = createModelSchema(
  V1_ExecutionContextInstance,
  {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.EXECUTIONCONTEXT_INSTANCE,
    ),
    executionContext: custom(
      (val) => V1_serializeExecutionContext(val),
      (val) => V1_deserializeExecutionContext(val),
    ),
  },
);

const unitTypeModelSchema = createModelSchema(V1_UnitType, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.UNIT_TYPE),
  unitType: primitive(),
});

const keyExpressionModelSchema = createModelSchema(V1_KeyExpression, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.KEY_EXPRESSION),
  add: optional(primitive()),
  expression: custom(
    (val) => V1_serializeValueSpecification(val),
    (val) => V1_deserializeValueSpecification(val),
  ),
  key: custom(
    (val) => V1_serializeValueSpecification(val),
    (val) => V1_deserializeValueSpecification(val),
  ),
});

const primitiveTypeModelSchema = createModelSchema(V1_PrimitiveType, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.PRIMITIVE_TYPE),
  name: primitive(),
});

const unitInstanceModelSchema = createModelSchema(V1_UnitInstance, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.UNIT_INSTANCE),
  unitType: primitive(),
  unitValue: primitive(),
});

const pureListModelSchema = createModelSchema(V1_PureList, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.PURE_LIST),
  values: list(
    custom(
      (val) => V1_serializeValueSpecification(val),
      (val) => V1_deserializeValueSpecification(val),
    ),
  ),
});

const rootGraphFetchTreeModelSchema = createModelSchema(V1_RootGraphFetchTree, {
  _type: usingConstantValueSchema(
    V1_ValueSpecificationType.ROOT_GRAPH_FETCH_TREE,
  ),
  class: primitive(),
  subTrees: list(
    custom(
      (val) => V1_serializeGraphFetchTree(val),
      (val) => V1_deserializeGraphFetchTree(val),
    ),
  ),
});

const propertyGraphFetchTreeModelSchema = createModelSchema(
  V1_PropertyGraphFetchTree,
  {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE,
    ),
    alias: optional(primitive()),
    parameters: list(
      custom(
        (val) => V1_serializeValueSpecification(val),
        (val) => V1_deserializeValueSpecification(val),
      ),
    ),
    property: primitive(),
    subTrees: list(
      custom(
        (val) => V1_serializeGraphFetchTree(val),
        (val) => V1_deserializeGraphFetchTree(val),
      ),
    ),
    subType: optional(primitive()),
  },
);

const serializationConfigModelSchema = createModelSchema(
  V1_SerializationConfig,
  {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.SERIALIZATION_CONFIG,
    ),
    includeType: optional(primitive()),
    typeKeyName: primitive(),
    includeEnumTypee: optional(primitive()),
    removePropertiesWithNullValuese: optional(primitive()),
    removePropertiesWithEmptySetse: optional(primitive()),
    fullyQualifiedTypePathe: optional(primitive()),
    includeObjectReferencee: optional(primitive()),
  },
);

const tdsAggregrateValueModelSchema = createModelSchema(V1_TDSAggregateValue, {
  _type: usingConstantValueSchema(
    V1_ValueSpecificationType.TDS_AGGREGATE_VALUE,
  ),
  name: primitive(),
  pmapFn: usingModelSchema(lambdaModelSchema),
  aggregateFn: usingModelSchema(lambdaModelSchema),
});

const tdsColumnInformationModelSchema = createModelSchema(
  V1_TDSColumnInformation,
  {
    _type: usingConstantValueSchema(
      V1_ValueSpecificationType.TDS_COLUMN_INFORMATION,
    ),
    name: primitive(),
    columnFn: usingModelSchema(lambdaModelSchema),
  },
);

const tdsSortInformationModelSchema = createModelSchema(V1_TDSSortInformation, {
  _type: usingConstantValueSchema(
    V1_ValueSpecificationType.TDS_SORT_INFORMATION,
  ),
  column: primitive(),
  direction: primitive(),
});

const tdsOlapRankModelSchema = createModelSchema(V1_TDSOlapRank, {
  _type: usingConstantValueSchema(V1_ValueSpecificationType.TDS_OLAP_RANK),
  function: usingModelSchema(lambdaModelSchema),
});

const tdsOlapAggregationModelSchema = createModelSchema(V1_TDSOlapAggregation, {
  _type: usingConstantValueSchema(
    V1_ValueSpecificationType.TDS_OLAP_AGGREGATION,
  ),
  function: usingModelSchema(lambdaModelSchema),
  columnName: primitive(),
});

class V1_ValueSpecificationSerializer
  implements V1_ValueSpecificationVisitor<PlainObject<V1_ValueSpecification>>
{
  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): PlainObject<V1_ValueSpecification> {
    return valueSpecification.content as PlainObject<V1_ValueSpecification>;
  }
  visit_PackageableElementPtr(
    valueSpecification: V1_PackageableElementPtr,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(packageableElementPtrSchema, valueSpecification);
  }
  visit_HackedClass(
    valueSpecification: V1_HackedClass,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(hackedClassSchema, valueSpecification);
  }
  visit_HackedUnit(
    valueSpecification: V1_HackedUnit,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(hackedUnitSchema, valueSpecification);
  }
  visit_EnumValue(
    valueSpecification: V1_EnumValue,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(enumValueModelSchema, valueSpecification);
  }
  visit_Variable(
    valueSpecification: V1_Variable,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(variableModelSchema, valueSpecification);
  }
  visit_Lambda(
    valueSpecification: V1_Lambda,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(lambdaModelSchema, valueSpecification);
  }
  visit_Path(valueSpecification: V1_Path): PlainObject<V1_ValueSpecification> {
    return serialize(pathModelSchema, valueSpecification);
  }
  visit_AppliedFunction(
    valueSpecification: V1_AppliedFunction,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(appliedFunctionModelSchema, valueSpecification);
  }
  visit_AppliedProperty(
    valueSpecification: V1_AppliedProperty,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(appliedPropertyModelSchema, valueSpecification);
  }
  visit_Collection(
    valueSpecification: V1_Collection,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(collectionModelSchema, valueSpecification);
  }
  visit_CInteger(
    valueSpecification: V1_CInteger,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cIntegerModelSchema, valueSpecification);
  }
  visit_CDecimal(
    valueSpecification: V1_CDecimal,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cDecimalModelSchema, valueSpecification);
  }
  visit_CString(
    valueSpecification: V1_CString,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cStringModelSchema, valueSpecification);
  }
  visit_CBoolean(
    valueSpecification: V1_CBoolean,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cBooleanModelSchema, valueSpecification);
  }
  visit_CFloat(
    valueSpecification: V1_CFloat,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cfloatModelSchema, valueSpecification);
  }
  visit_CDateTime(
    valueSpecification: V1_CDateTime,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cDateTimeModelSchema, valueSpecification);
  }
  visit_CStrictDate(
    valueSpecification: V1_CStrictDate,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cStrictDateModelSchema, valueSpecification);
  }
  visit_CStrictTime(
    valueSpecification: V1_CStrictTime,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cStrictTimeModelSchema, valueSpecification);
  }
  visit_CLatestDate(
    valueSpecification: V1_CLatestDate,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(cLatestDateModelSchema, valueSpecification);
  }
  visit_AggregateValue(
    valueSpecification: V1_AggregateValue,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(aggregationValueModelSchema, valueSpecification);
  }
  visit_Pair(valueSpecification: V1_Pair): PlainObject<V1_ValueSpecification> {
    return serialize(pairModelSchema, valueSpecification);
  }
  visit_RuntimeInstance(
    valueSpecification: V1_RuntimeInstance,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(runtimeInstanceModelSchema, valueSpecification);
  }
  visit_ExecutionContextInstance(
    valueSpecification: V1_ExecutionContextInstance,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(executionContextInstanceModelSchema, valueSpecification);
  }
  visit_PureList(
    valueSpecification: V1_PureList,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(pureListModelSchema, valueSpecification);
  }
  visit_RootGraphFetchTree(
    valueSpecification: V1_RootGraphFetchTree,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(rootGraphFetchTreeModelSchema, valueSpecification);
  }
  visit_PropertyGraphFetchTree(
    valueSpecification: V1_PropertyGraphFetchTree,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(propertyGraphFetchTreeModelSchema, valueSpecification);
  }
  visit_SerializationConfig(
    valueSpecification: V1_SerializationConfig,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(serializationConfigModelSchema, valueSpecification);
  }
  visit_UnitType(
    valueSpecification: V1_UnitType,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(unitTypeModelSchema, valueSpecification);
  }
  visit_UnitInstance(
    valueSpecification: V1_UnitInstance,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(unitInstanceModelSchema, valueSpecification);
  }
  visit_KeyExpression(
    valueSpecification: V1_KeyExpression,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(keyExpressionModelSchema, valueSpecification);
  }
  visit_PrimitiveType(
    valueSpecification: V1_PrimitiveType,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(primitiveTypeModelSchema, valueSpecification);
  }
  visit_TDSAggregateValue(
    valueSpecification: V1_TDSAggregateValue,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(tdsAggregrateValueModelSchema, valueSpecification);
  }
  visit_TDSColumnInformation(
    valueSpecification: V1_TDSColumnInformation,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(tdsColumnInformationModelSchema, valueSpecification);
  }
  visit_TDSSortInformation(
    valueSpecification: V1_TDSSortInformation,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(tdsSortInformationModelSchema, valueSpecification);
  }
  visit_TDSOlapRank(
    valueSpecification: V1_TDSOlapRank,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(tdsOlapRankModelSchema, valueSpecification);
  }
  visit_TDSOlapAggregation(
    valueSpecification: V1_TDSOlapAggregation,
  ): PlainObject<V1_ValueSpecification> {
    return serialize(tdsOlapAggregationModelSchema, valueSpecification);
  }
}

function V1_serializePathElement(
  protocol: V1_PathElement,
): V1_PathElement | PlainObject<V1_PathElement> | typeof SKIP {
  if (protocol instanceof V1_PropertyPathElement) {
    return serialize(propertyPathElementModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializePathElement(
  json: PlainObject<V1_PathElement>,
): V1_PathElement | typeof SKIP {
  switch (json._type) {
    case V1_PathElementType.PROPERTY_PATH_ELEMENT:
      return deserialize(propertyPathElementModelSchema, json);
    default:
      return SKIP;
  }
}

function V1_serializeGraphFetchTree(
  protocol: V1_GraphFetchTree,
): PlainObject<V1_GraphFetchTree> {
  if (protocol instanceof V1_PropertyGraphFetchTree) {
    return serialize(propertyGraphFetchTreeModelSchema, protocol);
  } else if (protocol instanceof V1_RootGraphFetchTree) {
    return serialize(rootGraphFetchTreeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize graph fetch tree`,
    protocol,
  );
}

function V1_deserializeGraphFetchTree(
  json: PlainObject<V1_GraphFetchTree>,
): V1_GraphFetchTree {
  switch (json._type) {
    case V1_ValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE:
      return deserialize(propertyGraphFetchTreeModelSchema, json);
    case V1_ValueSpecificationType.ROOT_GRAPH_FETCH_TREE:
      return deserialize(rootGraphFetchTreeModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize graph fetch tree node of type '${json._type}'`,
      );
  }
}

function V1_serializeExecutionContext(
  protocol: V1_ExecutionContext,
): PlainObject<V1_ExecutionContext> | typeof SKIP {
  if (protocol instanceof V1_AnalyticsExecutionContext) {
    return serialize(analyticsExecutionContextModelSchema, protocol);
  } else if (protocol instanceof V1_BaseExecutionContext) {
    return serialize(baseExecutionContextModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeExecutionContext(
  json: PlainObject<V1_ExecutionContext>,
): V1_ExecutionContext | typeof SKIP {
  switch (json._type) {
    case V1_ExecutionContextType.ANALYTICS_EXECUTION_CONTEXT:
      return deserialize(analyticsExecutionContextModelSchema, json);
    case V1_ExecutionContextType.BASE_EXECUTION_CONTEXT:
      return deserialize(baseExecutionContextModelSchema, json);
    default:
      return SKIP;
  }
}

export function V1_serializeValueSpecification(
  protocol: V1_ValueSpecification,
): PlainObject<V1_ValueSpecification> {
  return protocol.accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationSerializer(),
  );
}

export function V1_deserializeValueSpecification(
  json: PlainObject<V1_ValueSpecification>,
): V1_ValueSpecification {
  switch (json._type) {
    case V1_ValueSpecificationType.AGGREGATE_VALUE:
      return deserialize(aggregationValueModelSchema, json);
    case V1_ValueSpecificationType.APPLIED_FUNCTION:
      return deserialize(appliedFunctionModelSchema, json);
    case V1_ValueSpecificationType.APPLIED_PROPERTY:
      return deserialize(appliedPropertyModelSchema, json);
    case V1_ValueSpecificationType.CBOOLEAN:
      return deserialize(cBooleanModelSchema, json);
    case V1_ValueSpecificationType.CDATETIME:
      return deserialize(cDateTimeModelSchema, json);
    case V1_ValueSpecificationType.CSTRICTTIME:
      return deserialize(cStrictTimeModelSchema, json);
    case V1_ValueSpecificationType.CDECIMAL:
      return deserialize(cDecimalModelSchema, json);
    case V1_ValueSpecificationType.CFLOAT:
      return deserialize(cfloatModelSchema, json);
    case V1_ValueSpecificationType.CINTEGER:
      return deserialize(cIntegerModelSchema, json);
    case V1_ValueSpecificationType.CLATESTDATE:
      return deserialize(cLatestDateModelSchema, json);
    case V1_ValueSpecificationType.COLLECTION:
      return deserialize(collectionModelSchema, json);
    case V1_ValueSpecificationType.CSTRICTDATE:
      return deserialize(cStrictDateModelSchema, json);
    case V1_ValueSpecificationType.CSTRING:
      return deserialize(cStringModelSchema, json);
    case V1_ValueSpecificationType.ENUM_VALUE:
      return deserialize(enumValueModelSchema, json);
    case V1_ValueSpecificationType.EXECUTIONCONTEXT_INSTANCE:
      return deserialize(executionContextInstanceModelSchema, json);
    case V1_ValueSpecificationType.KEY_EXPRESSION:
      return deserialize(keyExpressionModelSchema, json);
    case V1_ValueSpecificationType.LAMBDA:
      return deserialize(lambdaModelSchema, json);
    case V1_ValueSpecificationType.PAIR:
      return deserialize(pairModelSchema, json);
    case V1_ValueSpecificationType.PATH:
      return deserialize(pathModelSchema, json);
    case V1_ValueSpecificationType.PRIMITIVE_TYPE:
      return deserialize(primitiveTypeModelSchema, json);
    case V1_ValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE:
      return deserialize(aggregationValueModelSchema, json);
    case V1_ValueSpecificationType.PURE_LIST:
      return deserialize(pureListModelSchema, json);
    case V1_ValueSpecificationType.ROOT_GRAPH_FETCH_TREE:
      return deserialize(rootGraphFetchTreeModelSchema, json);
    case V1_ValueSpecificationType.RUNTIME_INSTANCE:
      return deserialize(runtimeInstanceModelSchema, json);
    case V1_ValueSpecificationType.SERIALIZATION_CONFIG:
      return deserialize(serializationConfigModelSchema, json);
    case V1_ValueSpecificationType.TDS_AGGREGATE_VALUE:
      return deserialize(tdsAggregrateValueModelSchema, json);
    case V1_ValueSpecificationType.TDS_COLUMN_INFORMATION:
      return deserialize(tdsColumnInformationModelSchema, json);
    case V1_ValueSpecificationType.TDS_OLAP_AGGREGATION:
      return deserialize(tdsOlapAggregationModelSchema, json);
    case V1_ValueSpecificationType.TDS_OLAP_RANK:
      return deserialize(tdsOlapRankModelSchema, json);
    case V1_ValueSpecificationType.TDS_SORT_INFORMATION:
      return deserialize(tdsSortInformationModelSchema, json);
    case V1_ValueSpecificationType.UNIT_INSTANCE:
      return deserialize(unitInstanceModelSchema, json);
    case V1_ValueSpecificationType.UNIT_TYPE:
      return deserialize(unitTypeModelSchema, json);
    case V1_ValueSpecificationType.VARIABLE:
      return deserialize(variableModelSchema, json);
    case V1_ValueSpecificationType.ENUM: // deprecated
    case V1_ValueSpecificationType.CLASS: // deprecated
    case V1_ValueSpecificationType.MAPPING_INSTANCE: // deprecated
    case V1_ValueSpecificationType.PACKAGEABLE_ELEMENT_PTR:
      return deserialize(packageableElementPtrSchema, json);
    case V1_ValueSpecificationType.HACKED_CLASS:
      return deserialize(hackedClassSchema, json);
    case V1_ValueSpecificationType.HACKED_UNIT:
      return deserialize(hackedUnitSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize value specification of type '${json._type}'`,
      );
  }
}
