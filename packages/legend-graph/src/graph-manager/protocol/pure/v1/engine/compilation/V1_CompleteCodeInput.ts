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

import { SerializationFactory } from '@finos/legend-shared';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import { createModelSchema, optional, primitive } from 'serializr';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';

export class V1_CompleteCodeInput {
  model!: V1_PureModelContext;
  codeBlock!: string;
  offset?: number | undefined;

  constructor(
    codeBlock: string,
    model: V1_PureModelContext,
    offset: number | undefined,
  ) {
    this.codeBlock = codeBlock;
    this.model = model;
    this.offset = offset;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CompleteCodeInput, {
      model: V1_pureModelContextPropSchema,
      codeBlock: primitive(),
      offset: optional(primitive()),
    }),
  );
}
