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
import { flowResult } from 'mobx';
import {
  BlankPanelContent,
  BlankPanelPlaceholder,
  clsx,
  ContextMenu,
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
  PlusIcon,
  PlayIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  TimesIcon,
} from '@finos/legend-art';
import type {
  IngestElementTestDataState,
  IngestTestDataState,
  IngestTestState,
  IngestTestSuiteState,
  IngestTestableState,
} from '../../../../../stores/editor/editor-state/element-editor-state/ingest/IngestTestableState.js';
import { forwardRef, useRef, useState } from 'react';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import { validateTestableId } from '../../../../../stores/editor/utils/TestableUtils.js';
import {
  RenameModal,
  TestAssertionEditor,
} from '../../testable/TestableSharedComponents.js';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import type { IngestTestSuite } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { testSuite_setId } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import { RelationElementsDataEditor } from '../../data-editor/RelationElementsDataEditor.js';

interface ItemOption {
  value: string;
  label: string;
}

const CreateSuiteModal = observer(
  (props: { testableState: IngestTestableState; onClose: () => void }) => {
    const { testableState, onClose } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [datasetName, setDatasetName] = useState<string | undefined>(
      testableState.datasetNames[0],
    );

    const existingIds = testableState.ingest.tests.map((suite) => suite.id);
    const generateSuiteName = (): string => {
      let idx = 1;
      while (existingIds.includes(`suite_${idx}`)) {
        idx++;
      }
      return `suite_${idx}`;
    };

    const testError = validateTestableId(testName, undefined);
    const datasetOptions: ItemOption[] = testableState.datasetNames.map(
      (name) => ({
        value: name,
        label: name,
      }),
    );

    const selectedDatasetOption =
      datasetOptions.find((option) => option.value === datasetName) ?? null;

    const isValid = testName && !testError && datasetName;

    const create = (): void => {
      if (!testName || !datasetName) {
        return;
      }
      flowResult(
        testableState.createSuite(generateSuiteName(), testName, datasetName),
      )
        .then((error) => {
          if (error) {
            applicationStore.notificationService.notifyError(error);
          } else {
            onClose();
          }
        })
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: { onEnter: () => inputRef.current?.focus() },
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title="Create Test Suite" />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              ref={inputRef}
              name="Test Name"
              prompt="Name for the first test in this suite"
              placeholder="e.g. test_1"
              value={testName}
              update={(value): void => setTestName(value ?? '')}
              errorMessage={testError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                MatView Dataset
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select the MatView dataset tested by this first test
              </div>
              <CustomSelectorInput
                options={datasetOptions}
                onChange={(option: ItemOption | null): void =>
                  setDatasetName(option?.value)
                }
                value={selectedDatasetOption}
                placeholder="Select dataset..."
                isClearable={false}
                darkMode={true}
                disabled={datasetOptions.length === 0}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              title={!isValid ? 'Fill in all required fields' : 'Create Suite'}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton
              onClick={onClose}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const CreateTestModal = observer(
  (props: { suiteState: IngestTestSuiteState; onClose: () => void }) => {
    const { suiteState, onClose } = props;
    const editorStore = suiteState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingIds = suiteState.suite.tests.map((test) => test.id);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [datasetName, setDatasetName] = useState<string | undefined>(
      suiteState.testableState.datasetNames[0],
    );
    const testNameError = validateTestableId(testName, existingIds);

    const datasetOptions: ItemOption[] =
      suiteState.testableState.datasetNames.map((name) => ({
        value: name,
        label: name,
      }));
    const selectedDatasetOption =
      datasetOptions.find((option) => option.value === datasetName) ?? null;

    const isValid = testName && !testNameError && datasetName;

    const create = (): void => {
      if (!testName || !datasetName) {
        return;
      }
      flowResult(suiteState.addNewTest(testName, datasetName))
        .then((error) => {
          if (error) {
            applicationStore.notificationService.notifyError(error);
          } else {
            onClose();
          }
        })
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: { onEnter: () => inputRef.current?.focus() },
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title={`Add Test to "${suiteState.suite.id}"`} />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              ref={inputRef}
              name="Test Name"
              prompt="Unique identifier for the test"
              placeholder="e.g. test_1"
              value={testName}
              update={(value): void => setTestName(value ?? '')}
              errorMessage={testNameError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                MatView Dataset
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select which MatView dataset this test will verify
              </div>
              <CustomSelectorInput
                options={datasetOptions}
                onChange={(option: ItemOption | null): void =>
                  setDatasetName(option?.value)
                }
                value={selectedDatasetOption}
                placeholder="Select dataset..."
                isClearable={false}
                darkMode={true}
                disabled={datasetOptions.length === 0}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
              title={!isValid ? 'Fill in all required fields' : 'Create Test'}
              onClick={create}
              text="Create"
            />
            <ModalFooterButton
              onClick={onClose}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const ElementTestDataItem = observer(
  (props: {
    elementState: IngestElementTestDataState;
    testDataState: IngestTestDataState;
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
                onClick={(event): void => {
                  event.stopPropagation();
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

const ElementTestDataEditor = observer(
  (props: {
    elementState: IngestElementTestDataState;
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

const AddElementModal = observer(
  (props: { testDataState: IngestTestDataState }) => {
    const { testDataState } = props;
    const applicationStore = testDataState.editorStore.applicationStore;
    const options = testDataState.availableElementsToAdd.map((element) => ({
      value: element.path,
      label: element.path,
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
    const onChange = (value: { label: string; value: string } | null): void => {
      setSelectedPath(value?.value);
    };

    return (
      <Dialog
        open={testDataState.showAddElementModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
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

const IngestTestDataEditor = observer(
  (props: { testDataState: IngestTestDataState; isReadOnly: boolean }) => {
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
                    <ElementTestDataItem
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
                <ElementTestDataEditor
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
          <AddElementModal testDataState={testDataState} />
        )}
      </div>
    );
  },
);

const TestItem = observer(
  (props: {
    testState: IngestTestState;
    suiteState: IngestTestSuiteState;
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

const IngestTestEditor = observer(
  (props: { testState: IngestTestState; isReadOnly: boolean }) => {
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

const IngestTestsEditor = observer(
  (props: {
    suiteState: IngestTestSuiteState;
    testableState: IngestTestableState;
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
                  <TestItem
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
                <IngestTestEditor
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

const IngestTestSuiteEditor = observer(
  (props: { suiteState: IngestTestSuiteState }) => {
    const { suiteState } = props;
    const testableState = suiteState.testableState;
    const isReadOnly = testableState.ingestDefinitionEditorState.isReadOnly;

    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={580} minSize={28}>
            <IngestTestDataEditor
              testDataState={suiteState.testDataState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <IngestTestsEditor
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

const SuiteHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testSuite: IngestTestSuite;
      testableState: IngestTestableState;
    }
  >(function SuiteHeaderTabContextMenu(props, ref) {
    const { testSuite, testableState } = props;
    const deleteSuite = (): void => {
      const suiteState = testableState.suiteStates.find(
        (state) => state.suite === testSuite,
      );
      if (suiteState) {
        testableState.deleteSuite(suiteState);
      }
    };
    const rename = (): void => testableState.setSuiteToRename(testSuite);

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={deleteSuite}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

export const IngestTestableEditor = observer(
  (props: { testableState: IngestTestableState }) => {
    const { testableState } = props;
    const selectedSuiteState = testableState.selectedSuiteState;
    const isReadOnly = testableState.ingestDefinitionEditorState.isReadOnly;
    const ingest = testableState.ingest;

    const addSuite = (): void => {
      testableState.setShowCreateSuiteModal(true);
    };

    const changeSuite = (suite: IngestTestSuite): void => {
      testableState.changeSuite(suite);
    };

    const renameSuite = (value: string): void =>
      testSuite_setId(guaranteeNonNullable(testableState.suiteToRename), value);

    return (
      <Panel className="service-test-suite-editor">
        {testableState.showCreateSuiteModal && (
          <CreateSuiteModal
            testableState={testableState}
            onClose={(): void => testableState.setShowCreateSuiteModal(false)}
          />
        )}

        {testableState.showCreateTestModal && selectedSuiteState && (
          <CreateTestModal
            suiteState={selectedSuiteState}
            onClose={(): void => testableState.setShowCreateTestModal(false)}
          />
        )}

        <PanelHeader>
          {ingest.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {ingest.tests.map((suite) => (
                  <div
                    key={suite.id}
                    onClick={(): void => changeSuite(suite)}
                    className={clsx('service-test-suite-editor__tab', {
                      'service-test-suite-editor__tab--active':
                        selectedSuiteState?.suite === suite,
                    })}
                  >
                    <ContextMenu
                      className="mapping-editor__header__tab__content"
                      content={
                        <SuiteHeaderTabContextMenu
                          testableState={testableState}
                          testSuite={suite}
                        />
                      }
                    >
                      {suite.id}
                    </ContextMenu>
                  </div>
                ))}
              </div>
            </PanelHeader>
          ) : (
            <div></div>
          )}
          <PanelHeaderActions>
            <PanelHeaderActionItem onClick={addSuite} title="Add Test Suite">
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <Panel className="service-test-suite-editor">
          {selectedSuiteState && (
            <IngestTestSuiteEditor suiteState={selectedSuiteState} />
          )}
          {!ingest.tests.length && (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={addSuite}
              clickActionType="add"
              tooltipText="Click to add test suite"
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
        </Panel>
      </Panel>
    );
  },
);
