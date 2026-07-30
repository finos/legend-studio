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
import { forwardRef, useRef, useState } from 'react';
import {
  BlankPanelPlaceholder,
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
  PanelContent,
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
  RunErrorsIcon,
} from '@finos/legend-art';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import {
  type AvailabilityBarrierTest,
  type AvailabilityTestSuite,
} from '@finos/legend-graph';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
  type AvailabilityTestState,
  type AvailabilityTestSuiteState,
  type AvailabilityTestableState,
} from '../../../../../stores/editor/editor-state/element-editor-state/availability/testable/AvailabilityTestableState.js';
import {
  atomicTest_setId,
  testAssertion_setId,
  testSuite_setId,
} from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  RenameModal,
  TestAssertionResultViewer,
} from '../../testable/TestableSharedComponents.js';
import { TEST_ASSERTION_TAB } from '../../../../../stores/editor/editor-state/element-editor-state/testable/TestAssertionState.js';
import { RelationElementEditor } from '../../data-editor/RelationElementsDataEditor.js';
import { validateTestableId } from '../../../../../stores/editor/utils/TestableUtils.js';

// ─── Format helpers ─────────────────────────────────────────────────────────

interface FormatOption {
  label: string;
  value: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT;
}

const FORMAT_OPTIONS: FormatOption[] = Object.values(
  AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
).map((format) => ({ label: format, value: format }));

const FormatSelector = observer(
  (props: {
    value: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT;
    onChange: (v: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT) => void;
    disabled?: boolean;
    darkMode?: boolean;
  }) => {
    const { value, onChange, disabled, darkMode } = props;
    const selectedOption =
      FORMAT_OPTIONS.find((option) => option.value === value) ?? null;
    return (
      <div className="availability-test-editor__format-selector">
        <CustomSelectorInput
          options={FORMAT_OPTIONS}
          onChange={(option: FormatOption | null): void => {
            if (option) {
              onChange(option.value);
            }
          }}
          value={selectedOption}
          placeholder="Select watermark format"
          isClearable={false}
          darkMode={darkMode ?? true}
          disabled={disabled}
        />
      </div>
    );
  },
);

// ─── Create Suite Modal ─────────────────────────────────────────────────────

