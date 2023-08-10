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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { V1_rawLambdaModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';

export class V1_TestDataGenerationInput {
  clientVersion: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * Should be optional. For now, it's mandatory.
   * @discrepancy model
   */
  query!: V1_RawLambda;
  mapping!: string;
  runtime!: string;
  model!: V1_PureModelContext;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TestDataGenerationInput, {
      clientVersion: optional(primitive()),
      query: usingModelSchema(V1_rawLambdaModelSchema),
      mapping: primitive(),
      model: V1_pureModelContextPropSchema,
      runtime: primitive(),
    }),
  );
}
