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
  SerializationFactory,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { SKIP, createModelSchema, custom, list } from 'serializr';
import { V1_deserializeDebugTestResult } from '../../transformation/pureProtocol/serializationHelpers/V1_TestSerializationHelper.js';
import type { Testable } from '../../../../../../graph/metamodel/pure/test/Testable.js';
import type { TestDebug } from '../../../../../../graph/metamodel/pure/test/result/DebugTestsResult.js';
import { V1_buildDebugTestResult } from '../../transformation/pureGraph/to/helpers/V1_TestResultBuilderHelper.js';

export abstract class V1_TestDebug {
  testable!: string;
  atomicTestId!: string;
  testSuiteId?: string | undefined;
  error: string | undefined;
}

export class V1_UnknownTestDebug extends V1_TestDebug {
  value!: object;
}

export class V1_TestExecutionPlanDebug extends V1_TestDebug {
  executionPlan: object | undefined;
  debug: string[] | undefined;
}

export class V1_DebugTestsResult {
  results: V1_TestDebug[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DebugTestsResult, {
      results: list(custom((value) => SKIP, V1_deserializeDebugTestResult)),
    }),
  );
}

export const V1_buildDebugTestsResult = (
  results: V1_DebugTestsResult,
  testableFinder: (id: string) => Testable | undefined,
): TestDebug[] =>
  results.results
    .map((r) =>
      V1_buildDebugTestResult(
        r,
        guaranteeNonNullable(testableFinder(r.testable)),
      ),
    )
    .filter(isNonNullable);
