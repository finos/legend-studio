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
  list,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import {
  customListWithSchema,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import type { V1_Runtime } from '../../model/packageableElements/runtime/V1_Runtime.js';
import type { V1_RawExecutionContext } from '../../model/rawValueSpecification/V1_RawExecutionContext.js';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import {
  V1_deserializeRuntime,
  V1_serializeRuntime,
} from '../../transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper.js';
import {
  V1_rawBaseExecutionContextModelSchema,
  V1_rawLambdaModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import type { V1_ParameterValue } from '../../model/packageableElements/service/V1_ParameterValue.js';
import { V1_parameterValueModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_ServiceSerializationHelper.js';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import { V1_TableRowIdentifiers } from '../service/V1_TableRowIdentifiers.js';

export class V1_ExecuteInput {
  clientVersion: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  function!: V1_RawLambda;
  mapping: string | undefined;
  model!: V1_PureModelContext;
  runtime: V1_Runtime | undefined;
  context!: V1_RawExecutionContext;
  parameterValues: V1_ParameterValue[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ExecuteInput, {
      clientVersion: optional(primitive()),
      function: usingModelSchema(V1_rawLambdaModelSchema),
      mapping: optional(primitive()),
      model: V1_pureModelContextPropSchema,
      runtime: custom(
        (val) => (val ? V1_serializeRuntime(val) : SKIP),
        (val) => (val ? V1_deserializeRuntime(val) : SKIP),
      ),
      context: usingModelSchema(V1_rawBaseExecutionContextModelSchema),
      parameterValues: customListWithSchema(V1_parameterValueModelSchema),
    }),
  );
}

export class V1_TestDataGenerationExecutionInput extends V1_ExecuteInput {
  parameters: (string | number | boolean)[] = [];
  hashStrings = false;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_TestDataGenerationExecutionInput, {
      clientVersion: optional(primitive()),
      function: usingModelSchema(V1_rawLambdaModelSchema),
      mapping: primitive(),
      model: V1_pureModelContextPropSchema,
      runtime: custom(
        (val) => V1_serializeRuntime(val),
        () => SKIP,
      ),
      context: usingModelSchema(V1_rawBaseExecutionContextModelSchema),
      hashStrings: primitive(),
      parameters: list(primitive()),
    }),
  );
}

export class V1_TestDataGenerationExecutionWithSeedInput extends V1_ExecuteInput {
  tableRowIdentifiers: V1_TableRowIdentifiers[] = [];
  hashStrings = false;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_TestDataGenerationExecutionWithSeedInput, {
      clientVersion: optional(primitive()),
      function: usingModelSchema(V1_rawLambdaModelSchema),
      mapping: primitive(),
      model: V1_pureModelContextPropSchema,
      runtime: custom(
        (val) => V1_serializeRuntime(val),
        () => SKIP,
      ),
      context: usingModelSchema(V1_rawBaseExecutionContextModelSchema),
      hashStrings: primitive(),
      tableRowIdentifiers: list(
        usingModelSchema(V1_TableRowIdentifiers.serialization.schema),
      ),
    }),
  );
}
