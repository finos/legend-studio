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

/**
 * Shared React components for Lakehouse test editors (DataProduct and Ingest).
 *
 * Exports:
 *   - LakehouseElementTestDataItem   — sidebar row for a single element's test data
 *   - LakehouseElementTestDataEditor — editor for a selected element's RelationElementsData
 *   - LakehouseAddElementModal        — modal to add a new element to suite test data
 *   - LakehouseTestDataEditor         — full test-data panel (element list + editor)
 *   - LakehouseTestEditor             — assertion viewer for a single test
 *   - LakehouseTestsEditor            — tests list + test-detail panel
 *   - LakehouseTestSuiteEditor        — horizontal split: test data + tests
 *   - LakehouseSuiteStateForEditor    — interface for suite state passed to shared components
 *   - LakehouseTestableStateForEditor — interface for top-level testable state
 */

import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  BlankPanelContent,
  BlankPanelPlaceholder,
  clsx,
  CustomSelectorInput,
  Dialog,
  ErrorWarnIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  PlusIcon,
  PlayIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  TimesIcon,
} from '@finos/legend-art';
import type { AtomicTest, TestSuite } from '@finos/legend-graph';
import type { ActionState, GeneratorFn } from '@finos/legend-shared';
import { useState } from 'react';
import type { TestableTestEditorState } from '../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../side-bar/testable/GlobalTestRunner.js';
import type {
  LakehouseElementTestDataState,
  LakehouseTestDataStateBase,
} from '../../../../stores/editor/editor-state/element-editor-state/testable/LakehouseTestableUtils.js';
import { RelationElementsDataEditor } from '../data-editor/RelationElementsDataEditor.js';
import { TestAssertionEditor } from './TestableSharedComponents.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

// ─── Public interfaces ────────────────────────────────────────────────────────

/**
 * Minimal interface for a suite state object accepted by LakehouseTestsEditor
 * and LakehouseTestSuiteEditor. Satisfied by both IngestTestSuiteState and
 * DataProductTestSuiteState.
 */
export interface LakehouseSuiteStateForEditor {
  testDataState: LakehouseTestDataStateBase;
  testStates: TestableTestEditorState[];
  selectTestState: TestableTestEditorState | undefined;
  runningSuiteState: ActionState;
  runSuite(): GeneratorFn<void>;
  changeTest(test: AtomicTest): void;
  deleteTest(test: AtomicTest): void;
  suite: TestSuite;
  editorStore: EditorStore;
}

/**
 * Minimal interface for the top-level testable state passed to the tests editor.
 * Satisfied by both IngestTestableState and DataProductTestableState.
 */
export interface LakehouseTestableStateForEditor {
  setShowCreateTestModal(val: boolean): void;
  editorStore: EditorStore;
}

// ─── Element test data: list item ─────────────────────────────────────────────

