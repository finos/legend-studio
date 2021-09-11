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

import { custom, createModelSchema } from 'serializr';
import {
  deseralizeMap,
  SerializationFactory,
  serializeMap,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_ParserError } from '../../engine/grammar/V1_ParserError';
import { V1_Protocol } from '../../model/V1_Protocol';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda';
import { V1_rawLambdaModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';

export class V1_LambdaInput {
  serializer?: V1_Protocol | undefined;
  lambdas?: Map<string, V1_RawLambda> | undefined;
  lambdaErrors?: Map<string, V1_ParserError> | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_LambdaInput, {
      serializer: usingModelSchema(V1_Protocol.serialization.schema),
      lambdas: custom(
        (val) => serializeMap(val, V1_rawLambdaModelSchema),
        (val) => deseralizeMap(val, V1_rawLambdaModelSchema),
      ),
      lambdaErrors: custom(
        (val) => serializeMap(val, V1_ParserError),
        (val) => deseralizeMap(val, V1_ParserError),
      ),
    }),
  );
}
