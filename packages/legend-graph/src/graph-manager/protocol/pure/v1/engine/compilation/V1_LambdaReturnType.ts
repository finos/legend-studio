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
  type PlainObject,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import { createModelSchema, custom, deserialize, serialize } from 'serializr';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import type { V1_RelationType } from '../../model/packageableElements/type/V1_RelationType.js';
import type { V1_EngineError } from '../V1_EngineError.js';
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

export class V1_BatchLambdaReturnTypeInput {
  model: V1_PureModelContext;
  lambdas: Record<string, V1_RawLambda>;

  constructor(
    model: V1_PureModelContext,
    lambdas: Record<string, V1_RawLambda>,
  ) {
    this.model = model;
    this.lambdas = lambdas;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_BatchLambdaReturnTypeInput, {
      model: V1_pureModelContextPropSchema,
      lambdas: custom(
        (
          lambdas: Record<string, V1_RawLambda>,
        ): Record<string, PlainObject<V1_RawLambda>> =>
          Object.fromEntries(
            Object.entries(lambdas).map(([key, lambda]) => [
              key,
              serialize(V1_rawLambdaModelSchema, lambda),
            ]),
          ),
        (
          json: Record<string, PlainObject<V1_RawLambda>>,
        ): Record<string, V1_RawLambda> =>
          Object.fromEntries(
            Object.entries(json).map(([key, value]) => [
              key,
              deserialize(V1_rawLambdaModelSchema, value),
            ]),
          ),
      ),
    }),
  );
}

export interface V1_LambdaReturnTypeResult {
  returnType: string;
}

export interface V1_BatchLambdaReturnTypeResult {
  result: Record<string, PlainObject<V1_RelationType>>;
  errors: Record<string, PlainObject<V1_EngineError>>;
}
