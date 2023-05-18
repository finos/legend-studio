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

import type { PlainObject } from '@finos/legend-shared';
import packageJson from '../../../../package.json';
import {
  PureProtocolProcessorPlugin,
  type V1_PackageableElement,
  type V1_ElementProtocolDeserializer,
  V1_INTERNAL__UnknownFunctionActivatorModelSchema,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';

const V1_SNOWFLAKE_APP_ELEMENT_PROTOCOL_TYPE = 'snowflakeApp';

export class DSL_SnowflakeApp_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PackageableElement>,
        plugins: PureProtocolProcessorPlugin[],
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_SNOWFLAKE_APP_ELEMENT_PROTOCOL_TYPE) {
          const protocol = deserialize(
            V1_INTERNAL__UnknownFunctionActivatorModelSchema,
            json,
          );
          protocol.content = json;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
