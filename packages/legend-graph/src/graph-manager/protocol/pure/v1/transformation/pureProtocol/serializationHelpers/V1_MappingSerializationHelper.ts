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
  type ModelSchema,
  createModelSchema,
  list,
  primitive,
  deserialize,
  serialize,
  custom,
  optional,
  raw,
  SKIP,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  assertTrue,
  guaranteeIsNumber,
  guaranteeIsString,
  IllegalStateError,
  isNonNullable,
  shallowStringify,
  UnsupportedOperationError,
  usingModelSchema,
  optionalCustom,
  optionalCustomList,
  customList,
  TEMPORARY__disableModelSchemaExtensionMechanism,
} from '@finos/legend-shared';
import {
  ATOMIC_TEST_TYPE,
  PRIMITIVE_TYPE,
  ELEMENT_PATH_DELIMITER,
  PackageableElementPointerType,
} from '../../../../../../../graph/MetaModelConst.js';
import { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping.js';
import {
  type V1_DEPRECATED__MappingTestAssert,
  type V1_DEPRECATED__InputData,
  V1_DEPRECATED__MappingTest,
  V1_DEPRECATED__ObjectInputData,
  V1_DEPRECATED__FlatDataInputData,
  V1_DEPRECATED__ExpectedOutputMappingTestAssert,
  V1_DEPRECATED__RelationalInputData,
} from '../../../model/packageableElements/mapping/V1_DEPRECATED__MappingTest.js';
import {
  V1_multiplicityModelSchema,
  V1_packageableElementPointerModelSchema,
  V1_serializePackageableElementPointer,
} from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import { V1_propertyPointerModelSchema } from './V1_DomainSerializationHelper.js';
import type { V1_AssociationMapping } from '../../../model/packageableElements/mapping/V1_AssociationMapping.js';
import type { V1_PropertyMapping } from '../../../model/packageableElements/mapping/V1_PropertyMapping.js';
import { V1_RelationalAssociationMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalAssociationMapping.js';
import { V1_LocalMappingPropertyInfo } from '../../../model/packageableElements/mapping/V1_LocalMappingPropertyInfo.js';
import { V1_RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping.js';
import {
  V1_serializeRelationalOperationElement,
  V1_deserializeRelationalOperationElement,
  V1_filterMappingModelSchema,
  V1_tablePtrModelSchema,
} from './V1_DatabaseSerializationHelper.js';
import {
  type V1_MappingInclude,
  V1_MappingIncludeMapping,
} from '../../../model/packageableElements/mapping/V1_MappingInclude.js';
import { V1_MappingIncludeDataProduct } from '../../../model/packageableElements/dataProduct/V1_MappingIncludeDataProduct.js';
import {
  type V1_EnumValueMappingSourceValue,
  V1_EnumValueMappingEnumSourceValue,
  V1_EnumValueMappingIntegerSourceValue,
  V1_EnumValueMappingStringSourceValue,
  V1_EnumValueMapping,
} from '../../../model/packageableElements/mapping/V1_EnumValueMapping.js';
import { V1_EnumerationMapping } from '../../../model/packageableElements/mapping/V1_EnumerationMapping.js';
import type { V1_ClassMapping } from '../../../model/packageableElements/mapping/V1_ClassMapping.js';
import { V1_OperationClassMapping } from '../../../model/packageableElements/mapping/V1_OperationClassMapping.js';
import { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping.js';
import { V1_PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping.js';
import { V1_FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping.js';
import { V1_EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping.js';
import { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping.js';
import { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping.js';
import { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping.js';
import { V1_EmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping.js';
import { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping.js';
import { V1_InlineEmbeddedPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping.js';
import { V1_rawLambdaModelSchema } from './V1_RawValueSpecificationSerializationHelper.js';
import { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping.js';
import { V1_AggregateSetImplementationContainer } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer.js';
import { V1_AggregateSpecification } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSpecification.js';
import { V1_AggregateFunction } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateFunction.js';
import { V1_GroupByFunction } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_GroupByFunction.js';
import { V1_AggregationAwarePropertyMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping.js';
import type { V1_AbstractFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_AbstractFlatDataPropertyMapping.js';
import { V1_XStorePropertyMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStorePropertyMapping.js';
import { V1_XStoreAssociationMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStoreAssociationMapping.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import { V1_BindingTransformer } from '../../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_BindingTransformer.js';
import { V1_MergeOperationClassMapping } from '../../../model/packageableElements/mapping/V1_MergeOperationClassMapping.js';
import { V1_FlatDataAssociationMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationMapping.js';
import { V1_FlatDataAssociationPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationPropertyMapping.js';
import { V1_MappingTestSuite } from '../../../model/packageableElements/mapping/V1_MappingTestSuite.js';
import {
  V1_deserializeAtomicTest,
  V1_deserializeTestAssertion,
  V1_deserializeTestSuite,
  V1_serializeAtomicTest,
  V1_serializeTestAssertion,
  V1_serializeTestSuite,
  V1_TestSuiteType,
} from './V1_TestSerializationHelper.js';
import { V1_MappingStoreTestData } from '../../../model/packageableElements/mapping/V1_MappingStoreTestData.js';
import {
  V1_deserializeEmbeddedDataType,
  V1_serializeEmbeddedDataType,
} from './V1_DataElementSerializationHelper.js';
import {
  V1_MAPPING_INCLUDE_DATAPRODUCT_TYPE,
  V1_mappingIncludeDataProductModelSchema,
} from '../../../transformation/pureProtocol/serializationHelpers/V1_DataProductSerializationHelper.js';
import { V1_MappingTest } from '../../../model/packageableElements/mapping/V1_MappingTest.js';
import type { V1_TestSuite } from '../../../model/test/V1_TestSuite.js';
import { V1_INTERNAL__UnknownClassMapping } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownClassMapping.js';
import { V1_INTERNAL__UnknownMappingInclude } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownMappingInclude.js';
import { V1_RelationFunctionClassMapping } from '../../../model/packageableElements/mapping/V1_RelationFunctionClassMapping.js';
import { V1_RelationFunctionPropertyMapping } from '../../../model/packageableElements/mapping/V1_RelationFunctionPropertyMapping.js';

enum V1_ClassMappingType {
  OPERATION = 'operation',
  MERGE_OPERATION = 'mergeOperation',
  PUREINSTANCE = 'pureInstance',
  ROOT_FLAT_DATA = 'flatData',
  ROOT_RELATIONAL = 'relational',
  RELATIONAL = 'embedded',
  AGGREGATION_AWARE = 'aggregationAware',
  RELATION_FUNCTION = 'relation',
}

enum V1_PropertyMappingType {
  PURE = 'purePropertyMapping',
  FLAT_DATA = 'flatDataPropertyMapping',
  ASSOCIATION_FLAT_DATA = 'flatDataAssociationPropertyMapping',
  EMBEDDED_FLAT_DATA = 'embeddedFlatDataPropertyMapping',
  RELATIONAL = 'relationalPropertyMapping',
  EMBEDDED_RELATIONAL = 'embeddedPropertyMapping',
  INLINE_EMBEDDED_RELATIONAL = 'inlineEmbeddedPropertyMapping',
  OTHERWISE_EMBEDDED_RELATIONAL = 'otherwiseEmbeddedPropertyMapping',
  AGGREGATION_AWARE = 'AggregationAwarePropertyMapping',
  XSTORE = 'xStorePropertyMapping',
  RELATION_FUNCTION = 'relationFunctionPropertyMapping',
}

// ------------------------------------- Shared -------------------------------------

const V1_localMappingPropertyInfoModelSchema = createModelSchema(
  V1_LocalMappingPropertyInfo,
  {
    multiplicity: usingModelSchema(V1_multiplicityModelSchema),
    type: primitive(),
  },
);

// ------------------------------------- Operation Mapping -------------------------------------

const operationClassMappingModelSchema = createModelSchema(
  V1_OperationClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.OPERATION),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    id: optional(primitive()),
    operation: primitive(),
    parameters: list(primitive()),
    root: primitive(),
  },
);

const mergeOperationClassMappingModelSchema = createModelSchema(
  V1_MergeOperationClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.MERGE_OPERATION),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    id: optional(primitive()),
    operation: primitive(),
    parameters: list(primitive()),
    root: primitive(),
    validationFunction: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

// ------------------------------------- Model-to-model Mapping -------------------------------------

const purePropertyMappingModelSchema = createModelSchema(
  V1_PurePropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.PURE),
    enumMappingId: optional(primitive()),
    explodeProperty: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    source: primitive(),
    target: optional(primitive()),
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

function V1_serializePurePropertyMapping(
  protocol: V1_PurePropertyMapping,
): PlainObject<V1_PurePropertyMapping> | typeof SKIP {
  if (protocol instanceof V1_PurePropertyMapping) {
    return serialize(purePropertyMappingModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializePurePropertyMapping(
  json: PlainObject<V1_PurePropertyMapping>,
): V1_PurePropertyMapping | typeof SKIP {
  switch (json._type) {
    case V1_PropertyMappingType.PURE:
      return deserialize(purePropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
}

const pureInstanceClassMappingModelSchema = createModelSchema(
  V1_PureInstanceClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.PUREINSTANCE),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    filter: usingModelSchema(V1_rawLambdaModelSchema),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        V1_serializePurePropertyMapping,
        V1_deserializePurePropertyMapping,
      ),
    ),
    root: primitive(),
    srcClass: optional(primitive()),
  },
);

// ------------------------------------- Relational Mapping -------------------------------------

// NOTE: Order matters. V1_RootRelationalClassMapping model schema should be defined before V1_RelationalClassMapping
// since V1_RootRelationalClassMapping extends V1_RelationalClassMapping and thus the model schemas will get overridden and mix the order of the properties
const rootRelationalClassMappingModelSchema = createModelSchema(
  V1_RootRelationalClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.ROOT_RELATIONAL),
    class: primitive(),
    distinct: primitive(),
    extendsClassMappingId: optional(primitive()),
    filter: usingModelSchema(V1_filterMappingModelSchema),
    groupBy: customList(
      V1_serializeRelationalOperationElement,
      V1_deserializeRelationalOperationElement,
      { INTERNAL__forceReturnEmptyInTest: true },
    ),
    id: optional(primitive()),
    mainTable: usingModelSchema(V1_tablePtrModelSchema),
    primaryKey: list(
      custom(
        V1_serializeRelationalOperationElement,
        V1_deserializeRelationalOperationElement,
      ),
    ),
    propertyMappings: list(
      custom(
        V1_serializeRelationalPropertyMapping,
        V1_deserializeRelationalPropertyMapping,
      ),
    ),
    root: optional(primitive()),
  },
);

const relationalClassMappingModelSchema = createModelSchema(
  V1_RelationalClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.RELATIONAL),
    class: optional(primitive()),
    extendsClassMappingId: optional(primitive()),
    id: optional(primitive()),
    primaryKey: list(
      custom(
        (val) => V1_serializeRelationalOperationElement(val),
        (val) => V1_deserializeRelationalOperationElement(val),
      ),
    ),
    propertyMappings: list(
      custom(
        (val) => V1_serializeRelationalPropertyMapping(val),
        (val) => V1_deserializeRelationalPropertyMapping(val),
      ),
    ),
    root: optional(primitive()),
  },
);

const bindingTransformerModelSchema = createModelSchema(V1_BindingTransformer, {
  binding: primitive(),
});

const relationalPropertyMappingModelSchema = createModelSchema(
  V1_RelationalPropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.RELATIONAL),
    bindingTransformer: optionalCustom(
      (val) => serialize(bindingTransformerModelSchema, val),
      (val) => deserialize(bindingTransformerModelSchema, val),
    ),
    enumMappingId: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    relationalOperation: raw(),
    source: optional(primitive()),
    target: optional(primitive()),
  },
);

const flatDataAssociationPropertyMappingModelSchema = createModelSchema(
  V1_FlatDataAssociationPropertyMapping,
  {
    _type: usingConstantValueSchema(
      V1_PropertyMappingType.ASSOCIATION_FLAT_DATA,
    ),
    flatData: primitive(),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    sectionName: primitive(),
    source: optional(primitive()),
    target: optional(primitive()),
  },
);

const embeddedRelationalPropertyMappingModelSchema = createModelSchema(
  V1_EmbeddedRelationalPropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.EMBEDDED_RELATIONAL),
    classMapping: usingModelSchema(relationalClassMappingModelSchema),
    id: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    /**
     * Omit this information during protocol transformation as it can be
     * interpreted while building the graph; and will help grammar-roundtrip
     * tests (involving engine) to pass. Ideally, this requires grammar parser
     * and composer in engine to be more consistent.
     *
     * @discrepancy grammar-roundtrip
     */
    source: optional(primitive()),
    target: optional(primitive()),
  },
);

const otherwiseEmbeddedRelationalPropertyMappingModelSchema = createModelSchema(
  V1_OtherwiseEmbeddedRelationalPropertyMapping,
  {
    _type: usingConstantValueSchema(
      V1_PropertyMappingType.OTHERWISE_EMBEDDED_RELATIONAL,
    ),
    classMapping: usingModelSchema(relationalClassMappingModelSchema),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    otherwisePropertyMapping: custom(
      V1_serializeRelationalPropertyMapping,
      V1_deserializeRelationalPropertyMapping,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    /**
     * Omit this information during protocol transformation as it can be
     * interpreted while building the graph; and will help grammar-roundtrip
     * tests (involving engine) to pass. Ideally, this requires grammar parser
     * and composer in engine to be more consistent.
     *
     * @discrepancy grammar-roundtrip
     */
    source: optional(primitive()),
    target: optional(primitive()),
  },
);
TEMPORARY__disableModelSchemaExtensionMechanism(
  otherwiseEmbeddedRelationalPropertyMappingModelSchema,
);

const inlineEmbeddedPropertyMappingModelSchema = createModelSchema(
  V1_InlineEmbeddedPropertyMapping,
  {
    _type: usingConstantValueSchema(
      V1_PropertyMappingType.INLINE_EMBEDDED_RELATIONAL,
    ),
    id: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    /**
     * Omit this information during protocol transformation as it can be
     * interpreted while building the graph; and will help grammar-roundtrip
     * tests (involving engine) to pass. Ideally, this requires grammar parser
     * and composer in engine to be more consistent.
     *
     * @discrepancy grammar-roundtrip
     */
    source: optional(primitive()),
    setImplementationId: primitive(),
    target: optional(primitive()),
  },
);

const xStorePropertyMappingModelSchema = createModelSchema(
  V1_XStorePropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.XSTORE),
    crossExpression: usingModelSchema(V1_rawLambdaModelSchema),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    source: primitive(),
    target: optional(primitive()),
  },
);

function V1_serializeRelationalPropertyMapping(
  protocol: V1_PropertyMapping,
): PlainObject<V1_PropertyMapping> | typeof SKIP {
  if (protocol instanceof V1_RelationalPropertyMapping) {
    return serialize(relationalPropertyMappingModelSchema, protocol);
  } else if (
    protocol instanceof V1_OtherwiseEmbeddedRelationalPropertyMapping
  ) {
    return serialize(
      otherwiseEmbeddedRelationalPropertyMappingModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_EmbeddedRelationalPropertyMapping) {
    return serialize(embeddedRelationalPropertyMappingModelSchema, protocol);
  } else if (protocol instanceof V1_InlineEmbeddedPropertyMapping) {
    return serialize(inlineEmbeddedPropertyMappingModelSchema, protocol);
  } else if (protocol instanceof V1_XStorePropertyMapping) {
    return serialize(xStorePropertyMappingModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeRelationalPropertyMapping(
  json: PlainObject<V1_PropertyMapping>,
): V1_PropertyMapping | typeof SKIP {
  switch (json._type) {
    case V1_PropertyMappingType.RELATIONAL:
      return deserialize(relationalPropertyMappingModelSchema, json);
    case V1_PropertyMappingType.EMBEDDED_RELATIONAL:
      return deserialize(embeddedRelationalPropertyMappingModelSchema, json);
    case V1_PropertyMappingType.OTHERWISE_EMBEDDED_RELATIONAL:
      return deserialize(
        otherwiseEmbeddedRelationalPropertyMappingModelSchema,
        json,
      );
    case V1_PropertyMappingType.INLINE_EMBEDDED_RELATIONAL:
      return deserialize(inlineEmbeddedPropertyMappingModelSchema, json);
    case V1_PropertyMappingType.XSTORE:
      return deserialize(xStorePropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
}

// ------------------------------------- Flat-data Mapping -------------------------------------

const flatDataPropertyMappingModelSchema = createModelSchema(
  V1_FlatDataPropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.FLAT_DATA),
    enumMappingId: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    source: primitive(),
    target: optional(primitive()),
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

const embeddedFlatDataPropertyMappingModelSchema = createModelSchema(
  V1_EmbeddedFlatDataPropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.EMBEDDED_FLAT_DATA),
    class: primitive(),
    id: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    propertyMappings: list(
      custom(
        V1_serializeFlatDataPropertyMapping,
        V1_deserializeFlatDataPropertyMapping,
      ),
    ),
    root: primitive(),
    source: primitive(),
    target: optional(primitive()),
  },
);

function V1_serializeFlatDataPropertyMapping(
  protocol: V1_AbstractFlatDataPropertyMapping,
): PlainObject<V1_AbstractFlatDataPropertyMapping> | typeof SKIP {
  if (protocol instanceof V1_FlatDataPropertyMapping) {
    return serialize(flatDataPropertyMappingModelSchema, protocol);
  } else if (protocol instanceof V1_EmbeddedFlatDataPropertyMapping) {
    return serialize(embeddedFlatDataPropertyMappingModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeFlatDataPropertyMapping(
  json: PlainObject<V1_AbstractFlatDataPropertyMapping>,
): V1_AbstractFlatDataPropertyMapping | typeof SKIP {
  switch (json._type) {
    case V1_PropertyMappingType.FLAT_DATA:
      return deserialize(flatDataPropertyMappingModelSchema, json);
    case V1_PropertyMappingType.EMBEDDED_FLAT_DATA:
      return deserialize(embeddedFlatDataPropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
}

const rootFlatDataCLassMappingModelSchema = createModelSchema(
  V1_RootFlatDataClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.ROOT_FLAT_DATA),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    filter: usingModelSchema(V1_rawLambdaModelSchema),
    flatData: primitive(),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        V1_serializeFlatDataPropertyMapping,
        V1_deserializeFlatDataPropertyMapping,
      ),
    ),
    root: primitive(),
    sectionName: primitive(),
  },
);

// ------------------------------------- Aggregation Aware Mapping -------------------------------------

const aggregationAwarePropertyMappingModelSchema = createModelSchema(
  V1_AggregationAwarePropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.AGGREGATION_AWARE),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    source: optional(primitive()),
    target: optional(primitive()),
  },
);

const aggregateFunctionModelSchema = createModelSchema(V1_AggregateFunction, {
  aggregateFn: usingModelSchema(V1_rawLambdaModelSchema),
  mapFn: usingModelSchema(V1_rawLambdaModelSchema),
});

const groupByFunctionModelSchema = createModelSchema(V1_GroupByFunction, {
  groupByFn: usingModelSchema(V1_rawLambdaModelSchema),
});

const aggregateSpecificationModelSchema = createModelSchema(
  V1_AggregateSpecification,
  {
    aggregateValues: list(usingModelSchema(aggregateFunctionModelSchema)),
    canAggregate: primitive(),
    groupByFunctions: list(usingModelSchema(groupByFunctionModelSchema)),
  },
);

const aggregateSetImplementationContainer = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AggregateSetImplementationContainer> =>
  createModelSchema(V1_AggregateSetImplementationContainer, {
    aggregateSpecification: usingModelSchema(aggregateSpecificationModelSchema),
    index: primitive(),
    setImplementation: custom(
      (val) => V1_serializeClassMapping(val, plugins),
      (val) => V1_deserializeClassMapping(val, plugins),
    ),
  });

function V1_serializeAggregationAwarePropertyMapping(
  protocol: V1_AggregationAwarePropertyMapping,
): PlainObject<V1_AggregationAwarePropertyMapping> | typeof SKIP {
  if (protocol instanceof V1_AggregationAwarePropertyMapping) {
    return serialize(aggregationAwarePropertyMappingModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeAggregationAwarePropertyMapping(
  json: PlainObject<V1_AggregationAwarePropertyMapping>,
): V1_AggregationAwarePropertyMapping | typeof SKIP {
  switch (json._type) {
    case V1_PropertyMappingType.AGGREGATION_AWARE:
      return deserialize(aggregationAwarePropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
}

const aggregationAwareClassMappingModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_AggregationAwareClassMapping> =>
  createModelSchema(V1_AggregationAwareClassMapping, {
    _type: usingConstantValueSchema(V1_ClassMappingType.AGGREGATION_AWARE),
    aggregateSetImplementations: list(
      usingModelSchema(aggregateSetImplementationContainer(plugins)),
    ),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    id: optional(primitive()),
    mainSetImplementation: custom(
      (val) => V1_serializeClassMapping(val, plugins),
      (val) => V1_deserializeClassMapping(val, plugins),
    ),
    propertyMappings: list(
      custom(
        V1_serializeAggregationAwarePropertyMapping,
        V1_deserializeAggregationAwarePropertyMapping,
      ),
    ),
    root: primitive(),
  });

// ------------------------------------- Relation Function Mapping -------------------------------------

const relationFunctionPropertyMappingModelSchema = createModelSchema(
  V1_RelationFunctionPropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.RELATION_FUNCTION),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    source: optional(primitive()),
    target: optional(primitive()),
    column: primitive(),
    bindingTransformer: optionalCustom(
      (val) => serialize(bindingTransformerModelSchema, val),
      (val) => deserialize(bindingTransformerModelSchema, val),
    ),
  },
);

function V1_serializeRelationFunctionPropertyMapping(
  protocol: V1_RelationFunctionPropertyMapping,
): PlainObject<V1_RelationFunctionPropertyMapping> {
  return serialize(relationFunctionPropertyMappingModelSchema, protocol);
}

function V1_deserializeRelationFunctionPropertyMapping(
  json: PlainObject<V1_RelationFunctionPropertyMapping>,
): V1_RelationFunctionPropertyMapping | typeof SKIP {
  switch (json._type) {
    case V1_PropertyMappingType.RELATION_FUNCTION:
      return deserialize(relationFunctionPropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
}

const relationFunctionClassMappingModelSchema = createModelSchema(
  V1_RelationFunctionClassMapping,
  {
    _type: usingConstantValueSchema(V1_ClassMappingType.RELATION_FUNCTION),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        V1_serializeRelationFunctionPropertyMapping,
        V1_deserializeRelationFunctionPropertyMapping,
      ),
    ),
    root: primitive(),
    relationFunction: usingModelSchema(V1_packageableElementPointerModelSchema),
  },
);

// ------------------------------------- Class Mapping -------------------------------------

function V1_serializeClassMapping(
  value: V1_ClassMapping,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ClassMapping> {
  if (value instanceof V1_INTERNAL__UnknownClassMapping) {
    return value.content;
  } else if (value instanceof V1_MergeOperationClassMapping) {
    return serialize(mergeOperationClassMappingModelSchema, value);
  } else if (value instanceof V1_OperationClassMapping) {
    return serialize(operationClassMappingModelSchema, value);
  } else if (value instanceof V1_PureInstanceClassMapping) {
    return serialize(pureInstanceClassMappingModelSchema, value);
  } else if (value instanceof V1_RootFlatDataClassMapping) {
    return serialize(rootFlatDataCLassMappingModelSchema, value);
  } else if (value instanceof V1_RootRelationalClassMapping) {
    return serialize(rootRelationalClassMappingModelSchema, value);
  } else if (value instanceof V1_RelationalClassMapping) {
    return serialize(relationalClassMappingModelSchema, value);
  } else if (value instanceof V1_AggregationAwareClassMapping) {
    return serialize(aggregationAwareClassMappingModelSchema(plugins), value);
  } else if (value instanceof V1_RelationFunctionClassMapping) {
    return serialize(relationFunctionClassMappingModelSchema, value);
  }
  const extraClassMappingSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraClassMappingSerializers?.() ?? [],
  );
  for (const serializer of extraClassMappingSerializers) {
    const json = serializer(value);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize class mapping: no compatible serializer available from plugins`,
    value,
  );
}

const V1_INTERNAL__UnknownClassMappingModelSchema = createModelSchema(
  V1_INTERNAL__UnknownClassMapping,
  {
    class: primitive(),
    id: optional(primitive()),
    root: primitive(),
  },
);

function V1_deserializeClassMapping(
  json: PlainObject<V1_ClassMapping>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ClassMapping {
  switch (json._type) {
    case V1_ClassMappingType.MERGE_OPERATION:
      return deserialize(mergeOperationClassMappingModelSchema, json);
    case V1_ClassMappingType.OPERATION:
      return deserialize(operationClassMappingModelSchema, json);
    case V1_ClassMappingType.PUREINSTANCE:
      return deserialize(pureInstanceClassMappingModelSchema, json);
    case V1_ClassMappingType.ROOT_FLAT_DATA:
      return deserialize(rootFlatDataCLassMappingModelSchema, json);
    case V1_ClassMappingType.ROOT_RELATIONAL:
      return deserialize(rootRelationalClassMappingModelSchema, json);
    case V1_ClassMappingType.RELATIONAL:
      return deserialize(relationalClassMappingModelSchema, json);
    case V1_ClassMappingType.AGGREGATION_AWARE:
      return deserialize(
        aggregationAwareClassMappingModelSchema(plugins),
        json,
      );
    case V1_ClassMappingType.RELATION_FUNCTION:
      return deserialize(relationFunctionClassMappingModelSchema, json);
    default: {
      const extraClassMappingDeserializers = plugins.flatMap(
        (plugin) =>
          (
            plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
          ).V1_getExtraClassMappingDeserializers?.() ?? [],
      );
      for (const deserializer of extraClassMappingDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }

      // Fall back to create unknown stub if not supported
      const protocol = deserialize(
        V1_INTERNAL__UnknownClassMappingModelSchema,
        json,
      );
      protocol.content = json;
      return protocol;
    }
  }
}

// ------------------------------------- Mapping Test -------------------------------------

enum V1_InputDataType {
  OBJECT = 'object',
  FLAT_DATA = 'flatData',
  RELATIONAL = 'relational',
}

enum V1_MappingTestAssertType {
  EXPECTED_OUTPUT_MAPPING_TEST_ASSERT = 'expectedOutputMappingTestAssert',
}

const V1_objectInputData = createModelSchema(V1_DEPRECATED__ObjectInputData, {
  _type: usingConstantValueSchema(V1_InputDataType.OBJECT),
  data: primitive(),
  inputType: primitive(),
  sourceClass: primitive(),
});

const V1_flatDataInputData = createModelSchema(
  V1_DEPRECATED__FlatDataInputData,
  {
    _type: usingConstantValueSchema(V1_InputDataType.FLAT_DATA),
    data: primitive(),
    sourceFlatData: usingModelSchema(V1_packageableElementPointerModelSchema),
  },
);

const V1_relationalInputData = createModelSchema(
  V1_DEPRECATED__RelationalInputData,
  {
    _type: usingConstantValueSchema(V1_InputDataType.RELATIONAL),
    data: primitive(),
    database: primitive(),
    inputType: primitive(),
  },
);

const V1_expectedOutputMappingTestAssertModelSchema = createModelSchema(
  V1_DEPRECATED__ExpectedOutputMappingTestAssert,
  {
    _type: usingConstantValueSchema(
      V1_MappingTestAssertType.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
    ),
    expectedOutput: primitive(),
  },
);

const V1_serializeInputData = (
  protocol: V1_DEPRECATED__InputData,
): PlainObject<V1_DEPRECATED__InputData> => {
  if (protocol instanceof V1_DEPRECATED__ObjectInputData) {
    return serialize(V1_objectInputData, protocol);
  } else if (protocol instanceof V1_DEPRECATED__FlatDataInputData) {
    return serialize(V1_flatDataInputData, protocol);
  } else if (protocol instanceof V1_DEPRECATED__RelationalInputData) {
    return serialize(V1_relationalInputData, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize mapping test input data`,
    protocol,
  );
};

const V1_deserializeInputData = (
  json: PlainObject<V1_DEPRECATED__InputData>,
): V1_DEPRECATED__InputData => {
  switch (json._type) {
    case V1_InputDataType.OBJECT:
      return deserialize(V1_objectInputData, json);
    case V1_InputDataType.FLAT_DATA:
      return deserialize(V1_flatDataInputData, json);
    case V1_InputDataType.RELATIONAL:
      return deserialize(V1_relationalInputData, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize mapping test input data of type '${json._type}'`,
      );
  }
};

const V1_serializeTestAssert = (
  protocol: V1_DEPRECATED__MappingTestAssert,
): PlainObject<V1_DEPRECATED__MappingTestAssert> => {
  if (protocol instanceof V1_DEPRECATED__ExpectedOutputMappingTestAssert) {
    return serialize(V1_expectedOutputMappingTestAssertModelSchema, protocol);
  }

  throw new UnsupportedOperationError(
    `Can't serialize mapping test assert`,
    protocol,
  );
};

const V1_deserializeTestAssert = (
  json: PlainObject<V1_DEPRECATED__MappingTestAssert>,
): V1_DEPRECATED__MappingTestAssert => {
  switch (json._type) {
    case V1_MappingTestAssertType.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT:
      return deserialize(V1_expectedOutputMappingTestAssertModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize mapping test assert of type '${json._type}'`,
      );
  }
};

const V1_mappingTestModelLegacySchema = createModelSchema(
  V1_DEPRECATED__MappingTest,
  {
    assert: custom(V1_serializeTestAssert, V1_deserializeTestAssert),
    inputData: list(custom(V1_serializeInputData, V1_deserializeInputData)),
    name: primitive(),
    query: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

export const V1_mappingStoreTestDataModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MappingStoreTestData> =>
  createModelSchema(V1_MappingStoreTestData, {
    data: custom(
      (val) => V1_serializeEmbeddedDataType(val, plugins),
      (val) => V1_deserializeEmbeddedDataType(val, plugins),
    ),
    store: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.STORE,
        ),
    ),
  });

export const V1_mappingTestModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MappingTest> =>
  createModelSchema(V1_MappingTest, {
    _type: usingConstantValueSchema(ATOMIC_TEST_TYPE.Mapping_Test),
    assertions: list(
      custom(V1_serializeTestAssertion, V1_deserializeTestAssertion),
    ),
    doc: optional(primitive()),
    id: primitive(),
    storeTestData: usingModelSchema(
      V1_mappingStoreTestDataModelSchema(plugins),
    ),
  });

export const V1_mappingTestSuiteModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MappingTestSuite> =>
  createModelSchema(V1_MappingTestSuite, {
    _type: usingConstantValueSchema(V1_TestSuiteType.MAPPING_TEST_SUITE),
    doc: optional(primitive()),
    id: primitive(),
    func: usingModelSchema(V1_rawLambdaModelSchema),
    tests: list(
      custom(
        (val) => V1_serializeAtomicTest(val, plugins),
        (val) => V1_deserializeAtomicTest(val, plugins),
      ),
    ),
  });

// ------------------------------------- Association Mapping -------------------------------------

enum V1_AssociationMappingType {
  RELATIONAL = 'relational',
  XSTORE = 'xStore',
  FLAT_DATA = 'flatData',
}

const V1_serializeAssociationPropertyMapping = (
  protocol: V1_PropertyMapping,
): PlainObject<V1_PropertyMapping> | typeof SKIP => {
  if (protocol instanceof V1_RelationalPropertyMapping) {
    return serialize(relationalPropertyMappingModelSchema, protocol);
  } else if (protocol instanceof V1_XStorePropertyMapping) {
    return serialize(xStorePropertyMappingModelSchema, protocol);
  } else if (protocol instanceof V1_FlatDataAssociationPropertyMapping) {
    return serialize(flatDataAssociationPropertyMappingModelSchema, protocol);
  }
  return SKIP;
};

const V1_deserializeAssociationPropertyMapping = (
  json: PlainObject<V1_PropertyMapping>,
): V1_PropertyMapping | typeof SKIP => {
  switch (json._type) {
    case V1_PropertyMappingType.RELATIONAL:
      return deserialize(relationalPropertyMappingModelSchema, json);
    case V1_PropertyMappingType.XSTORE:
      return deserialize(xStorePropertyMappingModelSchema, json);
    case V1_PropertyMappingType.ASSOCIATION_FLAT_DATA:
      return deserialize(flatDataAssociationPropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
};

const relationalAssociationMappingModelschema = createModelSchema(
  V1_RelationalAssociationMapping,
  {
    _type: usingConstantValueSchema(V1_AssociationMappingType.RELATIONAL),
    association: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.ASSOCIATION,
        ),
    ),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        V1_serializeAssociationPropertyMapping,
        V1_deserializeAssociationPropertyMapping,
      ),
    ),
    stores: list(primitive()),
  },
);

const flatDataAssociationMappingModelschema = createModelSchema(
  V1_FlatDataAssociationMapping,
  {
    _type: usingConstantValueSchema(V1_AssociationMappingType.FLAT_DATA),
    association: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.ASSOCIATION,
        ),
    ),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        V1_serializeAssociationPropertyMapping,
        V1_deserializeAssociationPropertyMapping,
      ),
    ),
    stores: list(primitive()),
  },
);

const xStoreAssociationMappingModelschema = createModelSchema(
  V1_XStoreAssociationMapping,
  {
    _type: usingConstantValueSchema(V1_AssociationMappingType.XSTORE),
    association: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.ASSOCIATION,
        ),
    ),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        V1_serializeAssociationPropertyMapping,
        V1_deserializeAssociationPropertyMapping,
      ),
    ),
    stores: list(primitive()),
  },
);

const V1_serializeAssociationMapping = (
  protocol: V1_AssociationMapping,
): PlainObject<V1_AssociationMapping> => {
  if (protocol instanceof V1_RelationalAssociationMapping) {
    return serialize(relationalAssociationMappingModelschema, protocol);
  } else if (protocol instanceof V1_XStoreAssociationMapping) {
    return serialize(xStoreAssociationMappingModelschema, protocol);
  } else if (protocol instanceof V1_FlatDataAssociationMapping) {
    return serialize(flatDataAssociationMappingModelschema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize association mapping`,
    protocol,
  );
};

const V1_deserializeAssociationMapping = (
  json: PlainObject<V1_AssociationMapping>,
): V1_AssociationMapping => {
  switch (json._type) {
    case V1_AssociationMappingType.RELATIONAL:
      return deserialize(relationalAssociationMappingModelschema, json);
    case V1_AssociationMappingType.XSTORE:
      return deserialize(xStoreAssociationMappingModelschema, json);
    case V1_AssociationMappingType.FLAT_DATA:
      return deserialize(flatDataAssociationMappingModelschema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize association mapping of type '${json._type}'`,
      );
  }
};

// ------------------------------------- Enumeration Mapping -------------------------------------

enum V1_EnumValueMappingSourceValueType {
  STRING = 'stringSourceValue',
  INTEGER = 'integerSourceValue',
  ENUM = 'enumSourceValue',
}

const enumValueMappingStringSourceValueModelSchema = createModelSchema(
  V1_EnumValueMappingStringSourceValue,
  {
    _type: usingConstantValueSchema(V1_EnumValueMappingSourceValueType.STRING),
    value: primitive(),
  },
);

const enumValueMappingIntegerSourceValueModelSchema = createModelSchema(
  V1_EnumValueMappingIntegerSourceValue,
  {
    _type: usingConstantValueSchema(V1_EnumValueMappingSourceValueType.INTEGER),
    value: primitive(),
  },
);

const enumValueMappingEnumSourceValueeModelSchema = createModelSchema(
  V1_EnumValueMappingEnumSourceValue,
  {
    _type: usingConstantValueSchema(V1_EnumValueMappingSourceValueType.ENUM),
    enumeration: primitive(),
    value: primitive(),
  },
);

const serializeEnumValueMappingSourceValue = (
  protocol: V1_EnumValueMappingSourceValue,
): PlainObject<V1_EnumValueMappingSourceValue> => {
  if (protocol instanceof V1_EnumValueMappingStringSourceValue) {
    return serialize(enumValueMappingStringSourceValueModelSchema, protocol);
  } else if (protocol instanceof V1_EnumValueMappingIntegerSourceValue) {
    return serialize(enumValueMappingIntegerSourceValueModelSchema, protocol);
  } else if (protocol instanceof V1_EnumValueMappingEnumSourceValue) {
    return serialize(enumValueMappingEnumSourceValueeModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize enum value mapping source value`,
    protocol,
  );
};

const V1_deserializeEnumValueMappingSourceValue = (
  json: PlainObject<V1_EnumValueMappingSourceValue>,
  context: { args?: V1_EnumerationMapping },
): V1_EnumValueMappingSourceValue => {
  if (context.args) {
    // NOTE: we cannot use `instanceof` here since it will cause circular dependency
    const parentEnumerationMapping = context.args;
    if (parentEnumerationMapping.sourceType) {
      switch (parentEnumerationMapping.sourceType) {
        case PRIMITIVE_TYPE.STRING: {
          const sourceValue = new V1_EnumValueMappingStringSourceValue();
          sourceValue.value = guaranteeIsString(
            json,
            'Enum value mapping string source value must be a string',
          );
          return sourceValue;
        }
        case PRIMITIVE_TYPE.INTEGER: {
          const sourceValue = new V1_EnumValueMappingIntegerSourceValue();
          sourceValue.value = guaranteeIsNumber(
            json,
            'Enum value mapping integer source value must be a number',
          );
          return sourceValue;
        }
        default: {
          const sourceValue = new V1_EnumValueMappingEnumSourceValue();
          assertTrue(
            isNonNullable(parentEnumerationMapping.sourceType) &&
              typeof parentEnumerationMapping.sourceType === 'string',
            'Enum value mapping enumeration source value enumeration must be a string',
          );
          sourceValue.enumeration = parentEnumerationMapping.sourceType;
          sourceValue.value = guaranteeIsString(
            json,
            'Enum value mapping enumeration source value must be a string',
          );
          return sourceValue;
        }
      }
    }
    switch (json._type) {
      case V1_EnumValueMappingSourceValueType.STRING:
        return deserialize(enumValueMappingStringSourceValueModelSchema, json);
      case V1_EnumValueMappingSourceValueType.INTEGER:
        return deserialize(enumValueMappingIntegerSourceValueModelSchema, json);
      case V1_EnumValueMappingSourceValueType.ENUM:
        return deserialize(enumValueMappingEnumSourceValueeModelSchema, json);
      // NOTE: we might need to work on this since this is not backward compatible
      default:
        throw new UnsupportedOperationError(
          `Can't deserialize enum value mapping source value of type '${json._type}'`,
        );
    }
  }
  throw new IllegalStateError(
    `Deserialization parent context is not defined. Got: ${shallowStringify(
      context,
    )}`,
  );
};

const enumValueMappingModelSchema = createModelSchema(V1_EnumValueMapping, {
  enumValue: primitive(),
  sourceValues: list(
    custom(serializeEnumValueMappingSourceValue, (value, context) =>
      V1_deserializeEnumValueMappingSourceValue(
        value,
        context as { args?: V1_EnumerationMapping },
      ),
    ),
  ), //TODO look into why args is private in context
});

const V1_enumerationMappingModelSchema = createModelSchema(
  V1_EnumerationMapping,
  {
    enumValueMappings: list(
      custom(
        (value) => serialize(enumValueMappingModelSchema, value),
        (value, context) =>
          deserialize(
            enumValueMappingModelSchema,
            value,
            undefined,
            context.target,
          ),
      ),
    ),
    enumeration: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) =>
        V1_serializePackageableElementPointer(
          val,
          PackageableElementPointerType.ENUMERATION,
        ),
    ),
    id: optional(primitive()),
  },
);

// ------------------------------------- Mapping -------------------------------------

export const V1_MAPPING_ELEMENT_PROTOCOL_TYPE = 'mapping';

const V1_MAPPING_INCLUDE_MAPPING_TYPE = 'mappingIncludeMapping';

const V1_mappingIncludeMappingModelSchema = createModelSchema(
  V1_MappingIncludeMapping,
  {
    _type: usingConstantValueSchema(V1_MAPPING_INCLUDE_MAPPING_TYPE),
    includedMapping: primitive(),
    sourceDatabasePath: optional(primitive()),
    targetDatabasePath: optional(primitive()),
  },
);

const V1_serializeMappingInclude = (
  protocol: V1_MappingInclude,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_MappingInclude> => {
  if (protocol instanceof V1_INTERNAL__UnknownMappingInclude) {
    return protocol.content;
  } else if (protocol instanceof V1_MappingIncludeDataProduct) {
    return serialize(V1_mappingIncludeDataProductModelSchema, protocol);
  } else if (protocol instanceof V1_MappingIncludeMapping) {
    return serialize(V1_mappingIncludeMappingModelSchema, protocol);
  }
  const extraMappingIncludeSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMappingIncludeProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraMappingIncludeSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize mapping include: no compatible serializer available from plugins`,
    protocol,
  );
};

const V1_deserializeMappingInclude = (
  json: PlainObject<V1_MappingInclude>,
  plugins: PureProtocolProcessorPlugin[],
): V1_MappingInclude => {
  if (json._type === V1_MAPPING_INCLUDE_DATAPRODUCT_TYPE) {
    return deserialize(V1_mappingIncludeDataProductModelSchema, json);
  }
  if (!json._type || json._type === V1_MAPPING_INCLUDE_MAPPING_TYPE) {
    return deserialize(V1_mappingIncludeMappingModelSchema, {
      ...json,
      /** @backwardCompatibility */
      includedMapping:
        json.includedMapping ??
        `${json.includedMappingPackage}${ELEMENT_PATH_DELIMITER}${json.includedMappingName}`,
    });
  }
  const extraMappingIncludeDeserializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMappingIncludeProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraMappingIncludeDeserializers) {
    const protocol = deserializer(json);
    if (protocol) {
      return protocol;
    }
  }
  // Fall back to create unknown stub if not supported
  const protocol = new V1_INTERNAL__UnknownMappingInclude();
  protocol.content = json;
  return protocol;
};

export const V1_mappingModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Mapping> =>
  createModelSchema(V1_Mapping, {
    _type: usingConstantValueSchema(V1_MAPPING_ELEMENT_PROTOCOL_TYPE),
    associationMappings: customList(
      V1_serializeAssociationMapping,
      V1_deserializeAssociationMapping,
      {
        INTERNAL__forceReturnEmptyInTest: true,
      },
    ),
    classMappings: list(
      custom(
        (val) => V1_serializeClassMapping(val, plugins),
        (val) => V1_deserializeClassMapping(val, plugins),
      ),
    ),
    enumerationMappings: list(
      usingModelSchema(V1_enumerationMappingModelSchema),
    ),
    includedMappings: list(
      custom(
        (val) => V1_serializeMappingInclude(val, plugins),
        (val) => V1_deserializeMappingInclude(val, plugins),
      ),
    ),
    name: primitive(),
    package: primitive(),
    testSuites: optionalCustomList(
      (value: V1_TestSuite) => V1_serializeTestSuite(value, plugins),
      (value) => V1_deserializeTestSuite(value, plugins),
    ),
    tests: list(usingModelSchema(V1_mappingTestModelLegacySchema)),
  });