export const LakehouseElementTestDataItem = observer(
  (props: {
    elementState: LakehouseElementTestDataState;
    testDataState: LakehouseTestDataStateBase;
    isReadOnly: boolean;
  }) => {
    const { elementState, testDataState, isReadOnly } = props;
    const isActive =
      testDataState.selectedElementTestDataState === elementState;

    const select = (): void =>
      testDataState.setSelectedElementTestDataState(elementState);

    return (
      <div
        className={clsx('testable-test-explorer__item', {
          'testable-test-explorer__item--active': isActive,
        })}
      >
        <div
          className="testable-test-explorer__item__label"
          onClick={select}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__text">
            <span title={elementState.element.path}>
              {elementState.element.name}
            </span>
          </div>
          {!isReadOnly && (
            <div className="mapping-test-explorer__item__actions">
              <button
                className="mapping-test-explorer__item__action"
                onClick={(e): void => {
                  e.stopPropagation();
                  testDataState.deleteElement(elementState);
                }}
                tabIndex={-1}
                title="Delete"
              >
                <TimesIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

// ─── Element test data: editor ────────────────────────────────────────────────

export const LakehouseElementTestDataEditor = observer(
  (props: {
    elementState: LakehouseElementTestDataState;
    isReadOnly: boolean;
  }) => {
    const { elementState, isReadOnly } = props;
    const dataState = elementState.relationElementsDataState;

    if (!dataState) {
      return (
        <BlankPanelContent>No relation data for this element</BlankPanelContent>
      );
    }

    return (
      <RelationElementsDataEditor
        dataState={dataState}
        isReadOnly={isReadOnly}
        hideColumnDefinitions={true}
      />
    );
  },
);

// ─── Add element modal ────────────────────────────────────────────────────────

export const LakehouseAddElementModal = observer(
  (props: { testDataState: LakehouseTestDataStateBase }) => {
    const { testDataState } = props;
    const applicationStore = testDataState.editorStore.applicationStore;
    const options = testDataState.availableElementsToAdd.map((e) => ({
      value: e.path,
      label: e.path,
    }));
    const [selectedPath, setSelectedPath] = useState<string | undefined>(
      options[0]?.value,
    );
    const close = (): void => testDataState.setShowAddElementModal(false);
    const add = (): void => {
      if (selectedPath) {
        testDataState.addElement(selectedPath);
        close();
      }
    };
    const onChange = (val: { label: string; value: string } | null): void => {
      setSelectedPath(val?.value);
    };

    return (
      <Dialog
        open={testDataState.showAddElementModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title="Add Element" />
          </ModalHeader>
          <ModalBody>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown"
              options={options}
              onChange={onChange}
              value={
                selectedPath
                  ? { value: selectedPath, label: selectedPath }
                  : null
              }
              placeholder="Select element..."
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!selectedPath}
              onClick={add}
              text="Add"
            />
            <ModalFooterButton onClick={close} text="Close" type="secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

// ─── Test data editor (full panel: element list + per-element editor) ─────────

export const LakehouseTestDataEditor = observer(
  (props: {
    testDataState: LakehouseTestDataStateBase;
    isReadOnly: boolean;
  }) => {
    const { testDataState, isReadOnly } = props;

    const addElement = (): void => {
      if (testDataState.availableElementsToAdd.length === 0) {
        testDataState.editorStore.applicationStore.notificationService.notifyWarning(
          'No elements available to add',
        );
        return;
      }
      testDataState.setShowAddElementModal(true);
    };

    const hasTestData = testDataState.elementTestDataStates.length > 0;

    return (
      <div
        className={clsx('service-test-data-editor panel', {
          'service-test-data-editor--no-data': !hasTestData,
        })}
      >
        <div className="service-test-data-editor__data">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={180}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">Test Data</div>
                </div>
                {!isReadOnly && (
                  <div className="panel__header__actions">
                    <button
                      className="panel__header__action"
                      tabIndex={-1}
                      onClick={addElement}
                      title="Add Element"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                )}
              </div>
              {!hasTestData ? (
                <div className="service-test-data-editor__warning">
                  <ErrorWarnIcon />
                  <span>Add an element to configure test data</span>
                </div>
              ) : (
                <div>
                  {testDataState.elementTestDataStates.map((elementState) => (
                    <LakehouseElementTestDataItem
                      key={elementState.element.path}
                      elementState={elementState}
                      testDataState={testDataState}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </div>
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={200}>
              {testDataState.selectedElementTestDataState ? (
                <LakehouseElementTestDataEditor
                  elementState={testDataState.selectedElementTestDataState}
                  isReadOnly={isReadOnly}
                />
              ) : (
                <BlankPanelContent>
                  Select an element to configure its test data
                </BlankPanelContent>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {testDataState.showAddElementModal && (
          <LakehouseAddElementModal testDataState={testDataState} />
        )}
      </div>
    );
  },
);

// ─── Test editor: assertion viewer ────────────────────────────────────────────

export const LakehouseTestEditor = observer(
  (props: { testState: TestableTestEditorState; isReadOnly: boolean }) => {
    const { testState } = props;
    const selectedAssertion = testState.selectedAsertionState;

    return (
      <div className="function-test-editor panel">
        <div className="panel__header">
          <div className="panel__header service-test-editor__header--with-tabs">
            <div className="panel__header__title__content">Assertion</div>
          </div>
        </div>
        <div className="panel">
          {selectedAssertion && (
            <TestAssertionEditor testAssertionState={selectedAssertion} />
          )}
          {!selectedAssertion && (
            <BlankPanelPlaceholder
              text="No assertion"
              tooltipText="No assertion configured for this test"
            />
          )}
        </div>
      </div>
    );
  },
);

// ─── Test item: list row ──────────────────────────────────────────────────────

const LakehouseTestItem = observer(
  (props: {
    testState: TestableTestEditorState;
    suiteState: LakehouseSuiteStateForEditor;
    isReadOnly: boolean;
  }) => {
    const { testState, suiteState, isReadOnly } = props;
    const isActive = suiteState.selectTestState === testState;
    const isRunning = testState.runningTestAction.isInProgress;
    const _testableResult = getTestableResultFromTestResult(
      testState.testResultState.result,
    );
    const testResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : _testableResult;

    const select = (): void => suiteState.changeTest(testState.test);
    const runTest = (): void => {
      flowResult(testState.runTest()).catch(
        testState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    const deleteTest = (): void => {
      if (!isReadOnly) {
        suiteState.deleteTest(testState.test);
      }
    };

    return (
      <div
        className={clsx('testable-test-explorer__item', {
          'testable-test-explorer__item--active': isActive,
        })}
      >
        <div
          className="testable-test-explorer__item__label"
          onClick={select}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__icon">
            {getTestableResultIcon(testResult)}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {testState.test.id}
          </div>
        </div>
        <div className="mapping-test-explorer__item__actions">
          <button
            className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
            onClick={runTest}
            disabled={isRunning}
            tabIndex={-1}
            title={`Run test ${testState.test.id}`}
          >
            <PlayIcon />
          </button>
          {!isReadOnly && (
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={deleteTest}
              tabIndex={-1}
              title={`Delete test ${testState.test.id}`}
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </div>
    );
  },
);

// ─── Tests editor: test list + test detail ────────────────────────────────────

export const LakehouseTestsEditor = observer(
  (props: {
    suiteState: LakehouseSuiteStateForEditor;
    testableState: LakehouseTestableStateForEditor;
    isReadOnly: boolean;
  }) => {
    const { suiteState, testableState, isReadOnly } = props;
    const selectedTest = suiteState.selectTestState;

    return (
      <div className="panel service-test-editor">
        <div className="service-test-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={100} size={200}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">Tests</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={(): void => {
                      flowResult(suiteState.runSuite()).catch(
                        testableState.editorStore.applicationStore
                          .alertUnhandledError,
                      );
                    }}
                    disabled={
                      suiteState.runningSuiteState.isInProgress ||
                      suiteState.suite.tests.length === 0
                    }
                    title="Run all tests in this suite"
                  >
                    <RunAllIcon />
                  </button>
                  {!isReadOnly && (
                    <button
                      className="panel__header__action"
                      tabIndex={-1}
                      onClick={(): void =>
                        testableState.setShowCreateTestModal(true)
                      }
                      title="Add test to this suite"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
              </div>
              <div>
                {suiteState.testStates.map((testState) => (
                  <LakehouseTestItem
                    key={testState.test.id}
                    testState={testState}
                    suiteState={suiteState}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              {selectedTest ? (
                <LakehouseTestEditor
                  testState={selectedTest}
                  isReadOnly={isReadOnly}
                />
              ) : (
                <BlankPanelPlaceholder
                  text="Select a test"
                  tooltipText="Select a test from the list above"
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

// ─── Suite editor: horizontal split (test data + tests) ───────────────────────

export const LakehouseTestSuiteEditor = observer(
  (props: {
    suiteState: LakehouseSuiteStateForEditor;
    testableState: LakehouseTestableStateForEditor;
    isReadOnly: boolean;
  }) => {
    const { suiteState, testableState, isReadOnly } = props;

    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={580} minSize={28}>
            <LakehouseTestDataEditor
              testDataState={suiteState.testDataState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <LakehouseTestsEditor
              suiteState={suiteState}
              testableState={testableState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
