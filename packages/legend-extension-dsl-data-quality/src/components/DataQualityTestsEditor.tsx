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

import {
  EmbeddedDataEditor,
  RenameModal,
  TESTABLE_RESULT,
  TestAssertionEditor,
  type TestAssertionEditorState,
  getTestableResultFromTestResult,
  getTestableResultIcon,
  validateTestableId,
} from '@finos/legend-application-studio';
import {
  BlankPanelContent,
  BlankPanelPlaceholder,
  CaretDownIcon,
  CheckCircleIcon,
  ContextMenu,
  ControlledDropdownMenu,
  CustomSelectorInput,
  Dialog,
  ErrorWarnIcon,
  MenuContent,
  MenuContentItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  Panel,
  PanelFormTextField,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PlayIcon,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  TestTubeIcon,
  TimesCircleIcon,
  TimesIcon,
  clsx,
} from '@finos/legend-art';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { forwardRef, useRef, useState } from 'react';
import { EqualToJson, EqualToRelation } from '@finos/legend-graph';
import type {
  DataQualityRelationComparisonTest,
  DataQualityRelationComparisonTestSuite,
  DataQualityRelationValidationTest,
  DataQualityRelationValidationTestSuite,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityTest.js';
import {
  type DataQualityStoreTestDataState,
  type DataQualityTestDataState,
  type DataQualityTestState,
  type DataQualityTestSuiteState,
  type DataQualityTestableState,
} from './states/DataQualityTestableState.js';

// -----------------------------------------------------------------------------
// Store test data editor
// -----------------------------------------------------------------------------

const DataQualityStoreTestDataItem = observer(
  (props: {
    storeDataState: DataQualityStoreTestDataState;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    isReadOnly: boolean;
  }) => {
    const { storeDataState, isSelected, onSelect, onDelete, isReadOnly } =
      props;
    const element = storeDataState.storeTestData.element.value;
    return (
      <div
        className={clsx('testable-test-explorer__item', {
          'testable-test-explorer__item--active': isSelected,
        })}
      >
        <button
          className="testable-test-explorer__item__label"
          onClick={onSelect}
          tabIndex={-1}
          title={element.path}
        >
          <div className="testable-test-explorer__item__label__text">
            {element.name}
          </div>
        </button>
        {!isReadOnly && (
          <button
            className="dq-test-explorer__item__action"
            onClick={onDelete}
            tabIndex={-1}
            title="Remove store test data"
          >
            <TimesIcon />
          </button>
        )}
      </div>
    );
  },
);

const DataQualityStoreTestDataEditor = observer(
  (props: {
    storeDataState: DataQualityStoreTestDataState;
    isReadOnly: boolean;
  }) => {
    const { storeDataState, isReadOnly } = props;
    const element = storeDataState.storeTestData.element.value;
    return (
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            <div className="panel__header__title__label">store</div>
            <div className="panel__header__title__content" title={element.path}>
              {element.path}
            </div>
          </div>
        </PanelHeader>
        <div className="panel__content" style={{ overflow: 'auto' }}>
          <EmbeddedDataEditor
            embeddedDataEditorState={storeDataState.embeddedEditorState}
            isReadOnly={isReadOnly}
          />
        </div>
      </Panel>
    );
  },
);

const DataQualityAddElementModal = observer(
  (props: { testDataState: DataQualityTestDataState }) => {
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
        testDataState.addStoreTestData(selectedPath);
        close();
      }
    };
    const onChange = (val: { label: string; value: string } | null): void => {
      setSelectedPath(val?.value);
    };
    const isLightTheme =
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog
        open={testDataState.showAddElementModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal darkMode={!isLightTheme}>
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
              darkMode={!isLightTheme}
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

const DataQualityTestDataEditor = observer(
  (props: { suiteState: DataQualityTestSuiteState }) => {
    const { suiteState } = props;
    const isReadOnly = suiteState.isReadOnly;
    const testDataState = suiteState.testDataState;
    if (!testDataState) {
      return (
        <BlankPanelPlaceholder
          text="Add Test Data"
          onClick={(): void => {
            suiteState.ensureTestData();
          }}
          clickActionType="add"
          tooltipText="Click to add test data"
          disabled={isReadOnly}
        />
      );
    }
    const addStoreData = (): void => testDataState.setShowAddElementModal(true);
    const hasStoreData = Boolean(testDataState.storeDataStates.length);
    return (
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            <div className="panel__header__title__label">test data</div>
          </div>
          {!isReadOnly && (
            <PanelHeaderActions>
              <PanelHeaderActionItem
                onClick={addStoreData}
                title="Add Store Test Data"
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            </PanelHeaderActions>
          )}
        </PanelHeader>
        <div className="panel__content" style={{ overflow: 'auto' }}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={220} minSize={80}>
              <div className="panel__content">
                {hasStoreData ? (
                  testDataState.storeDataStates.map((state) => (
                    <DataQualityStoreTestDataItem
                      key={state.uuid}
                      storeDataState={state}
                      isSelected={testDataState.selectedStoreState === state}
                      onSelect={(): void =>
                        testDataState.setSelectedStoreState(state)
                      }
                      onDelete={(): void =>
                        testDataState.deleteStoreTestData(state)
                      }
                      isReadOnly={isReadOnly}
                    />
                  ))
                ) : (
                  <div className="dq-test-data-editor__warning">
                    <ErrorWarnIcon />
                    <span>Add an element to configure test data</span>
                  </div>
                )}
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              {testDataState.selectedStoreState ? (
                <DataQualityStoreTestDataEditor
                  storeDataState={testDataState.selectedStoreState}
                  isReadOnly={isReadOnly}
                />
              ) : (
                <BlankPanelContent>
                  No store test data selected
                </BlankPanelContent>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {testDataState.showAddElementModal && (
          <DataQualityAddElementModal testDataState={testDataState} />
        )}
      </Panel>
    );
  },
);

// -----------------------------------------------------------------------------
// Test editor (assertions)
// -----------------------------------------------------------------------------

const DataQualityAssertionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testState: DataQualityTestState;
      assertionState: TestAssertionEditorState;
    }
  >(function DataQualityAssertionContextMenu(props, ref) {
    const { testState, assertionState } = props;
    const applicationStore = testState.editorStore.applicationStore;
    const isRelation = assertionState.assertion instanceof EqualToRelation;
    const isJson = assertionState.assertion instanceof EqualToJson;
    const rename = (): void =>
      testState.setAssertionToRename(assertionState.assertion);
    const remove = (): void => testState.deleteAssertion(assertionState);
    const convertToRelation = applicationStore.guardUnhandledError(() =>
      flowResult(testState.switchAssertionType(assertionState, 'relation')),
    );
    const convertToJson = applicationStore.guardUnhandledError(() =>
      flowResult(testState.switchAssertionType(assertionState, 'json')),
    );
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem disabled={isRelation} onClick={convertToRelation}>
          Convert to EqualToRelation
        </MenuContentItem>
        <MenuContentItem disabled={isJson} onClick={convertToJson}>
          Convert to EqualToJson
        </MenuContentItem>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

const DataQualityTestAssertionsEditor = observer(
  (props: { testState: DataQualityTestState }) => {
    const { testState } = props;
    const editorStore = testState.editorStore;
    const isReadOnly = testState.isReadOnly;
    const selectedAssertionState = testState.selectedAsertionState;
    const applicationStore = editorStore.applicationStore;
    const addJsonAssertion = (): void => testState.addAssertion();
    const addRelationAssertion = applicationStore.guardUnhandledError(() =>
      flowResult(testState.addRelationAssertion()),
    );
    const runTest = (): void => {
      flowResult(testState.runTest()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const renameAssertion = (val: string): void => {
      const target = guaranteeNonNullable(testState.assertionToRename);
      target.id = val;
    };
    return (
      <Panel>
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={100} size={220}>
            <PanelHeader>
              <div className="panel__header__title">
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
              <PanelHeaderActions>
                <PanelHeaderActionItem
                  onClick={runTest}
                  title="Run all assertions"
                >
                  <RunAllIcon />
                </PanelHeaderActionItem>
                {!isReadOnly && (
                  <ControlledDropdownMenu
                    className="panel__header__action"
                    title="Add test assertion..."
                    content={
                      <MenuContent>
                        <MenuContentItem onClick={addRelationAssertion}>
                          Add EqualToRelation Assertion
                        </MenuContentItem>
                        <MenuContentItem onClick={addJsonAssertion}>
                          Add EqualToJson Assertion
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: {
                        vertical: 'bottom',
                        horizontal: 'right',
                      },
                      transformOrigin: {
                        vertical: 'top',
                        horizontal: 'right',
                      },
                      elevation: 7,
                    }}
                  >
                    <PlusIcon />
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                )}
              </PanelHeaderActions>
            </PanelHeader>
            <div>
              {testState.assertionEditorStates.map((assertionState) => (
                <ContextMenu
                  key={assertionState.assertion.id}
                  disabled={isReadOnly}
                  content={
                    <DataQualityAssertionContextMenu
                      testState={testState}
                      assertionState={assertionState}
                    />
                  }
                  menuProps={{ elevation: 7 }}
                >
                  <div
                    className={clsx('testable-test-explorer__item', {
                      'testable-test-explorer__item--active':
                        testState.selectedAsertionState === assertionState,
                    })}
                    onClick={(): void =>
                      testState.openAssertion(assertionState.assertion)
                    }
                  >
                    <div className="testable-test-explorer__item__label__text">
                      {assertionState.assertion.id}
                    </div>
                  </div>
                </ContextMenu>
              ))}
            </div>
            {testState.assertionToRename && (
              <RenameModal
                val={testState.assertionToRename.id}
                isReadOnly={isReadOnly}
                showModal={true}
                closeModal={(): void =>
                  testState.setAssertionToRename(undefined)
                }
                setValue={renameAssertion}
              />
            )}
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            {selectedAssertionState ? (
              <TestAssertionEditor
                testAssertionState={selectedAssertionState}
              />
            ) : (
              <BlankPanelContent>No assertion selected</BlankPanelContent>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </Panel>
    );
  },
);

// -----------------------------------------------------------------------------
// Test list + editor
// -----------------------------------------------------------------------------

const DataQualityTestContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suiteState: DataQualityTestSuiteState;
      testState: DataQualityTestState;
    }
  >(function DataQualityTestContextMenu(props, ref) {
    const { suiteState, testState } = props;
    const isReadOnly = suiteState.isReadOnly;
    const remove = (): void => suiteState.deleteTestState(testState);
    const rename = (): void =>
      suiteState.setTestToRename(
        testState.test as
          | DataQualityRelationValidationTest
          | DataQualityRelationComparisonTest,
      );
    const runTest = testState.editorStore.applicationStore.guardUnhandledError(
      () => flowResult(testState.runTest()),
    );
    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          disabled={testState.runningTestAction.isInProgress}
          onClick={runTest}
        >
          Run test
        </MenuContentItem>
        {!isReadOnly && (
          <>
            <MenuContentItem onClick={rename}>Rename</MenuContentItem>
            <MenuContentItem onClick={remove}>Delete</MenuContentItem>
          </>
        )}
      </MenuContent>
    );
  }),
);

const DataQualityTestItem = observer(
  (props: {
    suiteState: DataQualityTestSuiteState;
    testState: DataQualityTestState;
  }) => {
    const { suiteState, testState } = props;
    const isRunning = testState.runningTestAction.isInProgress;
    const isActive = suiteState.selectTestState === testState;
    const testableResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : getTestableResultFromTestResult(testState.testResultState.result);
    const resultIcon = getTestableResultIcon(testableResult);
    const openTest = (): void => suiteState.setSelectTestState(testState);
    const runTest = testState.editorStore.applicationStore.guardUnhandledError(
      () => flowResult(testState.runTest()),
    );
    return (
      <ContextMenu
        content={
          <DataQualityTestContextMenu
            suiteState={suiteState}
            testState={testState}
          />
        }
        menuProps={{ elevation: 7 }}
      >
        <div
          className={clsx('testable-test-explorer__item', {
            'testable-test-explorer__item--active': isActive,
          })}
        >
          <button
            className="testable-test-explorer__item__label"
            onClick={openTest}
            tabIndex={-1}
          >
            <div className="testable-test-explorer__item__label__icon">
              {resultIcon}
            </div>
            <div className="testable-test-explorer__item__label__text">
              {testState.test.id}
            </div>
          </button>
          <button
            className="dq-test-explorer__item__action dq-test-explorer__run-test-btn"
            onClick={runTest}
            disabled={isRunning}
            tabIndex={-1}
            title={`Run ${testState.test.id}`}
          >
            <PlayIcon />
          </button>
        </div>
      </ContextMenu>
    );
  },
);

const DataQualityTestsPanel = observer(
  (props: { suiteState: DataQualityTestSuiteState }) => {
    const { suiteState } = props;
    const isReadOnly = suiteState.isReadOnly;
    const addTest = (): void => suiteState.addTest();
    const runSuite = (): void => {
      flowResult(suiteState.runSuite()).catch(
        suiteState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    const renameTest = (val: string): void => {
      const target = guaranteeNonNullable(suiteState.testToRename);
      suiteState.testableState.renameTest(target, val);
    };
    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={220} minSize={80}>
          <Panel>
            <PanelHeader>
              <div className="panel__header__title">
                <div className="panel__header__title__label">tests</div>
              </div>
              <PanelHeaderActions>
                <PanelHeaderActionItem
                  onClick={runSuite}
                  title="Run all tests in suite"
                >
                  <RunAllIcon />
                </PanelHeaderActionItem>
                {!isReadOnly && (
                  <PanelHeaderActionItem onClick={addTest} title="Add test">
                    <PlusIcon />
                  </PanelHeaderActionItem>
                )}
              </PanelHeaderActions>
            </PanelHeader>
            <div>
              {suiteState.testStates.map((state) => (
                <DataQualityTestItem
                  key={state.test.id}
                  suiteState={suiteState}
                  testState={state}
                />
              ))}
              {!suiteState.testStates.length && (
                <BlankPanelPlaceholder
                  text="Add Test"
                  onClick={addTest}
                  clickActionType="add"
                  tooltipText="Click to add test"
                  disabled={isReadOnly}
                />
              )}
            </div>
            {suiteState.testToRename && (
              <RenameModal
                val={suiteState.testToRename.id}
                isReadOnly={isReadOnly}
                showModal={true}
                closeModal={(): void => suiteState.setTestToRename(undefined)}
                setValue={renameTest}
              />
            )}
          </Panel>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          {suiteState.selectTestState ? (
            <DataQualityTestAssertionsEditor
              testState={suiteState.selectTestState}
            />
          ) : (
            <BlankPanelContent>No test selected</BlankPanelContent>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

// -----------------------------------------------------------------------------
// Suite editor + suite tabs
// -----------------------------------------------------------------------------

const DataQualityTestSuiteEditor = observer(
  (props: { suiteState: DataQualityTestSuiteState }) => {
    const { suiteState } = props;
    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel flex={0.5} minSize={40}>
          <DataQualityTestDataEditor suiteState={suiteState} />
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel flex={0.5} minSize={100}>
          <DataQualityTestsPanel suiteState={suiteState} />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const DataQualitySuiteHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      suite:
        | DataQualityRelationValidationTestSuite
        | DataQualityRelationComparisonTestSuite;
      testableState: DataQualityTestableState;
    }
  >(function DataQualitySuiteHeaderTabContextMenu(props, ref) {
    const { suite, testableState } = props;
    const deleteSuite = (): void => testableState.deleteTestSuite(suite);
    const rename = (): void => testableState.setSuiteToRename(suite);
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={deleteSuite}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

const CreateDataQualityTestSuiteModal = observer(
  (props: { testableState: DataQualityTestableState }) => {
    const { testableState } = props;
    const applicationStore = testableState.editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);
    const handleEnter = (): void => inputRef.current?.focus();
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const isValid = suiteName && testName;
    const close = (): void => testableState.setCreateSuite(false);
    const create = (): void => {
      if (suiteName && testName) {
        flowResult(testableState.addTestSuite(suiteName, testName))
          .then(() => testableState.setCreateSuite(false))
          .catch(applicationStore.alertUnhandledError);
      }
    };
    const isLightTheme =
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    return (
      <Dialog
        open={true}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: { onEnter: handleEnter },
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal darkMode={!isLightTheme}>
          <ModalHeader>
            <ModalTitle title="Create Data Quality Test Suite" />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              ref={inputRef}
              name="Test Suite Name"
              prompt="Unique identifier for test suite"
              value={suiteName}
              placeholder="Suite Name"
              update={(value: string | undefined): void =>
                setSuiteName(value ?? '')
              }
              errorMessage={validateTestableId(suiteName, undefined)}
            />
            <PanelFormTextField
              name="Test Name"
              prompt="Unique identifier for first test in suite"
              placeholder="Test Name"
              value={testName}
              update={(value: string | undefined): void =>
                setTestName(value ?? '')
              }
              errorMessage={validateTestableId(testName, undefined)}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              title={
                !isValid
                  ? 'Suite Name and Test Name Required'
                  : 'Create Test Suite'
              }
              onClick={create}
              text="Create"
            />
            <ModalFooterButton onClick={close} text="Close" type="secondary" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const DataQualityTestsEditor = observer(
  (props: { testableState: DataQualityTestableState }) => {
    const { testableState } = props;
    const isReadOnly = testableState.isReadOnly;
    const suites = testableState.element.tests;
    const selectedSuite = testableState.selectedTestSuite?.suite;
    const runAllSuites = (): void => {
      flowResult(testableState.runTestable()).catch(
        testableState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    const openCreateSuiteModal = (): void => testableState.setCreateSuite(true);
    const renameSuite = (val: string): void => {
      const target = guaranteeNonNullable(testableState.suiteToRename);
      testableState.renameSuite(target, val);
    };
    const [contextSelected, setContextSelected] = useState<string | undefined>(
      undefined,
    );
    return (
      <Panel className="dq-testable-editor">
        <PanelHeader>
          {suites.length ? (
            <div className="dq-testable-editor__tabs">
              {suites.map((suite) => (
                <div
                  key={suite.id}
                  onClick={(): void => testableState.changeSuite(suite)}
                  className={clsx('dq-testable-editor__tab', {
                    'dq-testable-editor__tab--active': suite === selectedSuite,
                  })}
                >
                  <ContextMenu
                    className="dq-testable-editor__tab__content"
                    disabled={isReadOnly}
                    content={
                      <DataQualitySuiteHeaderTabContextMenu
                        suite={suite}
                        testableState={testableState}
                      />
                    }
                    onOpen={(): void => setContextSelected(suite.id)}
                    onClose={(): void => setContextSelected(undefined)}
                  >
                    <div
                      className={clsx({
                        'dq-testable-editor__tab--context':
                          contextSelected === suite.id,
                      })}
                    >
                      {suite.id}
                    </div>
                  </ContextMenu>
                </div>
              ))}
            </div>
          ) : (
            <div />
          )}
          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={runAllSuites}
              disabled={
                !suites.length ||
                testableState.isRunningTestableSuitesState.isInProgress
              }
              title="Run all test suites"
            >
              <RunAllIcon />
            </PanelHeaderActionItem>
            {!isReadOnly && (
              <PanelHeaderActionItem
                onClick={openCreateSuiteModal}
                title="Add Test Suite"
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            )}
          </PanelHeaderActions>
        </PanelHeader>
        {testableState.selectedTestSuite && (
          <DataQualityTestSuiteEditor
            suiteState={testableState.selectedTestSuite}
          />
        )}
        {!suites.length && (
          <BlankPanelPlaceholder
            text="Add Test Suite"
            onClick={openCreateSuiteModal}
            clickActionType="add"
            tooltipText="Click to add test suite"
            disabled={isReadOnly}
          />
        )}
        {testableState.createSuiteModal && (
          <CreateDataQualityTestSuiteModal testableState={testableState} />
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
      </Panel>
    );
  },
);
