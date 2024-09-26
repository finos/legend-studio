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

import {
  clsx,
  CompareIcon,
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
  PanelContent,
  PanelFormTextField,
  PanelHeader,
  PanelHeaderActions,
  PanelLoadingIndicator,
  RefreshIcon,
  WrenchIcon,
} from '@finos/legend-art';
import {
  type DataElement,
  type ValueSpecification,
  type VariableExpression,
  type PrimitiveInstanceValue,
  TestError,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  ContentType,
  prettyCONSTName,
  tryToFormatLosslessJSONString,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  AssertFailState,
  EqualToJsonAssertFailState,
  EqualToJsonAssertionState,
  TestAssertionStatusState,
  TEST_ASSERTION_TAB,
  type TestAssertionResultState,
  type TestAssertionEditorState,
  type TestAssertionState,
  EqualToAssertionState,
} from '../../../../stores/editor/editor-state/element-editor-state/testable/TestAssertionState.js';
import { externalFormatData_setData } from '../../../../stores/graph-modifier/DSL_Data_GraphModifierHelper.js';
import { TESTABLE_RESULT } from '../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import { CodeEditor, JSONDiffView } from '@finos/legend-lego/code-editor';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { forwardRef, useState } from 'react';
import type { TestableTestEditorState } from '../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import { getTestableResultIcon } from '../../side-bar/testable/GlobalTestRunner.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
} from '@finos/legend-lego/graph-editor';
import type { TestParamContentType } from '../../../../stores/editor/utils/TestableUtils.js';
import {
  BasicValueSpecificationEditor,
  buildDefaultInstanceValue,
} from '@finos/legend-query-builder';
import { useApplicationStore } from '@finos/legend-application';

