/**
 * Copyright Goldman Sachs
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

import { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { MappingTestState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import {
  TEST_RESULT,
  MappingTestExpectedOutputAssertionState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { isValidString, IllegalStateError } from '@finos/legend-studio-shared';
import { FaSave, FaPlay } from 'react-icons/fa';
import { JsonDiffView } from '../../../shared/DiffView';
import { useApplicationStore } from '../../../../stores/ApplicationStore';

export const MappingTestEditor = observer(
  (props: { mappingTestState: MappingTestState; isReadOnly: boolean }) => {
    const { mappingTestState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    // Test Name
    const testNameRef = useRef<HTMLInputElement>(null);
    const [testName, setTestName] = useState(mappingTestState.test.name);
    const changeTestName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setTestName(event.target.value);
    const updateTestName = (): void => mappingTestState.test.setName(testName);
    const testNameValidationErrorMessage = !testName // not empty
      ? 'Value must not be empty'
      : !isValidString(testName) // must not contain space
      ? 'Value must be a valid string'
      : mappingTestState.mappingEditorState.mapping.tests
          .filter((test) => test !== mappingTestState.test)
          .find((test) => test.name === testName)
      ? 'Value must be unique among all test names in mapping'
      : '';
    const allowSavingName =
      !testNameValidationErrorMessage &&
      // not empty and equal to current name
      testName !== mappingTestState.test.name;
    const runTest = applicationStore.guaranteeSafeAction(() =>
      mappingTestState.runTest(),
    );
    // Test Result
    let testResult = '';
    switch (mappingTestState.result) {
      case TEST_RESULT.NONE:
        testResult = 'Test did not run';
        break;
      case TEST_RESULT.FAILED:
        testResult = `Test failed in ${mappingTestState.runTime}ms, see comparison (expected <-> actual) below:`;
        break;
      case TEST_RESULT.PASSED:
        testResult = `Test passed in ${mappingTestState.runTime}ms`;
        break;
      case TEST_RESULT.ERROR:
        testResult = `Test failed in ${
          mappingTestState.runTime
        }ms due to error:\n${
          mappingTestState.errorRunningTest?.message ?? '(unknown)'
        }`;
        break;
      default:
        throw new IllegalStateError('Unknown test result state');
    }
    testResult = mappingTestState.isRunningTest
      ? 'Running test...'
      : testResult;

    useEffect(() => {
      testNameRef.current?.focus();
    }, [mappingTestState]);

    return (
      <div className="mapping-test-editor">
        <div className="mapping-test-editor__header">
          <div className="mapping-test-editor__header__name">
            <div className="input-group mapping-test-editor__header__name__input">
              <input
                className="input-group__input input--dark"
                spellCheck={false}
                ref={testNameRef}
                disabled={isReadOnly}
                value={testName}
                onChange={changeTestName}
                placeholder={`Test name`}
              />
              {Boolean(testNameValidationErrorMessage) && (
                <div className="input-group__error-message">
                  {testNameValidationErrorMessage}
                </div>
              )}
            </div>
            <button
              className="mapping-test-editor__header__name__action-btn btn--dark"
              tabIndex={-1}
              disabled={isReadOnly || !allowSavingName}
              onClick={updateTestName}
              title="Save change"
            >
              <FaSave />
            </button>
            <button
              className="mapping-test-editor__header__name__action-btn btn--dark"
              tabIndex={-1}
              disabled={mappingTestState.isRunningTest}
              onClick={runTest}
              title="Run test"
            >
              <FaPlay />
            </button>
          </div>
        </div>
        <div
          className={`mapping-test-editor__result mapping-test-editor__result--${
            mappingTestState.isRunningTest
              ? 'running'
              : mappingTestState.result.toLowerCase()
          }`}
        >
          {testResult}
        </div>
        {mappingTestState.result === TEST_RESULT.FAILED && (
          <>
            {mappingTestState.assertionState instanceof
              MappingTestExpectedOutputAssertionState && (
              <div className="mapping-test-editor__diff">
                <JsonDiffView
                  from={
                    mappingTestState.assertionState.expectedTestExecutionResult
                  } // expected
                  to={mappingTestState.testExecutionResultText} // actual
                  lossless={true}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);
