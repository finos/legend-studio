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

import type {
  TestAssertion,
  EqualToJson,
  AssertionStatus,
} from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';

export enum TEST_ASSERTION_TAB_TYPE {
  ASSERTION_EDITOR = 'ASSERTION_EDITOR',
  ASSERTION_RESULT = 'ASSERTION_RESULT',
}

export abstract class TestAssertionState {
  assertion: TestAssertion;
  selectedTab = TEST_ASSERTION_TAB_TYPE.ASSERTION_EDITOR;
  result: AssertionStatus | undefined;

  constructor(assertion: TestAssertion) {
    this.assertion = assertion;
    makeObservable(this, {
      selectedTab: observable,
      setSelectedTab: action,
      result: observable,
    });
  }

  setSelectedTab(val: TEST_ASSERTION_TAB_TYPE): void {
    this.selectedTab = val;
  }

  setResult(val: AssertionStatus | undefined): void {
    this.result = val;
  }
}

export class EqualToJsonAssertionState extends TestAssertionState {
  declare assertion: EqualToJson;

  constructor(assertion: EqualToJson) {
    super(assertion);
    makeObservable(this, {
      setExpectedValue: action,
    });
  }

  setExpectedValue(val: string): void {
    this.assertion.expected.data = val;
  }
}

export class UnsupportedAssertionState extends TestAssertionState {}
