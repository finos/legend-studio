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
} from 'serializr';
import {
  type V1_DataQualityExecutionContext,
  V1_DataQualityClassValidationsConfiguration,
  V1_DataQualityServiceValidationsConfiguration,
  V1_DataSpaceDataQualityExecutionContext,
  V1_MappingAndRuntimeDataQualityExecutionContext,
} from '../../V1_DataQualityConstraintsConfiguration.js';
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
} from '@finos/legend-graph';

export const V1_DATA_QUALITY_PROTOCOL_TYPE = 'dataQualityValidation';
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

export const V1_dataQualityServiceValidationsConfigurationModelSchema =
  createModelSchema(V1_DataQualityServiceValidationsConfiguration, {
    _type: usingConstantValueSchema(V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE),
    contextName: primitive(),
    serviceName: primitive(),
    dataQualityGraphFetchTree: primitive(),
  });
