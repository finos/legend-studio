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

import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  BlankPanelPlaceholder,
  BlankPanelContent,
  clsx,
  ContextMenu,
  CustomSelectorInput,
  Dialog,
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
  PanelLoadingIndicator,
  PlayIcon,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  TimesIcon,
} from '@finos/legend-art';
import type { DataProductTestSuite } from '@finos/legend-graph';
import type { DataProductEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import {
  type DataProductTestableState,
  type DataProductTestSuiteState,
  type DataProductTestState,
  type DataProductTestDataState,
  type DataProductElementTestDataState,
} from '../../../../../stores/editor/editor-state/element-editor-state/dataProduct/testable/DataProductTestableState.js';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { RelationElementEditor } from '../../data-editor/RelationElementsDataEditor.js';
import { validateTestableId } from '../../../../../stores/editor/utils/TestableUtils.js';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  RenameModal,
  TestAssertionEditor,
} from '../../testable/TestableSharedComponents.js';
import { testSuite_setId } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';

// ──────────────────────────────────────────────────────────────────────────────
// Create Suite Modal — test name + access point (datasets are auto-inferred)
// ──────────────────────────────────────────────────────────────────────────────

interface ItemOption {
  value: string;
  label: string;
}

const CreateSuiteModal = observer(
  (props: { testableState: DataProductTestableState; onClose: () => void }) => {
    const { testableState, onClose } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [selectedAccessPointId, setSelectedAccessPointId] = useState<
      string | undefined
    >(undefined);

    // Auto-generate suite name
    const existingIds = testableState.dataProduct.tests.map((s) => s.id);
    const generateSuiteName = (): string => {
      let idx = 1;
      while (existingIds.includes(`suite_${idx}`)) {
        idx++;
      }
      return `suite_${idx}`;
    };

    const testError = validateTestableId(testName, undefined);

    // Access points on the current DataProduct (for the test target)
    const accessPointOptions: ItemOption[] = testableState.ownAccessPoints.map(
      (ap) => ({
        value: ap.id,
        label: ap.title ? `${ap.title} (${ap.id})` : ap.id,
      }),
    );
    const selectedApOption =
      accessPointOptions.find((o) => o.value === selectedAccessPointId) ?? null;

    const isValid = testName && !testError && selectedAccessPointId;

    const create = (): void => {
      if (!testName || !selectedAccessPointId) {
        return;
      }
      flowResult(
        testableState.createSuite(
          generateSuiteName(),
          testName,
          selectedAccessPointId,
        ),
      )
        .then((err) => {
          if (err) {
            applicationStore.notificationService.notifyError(err);
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
                Access Point to Test
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select the access point of the current DataProduct that the
                first test in this suite will verify. Input data will be
                inferred automatically from the access point&apos;s data
                sources.
              </div>
              <CustomSelectorInput
                options={accessPointOptions}
                onChange={(opt: ItemOption | null): void =>
                  setSelectedAccessPointId(opt?.value)
                }
                value={selectedApOption}
                placeholder="Select access point..."
                isClearable={false}
                darkMode={true}
                disabled={accessPointOptions.length === 0}
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

// ──────────────────────────────────────────────────────────────────────────────
// Create Test Modal — asks for test name + access point to test
// ──────────────────────────────────────────────────────────────────────────────

const CreateTestModal = observer(
  (props: { suiteState: DataProductTestSuiteState; onClose: () => void }) => {
    const { suiteState, onClose } = props;
    const editorStore = suiteState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingIds = suiteState.suite.tests.map((t) => t.id);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [selectedAccessPointId, setSelectedAccessPointId] = useState<
      string | undefined
    >(undefined);
    const testNameError = validateTestableId(testName, existingIds);

    const accessPointOptions: ItemOption[] =
      suiteState.testableState.ownAccessPoints.map((ap) => ({
        value: ap.id,
        label: ap.title ? `${ap.title} (${ap.id})` : ap.id,
      }));
    const selectedApOption =
      accessPointOptions.find((o) => o.value === selectedAccessPointId) ?? null;

    const isValid = testName && !testNameError && selectedAccessPointId;

    const create = (): void => {
      if (!testName || !selectedAccessPointId) {
        return;
      }
      flowResult(suiteState.addNewTest(testName, selectedAccessPointId))
        .then((err) => {
          if (err) {
            applicationStore.notificationService.notifyError(err);
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
                Access Point to Test
              </div>
              <div className="panel__content__form__section__header__prompt">
                Select which access point of the DataProduct this test will
                verify
              </div>
              <CustomSelectorInput
                options={accessPointOptions}
                onChange={(opt: ItemOption | null): void =>
                  setSelectedAccessPointId(opt?.value)
                }
                value={selectedApOption}
                placeholder="Select access point..."
                isClearable={false}
                darkMode={true}
                disabled={accessPointOptions.length === 0}
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

// ──────────────────────────────────────────────────────────────────────────────
// Element Test Data Item (sidebar list row in test data panel)
// ──────────────────────────────────────────────────────────────────────────────

const ElementTestDataItem = observer(
  (props: {
    elementState: DataProductElementTestDataState;
    testDataState: DataProductTestDataState;
  }) => {
    const { elementState, testDataState } = props;
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
            {elementState.elementName}
          </div>
        </div>
      </div>
    );
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Element Test Data Editor — dataset tabs + CSV editor
// ──────────────────────────────────────────────────────────────────────────────

const ElementTestDataEditor = observer(
  (props: {
    elementState: DataProductElementTestDataState;
    isReadOnly: boolean;
  }) => {
    const { elementState, isReadOnly } = props;
    const configuredItems = elementState.configuredItems;
    const itemLabel = elementState.itemLabel;

    return (
      <div className="service-test-data-editor panel">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
              data
            </div>
          </div>
        </div>
        <div className="panel__content">
          {configuredItems.length > 0 ? (
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                {itemLabel}s
              </div>
              <div className="uml-element-editor__tabs">
                {configuredItems.map((item) => (
                  <div
                    key={item.id}
                    className={clsx('service-test-suite-editor__tab', {
                      'service-test-suite-editor__tab--active':
                        item.id === elementState.selectedItemId,
                    })}
                  >
                    <div
                      className="mapping-editor__header__tab__content"
                      onClick={(): void =>
                        elementState.setSelectedItem(item.id)
                      }
                      tabIndex={-1}
                    >
                      <div>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <BlankPanelContent>No {itemLabel}s configured</BlankPanelContent>
          )}
          {elementState.relationElementState && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <RelationElementEditor
                relationElementState={elementState.relationElementState}
                isReadOnly={isReadOnly}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Test Data Editor (top panel) — always-visible elements sidebar + per-element editor
// ──────────────────────────────────────────────────────────────────────────────

const DataProductTestDataEditor = observer(
  (props: { testDataState: DataProductTestDataState; isReadOnly: boolean }) => {
    const { testDataState, isReadOnly } = props;

    return (
      <div className="service-test-data-editor panel">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--data">
              Test Data
            </div>
          </div>
        </div>
        <div className="service-test-data-editor__data">
          <ResizablePanelGroup orientation="vertical">
            {/* Left: elements list — always visible */}
            <ResizablePanel minSize={100} size={180}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="binding-editor__header__title__label">
                    elements
                  </div>
                </div>
              </div>
              {testDataState.elementTestDataStates.length === 0 ? (
                <BlankPanelContent>
                  No data sources configured
                </BlankPanelContent>
              ) : (
                <div>
                  {testDataState.elementTestDataStates.map((elementState) => (
                    <ElementTestDataItem
                      key={elementState.element.path}
                      elementState={elementState}
                      testDataState={testDataState}
                    />
                  ))}
                </div>
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            {/* Right: per-element dataset tabs + CSV editor */}
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
      </div>
    );
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Test Item (inside tests panel)
// ──────────────────────────────────────────────────────────────────────────────

const TestItem = observer(
  (props: {
    testState: DataProductTestState;
    suiteState: DataProductTestSuiteState;
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

// ──────────────────────────────────────────────────────────────────────────────
// Test Editor — shows SETUP (input data) and ASSERTION (expected + result) tabs
// ──────────────────────────────────────────────────────────────────────────────

const DataProductTestEditor = observer(
  (props: { testState: DataProductTestState; isReadOnly: boolean }) => {
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

// ──────────────────────────────────────────────────────────────────────────────
// Tests Editor (bottom panel) — tests list + test detail
// ──────────────────────────────────────────────────────────────────────────────

const DataProductTestsEditor = observer(
  (props: {
    suiteState: DataProductTestSuiteState;
    testableState: DataProductTestableState;
    isReadOnly: boolean;
  }) => {
    const { suiteState, testableState, isReadOnly } = props;
    const selectedTest = suiteState.selectTestState;

    return (
      <div className="panel service-test-editor">
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label service-test-suite-editor__header__title__label--tests">
              tests
            </div>
          </div>
        </div>
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
                {suiteState.testStates.map((ts) => (
                  <TestItem
                    key={ts.test.id}
                    testState={ts}
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
                <DataProductTestEditor
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

// ──────────────────────────────────────────────────────────────────────────────
// Suite Editor — horizontal split: test data (top) + tests (bottom)
// ──────────────────────────────────────────────────────────────────────────────

const DataProductTestSuiteEditor = observer(
  (props: { suiteState: DataProductTestSuiteState }) => {
    const { suiteState } = props;
    const testableState = suiteState.testableState;
    const isReadOnly = testableState.dataProductEditorState.isReadOnly;

    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={300} minSize={28}>
            <DataProductTestDataEditor
              testDataState={suiteState.testDataState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <DataProductTestsEditor
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

// ──────────────────────────────────────────────────────────────────────────────
// Suite Tab Context Menu (rename/delete)
// ──────────────────────────────────────────────────────────────────────────────

const SuiteHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testSuite: DataProductTestSuite;
      testableState: DataProductTestableState;
    }
  >(function SuiteHeaderTabContextMenu(props, ref) {
    const { testSuite, testableState } = props;
    const deleteSuite = (): void => {
      const suiteState = testableState.suiteStates.find(
        (s) => s.suite === testSuite,
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

// ──────────────────────────────────────────────────────────────────────────────
// Main Testing Tab — suite tabs at top, suite editor below
// ──────────────────────────────────────────────────────────────────────────────

export const DataProductTestableEditor = observer(
  (props: {
    dataProductEditorState: DataProductEditorState;
    isReadOnly: boolean;
  }) => {
    const { dataProductEditorState, isReadOnly } = props;
    const testableState = dataProductEditorState.testableState;
    const selectedSuiteState = testableState.selectedSuiteState;
    const dp = testableState.dataProduct;

    useEffect(() => {
      testableState.init();
    }, [testableState]);

    const addSuite = (): void => {
      testableState.setShowCreateSuiteModal(true);
    };

    const changeSuite = (suite: DataProductTestSuite): void => {
      testableState.changeSuite(suite);
    };

    const renameSuite = (val: string): void =>
      testSuite_setId(guaranteeNonNullable(testableState.suiteToRename), val);

    return (
      <Panel className="service-test-suite-editor">
        <PanelLoadingIndicator
          isLoading={testableState.runningAllTestsState.isInProgress}
        />

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
          {dp.tests.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {dp.tests.map((suite) => (
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
            <DataProductTestSuiteEditor suiteState={selectedSuiteState} />
          )}
          {!dp.tests.length && (
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
