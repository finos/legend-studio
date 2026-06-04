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
  ErrorWarnIcon,
  FilledWindowMaximizeIcon,
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
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  FunctionAccessPoint,
  LakehouseAccessPoint,
  PrimitiveInstanceValue,
  PrimitiveType,
  type RawLambda,
  type DataProductTestSuite,
  type ValueSpecification,
} from '@finos/legend-graph';
import type { DataProductEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import {
  DataProductValueSpecificationTestParameterState,
  type DataProductTestParameterState,
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
import { RelationElementsDataEditor } from '../../data-editor/RelationElementsDataEditor.js';
import {
  getContentTypeWithParamFromQuery,
  type TestParamContentType,
  validateTestableId,
} from '../../../../../stores/editor/utils/TestableUtils.js';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  ExternalFormatParameterEditorModal,
  RenameModal,
  TestAssertionEditor,
} from '../../testable/TestableSharedComponents.js';
import { testSuite_setId } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import { TESTABLE_TEST_TAB } from '../../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import {
  BasicValueSpecificationEditor,
  instanceValue_setValue,
} from '@finos/legend-query-builder';

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
        label: ap.id,
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
                first test in this suite will verify
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
        label: ap.id,
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

const ElementTestDataEditor = observer(
  (props: {
    elementState: DataProductElementTestDataState;
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

// ──────────────────────────────────────────────────────────────────────────────
// Test Data Editor (top panel) — always-visible elements sidebar + per-element editor
// ──────────────────────────────────────────────────────────────────────────────

const AddElementModal = observer(
  (props: { testDataState: DataProductTestDataState }) => {
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

const DataProductTestDataEditor = observer(
  (props: { testDataState: DataProductTestDataState; isReadOnly: boolean }) => {
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
            {/* Left: elements list — always visible */}
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
        {testDataState.showAddElementModal && (
          <AddElementModal testDataState={testDataState} />
        )}
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

const DataProductTestParameterEditor = observer(
  (props: {
    isReadOnly: boolean;
    paramState: DataProductTestParameterState;
    testState: DataProductTestState;
    contentTypeParamPair: TestParamContentType | undefined;
  }) => {
    const { testState, paramState, isReadOnly, contentTypeParamPair } = props;
    const [showPopUp, setShowPopUp] = useState(false);
    const valueSpecificationParamState =
      paramState instanceof DataProductValueSpecificationTestParameterState
        ? paramState
        : undefined;
    const paramExpression = valueSpecificationParamState?.varExpression;
    const paramIsRequired = (paramExpression?.multiplicity.lowerBound ?? 0) > 0;
    const type = contentTypeParamPair
      ? contentTypeParamPair.contentType
      : (paramExpression?.genericType?.value.rawType.name ?? 'unknown');
    const primitiveValueSpecification =
      valueSpecificationParamState?.valueSpec instanceof PrimitiveInstanceValue
        ? valueSpecificationParamState.valueSpec
        : undefined;
    const primitiveValue = primitiveValueSpecification?.values[0] as
      | string
      | undefined;
    const paramValue =
      paramExpression?.genericType?.value.rawType === PrimitiveType.BYTE &&
      primitiveValue !== undefined
        ? atob(primitiveValue)
        : (primitiveValue ?? '');

    const openInPopUp = (): void => setShowPopUp(!showPopUp);
    const closePopUp = (): void => setShowPopUp(false);
    const updateParamValue = (val: string): void => {
      if (
        primitiveValueSpecification &&
        valueSpecificationParamState &&
        paramExpression
      ) {
        instanceValue_setValue(
          primitiveValueSpecification,
          paramExpression.genericType?.value.rawType === PrimitiveType.BYTE
            ? btoa(val)
            : val,
          0,
          testState.editorStore.changeDetectionState.observerContext,
        );
        valueSpecificationParamState.updateValueSpecification(
          primitiveValueSpecification,
        );
      }
    };

    return (
      <div
        key={paramState.parameterValue.name}
        className="panel__content__form__section"
      >
        <div className="panel__content__form__section__header__label">
          {paramState.parameterValue.name}
          <button
            className={clsx('type-tree__node__type__label', {})}
            tabIndex={-1}
            title={type}
          >
            {type}
          </button>
        </div>
        {!valueSpecificationParamState || !paramExpression ? (
          <BlankPanelPlaceholder
            text="Unsupported parameter value"
            tooltipText="This parameter was preserved but cannot currently be edited in form mode"
          />
        ) : contentTypeParamPair && primitiveValueSpecification ? (
          <div className="service-test-editor__setup__parameter__code-editor">
            <textarea
              className="panel__content__form__section__textarea value-spec-editor__input"
              spellCheck={false}
              value={paramValue}
              placeholder={primitiveValue === '' ? '(empty)' : undefined}
              onChange={(event) => {
                updateParamValue(event.target.value);
              }}
            />
            {showPopUp && (
              <ExternalFormatParameterEditorModal
                valueSpec={valueSpecificationParamState.valueSpec}
                varExpression={paramExpression}
                isReadOnly={isReadOnly}
                onClose={closePopUp}
                updateParamValue={updateParamValue}
                contentTypeParamPair={contentTypeParamPair}
              />
            )}
            <div className="service-test-editor__setup__parameter__value__actions">
              <button
                className="service-test-editor__setup__parameter__code-editor__expand-btn"
                onClick={openInPopUp}
                tabIndex={-1}
                title="Open in a popup..."
              >
                <FilledWindowMaximizeIcon />
              </button>
              <button
                className="btn--icon btn--dark btn--sm service-test-editor__setup__parameter__code-editor__expand-btn"
                disabled={isReadOnly || paramIsRequired}
                onClick={(): void =>
                  testState.removeParamValueState(paramState)
                }
                tabIndex={-1}
                title={
                  paramIsRequired ? 'Parameter Required' : 'Remove Parameter'
                }
              >
                <TimesIcon />
              </button>
            </div>
          </div>
        ) : (
          <div className="service-test-editor__setup__parameter__value">
            <BasicValueSpecificationEditor
              valueSpecification={valueSpecificationParamState.valueSpec}
              setValueSpecification={(val: ValueSpecification): void => {
                valueSpecificationParamState.updateValueSpecification(val);
              }}
              graph={testState.editorStore.graphManagerState.graph}
              observerContext={
                testState.editorStore.changeDetectionState.observerContext
              }
              typeCheckOption={{
                expectedType:
                  paramExpression.genericType?.value.rawType ??
                  PrimitiveType.STRING,
              }}
              className="query-builder__parameters__value__editor"
              resetValue={(): void => {
                valueSpecificationParamState.resetValueSpec();
              }}
            />
            <div className="service-test-editor__setup__parameter__value__actions">
              <button
                className="btn--icon btn--dark btn--sm"
                disabled={isReadOnly || paramIsRequired}
                onClick={(): void =>
                  testState.removeParamValueState(paramState)
                }
                tabIndex={-1}
                title={
                  paramIsRequired ? 'Parameter Required' : 'Remove Parameter'
                }
              >
                <TimesIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

const NewDataProductParameterModal = observer(
  (props: { testState: DataProductTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = testState.editorStore.applicationStore;
    const currentOption = {
      value: testState.newParameterValueName,
      label: testState.newParameterValueName,
    };
    const options = testState.newParamOptions;
    const closeModal = (): void => testState.setShowNewParameterModal(false);
    const onChange = (val: { label: string; value: string } | null): void => {
      if (val === null) {
        testState.setNewParameterValueName('');
      } else if (val.value !== testState.newParameterValueName) {
        testState.setNewParameterValueName(val.value);
      }
    };
    return (
      <Dialog
        open={testState.showNewParameterModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            testState.addParameterValue();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">New Test Parameter Value</div>
          <CustomSelectorInput
            className="panel__content__form__section__dropdown"
            options={options}
            onChange={onChange}
            value={currentOption}
            escapeClearsValue={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            disabled={isReadOnly}
          />
          <div className="search-modal__actions">
            <button className="btn btn--dark" disabled={isReadOnly}>
              Add
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const DataProductTestEditor = observer(
  (props: { testState: DataProductTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const selectedTab = testState.selectedTab;
    const selectedAssertion = testState.selectedAsertionState;

    useEffect(() => {
      testState.syncWithQuery();
    }, [testState]);

    const addParameter = (): void => {
      testState.openNewParamModal();
    };

    const generateParameterValues = (): void => {
      testState.generateTestParameterValues();
    };

    const accessPoint = testState.suiteState.testableState.ownAccessPoints.find(
      (ap) => ap.id === testState.test.accessPointId,
    );
    let accessPointQuery: RawLambda | undefined;
    if (accessPoint instanceof LakehouseAccessPoint) {
      accessPointQuery = accessPoint.func;
    } else if (accessPoint instanceof FunctionAccessPoint) {
      accessPointQuery = accessPoint.query;
    }
    const hasQueryParameters = Boolean(
      testState.queryVariableExpressions.length,
    );

    return (
      <div className="function-test-editor panel">
        <div className="panel__header">
          <div className="panel__header service-test-editor__header--with-tabs">
            <div className="panel__header__title__content">Assertion</div>
          </div>
        </div>
        <div className="panel">
          {selectedTab === TESTABLE_TEST_TAB.ASSERTION && (
            <>
              {selectedAssertion ? (
                <div className="data-product-test-editor__assertion">
                  {hasQueryParameters && (
                    <div className="data-product-test-editor__parameters-panel-container">
                      <div className="panel data-product-test-editor__parameters-panel">
                        <div className="data-product-test-editor__parameters-header">
                          <div className="data-product-test-editor__parameters-header__title">
                            <div className="data-product-test-editor__parameters-header__title__label">
                              Parameters
                            </div>
                          </div>
                          <div className="panel__header__actions data-product-test-editor__parameters-header__actions">
                            <button
                              className="panel__header__action data-product-test-editor__parameters-header__action data-product-test-editor__parameters-header__generate-btn"
                              onClick={generateParameterValues}
                              disabled={!testState.newParamOptions.length}
                              title="Generate test parameter values"
                              tabIndex={-1}
                            >
                              <div className="data-product-test-editor__parameters-header__generate-btn__label">
                                <RefreshIcon className="data-product-test-editor__parameters-header__generate-btn__label__icon" />
                                <div className="data-product-test-editor__parameters-header__generate-btn__label__title">
                                  Generate
                                </div>
                              </div>
                            </button>
                            <button
                              className="panel__header__action data-product-test-editor__parameters-header__action"
                              tabIndex={-1}
                              disabled={!testState.newParamOptions.length}
                              onClick={addParameter}
                              title="Add Parameter Value"
                            >
                              <PlusIcon />
                            </button>
                          </div>
                        </div>
                        <div className="data-product-test-editor__parameters">
                          {testState.parameterValueStates.map((paramState) => (
                            <DataProductTestParameterEditor
                              key={paramState.uuid}
                              isReadOnly={isReadOnly}
                              paramState={paramState}
                              testState={testState}
                              contentTypeParamPair={getContentTypeWithParamFromQuery(
                                accessPointQuery,
                                testState.editorStore,
                              ).find(
                                (pair) =>
                                  pair.param === paramState.parameterValue.name,
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div
                    className={clsx(
                      'data-product-test-editor__assertion-result',
                      {
                        'data-product-test-editor__assertion-result--full':
                          !hasQueryParameters,
                      },
                    )}
                  >
                    <TestAssertionEditor
                      testAssertionState={selectedAssertion}
                    />
                  </div>
                </div>
              ) : null}
            </>
          )}
          {selectedTab === TESTABLE_TEST_TAB.ASSERTION &&
            !selectedAssertion && (
              <BlankPanelPlaceholder
                text="No assertion"
                tooltipText="No assertion configured for this test"
              />
            )}
          {testState.showNewParameterModal && (
            <NewDataProductParameterModal
              testState={testState}
              isReadOnly={isReadOnly}
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
          <ResizablePanel size={580} minSize={28}>
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
