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
  guaranteeNonNullable,
  isNonNullable,
  SerializationFactory,
} from '@finos/legend-shared';
import { createModelSchema, custom, list, SKIP } from 'serializr';
import type { TestResult } from '../../../../../../graph/metamodel/pure/test/result/TestResult.js';
import type { Testable } from '../../../../../../graph/metamodel/pure/test/Testable.js';
import type { V1_TestResult } from '../../model/test/result/V1_TestResult.js';
import { V1_buildTestResult } from '../../transformation/pureGraph/to/helpers/V1_TestResultBuilderHelper.js';
import { V1_deserializeTestResult } from '../../transformation/pureProtocol/serializationHelpers/V1_TestSerializationHelper.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';

export class V1_RunTestsResult {
  results: V1_TestResult[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RunTestsResult, {
      results: list(custom((value) => SKIP, V1_deserializeTestResult)),
    }),
  );
}

export const V1_buildTestsResult = (
  results: V1_RunTestsResult,
  testableFinder: (id: string) => Testable | undefined,
  plugins: PureProtocolProcessorPlugin[],
): TestResult[] =>
  results.results
    .map((r) =>
      V1_buildTestResult(
        r,
        guaranteeNonNullable(testableFinder(r.testable)),
        plugins,
      ),
    )
    .filter(isNonNullable);
