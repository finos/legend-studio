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
import type { AtomicTest, TestSuite } from '../Test.js';
import type { Testable } from '../Testable.js';

export abstract class TestDebug {
  testable!: Testable;
  parentSuite: TestSuite | undefined;
  atomicTest: AtomicTest;
  error: string | undefined;

  constructor(testSuite: TestSuite | undefined, atomicTestId: AtomicTest) {
    this.parentSuite = testSuite;
    this.atomicTest = atomicTestId;
  }
}

export class TestExecutionPlanDebug extends TestDebug {
  executionPlan: object | undefined;
  debug: string[] | undefined;
}

export class UnknownTestDebug extends TestDebug {
  value!: object;
}
