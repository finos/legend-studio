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
  type EqualTo,
  type EqualToJson,
  type ExternalFormatData,
  type AtomicTest,
  type TestAssertion,
  type TestSuite,
  type ObserverContext,
  type Test,
  observe_TestAssertion,
  observe_ExternalFormatData,
  observe_AtomicTest,
  type Testable,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';

export const equalToJSON_setExpected = action(
  (equalToJSON: EqualToJson, val: ExternalFormatData): void => {
    equalToJSON.expected = observe_ExternalFormatData(val);
  },
);

export const equalTo_setExpected = action(
  (equalToJSON: EqualTo, val: object): void => {
    equalToJSON.expected = val;
  },
);

export const testAssertion_setId = action(
  (test: TestAssertion, val: string): void => {
    test.id = val;
  },
);

export const atomicTest_addAssertion = action(
  (test: AtomicTest, val: TestAssertion): void => {
    val.parentTest = test;
    addUniqueEntry(test.assertions, observe_TestAssertion(val));
  },
);

export const atomicTest_setId = action(
  (test: AtomicTest, val: string): void => {
    test.id = val;
  },
);

export const atomicTest_setDoc = action(
  (test: AtomicTest, val: string | undefined): void => {
    test.doc = val;
  },
);

export const testSuite_setId = action((test: TestSuite, val: string): void => {
  test.id = val;
});

export const testable_setId = action(
  (test: Test | AtomicTest, val: string): void => {
    test.id = val;
  },
);

export const testSuite_deleteTest = action(
  (test: TestSuite, val: AtomicTest): void => {
    deleteEntry(test.tests, val);
  },
);

export const testable_deleteTest = action(
  (testable: Testable, val: Test): void => {
    deleteEntry(testable.tests, val);
  },
);

export const testSuite_addTest = action(
  (
    test: TestSuite,
    val: AtomicTest,
    observerContext: ObserverContext,
  ): void => {
    addUniqueEntry(test.tests, observe_AtomicTest(val, observerContext));
  },
);
