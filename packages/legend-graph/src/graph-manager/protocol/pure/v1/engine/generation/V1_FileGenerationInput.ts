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

import { createModelSchema, optional, primitive, raw } from 'serializr';
import { type PlainObject, SerializationFactory } from '@finos/legend-shared';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { PureClientVersion } from '../../../../../../graph-manager/GraphManagerUtils.js';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';

export class V1_GenerateFileInput {
  clientVersion?: string | undefined;
  model: V1_PureModelContext;
  config?: PlainObject | undefined;

  constructor(model: V1_PureModelContext, config?: PlainObject) {
    this.clientVersion = PureClientVersion.V1_0_0;
    this.model = model;
    this.config = config;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerateFileInput, {
      clientVersion: optional(primitive()),
      model: V1_pureModelContextPropSchema,
      config: raw(),
    }),
  );
}
