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
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import { serialize, deserialize } from 'serializr';
import {
  V1_BaseDataResolver,
  V1_ReferenceDataResolver,
  type V1_DataResolver,
} from '../../../model/data/V1_DataResolver.js';
import type { V1_EmbeddedData } from '../../../model/data/V1_EmbeddedData.js';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin.js';
import {
  V1_deserializeEmbeddedDataType,
  V1_serializeEmbeddedDataType,
} from './V1_DataElementSerializationHelper.js';
import { V1_packageableElementPointerModelSchema } from './V1_CoreSerializationHelper.js';

enum V1_DataResolverType {
  BASE_DATA_RESOLVER = 'baseDataResolver',
  REFERENCE_DATA_RESOLVER = 'referenceDataResolver',
}

export const V1_serializeDataResolver = (
  protocol: V1_DataResolver,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DataResolver> => {
  if (protocol instanceof V1_BaseDataResolver) {
    return {
      _type: V1_DataResolverType.BASE_DATA_RESOLVER,
      data: V1_serializeEmbeddedDataType(protocol.data, plugins),
      elementPointer: serialize(
        V1_packageableElementPointerModelSchema,
        protocol.elementPointer,
      ),
    };
  } else if (protocol instanceof V1_ReferenceDataResolver) {
    return {
      _type: V1_DataResolverType.REFERENCE_DATA_RESOLVER,
      elementPointer: serialize(
        V1_packageableElementPointerModelSchema,
        protocol.elementPointer,
      ),
    };
  }
  throw new UnsupportedOperationError(
    `Unable to serialize data resolver of type '${protocol.constructor.name}'`,
  );
};

export const V1_deserializeDataResolver = (
  json: PlainObject<V1_DataResolver>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataResolver => {
  switch (json._type) {
    case V1_DataResolverType.BASE_DATA_RESOLVER: {
      const resolver = new V1_BaseDataResolver();
      resolver.elementPointer = deserialize(
        V1_packageableElementPointerModelSchema,
        json.elementPointer as PlainObject,
      );
      resolver.data = V1_deserializeEmbeddedDataType(
        json.data as PlainObject<V1_EmbeddedData>,
        plugins,
      );
      return resolver;
    }
    case V1_DataResolverType.REFERENCE_DATA_RESOLVER: {
      const resolver = new V1_ReferenceDataResolver();
      resolver.elementPointer = deserialize(
        V1_packageableElementPointerModelSchema,
        json.elementPointer as PlainObject,
      );
      return resolver;
    }
    default:
      throw new UnsupportedOperationError(
        `Unable to deserialize data resolver of type '${json._type}'`,
      );
  }
};
