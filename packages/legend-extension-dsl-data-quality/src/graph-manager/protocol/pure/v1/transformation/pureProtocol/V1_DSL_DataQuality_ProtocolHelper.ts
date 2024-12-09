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
  primitive,
  custom,
  deserialize,
  serialize,
  list,
  optional,
  raw,
} from 'serializr';
import {
  type V1_DataQualityExecutionContext,
  V1_DataQualityClassValidationsConfiguration,
  V1_DataQualityServiceValidationsConfiguration,
  V1_DataSpaceDataQualityExecutionContext,
  V1_MappingAndRuntimeDataQualityExecutionContext,
  V1_DataQualityRelationValidationsConfiguration,
  V1_DataQualityRelationValidation,
  V1_DataQualityRelationQueryLambda,
} from '../../V1_DataQualityValidationConfiguration.js';
import {
  type PlainObject,
  optionalCustom,
  usingConstantValueSchema,
  usingModelSchema,
  UnsupportedOperationError,
  customListWithSchema,
} from '@finos/legend-shared';
import {
  type PureProtocolProcessorPlugin,
  V1_packageableElementPointerModelSchema,
  V1_rawLambdaModelSchema,
  V1_serializeGraphFetchTree,
  V1_deserializeGraphFetchTree,
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
  V1_RawValueSpecificationType,
  V1_rawVariableModelSchema,
} from '@finos/legend-graph';

export const V1_DATA_QUALITY_PROTOCOL_TYPE = 'dataQualityValidation';
export const V1_DATA_QUALITY_RELATION_PROTOCOL_TYPE =
  'dataqualityRelationValidation';
export const V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE =
  'dataQualityServiceValidations';
const V1_DATA_QUALITY_DATASPACE_EXECUTION_CONTEXT =
  'dataSpaceDataQualityExecutionContext';
const V1_DATA_QUALITY_MAPPING_AND_RUNTIME_EXECUTION_CONTEXT =
  'mappingAndRuntimeDataQualityExecutionContext';

const dataQualityContextDataSpaceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceDataQualityExecutionContext> =>
  createModelSchema(V1_DataSpaceDataQualityExecutionContext, {
    _type: usingConstantValueSchema(
      V1_DATA_QUALITY_DATASPACE_EXECUTION_CONTEXT,
    ),
    context: primitive(),
    dataSpace: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) => deserialize(V1_packageableElementPointerModelSchema, val),
    ),
  });

const dataQualityContextMappingRuntimeModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MappingAndRuntimeDataQualityExecutionContext> =>
  createModelSchema(V1_MappingAndRuntimeDataQualityExecutionContext, {
    _type: usingConstantValueSchema(
      V1_DATA_QUALITY_MAPPING_AND_RUNTIME_EXECUTION_CONTEXT,
    ),
    mapping: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) => deserialize(V1_packageableElementPointerModelSchema, val),
    ),
    runtime: custom(
      (val) => serialize(V1_packageableElementPointerModelSchema, val),
      (val) => deserialize(V1_packageableElementPointerModelSchema, val),
    ),
  });

export function V1_serializeDataQualityExecutionContext(
  protocol: V1_DataQualityExecutionContext,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DataQualityExecutionContext> {
  if (protocol instanceof V1_DataSpaceDataQualityExecutionContext) {
    return serialize(dataQualityContextDataSpaceModelSchema(plugins), protocol);
  } else if (
    protocol instanceof V1_MappingAndRuntimeDataQualityExecutionContext
  ) {
    return serialize(
      dataQualityContextMappingRuntimeModelSchema(plugins),
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize data quality execution context`,
    protocol,
  );
}

export function V1_deserializeDataQualityExecutionContext(
  json: PlainObject<V1_DataQualityExecutionContext>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataQualityExecutionContext {
  switch (json._type) {
    case V1_DATA_QUALITY_DATASPACE_EXECUTION_CONTEXT:
      return deserialize(dataQualityContextDataSpaceModelSchema(plugins), json);
    case V1_DATA_QUALITY_MAPPING_AND_RUNTIME_EXECUTION_CONTEXT:
      return deserialize(
        dataQualityContextMappingRuntimeModelSchema(plugins),
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize data quality execution context of type '${json._type}'`,
      );
  }
}

const V1_relationValidationModelSchema = createModelSchema(
  V1_DataQualityRelationValidation,
  {
    name: primitive(),
    description: optional(primitive()),
    assertion: usingModelSchema(V1_rawLambdaModelSchema),
    rowMapFunction: optional(usingModelSchema(V1_rawLambdaModelSchema)),
    expected: optional(primitive()),
    buffer: optional(primitive()),
  },
);

const V1_dataQualityClassValidationModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityClassValidationsConfiguration> =>
  createModelSchema(V1_DataQualityClassValidationsConfiguration, {
    _type: usingConstantValueSchema(V1_DATA_QUALITY_PROTOCOL_TYPE),
    context: custom(
      (val) => V1_serializeDataQualityExecutionContext(val, plugins),
      (val) => V1_deserializeDataQualityExecutionContext(val, plugins),
    ),
    dataQualityRootGraphFetchTree: optionalCustom(
      (val) => V1_serializeGraphFetchTree(val, plugins),
      (val) => V1_deserializeGraphFetchTree(val, plugins),
    ),
    filter: usingModelSchema(V1_rawLambdaModelSchema),
    name: primitive(),
    package: primitive(),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
    taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
    }),
  });

