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
import { createModelSchema, object, primitive, list } from 'serializr';
import { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import type { V1_UniqueTestId } from '../../model/test/V1_UniqueTestId.js';
import { V1_uniqueTestIdModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_TestSerializationHelper.js';

export class V1_RunTestsTestableInput {
  testable!: string;
  unitTestIds: V1_UniqueTestId[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RunTestsTestableInput, {
      testable: primitive(),
      unitTestIds: list(usingModelSchema(V1_uniqueTestIdModelSchema)),
    }),
  );
}

export class V1_RunTestsInput {
  model!: V1_PureModelContextData;
  testables: V1_RunTestsTestableInput[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RunTestsInput, {
      model: object(V1_PureModelContextData),
      testables: usingModelSchema(
        V1_RunTestsTestableInput.serialization.schema,
      ),
    }),
  );
}
