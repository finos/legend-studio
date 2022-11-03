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
  deserializeArray,
  assertTrue,
  guaranteeIsNumber,
  guaranteeIsString,
  IllegalStateError,
  isNonNullable,
  shallowStringify,
  UnsupportedOperationError,
  serializeArray,
  usingModelSchema,
  optionalCustom,
} from '@finos/legend-shared';
import {
  ELEMENT_PATH_DELIMITER,
  PRIMITIVE_TYPE,
} from '../../../../../../../graph/MetaModelConst.js';
import type { V1_InputData } from '../../../model/packageableElements/mapping/V1_InputData.js';
import { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping.js';
import { V1_MappingTest } from '../../../model/packageableElements/mapping/V1_MappingTest.js';
import {
  V1_multiplicitySchema,
  V1_packageableElementPointerDeserializerSchema,
} from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import {
  V1_propertyPointerModelSchema,
  V1_deserializePropertyPointer,
} from './V1_DomainSerializationHelper.js';
import { V1_FlatDataInputData } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataInputData.js';
import { V1_ObjectInputData } from '../../../model/packageableElements/store/modelToModel/mapping/V1_ObjectInputData.js';
import { V1_ExpectedOutputMappingTestAssert } from '../../../model/packageableElements/mapping/V1_ExpectedOutputMappingTestAssert.js';
import type { V1_MappingTestAssert } from '../../../model/packageableElements/mapping/V1_MappingTestAssert.js';
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
import { V1_MappingInclude } from '../../../model/packageableElements/mapping/V1_MappingInclude.js';
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
import { V1_RelationalInputData } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalInputData.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import { V1_BindingTransformer } from '../../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_BindingTransformer.js';
import { V1_MergeOperationClassMapping } from '../../../model/packageableElements/mapping/V1_MergeOperationClassMapping.js';
import type { V1_RelationalOperationElement } from '../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement.js';
import { V1_FlatDataAssociationMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationMapping.js';
import { V1_FlatDataAssociationPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationPropertyMapping.js';

enum V1_ClassMappingType {
  OPERATION = 'operation',
  MERGE_OPERATION = 'mergeOperation',
  PUREINSTANCE = 'pureInstance',
  ROOT_FLAT_DATA = 'flatData',
  ROOT_RELATIONAL = 'relational',
  RELATIONAL = 'embedded',
  AGGREGATION_AWARE = 'aggregationAware',
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
}

// ------------------------------------- Shared -------------------------------------

const V1_localMappingPropertyInfoModelSchema = createModelSchema(
  V1_LocalMappingPropertyInfo,
  {
    multiplicity: usingModelSchema(V1_multiplicitySchema),
    type: primitive(),
  },
);

// ------------------------------------- M2M Mapping -------------------------------------

const purePropertyMappingModelSchema = createModelSchema(
  V1_PurePropertyMapping,
  {
    _type: usingConstantValueSchema(V1_PropertyMappingType.PURE),
    enumMappingId: optional(primitive()),
    explodeProperty: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
    source: primitive(),
    target: optional(primitive()),
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

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

function V1_serializeM2MPropertyMapping(
  protocol: V1_PurePropertyMapping,
): PlainObject<V1_PurePropertyMapping> | typeof SKIP {
  if (protocol instanceof V1_PurePropertyMapping) {
    return serialize(purePropertyMappingModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeM2MPropertyMapping(
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
        (val) => V1_serializeM2MPropertyMapping(val),
        (val) => V1_deserializeM2MPropertyMapping(val),
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
    extendsClassMappingId: optional(primitive()),
    distinct: primitive(),
    filter: usingModelSchema(V1_filterMappingModelSchema),
    groupBy: custom(
      (values) =>
        serializeArray(
          values,
          (value: V1_RelationalOperationElement) =>
            V1_serializeRelationalOperationElement(value),
          {
            skipIfEmpty: true,
            INTERNAL__forceReturnEmptyInTest: true,
          },
        ),
      (values) =>
        deserializeArray(
          values,
          (val) => V1_deserializeRelationalOperationElement(val),
          {
            skipIfEmpty: false,
          },
        ),
    ),
    id: optional(primitive()),
    mainTable: usingModelSchema(V1_tablePtrModelSchema),
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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

const otherwiseEmbeddedRelationalPropertyMappingModelSchgema =
  createModelSchema(V1_OtherwiseEmbeddedRelationalPropertyMapping, {
    _type: usingConstantValueSchema(
      V1_PropertyMappingType.OTHERWISE_EMBEDDED_RELATIONAL,
    ),
    classMapping: usingModelSchema(relationalClassMappingModelSchema),
    otherwisePropertyMapping: custom(
      (val) => V1_serializeRelationalPropertyMapping(val),
      (val) => V1_deserializeRelationalPropertyMapping(val),
    ),
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
  });

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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
      otherwiseEmbeddedRelationalPropertyMappingModelSchgema,
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
        otherwiseEmbeddedRelationalPropertyMappingModelSchgema,
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
    propertyMappings: list(
      custom(
        (val) => V1_serializeFlatDataPropertyMapping(val),
        (val) => V1_deserializeFlatDataPropertyMapping(val),
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
        (val) => V1_serializeFlatDataPropertyMapping(val),
        (val) => V1_deserializeFlatDataPropertyMapping(val),
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
    property: custom(
      (val) => serialize(V1_propertyPointerModelSchema, val),
      (val) => V1_deserializePropertyPointer(val),
    ),
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
        (val) => V1_serializeAggregationAwarePropertyMapping(val),
        (val) => V1_deserializeAggregationAwarePropertyMapping(val),
      ),
    ),
    root: primitive(),
  });

// ------------------------------------- Class Mapping -------------------------------------

function V1_serializeClassMapping(
  value: V1_ClassMapping,
  plugins: PureProtocolProcessorPlugin[],
): V1_ClassMapping {
  if (value instanceof V1_MergeOperationClassMapping) {
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
      throw new UnsupportedOperationError(
        `Can't deserialize class mapping of type '${json._type}': no compatible deserializer available from plugins`,
      );
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

const V1_objectInputData = createModelSchema(V1_ObjectInputData, {
  _type: usingConstantValueSchema(V1_InputDataType.OBJECT),
  data: primitive(),
  inputType: primitive(),
  sourceClass: primitive(),
});

const V1_flatDataInputData = createModelSchema(V1_FlatDataInputData, {
  _type: usingConstantValueSchema(V1_InputDataType.FLAT_DATA),
  data: primitive(),
  sourceFlatData: usingModelSchema(
    V1_packageableElementPointerDeserializerSchema,
  ),
});

const V1_relationalInputData = createModelSchema(V1_RelationalInputData, {
  _type: usingConstantValueSchema(V1_InputDataType.RELATIONAL),
  data: primitive(),
  database: primitive(),
  inputType: primitive(),
});

const V1_expectedOutputMappingTestAssertModelSchema = createModelSchema(
  V1_ExpectedOutputMappingTestAssert,
  {
    _type: usingConstantValueSchema(
      V1_MappingTestAssertType.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
    ),
    expectedOutput: primitive(),
  },
);

const V1_serializeInputData = (
  protocol: V1_InputData,
): PlainObject<V1_InputData> => {
  if (protocol instanceof V1_ObjectInputData) {
    return serialize(V1_objectInputData, protocol);
  } else if (protocol instanceof V1_FlatDataInputData) {
    return serialize(V1_flatDataInputData, protocol);
  } else if (protocol instanceof V1_RelationalInputData) {
    return serialize(V1_relationalInputData, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize mapping test input data`,
    protocol,
  );
};

const V1_deserializeInputData = (
  json: PlainObject<V1_InputData>,
): V1_InputData => {
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
  protocol: V1_MappingTestAssert,
): PlainObject<V1_MappingTestAssert> => {
  if (protocol instanceof V1_ExpectedOutputMappingTestAssert) {
    return serialize(V1_expectedOutputMappingTestAssertModelSchema, protocol);
  }

  throw new UnsupportedOperationError(
    `Can't serialize mapping test assert`,
    protocol,
  );
};

const V1_deserializeTestAssert = (
  json: PlainObject<V1_MappingTestAssert>,
): V1_MappingTestAssert => {
  switch (json._type) {
    case V1_MappingTestAssertType.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT:
      return deserialize(V1_expectedOutputMappingTestAssertModelSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize mapping test assert of type '${json._type}'`,
      );
  }
};

const V1_mappingTestModelSchema = createModelSchema(V1_MappingTest, {
  assert: custom(
    (val) => V1_serializeTestAssert(val),
    (val) => V1_deserializeTestAssert(val),
  ),
  inputData: list(
    custom(
      (val) => V1_serializeInputData(val),
      (val) => V1_deserializeInputData(val),
    ),
  ),
  name: primitive(),
  query: usingModelSchema(V1_rawLambdaModelSchema),
});

// ------------------------------------- Association Mapping -------------------------------------

enum V1_AssociationMappingType {
  RELATIONAL = 'relational',
  XSTORE = 'xStore',
  FLAT_DATA = 'flatData',
}

const V1_serializeAssociationPropertMapping = (
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

const V1_deserializeAssociationPropertMapping = (
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
    association: primitive(),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        (val) => V1_serializeAssociationPropertMapping(val),
        (val) => V1_deserializeAssociationPropertMapping(val),
      ),
    ),
    stores: list(primitive()),
  },
);

const flatDataAssociationMappingModelschema = createModelSchema(
  V1_FlatDataAssociationMapping,
  {
    _type: usingConstantValueSchema(V1_AssociationMappingType.FLAT_DATA),
    association: primitive(),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        (val) => V1_serializeAssociationPropertMapping(val),
        (val) => V1_deserializeAssociationPropertMapping(val),
      ),
    ),
    stores: list(primitive()),
  },
);

const xStoreAssociationMappingModelschema = createModelSchema(
  V1_XStoreAssociationMapping,
  {
    _type: usingConstantValueSchema(V1_AssociationMappingType.XSTORE),
    association: primitive(),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        (val) => V1_serializeAssociationPropertMapping(val),
        (val) => V1_deserializeAssociationPropertMapping(val),
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
    enumeration: primitive(),
    id: optional(primitive()),
  },
);

// ------------------------------------- Mapping -------------------------------------

export const V1_MAPPING_ELEMENT_PROTOCOL_TYPE = 'mapping';

const V1_mappingIncludeModelSchema = createModelSchema(V1_MappingInclude, {
  includedMapping: primitive(),
  sourceDatabasePath: optional(primitive()),
  targetDatabasePath: optional(primitive()),
});

export const V1_mappingModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Mapping> =>
  createModelSchema(V1_Mapping, {
    _type: usingConstantValueSchema(V1_MAPPING_ELEMENT_PROTOCOL_TYPE),
    associationMappings: custom(
      (values) =>
        serializeArray(
          values,
          (value: V1_AssociationMapping) =>
            V1_serializeAssociationMapping(value),
          {
            skipIfEmpty: true,
            INTERNAL__forceReturnEmptyInTest: true,
          },
        ),
      (values) =>
        deserializeArray(
          values,
          (val) => V1_deserializeAssociationMapping(val),
          {
            skipIfEmpty: false,
          },
        ),
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
        (val) => serialize(V1_mappingIncludeModelSchema, val),
        (val) =>
          deserialize(V1_mappingIncludeModelSchema, {
            ...val,
            /**
             * @backwardCompatibility
             */
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            includedMapping:
              val.includedMapping ??
              `${val.includedMappingPackage}${ELEMENT_PATH_DELIMITER}${val.includedMappingName}`,
          }),
      ),
    ),
    name: primitive(),
    package: primitive(),
    tests: list(usingModelSchema(V1_mappingTestModelSchema)),
  });