export const V1_rawLambdaModelSchemaParameters = createModelSchema(
  V1_DataQualityRelationQueryLambda,
  {
    _type: usingConstantValueSchema(V1_RawValueSpecificationType.LAMBDA),
    body: raw(),
    parameters: list(usingModelSchema(V1_rawVariableModelSchema)),
  },
);

const V1_dataQualityRelationValidationModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityRelationValidationsConfiguration> =>
  createModelSchema(V1_DataQualityRelationValidationsConfiguration, {
    _type: usingConstantValueSchema(V1_DATA_QUALITY_RELATION_PROTOCOL_TYPE),
    name: primitive(),
    package: primitive(),
    query: usingModelSchema(V1_rawLambdaModelSchemaParameters),
    validations: list(usingModelSchema(V1_relationValidationModelSchema)),
    stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
      INTERNAL__forceReturnEmptyInTest: true,
      }),
      taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
          INTERNAL__forceReturnEmptyInTest: true,
      }),
  });

const V1_dataQualityServiceValidationModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataQualityServiceValidationsConfiguration> =>
  createModelSchema(V1_DataQualityServiceValidationsConfiguration, {
    _type: usingConstantValueSchema(V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE),
    contextName: primitive(),
    serviceName: primitive(),
    dataQualityGraphFetchTree: optionalCustom(
      (val) => V1_serializeGraphFetchTree(val, plugins),
      (val) => V1_deserializeGraphFetchTree(val, plugins),
    ),
    name: primitive(),
    package: primitive(),
  });

export const V1_serializeDataQualityClassValidation = (
  protocol: V1_DataQualityClassValidationsConfiguration,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DataQualityClassValidationsConfiguration> =>
  serialize(V1_dataQualityClassValidationModelSchema(plugins), protocol);

export const V1_serializeDataQualityServiceValidation = (
  protocol: V1_DataQualityServiceValidationsConfiguration,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DataQualityServiceValidationsConfiguration> =>
  serialize(V1_dataQualityServiceValidationModelSchema(plugins), protocol);

export const V1_serializeDataQualityRelationValidation = (
  protocol: V1_DataQualityRelationValidationsConfiguration,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DataQualityRelationValidationsConfiguration> =>
  serialize(V1_dataQualityRelationValidationModelSchema(plugins), protocol);

export const V1_deserializeDataQualityClassValidation = (
  json: PlainObject<V1_DataQualityClassValidationsConfiguration>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataQualityClassValidationsConfiguration =>
  deserialize(V1_dataQualityClassValidationModelSchema(plugins), json);

export const V1_deserializeDataQualityServiceValidation = (
  json: PlainObject<V1_DataQualityServiceValidationsConfiguration>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataQualityServiceValidationsConfiguration =>
  deserialize(V1_dataQualityServiceValidationModelSchema(plugins), json);

export const V1_deserializeDataQualityRelationValidation = (
  json: PlainObject<V1_DataQualityRelationValidationsConfiguration>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataQualityRelationValidationsConfiguration =>
  deserialize(V1_dataQualityRelationValidationModelSchema(plugins), json);
