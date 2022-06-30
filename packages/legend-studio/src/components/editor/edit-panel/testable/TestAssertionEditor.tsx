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

import { EDITOR_LANGUAGE } from '@finos/legend-application';
import {
  clsx,
  CompareIcon,
  Dialog,
  PanelLoadingIndicator,
  RefreshIcon,
  WrenchIcon,
} from '@finos/legend-art';
import {
  prettyCONSTName,
  tryToFormatLosslessJSONString,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  AssertFailState,
  EqualToJsonAssertFailState,
  EqualToJsonAssertionState,
  TEST_ASSERTION_TAB,
  type TestAssertionEditorState,
  type TestAssertionState,
} from '../../../../stores/editor-state/element-editor-state/testable/TestAssertionState.js';
import { externalFormatData_setData } from '../../../../stores/graphModifier/DSLData_GraphModifierHelper.js';
import { TESTABLE_RESULT } from '../../../../stores/sidebar-state/testable/GlobalTestRunnerState.js';
import { JsonDiffView } from '../../../shared/DiffView.js';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';

export const EqualToJsonAsssertionEditor = observer(
  (props: {
    testAssertionEditorState: TestAssertionEditorState;
    equalToJsonAssertionState: EqualToJsonAssertionState;
  }) => {
    const { equalToJsonAssertionState, testAssertionEditorState } = props;
    const assertion = equalToJsonAssertionState.assertion;
    const formatExpectedResultJSONString = (): void => {
      externalFormatData_setData(
        assertion.expected,
        tryToFormatLosslessJSONString(assertion.expected.data),
      );
    };

    return (
      <>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">expected</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={testAssertionEditorState.testState.isReadOnly}
              tabIndex={-1}
              onClick={formatExpectedResultJSONString}
              title={'Format JSON (Alt + Shift + F)'}
            >
              <WrenchIcon />
            </button>
          </div>
        </div>
        <div className="equal-to-json-editor__content panel__content">
          <div className="equal-to-json-editor__content__data">
            <StudioTextInputEditor
              inputValue={assertion.expected.data}
              language={EDITOR_LANGUAGE.JSON}
              updateInput={(val: string): void => {
                equalToJsonAssertionState.setExpectedValue(val);
              }}
              hideGutter={true}
            />
          </div>
        </div>
      </>
    );
  },
);
const EqualToJsonAssertFailViewer = observer(
  (props: { equalToJsonAssertFailState: EqualToJsonAssertFailState }) => {
    const { equalToJsonAssertFailState } = props;
    const open = (): void => equalToJsonAssertFailState.setDiffModal(true);
    const close = (): void => equalToJsonAssertFailState.setDiffModal(false);
    return (
      <>
        <div className="equal-to-json-editor__message" onClick={open}>
          {`<Click to see difference>`}
        </div>
        {equalToJsonAssertFailState.diffModal && (
          <Dialog
            open={Boolean(equalToJsonAssertFailState.diffModal)}
            onClose={close}
            classes={{
              root: 'editor-modal__root-container',
              container: 'editor-modal__container',
              paper: 'editor-modal__content',
            }}
          >
            <div className="modal modal--dark editor-modal">
              <div className="modal__header">
                <div className="service-test-editor__test__diff__header__info">
                  <div className="service-test-editor__test__diff__header__info__label">
                    expected
                  </div>
                  <div className="service-test-editor__test__diff__header__info__icon">
                    <CompareIcon />
                  </div>
                  <div className="service-test-editor__test__diff__header__info__label">
                    actual
                  </div>
                </div>
              </div>
              <div className="modal__body">
                <JsonDiffView
                  from={equalToJsonAssertFailState.status.expected}
                  to={equalToJsonAssertFailState.status.actual}
                />
              </div>
              <div className="modal__footer">
                <button
                  className="btn modal__footer__close-btn"
                  onClick={close}
                >
                  Close
                </button>
              </div>
            </div>
          </Dialog>
        )}
      </>
    );
  },
);