export const SharedDataElementModal = observer(
  (props: {
    filterBy?: (val: DataElement) => boolean;
    handler: (val: DataElement) => void;
    editorStore: EditorStore;
    isReadOnly: boolean;
    close: () => void;
  }) => {
    const { filterBy, isReadOnly, close, editorStore, handler } = props;
    const applicationStore = editorStore.applicationStore;
    const dataElements =
      editorStore.graphManagerState.graph.dataElements.filter((e) =>
        filterBy ? filterBy(e) : true,
      );
    const [dataElement, setDataElement] = useState(dataElements[0]);
    const dataElementOptions =
      editorStore.graphManagerState.usableDataElements.map(buildElementOption);
    const selectedDataElement = dataElement
      ? buildElementOption(dataElement)
      : null;
    const onDataElementChange = (val: {
      label: string;
      value?: DataElement;
    }): void => {
      if (val.value !== selectedDataElement?.value && val.value) {
        setDataElement(val.value);
      }
    };
    const change = (): void => {
      if (dataElement) {
        handler(dataElement);
      }
      close();
    };
    return (
      <Dialog
        open={true}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="service-test-data-modal"
        >
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Data Element
              </div>
              <div className="explorer__new-element-modal__driver">
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown data-element-reference-editor__value__dropdown"
                  disabled={false}
                  options={dataElementOptions}
                  onChange={onDataElementChange}
                  formatOptionLabel={getPackageableElementOptionFormatter({})}
                  value={selectedDataElement}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly}
              onClick={change}
              title="Change to use Data Element"
            >
              Change
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const RenameModal = observer(
  (props: {
    val: string;
    isReadOnly: boolean;
    setValue: (val: string) => void;
    showModal: boolean;
    closeModal: () => void;
    errorMessageFunc?: (val: string) => string | undefined;
  }) => {
    const {
      val,
      isReadOnly,
      showModal,
      closeModal,
      setValue,
      errorMessageFunc,
    } = props;
    const [inputValue, setInputValue] = useState(val);
    const changeValue = (_val: string | undefined): void => {
      setInputValue(_val ?? '');
    };
    const errorMessage = errorMessageFunc?.(inputValue);
    return (
      <Dialog
        open={showModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setValue(inputValue);
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <ModalBody>
            <PanelFormTextField
              name="Rename"
              isReadOnly={isReadOnly}
              value={inputValue}
              update={changeValue}
              errorMessage={errorMessage}
            />
          </ModalBody>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={isReadOnly || Boolean(errorMessage)}
            >
              Rename
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const EqualToJsonAsssertionEditor = observer(
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
        <PanelHeader>
          <PanelHeader title="expected" />
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={testAssertionEditorState.testState.isReadOnly}
              tabIndex={-1}
              onClick={formatExpectedResultJSONString}
              title="Format JSON (Alt + Shift + F)"
            >
              <WrenchIcon />
            </button>
          </div>
        </PanelHeader>
        <div className="equal-to-json-editor__content panel__content">
          <div className="equal-to-json-editor__content__data">
            <CodeEditor
              inputValue={assertion.expected.data}
              language={CODE_EDITOR_LANGUAGE.JSON}
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

const EqualToAsssertionEditor = observer(
  (props: {
    testAssertionEditorState: TestAssertionEditorState;
    equalToAssertionState: EqualToAssertionState;
  }) => {
    const { equalToAssertionState, testAssertionEditorState } = props;
    const editorStore = testAssertionEditorState.editorStore;
    const resetNode = (): void => {
      const type = equalToAssertionState.valueSpec.genericType?.value.rawType;
      if (type) {
        const valSpec = buildDefaultInstanceValue(
          testAssertionEditorState.editorStore.graphManagerState.graph,
          type,
          testAssertionEditorState.editorStore.changeDetectionState
            .observerContext,
          true,
        );
        equalToAssertionState.updateValueSpec(valSpec);
      }
    };

    return (
      <>
        <div className="equal-to-editor__content">
          <div className="equal-to-editor__content__data">
            <BasicValueSpecificationEditor
              valueSpecification={equalToAssertionState.valueSpec}
              setValueSpecification={(val: ValueSpecification): void => {
                equalToAssertionState.updateValueSpec(val);
              }}
              graph={editorStore.graphManagerState.graph}
              observerContext={editorStore.changeDetectionState.observerContext}
              resetValue={resetNode}
              typeCheckOption={{
                expectedType:
                  equalToAssertionState.valueSpec.genericType?.value.rawType ??
                  PrimitiveType.STRING,
              }}
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
    const applicationStore =
      equalToJsonAssertFailState.resultState.editorStore.applicationStore;
    const open = (): void => equalToJsonAssertFailState.setDiffModal(true);
    const close = (): void => equalToJsonAssertFailState.setDiffModal(false);
    const expected = equalToJsonAssertFailState.status.expected;
    const actual = equalToJsonAssertFailState.status.actual;

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
            <Modal
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
              className="editor-modal"
            >
              <ModalHeader>
                <div className="equal-to-json-result__diff__summary">
                  <div className="equal-to-json-result__diff__header__label">
                    expected
                  </div>
                  <div className="equal-to-json-result__diff__icon">
                    <CompareIcon />
                  </div>
                  <div className="equal-to-json-result__diff__header__label">
                    actual
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                <JSONDiffView from={expected} to={actual} lossless={true} />
              </ModalBody>
              <ModalFooter>
                <ModalFooterButton
                  text="Close"
                  onClick={close}
                  type="secondary"
                />
              </ModalFooter>
            </Modal>
          </Dialog>
        )}
      </>
    );
  },
);

const TestErrorViewer = observer((props: { testError: TestError }) => {
  const { testError } = props;
  return (
    <>
      <div className="testable-test-assertion-result__summary-info">
        {testError.error}
      </div>
    </>
  );
});

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
    const parentAssertionResultState =
      testAssertionEditorState.assertionResultState;
    const assertionResult =
      testAssertionEditorState.assertionResultState.result;
    const renderAssertionResult = (
      assertionResultState: TestAssertionResultState,
    ): React.ReactNode => {
      const _statusState = assertionResultState.statusState;
      if (assertionResultState.testResult instanceof TestError) {
        return <TestErrorViewer testError={assertionResultState.testResult} />;
      } else if (_statusState instanceof TestAssertionStatusState) {
        return _statusState instanceof AssertFailState ? (
          <AssertFailViewer assertFailState={_statusState} />
        ) : null;
      }
      return null;
    };
    const renderResultView = (
      assertionResultState: TestAssertionResultState,
    ): React.ReactNode => {
      const _statusState = assertionResultState.statusState;
      if (
        _statusState === undefined ||
        _statusState instanceof TestAssertionStatusState
      ) {
        return (
          <>
            <div className="testable-test-assertion-result__summary-info">
              Result: {prettyCONSTName(assertionResult)}
            </div>
            {renderAssertionResult(assertionResultState)}
          </>
        );
      } else {
        return Array.from(_statusState.entries()).map((state) => {
          const _key = state[0];
          const resultState = state[1];
          return (
            <div
              className="testable-test-assertion-result__summary-multi"
              key={_key}
            >
              <div>{_key}</div>
              <div className="testable-test-assertion-result__summary-info">
                Result: {prettyCONSTName(resultState.result)}
              </div>
              {renderAssertionResult(resultState)}
            </div>
          );
        });
      }
    };

    return (
      <>
        <PanelHeader title="result">
          <PanelHeaderActions />
        </PanelHeader>
        <PanelContent className="testable-test-assertion-result__content">
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
            {assertionResult === TESTABLE_RESULT.IN_PROGRESS && (
              <div className="testable-test-assertion-result__summary-info">
                Running assertion...
              </div>
            )}

            {assertionResult !== TESTABLE_RESULT.IN_PROGRESS && (
              <>
                <div className="testable-test-assertion-result__summary-info">
                  Id: {testAssertionEditorState.assertion.id}
                </div>
                <div className="testable-test-assertion-result__summary-info">
                  Type: {testAssertionEditorState.assertionState.label()}
                </div>
                {renderResultView(parentAssertionResultState)}
              </>
            )}
          </div>
          <div></div>
        </PanelContent>
      </>
    );
  },
);

export const TestAssertionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      testableTestState: TestableTestEditorState;
      testAssertionState: TestAssertionEditorState;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { testableTestState: testableTestState, testAssertionState } = props;
    const rename = (): void =>
      testableTestState.setAssertionToRename(testAssertionState.assertion);
    const remove = (): void =>
      testableTestState.deleteAssertion(testAssertionState);
    const add = (): void => testableTestState.addAssertion();
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={remove}>Delete</MenuContentItem>
        <MenuContentItem onClick={add}>Create a new assert</MenuContentItem>
      </MenuContent>
    );
  }),
);

