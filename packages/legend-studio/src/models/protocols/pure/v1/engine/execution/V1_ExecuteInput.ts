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
  createModelSchema,
  custom,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import {
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData';
import type { V1_Runtime } from '../../model/packageableElements/runtime/V1_Runtime';
import type { V1_RawExecutionContext } from '../../model/rawValueSpecification/V1_RawExecutionContext';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda';
import { V1_pureModelContextDataPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization';
import { V1_serializeRuntime } from '../../transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper';
import {
  V1_rawBaseExecutionContextModelSchema,
  V1_rawLambdaModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';

export class V1_ExecuteInput {
  clientVersion!: string;
  function!: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  mapping!: string;
  model!: V1_PureModelContextData;
  runtime!: V1_Runtime;
  context!: V1_RawExecutionContext;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ExecuteInput, {
      clientVersion: optional(primitive()),
      function: usingModelSchema(V1_rawLambdaModelSchema),
      mapping: primitive(),
      model: V1_pureModelContextDataPropSchema,
      runtime: custom(
        (val) => V1_serializeRuntime(val),
        () => SKIP,
      ),
      context: usingModelSchema(V1_rawBaseExecutionContextModelSchema),
    }),
  );
}
