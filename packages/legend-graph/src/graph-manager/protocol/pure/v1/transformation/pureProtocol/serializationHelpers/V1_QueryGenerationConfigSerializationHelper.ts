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
  type V1_RelationalQueryGenerationConfig,
  V1_GenerationFeaturesConfig,
} from '../../../model/packageableElements/store/relational/connection/V1_RelationalQueryGenerationConfig.js';
import {
  createModelSchema,
  deserialize,
  serialize,
  primitive,
  list,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';

enum V1_QueryGenerationConfigType {
  GENERATION_FEATURES = 'generationFeaturesConfig',
}

const V1_generationFeaturesConfigModelSchema = createModelSchema(
  V1_GenerationFeaturesConfig,
  {
    _type: usingConstantValueSchema(
      V1_QueryGenerationConfigType.GENERATION_FEATURES,
    ),
    disabled: list(primitive()),
    enabled: list(primitive()),
  },
);

export const V1_serializeQueryGenerationConfig = (
  value: V1_RelationalQueryGenerationConfig,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_RelationalQueryGenerationConfig> => {
  if (value instanceof V1_GenerationFeaturesConfig) {
    return serialize(V1_generationFeaturesConfigModelSchema, value);
  }

  throw new UnsupportedOperationError(
    `Can't serialize query generation config: no compatible serializer available`,
    value,
  );
};

export const V1_deserializeQueryGenerationConfig = (
  json: PlainObject<V1_RelationalQueryGenerationConfig>,
  plugins: PureProtocolProcessorPlugin[],
): V1_RelationalQueryGenerationConfig => {
  switch (json._type) {
    case V1_QueryGenerationConfigType.GENERATION_FEATURES:
      return deserialize(V1_generationFeaturesConfigModelSchema, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize query generation config of type '${json._type}'`,
      );
    }
  }
};
