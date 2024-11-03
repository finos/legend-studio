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
  deserialize,
  list,
  object,
  primitive,
  SKIP,
} from 'serializr';

export class PCTAdapter {
  name: string;
  func: string;

  constructor(name: string, func: string) {
    this.name = name;
    this.func = func;
  }
}

export enum TestResultStatus {
  // PASSED = 'passed',
  PASSED = 'Success',
  FAILED = 'AssertFail',
  ERROR = 'Error',
  NOT_RUN = 'notRan',
}

export abstract class TestResult {
  // console!: string;
  // compiler!: string;
  status!: string;
  test!: string[];
}

export class TestSuccessResult extends TestResult {
  declare status: string;
  override test: string[] = [];
}

createModelSchema(TestSuccessResult, {
  status: primitive(),
  test: list(primitive()),
});

export class TestFailureResultError {
  text!: string;
  RO!: boolean;
  line!: number;
  column!: number;
  source!: string;
  error!: boolean;
}

createModelSchema(TestFailureResultError, {
  text: primitive(),
  RO: primitive(),
  line: primitive(),
  column: primitive(),
  source: primitive(),
  error: primitive(),
});

export class TestFailureResult extends TestResult {
  declare status: string;
  override test: string[] = [];
  error!: TestFailureResultError;
}

createModelSchema(TestFailureResult, {
  status: primitive(),
  test: list(primitive()),
  error: object(TestFailureResultError),
});

export class AbstractTestRunnerCheckResult {}

export class TestRunnerCheckResult extends AbstractTestRunnerCheckResult {
  finished!: boolean;
  tests: TestResult[] = [];
}

createModelSchema(TestRunnerCheckResult, {
  finished: primitive(),
  tests: list(
    custom(
      () => SKIP,
      (value) => {
        if (value.error) {
          return deserialize(TestFailureResult, value);
        }
        return deserialize(TestSuccessResult, value);
      },
    ),
  ),
});

export class TestRunnerCheckError extends AbstractTestRunnerCheckResult {
  error!: boolean;
  text!: string;
}

createModelSchema(TestRunnerCheckError, {
  error: primitive(),
  text: primitive(),
});

export const deserializeTestRunnerCheckResult = (
  value: Record<PropertyKey, unknown>,
): AbstractTestRunnerCheckResult => {
  if (value.error) {
    return deserialize(TestRunnerCheckError, value);
  }
  return deserialize(TestRunnerCheckResult, value);
};

export interface TestRunnerCancelResult {
  text: string;
}