const CreateSuiteModal = observer(
  (props: {
    testableState: AvailabilityTestableState;
    onClose: () => void;
  }) => {
    const { testableState, onClose } = props;
    const editorStore = testableState.editorState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingSuiteIds = testableState.availability.tests.map(
      (suite) => suite.id,
    );
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [format, setFormat] =
      useState<AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT>(
        AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT,
      );

    const suiteError = validateTestableId(suiteName, existingSuiteIds);
    const testError = validateTestableId(testName, undefined);
    const isValid = Boolean(suiteName && !suiteError && testName && !testError);

    const create = (): void => {
      if (!suiteName || !testName) {
        return;
      }
      try {
        testableState.addSuite(format, suiteName, testName);
        onClose();
      } catch (err) {
        applicationStore.notificationService.notifyError(
          err instanceof Error ? err.message : String(err),
        );
      }
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
              name="Suite Name"
              prompt="Unique identifier for the test suite"
              placeholder="e.g. suite_1"
              value={suiteName}
              update={(v): void => setSuiteName(v ?? '')}
              errorMessage={suiteError}
            />
            <PanelFormTextField
              name="Test Name"
              prompt="Name for the first test in this suite"
              placeholder="e.g. test_1"
              value={testName}
              update={(v): void => setTestName(v ?? '')}
              errorMessage={testError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Watermark Serialization Format
              </div>
              <div className="panel__content__form__section__header__prompt">
                This format is fixed for the life of the test.
              </div>
              <FormatSelector
                value={format}
                onChange={setFormat}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
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

// ─── Create Test Modal ──────────────────────────────────────────────────────

const CreateTestModal = observer(
  (props: { suiteState: AvailabilityTestSuiteState; onClose: () => void }) => {
    const { suiteState, onClose } = props;
    const applicationStore = suiteState.editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);

    const existingIds = suiteState.suite.tests.map((test) => test.id);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const [format, setFormat] =
      useState<AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT>(
        AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT,
      );

    const testError = validateTestableId(testName, existingIds);
    const isValid = Boolean(testName && !testError);

    const create = (): void => {
      if (!testName) {
        return;
      }
      try {
        suiteState.addTest(format, testName);
        onClose();
      } catch (err) {
        applicationStore.notificationService.notifyError(
          err instanceof Error ? err.message : String(err),
        );
      }
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
              update={(v): void => setTestName(v ?? '')}
              errorMessage={testError}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Watermark Serialization Format
              </div>
              <div className="panel__content__form__section__header__prompt">
                This format is fixed for the life of the test.
              </div>
              <FormatSelector
                value={format}
                onChange={setFormat}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
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

// ─── Availability expected-JSON editor ──────────────────────────────────────

const ExpectedJsonEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const isReadOnly = testState.isReadOnly;
    const canAdd = testState.parsedExpected !== undefined;
    const [editorRefreshNonce, setEditorRefreshNonce] = useState(0);

    const handleAdd = (): void => {
      testState.addExpectedEntry();
      // Force a lightweight rerender/remount so Monaco reflects external
      // state updates immediately (without tab switching).
      setEditorRefreshNonce((val) => val + 1);
    };

    return (
      <div className="availability-assertion-editor__expected">
        <div className="availability-assertion-editor__expected__body availability-assertion-editor__expected__body--code">
          <CodeEditor
            inputValue={testState.expectedValue}
            language={CODE_EDITOR_LANGUAGE.JSON}
            updateInput={(val: string): void => {
              testState.setExpectedValue(val);
            }}
            hideGutter={true}
            rightActions={
              <button
                tabIndex={-1}
                className="code-editor__header__action"
                disabled={isReadOnly || !canAdd}
                onClick={handleAdd}
                title={
                  canAdd
                    ? 'Add entry'
                    : 'Fix invalid JSON first, then add entry'
                }
              >
                <PlusIcon />
              </button>
            }
            key={`availability-expected-json-${String(editorRefreshNonce)}`}
          />
        </div>
      </div>
    );
  },
);

const AvailabilityAssertionEditor = observer(
  (props: { testState: AvailabilityTestState }) => {
    const { testState } = props;
    const assertionEditorState = testState.assertionEditorStates[0];
    const selectedTab =
      assertionEditorState?.selectedTab ?? TEST_ASSERTION_TAB.EXPECTED;
    const changeTab = (tab: TEST_ASSERTION_TAB): void =>
      assertionEditorState?.setSelectedTab(tab);

    return (
      <div className="availability-assertion-editor panel">
        <PanelHeader>
          <div className="availability-assertion-editor__title">
            <div className="availability-assertion-editor__title__value">
              {testState.test.id}
            </div>
          </div>
          <div className="availability-assertion-editor__meta">
            <div className="availability-assertion-editor__meta__label">
              Format
            </div>
            <div className="availability-assertion-editor__meta__value">
              {testState.format}
            </div>
          </div>
        </PanelHeader>
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
                {tab === TEST_ASSERTION_TAB.EXPECTED ? 'Expected' : 'Result'}
              </div>
            ))}
          </div>
        </div>
        <PanelContent>
          <div className="availability-assertion-editor__body">
            {selectedTab === TEST_ASSERTION_TAB.EXPECTED && (
              <ExpectedJsonEditor testState={testState} />
            )}
            {selectedTab === TEST_ASSERTION_TAB.RESULT &&
              assertionEditorState && (
                <TestAssertionResultViewer
                  testAssertionEditorState={assertionEditorState}
                />
              )}
          </div>
        </PanelContent>
      </div>
    );
  },
);

// ─── Test list item ─────────────────────────────────────────────────────────

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
          <div className="testable-test-explorer__item__label__icon">
            {icon}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {testState.test.id}
          </div>
          <div className="mapping-test-explorer__item__actions">
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
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
          </div>
        </div>
      </ContextMenu>
    );
  },
);

// ─── Tests panel (right side) ───────────────────────────────────────────────

