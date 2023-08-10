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

import { createModelSchema, list, custom, type ModelSchema } from 'serializr';
import type { V1_EmbeddedData } from '../../model/data/V1_EmbeddedData.js';
import {
  V1_deserializeEmbeddedDataType,
  V1_serializeEmbeddedDataType,
} from '../../transformation/pureProtocol/serializationHelpers/V1_DataElementSerializationHelper.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';
import type { V1_GraphBuilderContext } from '../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { TestDataGenerationResult } from '../../../../../../graph/metamodel/pure/packageableElements/service/TestGenerationResult.js';
import { V1_buildEmbeddedData } from '../../transformation/pureGraph/to/helpers/V1_DataElementBuilderHelper.js';

export class V1_TestDataGenerationResult {
  data: V1_EmbeddedData[] = [];
}

export const V1_testDataGenerationResultModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_TestDataGenerationResult> =>
  createModelSchema(V1_TestDataGenerationResult, {
    data: list(
      custom(
        (val) => V1_serializeEmbeddedDataType(val, plugins),
        (val) => V1_deserializeEmbeddedDataType(val, plugins),
      ),
    ),
  });

export const V1_buildTestDataGenerationResult = (
  protocol: V1_TestDataGenerationResult,
  context: V1_GraphBuilderContext,
): TestDataGenerationResult =>
  new TestDataGenerationResult(
    protocol.data.map((p) => V1_buildEmbeddedData(p, context)),
  );
