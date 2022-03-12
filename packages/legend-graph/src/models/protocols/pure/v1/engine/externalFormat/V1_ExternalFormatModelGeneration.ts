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
import { SerializationFactory } from '@finos/legend-shared';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext';
import { PureClientVersion } from '../../../../../../graphManager/GraphManagerUtils';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization';

export class V1_ExternalFormatModelGenerationInput {
  clientVersion?: string | undefined;
  model: V1_PureModelContext;
  config?: Record<PropertyKey, unknown> | undefined;

  constructor(
    model: V1_PureModelContext,
    config?: Record<PropertyKey, unknown>,
  ) {
    this.clientVersion = PureClientVersion.VX_X_X;
    this.model = model;
    this.config = config;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ExternalFormatModelGenerationInput, {
      clientVersion: optional(primitive()),
      model: V1_pureModelContextPropSchema,
      config: raw(),
    }),
  );
}
