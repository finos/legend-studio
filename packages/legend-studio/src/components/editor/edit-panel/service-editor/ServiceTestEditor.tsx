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

import { useState, useEffect, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import type { ServiceExecutionState } from '../../../../stores/editor-state/element-editor-state/service/ServiceExecutionState';
import {
  isValidJSONString,
  prettyCONSTName,
  UnsupportedOperationError,
  tryToFormatLosslessJSONString,
} from '@finos/legend-shared';
import {
  clsx,
  ContextMenu,
  ProgressBar,
  BlankPanelContent,
  BlankPanelPlaceholder,
  PanelLoadingIndicator,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  ErrorIcon,
  RefreshIcon,
  CompareIcon,
  PlayIcon,
  PlusIcon,
  CheckCircleIcon,
  EmptyCircleIcon,
  WrenchIcon,
  TimesCircleIcon,
  CircleNotchIcon,
  InfoCircleIcon,
  MenuContentItem,
  MenuContent,
} from '@finos/legend-art';
import {
  type TestContainerState,
  SingleExecutionTestState,
} from '../../../../stores/editor-state/element-editor-state/service/ServiceTestState';
import { TEST_RESULT } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { JsonDiffView } from '../../../shared/DiffView';
import { UnsupportedEditorPanel } from '../../../editor/edit-panel/UnsupportedElementEditor';
import { ServiceEditorState } from '../../../../stores/editor-state/element-editor-state/service/ServiceEditorState';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider';
import {
  EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor';
import { singleExecTest_setData } from '../../../../stores/graphModifier/DSLService_GraphModifierHelper';
import type { DEPRECATED__TestContainer } from '@finos/legend-graph';

const TestContainerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testContainer?: DEPRECATED__TestContainer;
      createTestContainer: () => void;
      deleteTestContainer?: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { testContainer, deleteTestContainer, createTestContainer } = props;
    const remove = (): void => deleteTestContainer?.();

    return (
      <MenuContent ref={ref}>
        {testContainer && (
          <MenuContentItem onClick={remove}>Delete</MenuContentItem>
        )}
        {!testContainer && (
          <MenuContentItem onClick={createTestContainer}>
            Create a new assert
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

export const TestContainerItem = observer(
  (props: {
    testState: SingleExecutionTestState;
    testContainer: DEPRECATED__TestContainer;
    isReadOnly: boolean;
    testIdx: number;
  }) => {
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const { testState, testContainer, isReadOnly, testIdx } = props;
    const openTestContainer = (): void =>
      testState.openTestContainer(testContainer);
    const testResult = testState.testResults.length
      ? testState.testResults[testIdx]
      : undefined;
    const isActive =
      testState.selectedTestContainerState?.testContainer === testContainer;
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const createTestContainer = (): void => testState.addNewTestContainer();
    const deleteTestContainer = (): void =>
      testState.deleteTestContainerState(testContainer);

    let testStatusIcon: React.ReactNode = (
      <div
        title="Test did not run"
        className="service-test-explorer__test-result-indicator service-test-explorer__test-result-indicator--none"
      >
        <EmptyCircleIcon />
      </div>
    );
    if (testResult) {
      testStatusIcon = testResult.result ? (
        <div
          title="Test passed"
          className="service-test-explorer__test-result-indicator service-test-explorer__test-result-indicator--passed"
        >
          <CheckCircleIcon />
        </div>
      ) : (
        <div
          title="Test failed assertion"
          className="service-test-explorer__test-result-indicator service-test-explorer__test-result-indicator--failed"
        >
          <TimesCircleIcon />
        </div>
      );
    }
    testStatusIcon = testState.isRunningAllTests ? (
      <div
        title="Test is running"
        className="service-test-explorer__test-result-indicator service-test-explorer__test-result-indicator--in-progress"
      >
        <CircleNotchIcon />
      </div>
    ) : (
      testStatusIcon
    );

    return (
      <ContextMenu
        className={clsx(
          'service-test-explorer__item',
          {
            'service-test-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'service-test-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <TestContainerContextMenu
            testContainer={testContainer}
            createTestContainer={createTestContainer}
            deleteTestContainer={deleteTestContainer}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('service-test-explorer__item__label')}
          onClick={openTestContainer}
          tabIndex={-1}
        >
          <div className="service-test-explorer__item__label__icon service-test-explorer__test-result-indicator__container">
            {testStatusIcon}
          </div>
          <div className="service-test-explorer__item__label__text">{`test_${
            testIdx + 1
          }`}</div>
        </button>
      </ContextMenu>
    );
  },
);

export const TestContainerStateExplorer = observer(
  (props: { testState: SingleExecutionTestState }) => {
    const { testState } = props;
    const addNewTestContainer = (): void => testState.addNewTestContainer();
    const isReadOnly = testState.serviceEditorState.isReadOnly;
    if (testState instanceof SingleExecutionTestState) {
      return (
        <ContextMenu
          className="panel__content"
          disabled={isReadOnly}
          content={
            <TestContainerContextMenu
              createTestContainer={addNewTestContainer}
            />
          }
          menuProps={{ elevation: 7 }}
        >
          {Boolean(testState.test.asserts.length) &&
            testState.test.asserts.map((test, idx) => (
              <TestContainerItem
                testState={testState}
                key={test.uuid}
                testContainer={test}
                testIdx={idx}
                isReadOnly={Boolean(isReadOnly)}
              />
            ))}
          {!testState.test.asserts.length && (
            <BlankPanelPlaceholder
              placeholderText="Add a test"
              onClick={addNewTestContainer}
              clickActionType="add"
              tooltipText="Click to add a test"
              readOnlyProps={
                !isReadOnly
                  ? undefined
                  : {
                      placeholderText: 'No test',
                    }
              }
            />
          )}
        </ContextMenu>
      );
    }
    throw new UnsupportedOperationError();
  },
);

enum SERVICE_TEST_TAB {
  RESULT = 'TEST_RESULT',
  DETAIL = 'TEST_DETAIL',
}

export const ServiceTestEditorEditPanel = observer(
  (props: {
    executionState: ServiceExecutionState;
    testState: SingleExecutionTestState;
    selectedTestContainerState: TestContainerState;
  }) => {
    const { executionState, testState, selectedTestContainerState } = props;
    const applicationStore = useApplicationStore();
    const isReadOnly = executionState.serviceEditorState.isReadOnly;
    const testResult = selectedTestContainerState.testResult;
    const testExecutionResult =
      selectedTestContainerState.textExecutionTextResult;
    const generateAssertion = applicationStore.guardUnhandledError(() =>
      flowResult(selectedTestContainerState.generateAssertion()),
    );
    // tab
    const [selectedTab, setSelectedTab] = useState(SERVICE_TEST_TAB.RESULT);
    const changeTab =
      (tab: SERVICE_TEST_TAB): (() => void) =>
      (): void =>
        setSelectedTab(tab);
    // expected result
    const expectedResult = selectedTestContainerState.assertionData;
    const formatExpectedResultJSONString = (): void => {
      if (selectedTestContainerState.assertionData) {
        selectedTestContainerState.setAssertionData(
          tryToFormatLosslessJSONString(
            selectedTestContainerState.assertionData,
          ),
        );
      }
    };
    // TODO: move this into the meta model when we can peek inside of lambda
    const isExpectedResultValidJSON =
      expectedResult && isValidJSONString(expectedResult);
    const updateExpectedResult = (val: string): void => {
      selectedTestContainerState.setAssertionData(val);
      selectedTestContainerState.updateTestAssert();
    };
    // result
    const testResultMessage = testState.testSuiteRunError ? (
      <div className="service-test-editor__test__result__text service-test-editor__test__result__text--error">
        Test failed in {testState.allTestRunTime}ms due to error:
        <br />
        {testState.testSuiteRunError.message}
      </div>
    ) : testState.isRunningAllTests ? (
      <div className="service-test-editor__test__result__text service-test-editor__test__result__text--running">
        Running test...
      </div>
    ) : !testResult ? (
      <div className="service-test-editor__test__result__text service-test-editor__test__result__text--none">
        Test did not run
      </div>
    ) : testResult.result ? (
      <div className="service-test-editor__test__result__text service-test-editor__test__result__text--passed">
        Test passed in {testState.allTestRunTime}ms
      </div>
    ) : (
      <div className="service-test-editor__test__result__text service-test-editor__test__result__text--failed">
        Test failed in {testState.allTestRunTime}ms. See the comparison below:
      </div>
    );
    const showDiff =
      !testState.testSuiteRunError && testResult && !testResult.result;
    const fetchActualResult = applicationStore.guardUnhandledError(() =>
      flowResult(selectedTestContainerState.fetchActualResultForComparison()),
    );

    useEffect(
      () => setSelectedTab(SERVICE_TEST_TAB.RESULT),
      [selectedTestContainerState],
    ); // reset selected tab

    return (
      <div className="panel service-test-editor__test">
        <div className="panel__header panel__header--with-tabs">
          <div className="panel__header__tabs">
            {Object.values(SERVICE_TEST_TAB).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('panel__header__tab', {
                  'panel__header__tab--active': tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        <div className="panel__content">
          {selectedTab === SERVICE_TEST_TAB.RESULT && (
            <>
              <div
                className={clsx('service-test-editor__test__result', {
                  'service-test-editor__test__result--with-diff': showDiff,
                })}
              >
                {testResultMessage}
              </div>
              {showDiff && (
                <div className="panel service-test-editor__test__diff">
                  <div className="panel__header">
                    <div className="panel__header__title">
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
                      <div
                        className="service-editor__header__hint"
                        title="Actual result is computed by running execution against the test case"
                      >
                        <InfoCircleIcon />
                      </div>
                    </div>
                    <div className="panel__header__actions">
                      <button
                        className="panel__header__action service-test-editor__test__generate-expected-result-btn"
                        disabled={
                          selectedTestContainerState.isFetchingActualResultForComparison ||
                          testState.isRunningAllTests
                        }
                        onClick={fetchActualResult}
                        tabIndex={-1}
                        title={'Fetch diff'}
                      >
                        <RefreshIcon />
                      </button>
                    </div>
                  </div>
                  <div className="panel__content">
                    <PanelLoadingIndicator
                      isLoading={
                        selectedTestContainerState.isFetchingActualResultForComparison
                      }
                    />
                    {testExecutionResult && (
                      <JsonDiffView
                        from={testExecutionResult.expected} // expected
                        to={testExecutionResult.actual} // actual
                        lossless={true}
                      />
                    )}
                    {!testExecutionResult && (
                      <BlankPanelContent>
                        <button
                          className="service-test-editor__test__fetch-diff-panel"
                          onClick={fetchActualResult}
                          disabled={
                            selectedTestContainerState.isFetchingActualResultForComparison
                          }
                        >
                          Click to fetch actual result to see diff
                        </button>
                      </BlankPanelContent>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {selectedTab === SERVICE_TEST_TAB.DETAIL && (
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel size={200} minSize={150}>
                <div className="panel service-test-editor__parameters">
                  <div className="panel__header">
                    <div className="panel__header__title">
                      <div className="panel__header__title__label service-editor__execution__sub-label--test">
                        parameter values
                      </div>
                    </div>
                  </div>
                  <div className="panel__content">
                    <BlankPanelContent>Work in progress</BlankPanelContent>
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel minSize={150}>
                <div className="panel service-test-editor__expected-result">
                  <div className="panel__header">
                    <div className="panel__header__title">
                      <div className="panel__header__title__label service-editor__execution__sub-label--test">
                        expected result
                      </div>
                      <div
                        className="service-editor__header__hint"
                        title="Specifies the expected execution result JSON"
                      >
                        <InfoCircleIcon />
                      </div>
                    </div>
                    <div className="panel__header__actions">
                      <button
                        className="panel__header__action service-test-editor__test__generate-expected-result-btn"
                        tabIndex={-1}
                        onClick={generateAssertion}
                        disabled={
                          isReadOnly ||
                          selectedTestContainerState.isGeneratingTestAssertion
                        }
                        title={'Generate expected result'}
                      >
                        <RefreshIcon />
                      </button>
                      <button
                        className="panel__header__action"
                        disabled={isReadOnly}
                        tabIndex={-1}
                        onClick={formatExpectedResultJSONString}
                        title={'Format JSON (Alt + Shift + F)'}
                      >
                        <WrenchIcon />
                      </button>
                    </div>
                  </div>
                  <div className="panel__content service-test-editor__expected-result__editor">
                    <PanelLoadingIndicator
                      isLoading={
                        selectedTestContainerState.isGeneratingTestAssertion
                      }
                    />
                    {!isExpectedResultValidJSON && expectedResult && (
                      <div
                        className="panel__content__validation-error"
                        title={'Expected result must be a valid JSON'}
                      >
                        <ErrorIcon />
                      </div>
                    )}
                    {expectedResult && (
                      <StudioTextInputEditor
                        inputValue={expectedResult}
                        isReadOnly={
                          isReadOnly ||
                          selectedTestContainerState.isFetchingActualResultForComparison ||
                          selectedTestContainerState.isGeneratingTestAssertion
                        }
                        updateInput={updateExpectedResult}
                        language={EDITOR_LANGUAGE.JSON}
                      />
                    )}
                    {!expectedResult && (
                      <div className="panel__content">
                        <UnsupportedEditorPanel
                          text={`Can't display assertion in form-mode`}
                          isReadOnly={isReadOnly}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    );
  },
);

export const ServiceTestAssertEditor = observer(
  (props: {
    executionState: ServiceExecutionState;
    testState: SingleExecutionTestState;
  }) => {
    const { executionState, testState } = props;
    const applicationStore = useApplicationStore();
    const isReadOnly = executionState.serviceEditorState.isReadOnly;
    const selectedTestContainerState = testState.selectedTestContainerState;
    const addTestContainer = (): void => testState.addNewTestContainer();
    const runAsserts = applicationStore.guardUnhandledError(() =>
      flowResult(testState.runTestSuite()),
    );
    // all test run report summary
    const numberOfTests = testState.test.asserts.length;
    const percentageTestRun = 100; // Math.floor((numberOfTests / numberOfTests) * 100);
    const numberOfTestsPassed = testState.testResults.filter(
      (result) => result.result,
    ).length;
    const numberOfTestsFailed = testState.testResults.filter(
      (result) => !result.result,
    ).length;
    let testReportSummary = '';
    switch (testState.testSuiteResult) {
      case TEST_RESULT.NONE:
        testReportSummary = testState.isRunningAllTests
          ? `Running ${numberOfTests} tests...`
          : 'No tests run!';
        break;
      case TEST_RESULT.FAILED:
        testReportSummary = `${numberOfTestsFailed} of ${numberOfTests} failed`;
        break;
      case TEST_RESULT.PASSED:
        testReportSummary =
          numberOfTestsPassed === numberOfTests
            ? `All ${numberOfTests} passed`
            : `${numberOfTestsPassed} of ${numberOfTests} passed`;
        break;
      default:
        break;
    }

    return (
      <div className="service-test-editor">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={250} minSize={250}>
            <div className="panel service-test-editor__explorer">
              <div className="panel__header">
                <div className="panel__header__title" title={testReportSummary}>
                  <div className="panel__header__title__content service-test-editor__explorer__report">
                    <div className="service-test-editor__explorer__report__overview">
                      <div className="service-test-editor__explorer__report__overview__stat service-test-editor__explorer__report__overview__stat--total">
                        {numberOfTests} total
                      </div>
                      <div className="service-test-editor__explorer__report__overview__stat service-test-editor__explorer__report__overview__stat--passed">
                        {numberOfTestsPassed} <CheckCircleIcon />
                      </div>
                      <div className="service-test-editor__explorer__report__overview__stat service-test-editor__explorer__report__overview__stat--failed">
                        {numberOfTestsFailed} <TimesCircleIcon />
                      </div>
                    </div>
                    {testState.testSuiteResult !== TEST_RESULT.NONE && (
                      <div className="service-test-editor__explorer__report__time">
                        {testState.allTestRunTime}ms
                      </div>
                    )}
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    disabled={isReadOnly}
                    onClick={addTestContainer}
                    title="Add Test"
                  >
                    <PlusIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    disabled={isReadOnly || !numberOfTests}
                    onClick={runAsserts}
                    title="Run All Tests"
                  >
                    <PlayIcon />
                  </button>
                </div>
              </div>
              <div className="service-test-editor__header__status">
                <ProgressBar
                  className={`service-test-editor__progress-bar service-test-editor__progress-bar--${testState.testSuiteResult.toLowerCase()}`}
                  classes={{
                    bar: `service-test-editor__progress-bar__bar service-test-editor__progress-bar__bar--${testState.testSuiteResult.toLowerCase()}`,
                  }}
                  variant="determinate"
                  value={percentageTestRun}
                />
              </div>
              <TestContainerStateExplorer testState={testState} />
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={300}>
            {selectedTestContainerState && (
              <ServiceTestEditorEditPanel
                executionState={executionState}
                testState={testState}
                selectedTestContainerState={selectedTestContainerState}
              />
            )}
            {!selectedTestContainerState && (
              <div className="panel">
                <div className="panel__header"></div>
                <div className="panel__content">
                  <BlankPanelContent>No test selected</BlankPanelContent>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const ServiceTestEditor = observer(
  (props: {
    executionState: ServiceExecutionState;
    selectedTestState: SingleExecutionTestState;
  }) => {
    const { executionState, selectedTestState } = props;
    const selectedTest = selectedTestState.test;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const serviceState = editorStore.getCurrentEditorState(ServiceEditorState);
    const isReadOnly = serviceState.isReadOnly;
    // test data
    const updateTestData = (val: string): void =>
      singleExecTest_setData(selectedTest, val);
    const generateTestData = (): void => {
      if (!isReadOnly) {
        flowResult(selectedTestState.generateTestData()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    return (
      <div className="panel__content service-execution-editor__test__content">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel minSize={28}>
            <div className="panel service-execution-editor__test-data">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label service-editor__execution__sub-label--test">
                    test data
                  </div>
                  <div
                    className="service-editor__header__hint"
                    title="Test data is shared between all test cases"
                  >
                    <InfoCircleIcon />
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action service-execution-editor__test-data__generate-btn"
                    onClick={generateTestData}
                    tabIndex={-1}
                    title={'Generate test data'}
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>
              <div className="panel__content service-execution-editor__test-data__editor">
                <PanelLoadingIndicator
                  isLoading={selectedTestState.isGeneratingTestData}
                />
                <StudioTextInputEditor
                  inputValue={selectedTest.data}
                  updateInput={updateTestData}
                  isReadOnly={isReadOnly}
                  language={EDITOR_LANGUAGE.TEXT}
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={28}>
            <ServiceTestAssertEditor
              executionState={executionState}
              testState={selectedTestState}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
