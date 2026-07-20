/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { observer } from 'mobx-react-lite';
import {
  BlankPanelPlaceholder,
  CheckCircleIcon,
  clsx,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  Panel,
  PanelContent,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlusIcon,
  PlayIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  RunErrorsIcon,
  TestTubeIcon,
  TimesCircleIcon,
} from '@finos/legend-art';
import {
  type AvailabilityBarrierTest,
  type AvailabilityTestSuite,
} from '@finos/legend-graph';
import { forwardRef } from 'react';
import { flowResult } from 'mobx';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  type AvailabilityTestState,
  type AvailabilityTestSuiteState,
  type AvailabilityTestableState,
  AVAILABILITY_WATERMARK_TEMPLATE_JSON,
} from '../../../../../stores/editor/editor-state/element-editor-state/availability/testable/AvailabilityTestableState.js';
import { TESTABLE_TEST_TAB } from '../../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import {
  atomicTest_setId,
  testAssertion_setId,
  testSuite_setId,
} from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  RenameModal,
  TestAssertionEditor,
  TestAssertionItem,
} from '../../testable/TestableSharedComponents.js';
import { RelationElementsDataEditor } from '../../data-editor/RelationElementsDataEditor.js';

const AvailabilitySuiteContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suite: AvailabilityTestSuite;
      testableState: AvailabilityTestableState;
    }
  >(function AvailabilitySuiteContextMenu(props, ref) {
    const { suite, testableState } = props;
    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          onClick={(): void => testableState.setSuiteToRename(suite)}
        >
          Rename
        </MenuContentItem>
        <MenuContentItem onClick={(): void => testableState.deleteSuite(suite)}>
          Delete
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const AvailabilityTestContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suiteState: AvailabilityTestSuiteState;
      test: AvailabilityBarrierTest;
    }
  >(function AvailabilityTestContextMenu(props, ref) {
    const { suiteState, test } = props;
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={(): void => suiteState.setTestToRename(test)}>
          Rename
        </MenuContentItem>
        <MenuContentItem onClick={(): void => suiteState.deleteTest(test)}>
          Delete
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const AvailabilityTestItem = observer(
  (props: {
    suiteState: AvailabilityTestSuiteState;
    testState: AvailabilityTestState;
  }) => {
    const { suiteState, testState } = props;
    const isActive = suiteState.selectTestState === testState;
    const testResult = getTestableResultFromTestResult(
      testState.testResultState.result,
    );
    const icon = getTestableResultIcon(testResult);

    return (
      <ContextMenu
        className={clsx('testable-test-explorer__item', {
          'testable-test-explorer__item--active': isActive,
        })}
        content={
          <AvailabilityTestContextMenu
            suiteState={suiteState}
            test={testState.test}
          />
        }
      >
        <div
          className="testable-test-explorer__item__label"
          onClick={(): void => suiteState.changeTest(testState.test)}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__text">
            {testState.test.id}
          </div>
          <div className="testable-test-explorer__item__actions">
            <button
              className="testable-test-explorer__item__action"
              onClick={(event): void => {
                event.stopPropagation();
                flowResult(testState.runTest()).catch(
                  suiteState.editorStore.applicationStore.alertUnhandledError,
                );
              }}
              tabIndex={-1}
              title="Run Test"
            >
              <PlayIcon />
            </button>
            <div className="testable-test-explorer__item__result">{icon}</div>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

const AvailabilityAssertionsEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const isReadOnly = testState.isReadOnly;

    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel minSize={100} size={200}>
          <div className="binding-editor__header">
            <div className="binding-editor__header__title">
              <div className="testable-test-assertion-explorer__header__summary">
                <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--assertion">
                  <TestTubeIcon />
                </div>
                <div>{testState.assertionCount}</div>
              </div>
              <div className="testable-test-assertion-explorer__header__summary">
                <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--passed">
                  <CheckCircleIcon />
                </div>
                <div>{testState.assertionPassed}</div>
              </div>
              <div className="testable-test-assertion-explorer__header__summary">
                <div className="testable-test-assertion-explorer__header__summary__icon testable-test-assertion-explorer__header__summary__icon--failed">
                  <TimesCircleIcon />
                </div>
                <div>{testState.assertionFailed}</div>
              </div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                onClick={(): void => {
                  flowResult(testState.runTest()).catch(
                    testState.editorStore.applicationStore.alertUnhandledError,
                  );
                }}
                tabIndex={-1}
                title="Run Test"
              >
                <RunAllIcon />
              </button>
              <button
                className="panel__header__action"
                onClick={(): void => testState.addAssertion()}
                tabIndex={-1}
                title="Add Assertion"
                disabled={isReadOnly}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <div>
            {testState.assertionEditorStates.map((assertionState) => (
              <TestAssertionItem
                key={assertionState.assertion.id}
                testableTestState={testState}
                testAssertionEditorState={assertionState}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          {testState.selectedAsertionState && (
            <TestAssertionEditor
              testAssertionState={testState.selectedAsertionState}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const AvailabilityTestEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const suiteState = testState.suiteState;

    return (
      <div className="service-test-editor panel">
        <div className="panel__header service-test-editor__header--with-tabs">
          <div className="uml-element-editor__tabs">
            {Object.values(TESTABLE_TEST_TAB).map((tab) => (
              <div
                key={tab}
                onClick={(): void => testState.setSelectedTab(tab)}
                className={clsx('service-test-editor__tab', {
                  'service-test-editor__tab--active':
                    tab === testState.selectedTab,
                })}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>
        {testState.selectedTab === TESTABLE_TEST_TAB.SETUP && (
          <div className="panel__content">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Watermark Serialization Format
              </div>
              <div className="panel__content__form__section__header__prompt">
                Format used to serialize watermark values. Click a template to
                pre-populate the expected assertion JSON.
              </div>
              <div className="availability-test-editor__format-selector">
                {Object.keys(AVAILABILITY_WATERMARK_TEMPLATE_JSON).map(
                  (format) => (
                    <button
                      key={format}
                      className={clsx('availability-test-editor__format-btn', {
                        'availability-test-editor__format-btn--active':
                          testState.test.watermarkSerializationFormat ===
                          format,
                      })}
                      onClick={(): void =>
                        testState.applyWatermarkTemplate(format)
                      }
                      disabled={testState.isReadOnly}
                      title={`Apply ${format} watermark template`}
                    >
                      {format}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="panel">
              <PanelHeader title="Suite Test Data" darkMode={true} />
              <PanelContent>
                <RelationElementsDataEditor
                  dataState={suiteState.testDataState}
                  isReadOnly={testState.isReadOnly}
                />
              </PanelContent>
            </div>
          </div>
        )}
        {testState.selectedTab === TESTABLE_TEST_TAB.ASSERTION && (
          <AvailabilityAssertionsEditor testState={testState} />
        )}
      </div>
    );
  },
);

const AvailabilitySuiteEditor = observer(
  (props: { suiteState: AvailabilityTestSuiteState }) => {
    const { suiteState } = props;
    const selectedTestState = suiteState.selectTestState;
    const resultIcon = getTestableResultIcon(suiteState.result);

    return (
      <Panel className="service-test-suite-editor">
        <PanelHeader>
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              {suiteState.suite.id}
            </div>
            <div className="service-test-suite-editor__header__title__summary">
              {resultIcon}
            </div>
          </div>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={(): void => {
                flowResult(suiteState.runSuite()).catch(
                  suiteState.editorStore.applicationStore.alertUnhandledError,
                );
              }}
              title="Run Suite"
            >
              <RunAllIcon />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem
              onClick={(): void => {
                flowResult(suiteState.runFailingTests()).catch(
                  suiteState.editorStore.applicationStore.alertUnhandledError,
                );
              }}
              title="Run Failing Tests"
            >
              <RunErrorsIcon />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem
              onClick={(): void => suiteState.addTest()}
              title="Add Test"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent>
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={260} minSize={24}>
              {suiteState.testStates.map((testState) => (
                <AvailabilityTestItem
                  key={testState.test.id}
                  suiteState={suiteState}
                  testState={testState}
                />
              ))}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              {selectedTestState ? (
                <AvailabilityTestEditor testState={selectedTestState} />
              ) : (
                <BlankPanelPlaceholder
                  text="No tests in this suite"
                  tooltipText="Add a test to start validating this suite"
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </PanelContent>
      </Panel>
    );
  },
);

export const AvailabilityTestableEditor = observer(
  (props: { testableState: AvailabilityTestableState }) => {
    const { testableState } = props;
    const availability = testableState.availability;
    const isReadOnly = testableState.editorState.isReadOnly;

    const renameSuite = (val: string): void => {
      if (testableState.suiteToRename) {
        testSuite_setId(testableState.suiteToRename, val);
      }
    };

    const renameTest = (val: string): void => {
      const testToRename = testableState.selectedSuiteState?.testToRename;
      if (testToRename) {
        atomicTest_setId(testToRename, val);
      }
    };

    const renameAssertion = (val: string): void => {
      const assertionToRename =
        testableState.selectedSuiteState?.selectTestState?.assertionToRename;
      if (assertionToRename) {
        testAssertion_setId(assertionToRename, val);
      }
    };

    return (
      <Panel className="service-test-suite-editor">
        <PanelHeader>
          {availability.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {availability.tests.map((suite) => {
                  const typedSuite = suite;
                  const isActive =
                    testableState.selectedSuiteState?.suite === typedSuite;
                  const suiteResult =
                    isActive && testableState.selectedSuiteState
                      ? testableState.selectedSuiteState.result
                      : TESTABLE_RESULT.DID_NOT_RUN;

                  return (
                    <div
                      key={typedSuite.id}
                      onClick={(): void =>
                        testableState.changeSuite(typedSuite)
                      }
                      className={clsx('service-test-suite-editor__tab', {
                        'service-test-suite-editor__tab--active': isActive,
                      })}
                    >
                      <ContextMenu
                        className="mapping-editor__header__tab__content"
                        content={
                          <AvailabilitySuiteContextMenu
                            suite={typedSuite}
                            testableState={testableState}
                          />
                        }
                      >
                        <div className="testable-test-explorer__item__result">
                          {getTestableResultIcon(suiteResult)}
                        </div>
                        {typedSuite.id}
                      </ContextMenu>
                    </div>
                  );
                })}
              </div>
            </PanelHeader>
          ) : (
            <div></div>
          )}

          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={(): void => testableState.addSuite()}
              title="Add Suite"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <Panel className="service-test-suite-editor">
          {testableState.selectedSuiteState ? (
            <AvailabilitySuiteEditor
              suiteState={testableState.selectedSuiteState}
            />
          ) : (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={(): void => testableState.addSuite()}
              clickActionType="add"
              tooltipText="Click to add availability test suite"
            />
          )}

          {testableState.suiteToRename && (
            <RenameModal
              val={testableState.suiteToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void => testableState.setSuiteToRename(undefined)}
              setValue={renameSuite}
            />
          )}

          {testableState.selectedSuiteState?.testToRename && (
            <RenameModal
              val={testableState.selectedSuiteState.testToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                testableState.selectedSuiteState?.setTestToRename(undefined)
              }
              setValue={renameTest}
            />
          )}

          {testableState.selectedSuiteState?.selectTestState
            ?.assertionToRename && (
            <RenameModal
              val={
                testableState.selectedSuiteState.selectTestState
                  .assertionToRename.id
              }
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                testableState.selectedSuiteState?.selectTestState?.setAssertionToRename(
                  undefined,
                )
              }
              setValue={renameAssertion}
            />
          )}
        </Panel>
      </Panel>
    );
  },
);
