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
import { createModelSchema } from 'serializr';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_rawLambdaModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';

export class V1_LambdaReturnTypeInput {
  model: V1_PureModelContext;
  lambda: V1_RawLambda;

  constructor(model: V1_PureModelContext, lambda: V1_RawLambda) {
    this.model = model;
    this.lambda = lambda;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_LambdaReturnTypeInput, {
      lambda: usingModelSchema(V1_rawLambdaModelSchema),
      model: V1_pureModelContextPropSchema,
    }),
  );
}

export interface V1_LambdaReturnTypeResult {
  returnType: string;
}
