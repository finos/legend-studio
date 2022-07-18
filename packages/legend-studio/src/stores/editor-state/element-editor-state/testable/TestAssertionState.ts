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
  type TestAssertion,
  type AssertionStatus,
  AssertFail,
  type TestResult,
  TestPassed,
  TestError,
  TestFailed,
  EqualToJson,
  ExternalFormatData,
  EqualToJsonAssertFail,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  ContentType,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { externalFormatData_setData } from '../../../graphModifier/DSLData_GraphModifierHelper.js';
import {
  getTestableResultFromAssertionStatus,
  TESTABLE_RESULT,
} from '../../../sidebar-state/testable/GlobalTestRunnerState.js';
import type { TestableTestEditorState } from './TestableEditorState.js';

export enum TEST_ASSERTION_TAB {
  ASSERTION_SETUP = 'ASSERTION_SETUP',
  ASSERTION_RESULT = 'ASSERTION_RESULT',
}

export abstract class TestAssertionStatusState {
  resultState: TestAssertionResultState;
  status: AssertionStatus;

  constructor(resultState: TestAssertionResultState, status: AssertionStatus) {
    this.resultState = resultState;
    this.status = status;
  }
}

export class AssertFailState extends TestAssertionStatusState {
  declare status: AssertFail;

  constructor(resultState: TestAssertionResultState, status: AssertFail) {
    super(resultState, status);
    this.status = status;
    makeObservable(this, {
      status: observable,
    });
  }
}

export class EqualToJsonAssertFailState extends AssertFailState {
  declare status: EqualToJsonAssertFail;
  diffModal = false;

  constructor(
    resultState: TestAssertionResultState,
    status: EqualToJsonAssertFail,
  ) {
    super(resultState, status);
    this.status = status;
    makeObservable(this, {
      diffModal: observable,
      setDiffModal: action,
    });
  }

  setDiffModal(val: boolean): void {
    this.diffModal = val;
  }
}

export class UnsupportedAssertionStatusState extends TestAssertionStatusState {}

export class TestAssertionResultState {
  testResult: TestResult | undefined;
  statusState: TestAssertionStatusState | undefined;
  readonly editorStore: EditorStore;
  readonly assertionState: TestAssertionEditorState;
  constructor(
    editorStore: EditorStore,
    assertionState: TestAssertionEditorState,
  ) {
    makeObservable(this, {
      testResult: observable,
      setTestResult: action,
      statusState: observable,
    });
    this.editorStore = editorStore;
    this.assertionState = assertionState;
  }

  setTestResult(val: TestResult | undefined): void {
    this.testResult = val;
    this.statusState = undefined;
    if (val instanceof TestFailed) {
      const status = val.assertStatuses.find(
        (_status) => _status.assertion === this.assertionState.assertion,
      );
      this.statusState = this.buildStatus(status);
    }
  }

  buildStatus(
    val: AssertionStatus | undefined,
  ): TestAssertionStatusState | undefined {
    if (val) {
      if (val instanceof EqualToJsonAssertFail) {
        return new EqualToJsonAssertFailState(this, val);
      }
      if (val instanceof AssertFail) {
        return new AssertFailState(this, val);
      }
      return new UnsupportedAssertionStatusState(this, val);
    }
    return undefined;
  }

  get result(): TESTABLE_RESULT {
    if (this.assertionState.testState.runningTestAction.isInProgress) {
      return TESTABLE_RESULT.IN_PROGRESS;
    }
    if (this.testResult instanceof TestError) {
      return TESTABLE_RESULT.ERROR;
    } else if (this.testResult instanceof TestPassed) {
      return TESTABLE_RESULT.PASSED;
    } else if (this.testResult instanceof TestFailed) {
      return getTestableResultFromAssertionStatus(this.statusState?.status);
    }
    return TESTABLE_RESULT.DID_NOT_RUN;
  }
}
export abstract class TestAssertionState {
  readonly editorStore: EditorStore;
  assertion: TestAssertion;
  result: TestAssertionResultState;

  constructor(
    editorStore: EditorStore,
    assertionState: TestAssertionEditorState,
  ) {
    this.editorStore = editorStore;
    this.assertion = assertionState.assertion;
    this.result = new TestAssertionResultState(editorStore, assertionState);
  }

  abstract generateExpected(status: AssertFail): void;

  abstract generateBare(): TestAssertion;

  abstract label(): string;
}

export class EqualToJsonAssertionState extends TestAssertionState {
  declare assertion: EqualToJson;

  setExpectedValue(val: string): void {
    externalFormatData_setData(this.assertion.expected, val);
  }

  generateExpected(status: AssertFail): void {
    if (status instanceof EqualToJsonAssertFail) {
      const expected = status.actual;
      this.setExpectedValue(expected);
    }
  }
  generateBare(): TestAssertion {
    const bareAssertion = new EqualToJson();
    bareAssertion.expected = new ExternalFormatData();
    bareAssertion.expected.contentType = ContentType.APPLICATION_JSON;
    bareAssertion.expected.data = '';
    return bareAssertion;
  }

  label(): string {
    return 'EqualToJSON';
  }
}

export class UnsupportedAssertionState extends TestAssertionState {
  generateBare(): TestAssertion {
    throw new Error('Method not implemented.');
  }
  generateExpected(status: AssertFail): void {
    return;
  }

  label(): string {
    return 'Unsupported';
  }
}

export class TestAssertionEditorState {
  readonly editorStore: EditorStore;
  readonly testState: TestableTestEditorState;
  assertionState: TestAssertionState;
  assertionResultState: TestAssertionResultState;
  assertion: TestAssertion;
  selectedTab = TEST_ASSERTION_TAB.ASSERTION_SETUP;
  generatingExpectedAction = ActionState.create();
  constructor(
    editorStore: EditorStore,
    assertion: TestAssertion,
    testState: TestableTestEditorState,
  ) {
    makeObservable(this, {
      selectedTab: observable,
      assertionResultState: observable,
      setSelectedTab: action,
      generateExpected: flow,
    });
    this.editorStore = editorStore;
    this.assertion = assertion;
    this.testState = testState;
    this.assertionState = this.buildAssertionState(assertion);
    this.assertionResultState = new TestAssertionResultState(editorStore, this);
  }

  setSelectedTab(val: TEST_ASSERTION_TAB): void {
    this.selectedTab = val;
  }

  *generateExpected(): GeneratorFn<void> {
    try {
      this.generatingExpectedAction.inProgress();
      const bare = this.assertionState.generateBare();
      bare.parentTest = this.assertion.parentTest;
      const status =
        (yield this.editorStore.graphManagerState.graphManager.generateExpectedResult(
          this.testState.testable,
          this.testState.test,

          bare,
          this.editorStore.graphManagerState.graph,
        )) as AssertFail;
      this.assertionState.generateExpected(status);
      this.generatingExpectedAction.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
      this.generatingExpectedAction.fail();
    }
  }

  buildAssertionState(assertion: TestAssertion): TestAssertionState {
    if (assertion instanceof EqualToJson) {
      return new EqualToJsonAssertionState(this.editorStore, this);
    }
    return new UnsupportedAssertionState(this.editorStore, this);
  }
}