export const TestAssertionItem = observer(
  (props: {
    testAssertionEditorState: TestAssertionEditorState;
    testableTestState: TestableTestEditorState;
    isReadOnly: boolean;
  }) => {
    const { testAssertionEditorState, isReadOnly, testableTestState } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isRunning = testableTestState.runningTestAction.isInProgress;
    const testAssertion = testAssertionEditorState.assertion;
    const isActive =
      testableTestState.selectedAsertionState?.assertion === testAssertion;
    const _testableResult =
      testAssertionEditorState.assertionResultState.result;
    const testableResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : _testableResult;
    const resultIcon = getTestableResultIcon(testableResult);
    const openTestAssertion = (): void =>
      testableTestState.openAssertion(testAssertion);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    return (
      <ContextMenu
        className={clsx(
          'testable-test-assertion-explorer__item',
          {
            'testable-test-assertion-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'testable-test-assertion-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <TestAssertionContextMenu
            testableTestState={testableTestState}
            testAssertionState={testAssertionEditorState}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-assertion-explorer__item__label')}
          onClick={openTestAssertion}
          tabIndex={-1}
        >
          <div className="testable-test-assertion-explorer__item__label__icon testable-test-assertion-explorer__test-result-indicator__container">
            {resultIcon}
          </div>
          <div className="testable-test-assertion-explorer__item__label__text">
            {testAssertion.id}
          </div>
        </button>
      </ContextMenu>
    );
  },
);

export const TestAssertionEditor = observer(
  (props: { testAssertionState: TestAssertionEditorState }) => {
    const { testAssertionState } = props;
    const selectedTab = testAssertionState.selectedTab;
    const isReadOnly = testAssertionState.testState.isReadOnly;
    const isDisabled =
      isReadOnly ||
      !testAssertionState.assertionState.supportsGeneratingAssertion ||
      testAssertionState.generatingExpectedAction.isInProgress;
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
      } else if (state instanceof EqualToAssertionState) {
        return (
          <EqualToAsssertionEditor
            equalToAssertionState={state}
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
              title="Generate expected result if possible"
              disabled={isDisabled}
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
          {selectedTab === TEST_ASSERTION_TAB.EXPECTED && (
            <div className="testable-test-assertion-editor__setup">
              {renderContent(testAssertionState.assertionState)}
            </div>
          )}
          {selectedTab === TEST_ASSERTION_TAB.RESULT && (
            <TestAssertionResultViewer
              testAssertionEditorState={testAssertionState}
            />
          )}
        </div>
      </div>
    );
  },
);

export const ExternalFormatParameterEditorModal = observer(
  (props: {
    valueSpec: ValueSpecification;
    varExpression: VariableExpression;
    isReadOnly: boolean;
    onClose: () => void;
    updateParamValue: (val: string) => void;
    contentTypeParamPair: TestParamContentType;
  }) => {
    const {
      valueSpec,
      varExpression,
      isReadOnly,
      onClose,
      updateParamValue,
      contentTypeParamPair,
    } = props;
    const applicationStore = useApplicationStore();
    const paramValue =
      varExpression.genericType?.value.rawType === PrimitiveType.BYTE
        ? atob((valueSpec as PrimitiveInstanceValue).values[0] as string)
        : ((valueSpec as PrimitiveInstanceValue).values[0] as string);
    return (
      <Dialog
        open={true}
        onClose={onClose}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className={clsx('editor-modal lambda-editor__popup__modal')}
        >
          <ModalHeader>
            <ModalTitle title="Edit Parameter Value" />
          </ModalHeader>
          <ModalBody>
            <div className="service-test-editor__setup__parameter__code-editor__container">
              <div className="service-test-editor__setup__parameter__code-editor__container__content">
                <CodeEditor
                  inputValue={paramValue}
                  updateInput={updateParamValue}
                  isReadOnly={isReadOnly}
                  language={
                    contentTypeParamPair.contentType ===
                    ContentType.APPLICATION_JSON.toString()
                      ? CODE_EDITOR_LANGUAGE.JSON
                      : CODE_EDITOR_LANGUAGE.TEXT
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Close"
              onClick={onClose}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