const AssertFailViewer = observer(
  (props: { assertFailState: AssertFailState }) => {
    const { assertFailState } = props;
    return (
      <>
        <div className="testable-test-assertion-result__summary-info">
          {assertFailState.status.message}
        </div>
        {assertFailState instanceof EqualToJsonAssertFailState && (
          <EqualToJsonAssertFailViewer
            equalToJsonAssertFailState={assertFailState}
          />
        )}
      </>
    );
  },
);
const TestAssertionResultViewer = observer(
  (props: { testAssertionEditorState: TestAssertionEditorState }) => {
    const { testAssertionEditorState } = props;
    const statusState =
      testAssertionEditorState.assertionResultState.statusState;
    const assertionResult =
      testAssertionEditorState.assertionResultState.result;

    return (
      <>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
          </div>
          <div className="panel__header__actions"></div>
        </div>
        <div className="testable-test-assertion-result__content panel__content">
          <div
            className={clsx('testable-test-assertion-result__summary', {
              'testable-test-assertion-result__summary--fail':
                assertionResult === TESTABLE_RESULT.ERROR ||
                assertionResult === TESTABLE_RESULT.FAILED,
              'testable-test-assertion-result__summary--success':
                assertionResult === TESTABLE_RESULT.PASSED,
            })}
          >
            <div className="testable-test-assertion-result__summary-main">
              Assertion Result Summary
            </div>
            {assertionResult === TESTABLE_RESULT.IN_PROGRESS ? (
              <div className="testable-test-assertion-result__summary-info">
                Running assertion...
              </div>
            ) : (
              <>
                <div className="testable-test-assertion-result__summary-info">
                  Id: {testAssertionEditorState.assertion.id}
                </div>
                <div className="testable-test-assertion-result__summary-info">
                  Type: {testAssertionEditorState.assertionState.label()}
                </div>
                <div className="testable-test-assertion-result__summary-info">
                  Result: {prettyCONSTName(assertionResult)}
                </div>
                {statusState instanceof AssertFailState && (
                  <AssertFailViewer assertFailState={statusState} />
                )}
              </>
            )}
          </div>
          <div></div>
        </div>
      </>
    );
  },
);

export const TestAssertionEditor = observer(
  (props: { testAssertionState: TestAssertionEditorState }) => {
    const { testAssertionState } = props;
    const selectedTab = testAssertionState.selectedTab;
    const isReadOnly = testAssertionState.testState.isReadOnly;
    const changeTab = (val: TEST_ASSERTION_TAB): void =>
      testAssertionState.setSelectedTab(val);
    const renderContent = (state: TestAssertionState): React.ReactNode => {
      if (state instanceof EqualToJsonAssertionState) {
        return (
          <EqualToJsonAsssertionEditor
            equalToJsonAssertionState={state}
            testAssertionEditorState={testAssertionState}
          />
        );
      }
      return (
        <UnsupportedEditorPanel
          text="Can't display this assertion in form-mode"
          isReadOnly={isReadOnly}
        />
      );
    };
    const generate = (): void => {
      testAssertionState.generateExpected();
    };

    const isRunning = testAssertionState.generatingExpectedAction.isInProgress;
    return (
      <div className="testable-test-assertion-editor">
        <PanelLoadingIndicator isLoading={isRunning} />
        <div className="testable-test-assertion-editor__header">
          <div className="testable-test-assertion-editor__header__tabs">
            {Object.values(TEST_ASSERTION_TAB).map((tab) => (
              <div
                key={tab}
                onClick={(): void => changeTab(tab)}
                className={clsx('testable-test-assertion-editor__header__tab', {
                  'testable-test-assertion-editor__header__tab--active':
                    tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
          <div className="testable-test-assertion-editor__header__actions">
            <button
              className="panel__header__action service-execution-editor__test-data__generate-btn"
              onClick={generate}
              title="Generate expected result is possible"
              disabled={isReadOnly}
              tabIndex={-1}
            >
              <div className="service-execution-editor__test-data__generate-btn__label">
                <RefreshIcon className="service-execution-editor__test-data__generate-btn__label__icon" />
                <div className="service-execution-editor__test-data__generate-btn__label__title">
                  Generate
                </div>
              </div>
            </button>
          </div>
        </div>
        <div className="testable-test-assertion-editor__content">
          {selectedTab === TEST_ASSERTION_TAB.ASSERTION_SETUP && (
            <div className="testable-test-assertion-editor__setup">
              {renderContent(testAssertionState.assertionState)}
            </div>
          )}
          {selectedTab === TEST_ASSERTION_TAB.ASSERTION_RESULT && (
            <TestAssertionResultViewer
              testAssertionEditorState={testAssertionState}
            />
          )}
        </div>
      </div>
    );
  },
);