const AvailabilityTestsEditor = observer(
  (props: {
    suiteState: AvailabilityTestSuiteState;
    testableState: AvailabilityTestableState;
  }) => {
    const { suiteState, testableState } = props;
    const selectedTestState = suiteState.selectTestState;
    const isReadOnly = testableState.editorState.isReadOnly;

    return (
      <div className="panel service-test-editor">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={100} size={220}>
            <div className="binding-editor__header">
              <div className="binding-editor__header__title">
                <div className="panel__header__title__content">Tests</div>
              </div>
              <div className="panel__header__actions">
                <button
                  className="panel__header__action"
                  tabIndex={-1}
                  onClick={(): void => {
                    flowResult(suiteState.runSuite()).catch(
                      suiteState.editorStore.applicationStore
                        .alertUnhandledError,
                    );
                  }}
                  disabled={suiteState.suite.tests.length === 0}
                  title="Run all tests in this suite"
                >
                  <RunAllIcon />
                </button>
                <button
                  className="panel__header__action"
                  tabIndex={-1}
                  onClick={(): void => {
                    flowResult(suiteState.runFailingTests()).catch(
                      suiteState.editorStore.applicationStore
                        .alertUnhandledError,
                    );
                  }}
                  disabled={suiteState.suite.tests.length === 0}
                  title="Run failing tests"
                >
                  <RunErrorsIcon />
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
                <AvailabilityTestItem
                  key={testState.test.id}
                  suiteState={suiteState}
                  testState={testState}
                />
              ))}
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            {selectedTestState ? (
              <AvailabilityAssertionEditor testState={selectedTestState} />
            ) : (
              <BlankPanelPlaceholder
                text="Select a test"
                tooltipText="Select a test from the list above"
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

// ─── Suite editor (horizontal split) ────────────────────────────────────────

const AvailabilitySuiteEditor = observer(
  (props: {
    suiteState: AvailabilityTestSuiteState;
    testableState: AvailabilityTestableState;
  }) => {
    const { suiteState, testableState } = props;
    const isReadOnly = testableState.editorState.isReadOnly;

    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={520} minSize={28}>
            <div className="panel service-test-data-editor">
              <div className="service-test-data-editor__data">
                <RelationElementEditor
                  relationElementState={suiteState.testDataState}
                  isReadOnly={isReadOnly}
                  hideColumnDefinitions={true}
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <AvailabilityTestsEditor
              suiteState={suiteState}
              testableState={testableState}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

// ─── Suite tab context menu ─────────────────────────────────────────────────

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

// ─── Top-level testable editor ──────────────────────────────────────────────

export const AvailabilityTestableEditor = observer(
  (props: { testableState: AvailabilityTestableState }) => {
    const { testableState } = props;
    const availability = testableState.availability;
    const selectedSuiteState = testableState.selectedSuiteState;
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
                  const isActive = selectedSuiteState?.suite === suite;
                  const suiteResult = selectedSuiteState
                    ? isActive
                      ? selectedSuiteState.result
                      : TESTABLE_RESULT.DID_NOT_RUN
                    : TESTABLE_RESULT.DID_NOT_RUN;
                  return (
                    <div
                      key={suite.id}
                      onClick={(): void => testableState.changeSuite(suite)}
                      className={clsx('service-test-suite-editor__tab', {
                        'service-test-suite-editor__tab--active': isActive,
                      })}
                    >
                      <ContextMenu
                        className="mapping-editor__header__tab__content"
                        content={
                          <AvailabilitySuiteContextMenu
                            suite={suite}
                            testableState={testableState}
                          />
                        }
                      >
                        <div className="testable-test-explorer__item__result">
                          {getTestableResultIcon(suiteResult)}
                        </div>
                        {suite.id}
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
            {!isReadOnly && (
              <PanelHeaderActionItem
                onClick={(): void =>
                  testableState.setShowCreateSuiteModal(true)
                }
                title="Add Suite"
              >
                <PlusIcon />
              </PanelHeaderActionItem>
            )}
          </PanelHeaderActions>
        </PanelHeader>

        <Panel className="service-test-suite-editor">
          {selectedSuiteState ? (
            <AvailabilitySuiteEditor
              suiteState={selectedSuiteState}
              testableState={testableState}
            />
          ) : (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={(): void => testableState.setShowCreateSuiteModal(true)}
              clickActionType="add"
              tooltipText="Click to add availability test suite"
            />
          )}

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

          {testableState.suiteToRename && (
            <RenameModal
              val={testableState.suiteToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void => testableState.setSuiteToRename(undefined)}
              setValue={renameSuite}
            />
          )}

          {selectedSuiteState?.testToRename && (
            <RenameModal
              val={selectedSuiteState.testToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                selectedSuiteState.setTestToRename(undefined)
              }
              setValue={renameTest}
            />
          )}

          {selectedSuiteState?.selectTestState?.assertionToRename && (
            <RenameModal
              val={selectedSuiteState.selectTestState.assertionToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                selectedSuiteState.selectTestState?.setAssertionToRename(
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
