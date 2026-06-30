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
import {
  BlankPanelPlaceholder,
  BlankPanelContent,
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
  PlayIcon,
  PlusIcon,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  RunErrorsIcon,
  TimesIcon,
  clsx,
} from '@finos/legend-art';
import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  type FunctionTestSuite,
  type DataElement,
  type EmbeddedData,
  type ValueSpecification,
  DataElementReference,
  PackageableElementExplicitReference,
  RelationalCSVData,
  ModelStoreData,
  ExternalFormatData,
  ModelEmbeddedData,
  PrimitiveInstanceValue,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  FunctionValueSpecificationTestParameterState,
  type FunctionStoreTestDataState,
  type FunctionTestState,
  type FunctionTestSuiteState,
  type FunctionTestableState,
} from '../../../../../stores/editor/editor-state/element-editor-state/function-activator/testable/FunctionTestableState.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { flowResult } from 'mobx';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import {
  ExternalFormatParameterEditorModal,
  RenameModal,
  SharedDataElementModal,
  TestAssertionEditor,
} from '../../testable/TestableSharedComponents.js';
import {
  filterByType,
  prettyCONSTName,
  returnUndefOnError,
} from '@finos/legend-shared';
import {
  EmbeddedDataCreatorFromEmbeddedData,
  validateTestableId,
  type TestParamContentType,
  getContentTypeWithParamFromQuery,
} from '../../../../../stores/editor/utils/TestableUtils.js';
import { EmbeddedDataEditor } from '../../data-editor/EmbeddedDataEditor.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import {
  BasicValueSpecificationEditor,
  instanceValue_setValue,
} from '@finos/legend-query-builder';
import { TESTABLE_TEST_TAB } from '../../../../../stores/editor/editor-state/element-editor-state/testable/TestableEditorState.js';
import { atomicTest_setDoc } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';

const FunctionTestableContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      addName?: string;
      _delete?: () => void;
      rename?: () => void;
      add?: () => void;
    }
  >(function TestContainerContextMenu(props, ref) {
    const { addName, add, rename, _delete } = props;
    const addTest = (): void => {
      add?.();
    };
    const remove = (): void => _delete?.();
    const handleRename = (): void => rename?.();
    return (
      <MenuContent ref={ref}>
        {rename && (
          <MenuContentItem onClick={handleRename}>Rename</MenuContentItem>
        )}
        {_delete && <MenuContentItem onClick={remove}>Delete</MenuContentItem>}
        {addName && rename && (
          <MenuContentItem
            onClick={addTest}
          >{`Add ${addName}`}</MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const FunctionTestDataStateEditor = observer(
  (props: {
    functionTestSuiteState: FunctionTestSuiteState;
    storeTestDataState: FunctionStoreTestDataState;
  }) => {
    const { functionTestSuiteState, storeTestDataState } = props;
    const functionTestableState = functionTestSuiteState.functionTestableState;
    const isReadOnly = functionTestableState.functionEditorState.isReadOnly;
    const embeddedState = storeTestDataState.embeddedEditorState;
    const currentData = embeddedState.embeddedData;
    const isUsingReference = currentData instanceof DataElementReference;
    const open = (): void => storeTestDataState.setDataElementModal(true);
    const close = (): void => storeTestDataState.setDataElementModal(false);
    const changeToUseMyOwn = (): void => {
      if (isUsingReference) {
        const newBare = returnUndefOnError(() =>
          currentData.accept_EmbeddedDataVisitor(
            new EmbeddedDataCreatorFromEmbeddedData(
              functionTestableState.editorStore,
            ),
          ),
        );
        if (newBare) {
          storeTestDataState.changeEmbeddedData(newBare);
        }
      }
    };

    const sharedDataHandler = (val: DataElement): void => {
      const dataRef = new DataElementReference();
      dataRef.dataElement = PackageableElementExplicitReference.create(val);
      const dataElementValue = val.data;
      let embeddedData: EmbeddedData = dataRef;
      if (
        currentData instanceof ModelStoreData &&
        dataElementValue instanceof ExternalFormatData
      ) {
        const modelStoreVal = currentData.modelData?.[0];
        if (modelStoreVal instanceof ModelEmbeddedData) {
          const newModelEmbeddedData = new ModelEmbeddedData();
          newModelEmbeddedData.model =
            PackageableElementExplicitReference.create(
              modelStoreVal.model.value,
            );

          newModelEmbeddedData.data = dataRef;
          const modelStoreData = new ModelStoreData();
          modelStoreData.modelData = [newModelEmbeddedData];
          embeddedData = modelStoreData;
        }
      }
      storeTestDataState.changeEmbeddedData(embeddedData);
    };

    const dataElements =
      functionTestSuiteState.editorStore.graphManagerState.graph.dataElements;

    const filter = (val: DataElement): boolean => {
      const dataElementData = val.data;
      if (currentData instanceof RelationalCSVData) {
        if (dataElementData instanceof RelationalCSVData) {
          return true;
        }
        return false;
      } else if (currentData instanceof ModelStoreData) {
        if (
          dataElementData instanceof ExternalFormatData ||
          dataElementData instanceof ModelStoreData
        ) {
          return true;
        }
        return false;
      }
      return true;
    };
    return (
      <div className="service-test-data-editor">
        <div className="function-testable-editor__header">
          <div className="function-testable-editor__header__title">
            <div className="function-testable-editor__header__title__label">
              input data
            </div>
          </div>
          <div className="panel__header__actions">
            {isUsingReference ? (
              <button
                className="panel__header__action service-execution-editor__test-data__generate-btn"
                onClick={changeToUseMyOwn}
                disabled={!isUsingReference}
                title="Use own data"
                tabIndex={-1}
              >
                <div className="service-execution-editor__test-data__generate-btn__label">
                  <div className="service-execution-editor__test-data__generate-btn__label__title">
                    Own Data
                  </div>
                </div>
              </button>
            ) : (
              <button
                className="panel__header__action service-execution-editor__test-data__generate-btn"
                onClick={open}
                title="Use Shared Data via Defined Data Element"
                disabled={!dataElements.length}
                tabIndex={-1}
              >
                <div className="service-execution-editor__test-data__generate-btn__label">
                  <div className="service-execution-editor__test-data__generate-btn__label__title">
                    Shared Data
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {storeTestDataState.dataElementModal && (
          <SharedDataElementModal
            isReadOnly={false}
            editorStore={storeTestDataState.editorStore}
            close={close}
            filterBy={filter}
            handler={sharedDataHandler}
          />
        )}
        <EmbeddedDataEditor
          isReadOnly={isReadOnly}
          embeddedDataEditorState={storeTestDataState.embeddedEditorState}
        />
      </div>
    );
  },
);

const FunctionTestParameterEditor = observer(
  (props: {
    isReadOnly: boolean;
    paramState: FunctionValueSpecificationTestParameterState;
    functionTestState: FunctionTestState;
    contentTypeParamPair: TestParamContentType | undefined;
  }) => {
    const { functionTestState, paramState, isReadOnly, contentTypeParamPair } =
      props;
    const [showPopUp, setShowPopUp] = useState(false);
    const paramIsRequired =
      paramState.varExpression.multiplicity.lowerBound > 0;
    const type = contentTypeParamPair
      ? contentTypeParamPair.contentType
      : (paramState.varExpression.genericType?.value.rawType.name ?? 'unknown');
    const paramValue =
      paramState.varExpression.genericType?.value.rawType === PrimitiveType.BYTE
        ? atob(
            (paramState.valueSpec as PrimitiveInstanceValue)
              .values[0] as string,
          )
        : ((paramState.valueSpec as PrimitiveInstanceValue)
            .values[0] as string);

    const openInPopUp = (): void => setShowPopUp(!showPopUp);
    const closePopUp = (): void => setShowPopUp(false);
    const updateParamValue = (val: string): void => {
      if (paramState.valueSpec instanceof PrimitiveInstanceValue) {
        instanceValue_setValue(
          paramState.valueSpec,
          paramState.varExpression.genericType?.value.rawType ===
            PrimitiveType.BYTE
            ? btoa(val)
            : val,
          0,
          functionTestState.editorStore.changeDetectionState.observerContext,
        );
        paramState.updateValueSpecification(paramState.valueSpec);
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
        <>
          {contentTypeParamPair ? (
            <div className="service-test-editor__setup__parameter__code-editor">
              <textarea
                className="panel__content__form__section__textarea value-spec-editor__input"
                spellCheck={false}
                value={paramValue}
                placeholder={
                  ((paramState.valueSpec as PrimitiveInstanceValue)
                    .values[0] as string) === ''
                    ? '(empty)'
                    : undefined
                }
                onChange={(event) => {
                  updateParamValue(event.target.value);
                }}
              />
              {showPopUp && (
                <ExternalFormatParameterEditorModal
                  valueSpec={paramState.valueSpec}
                  varExpression={paramState.varExpression}
                  isReadOnly={isReadOnly}
                  onClose={closePopUp}
                  updateParamValue={updateParamValue}
                  contentTypeParamPair={contentTypeParamPair}
                />
              )}
              <div className="service-test-editor__setup__parameter__value__actions">
                <button
                  className={clsx(
                    'service-test-editor__setup__parameter__code-editor__expand-btn',
                  )}
                  onClick={openInPopUp}
                  tabIndex={-1}
                  title="Open in a popup..."
                >
                  <FilledWindowMaximizeIcon />
                </button>
                <button
                  className={clsx(
                    'btn--icon btn--dark btn--sm service-test-editor__setup__parameter__code-editor__expand-btn',
                  )}
                  disabled={isReadOnly || paramIsRequired}
                  onClick={(): void =>
                    functionTestState.removeParamValueState(paramState)
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
                valueSpecification={paramState.valueSpec}
                setValueSpecification={(val: ValueSpecification): void => {
                  paramState.updateValueSpecification(val);
                }}
                graph={functionTestState.editorStore.graphManagerState.graph}
                observerContext={
                  functionTestState.editorStore.changeDetectionState
                    .observerContext
                }
                typeCheckOption={{
                  expectedType:
                    paramState.varExpression.genericType?.value.rawType ??
                    PrimitiveType.STRING,
                }}
                className="query-builder__parameters__value__editor"
                resetValue={(): void => {
                  paramState.resetValueSpec();
                }}
              />
              <div className="service-test-editor__setup__parameter__value__actions">
                <button
                  className="btn--icon btn--dark btn--sm"
                  disabled={isReadOnly || paramIsRequired}
                  onClick={(): void =>
                    functionTestState.removeParamValueState(paramState)
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
        </>
      </div>
    );
  },
);

const NewParameterModal = observer(
  (props: { functionTestState: FunctionTestState; isReadOnly: boolean }) => {
    const { functionTestState, isReadOnly } = props;
    const applicationStore = functionTestState.editorStore.applicationStore;
    const currentOption = {
      value: functionTestState.newParameterValueName,
      label: functionTestState.newParameterValueName,
    };
    const options = functionTestState.newParamOptions;
    const closeModal = (): void =>
      functionTestState.setShowNewParameterModal(false);
    const onChange = (val: { label: string; value: string } | null): void => {
      if (val === null) {
        functionTestState.setNewParameterValueName('');
      } else if (val.value !== functionTestState.newParameterValueName) {
        functionTestState.setNewParameterValueName(val.value);
      }
    };
    return (
      <Dialog
        open={functionTestState.showNewParameterModal}
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
            functionTestState.addParameterValue();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">New Test Parameter Value </div>
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

const FunctionTestEditor = observer(
  (props: { functionTestState: FunctionTestState }) => {
    const { functionTestState } = props;
    const selectedTab = functionTestState.selectedTab;
    const addParameter = (): void => {
      functionTestState.setShowNewParameterModal(true);
    };
    const generateParameterValues = (): void => {
      functionTestState.generateTestParameterValues();
    };
    useEffect(() => {
      functionTestState.syncWithQuery();
    }, [functionTestState]);
    return (
      <div className="function-test-editor panel">
        <div className="panel__header">
          <div className="panel__header service-test-editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {Object.values(TESTABLE_TEST_TAB).map((tab) => (
                <div
                  key={tab}
                  onClick={(): void => functionTestState.setSelectedTab(tab)}
                  className={clsx('service-test-editor__tab', {
                    'service-test-editor__tab--active':
                      tab === functionTestState.selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel">
          {selectedTab === TESTABLE_TEST_TAB.ASSERTION &&
            functionTestState.selectedAsertionState && (
              <TestAssertionEditor
                testAssertionState={functionTestState.selectedAsertionState}
              />
            )}
          {selectedTab === TESTABLE_TEST_TAB.SETUP &&
            functionTestState.selectedAsertionState && (
              <>
                <div className="function-test-editor__doc">
                  <div className="panel__content__form__section">
                    <div className="panel__content__form__section__header__label">
                      Test Documentation
                    </div>
                    <textarea
                      className="panel__content__form__section__textarea mapping-testable-editor__doc__textarea"
                      spellCheck={false}
                      value={functionTestState.test.doc ?? ''}
                      onChange={(event) => {
                        atomicTest_setDoc(
                          functionTestState.test,
                          event.target.value ? event.target.value : undefined,
                        );
                      }}
                    />
                  </div>
                </div>

                {Boolean(functionTestState.parameterValueStates.length) && (
                  <div className="service-test-data-editor panel">
                    <div className="service-test-suite-editor__header">
                      <div className="service-test-suite-editor__header__title">
                        <div className="service-test-suite-editor__header__title__label">
                          parameters
                        </div>
                      </div>
                      <div className="panel__header__actions">
                        <button
                          className="panel__header__action service-execution-editor__test-data__generate-btn"
                          onClick={generateParameterValues}
                          disabled={!functionTestState.newParamOptions.length}
                          title="Generate test parameter values"
                          tabIndex={-1}
                        >
                          <div className="service-execution-editor__test-data__generate-btn__label">
                            <RefreshIcon className="service-execution-editor__test-data__generate-btn__label__icon" />
                            <div className="service-execution-editor__test-data__generate-btn__label__title">
                              Generate
                            </div>
                          </div>
                        </button>
                        <button
                          className="panel__header__action"
                          tabIndex={-1}
                          disabled={!functionTestState.newParamOptions.length}
                          onClick={addParameter}
                          title="Add Parameter Value"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    </div>
                    <div className="service-test-editor__setup__parameters">
                      {functionTestState.parameterValueStates
                        .filter(
                          filterByType(
                            FunctionValueSpecificationTestParameterState,
                          ),
                        )
                        .map((paramState) => (
                          <FunctionTestParameterEditor
                            key={paramState.uuid}
                            isReadOnly={false}
                            paramState={paramState}
                            functionTestState={functionTestState}
                            contentTypeParamPair={getContentTypeWithParamFromQuery(
                              functionTestState.functionTestableState
                                .functionEditorState.bodyExpressionSequence,
                              functionTestState.functionTestableState
                                .editorStore,
                            ).find(
                              (pair) =>
                                pair.param === paramState.parameterValue.name,
                            )}
                          />
                        ))}
                    </div>
                    {functionTestState.showNewParameterModal && (
                      <NewParameterModal
                        functionTestState={functionTestState}
                        isReadOnly={false}
                      />
                    )}
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    );
  },
);

const FunctionTestItem = observer(
  (props: {
    suiteState: FunctionTestSuiteState;
    functionTestState: FunctionTestState;
  }) => {
    const { functionTestState, suiteState } = props;
    const functionTest = functionTestState.test;
    const isRunning = functionTestState.runningTestAction.isInProgress;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly =
      suiteState.functionTestableState.functionEditorState.isReadOnly;
    const openTest = (): void => suiteState.changeTest(functionTest);
    const isActive = suiteState.selectTestState?.test === functionTest;
    const _testableResult = getTestableResultFromTestResult(
      functionTestState.testResultState.result,
    );
    const testableResult = isRunning
      ? TESTABLE_RESULT.IN_PROGRESS
      : _testableResult;
    const resultIcon = getTestableResultIcon(testableResult);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const add = (): void => {
      // TODO
    };
    const _delete = (): void => {
      suiteState.deleteTest(functionTest);
    };

    const rename = (): void => {
      suiteState.functionTestableState.setRenameComponent(functionTest);
    };
    const runTest = (): void => {
      flowResult(functionTestState.runTest()).catch(
        functionTestState.editorStore.applicationStore.alertUnhandledError,
      );
    };
    return (
      <ContextMenu
        className={clsx(
          'testable-test-explorer__item',
          {
            'testable-test-explorer__item--selected-from-context-menu':
              !isActive && isSelectedFromContextMenu,
          },
          { 'testable-test-explorer__item--active': isActive },
        )}
        disabled={isReadOnly}
        content={
          <FunctionTestableContextMenu
            addName="Test"
            add={add}
            _delete={_delete}
            rename={rename}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx('testable-test-explorer__item__label')}
          onClick={openTest}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__icon">
            {resultIcon}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {functionTest.id}
          </div>
          <div className="mapping-test-explorer__item__actions">
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={runTest}
              disabled={functionTestState.runningTestAction.isInProgress}
              tabIndex={-1}
              title={`Run ${functionTestState.test.id}`}
            >
              {<PlayIcon />}
            </button>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

const CreateTestModal = observer(
  (props: { functionSuiteState: FunctionTestSuiteState }) => {
    const { functionSuiteState } = props;
    const applicationStore = functionSuiteState.editorStore.applicationStore;
    const suite = functionSuiteState.suite;
    // test name
    const [id, setId] = useState<string | undefined>(undefined);
    const isValid = id && !id.includes(' ');
    const errorMessage = validateTestableId(
      id,
      suite.tests.map((t) => t.id),
    );
    const close = (): void => functionSuiteState.setShowModal(false);
    const create = (): void => {
      if (id) {
        flowResult(functionSuiteState.addNewTest(id))
          .then(() => close())
          .catch(
            functionSuiteState.editorStore.applicationStore.alertUnhandledError,
          );
      }
    };

    return (
      <Dialog
        open={functionSuiteState.showCreateModal}
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
            <ModalTitle title="Create Function Test" />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              name="Name"
              prompt=""
              value={id}
              update={(value: string | undefined): void => setId(value ?? '')}
              errorMessage={errorMessage}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              disabled={!isValid}
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
// ──────────────────────────────────────────────────────────────────────────────
// Add Element Modal
// ──────────────────────────────────────────────────────────────────────────────

const AddDataElementModal = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    const dataState = functionTestSuiteState.dataState;
    const applicationStore =
      functionTestSuiteState.editorStore.applicationStore;
    const options = dataState.availableElementsToAdd.map((e) => ({
      value: e.path,
      label: e.path,
    }));
    const [selectedPath, setSelectedPath] = useState<string | undefined>(
      options[0]?.value,
    );
    const close = (): void => dataState.setShowAddElementModal(false);
    const add = (): void => {
      if (selectedPath) {
        dataState.addDataElement(selectedPath);
        close();
      }
    };
    const onChange = (val: { label: string; value: string } | null): void => {
      setSelectedPath(val?.value);
    };

    return (
      <Dialog
        open={dataState.showAddElementModal}
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

// ──────────────────────────────────────────────────────────────────────────────
// Test Data Editor (left panel) — elements list + per-element data editor
// ──────────────────────────────────────────────────────────────────────────────

const FunctionTestDataPanel = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    const dataState = functionTestSuiteState.dataState;
    const hasTestData = Boolean(dataState.dataHolder.testData?.length);

    const addStoreTestData = (): void => {
      dataState.setShowAddElementModal(true);
    };

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
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addStoreTestData}
                    title="Add Element"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              {!hasTestData ? (
                <div className="service-test-data-editor__warning">
                  <ErrorWarnIcon />
                  <span>Add an element to configure test data</span>
                </div>
              ) : (
                <div>
                  {(dataState.dataHolder.testData ?? []).map((td) => (
                    <div
                      key={td.element.value.path}
                      className={clsx('testable-test-explorer__item', {
                        'testable-test-explorer__item--active':
                          dataState.selectedDataState?.storeTestData === td,
                      })}
                    >
                      <div
                        className="testable-test-explorer__item__label"
                        onClick={(): void => dataState.openStoreTestData(td)}
                        tabIndex={-1}
                      >
                        <div className="testable-test-explorer__item__label__text">
                          <span title={td.element.value.path}>
                            {td.element.value.name}
                          </span>
                        </div>
                        <div className="mapping-test-explorer__item__actions">
                          <button
                            className="mapping-test-explorer__item__action"
                            onClick={(e): void => {
                              e.stopPropagation();
                              dataState.deleteStoreTestData(td);
                            }}
                            tabIndex={-1}
                            title="Delete"
                          >
                            <TimesIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={200}>
              {dataState.selectedDataState ? (
                <FunctionTestDataStateEditor
                  functionTestSuiteState={functionTestSuiteState}
                  storeTestDataState={dataState.selectedDataState}
                />
              ) : (
                <BlankPanelContent>
                  Select an element to configure its test data
                </BlankPanelContent>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {dataState.showAddElementModal && (
          <AddDataElementModal
            functionTestSuiteState={functionTestSuiteState}
          />
        )}
      </div>
    );
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Tests Editor (right panel) — tests list + test detail (assertion/setup)
// ──────────────────────────────────────────────────────────────────────────────

const FunctionTestsPanel = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    const editorStore = functionTestSuiteState.editorStore;
    const isReadOnly =
      functionTestSuiteState.functionTestableState.functionEditorState
        .isReadOnly;
    const selectedTestState = functionTestSuiteState.selectTestState;

    const addTest = (): void => {
      functionTestSuiteState.setShowModal(true);
    };
    const runTests = (): void => {
      flowResult(functionTestSuiteState.runSuite()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };
    const runFailingTests = (): void => {
      flowResult(functionTestSuiteState.runFailingTests()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };

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
                    onClick={runTests}
                    title="Run All Tests"
                  >
                    <RunAllIcon />
                  </button>
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runFailingTests}
                    title="Run All Failing Tests"
                  >
                    <RunErrorsIcon />
                  </button>
                  {!isReadOnly && (
                    <button
                      className="panel__header__action"
                      tabIndex={-1}
                      onClick={addTest}
                      title="Add Function Test"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
              </div>
              <div>
                {functionTestSuiteState.testStates.map((test) => (
                  <FunctionTestItem
                    key={test.uuid}
                    functionTestState={test}
                    suiteState={functionTestSuiteState}
                  />
                ))}
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              {selectedTestState ? (
                <FunctionTestEditor functionTestState={selectedTestState} />
              ) : (
                <BlankPanelPlaceholder
                  text="Select a test"
                  tooltipText="Select a test from the list above"
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {functionTestSuiteState.showCreateModal && (
          <CreateTestModal functionSuiteState={functionTestSuiteState} />
        )}
      </div>
    );
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Suite Editor — horizontal split: test data (left) + tests (right)
// ──────────────────────────────────────────────────────────────────────────────

const FunctionTestSuiteEditor = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    return (
      <div className="service-test-suite-editor">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={300} minSize={28}>
            <FunctionTestDataPanel
              functionTestSuiteState={functionTestSuiteState}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={56}>
            <FunctionTestsPanel
              functionTestSuiteState={functionTestSuiteState}
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
      suite: FunctionTestSuite;
      functionTestableState: FunctionTestableState;
    }
  >(function SuiteHeaderTabContextMenu(props, ref) {
    const { suite, functionTestableState } = props;
    const deleteSuite = (): void => {
      functionTestableState.deleteTestSuite(suite);
    };
    const rename = (): void => {
      functionTestableState.setRenameComponent(suite);
    };
    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={rename}>Rename</MenuContentItem>
        <MenuContentItem onClick={deleteSuite}>Delete</MenuContentItem>
      </MenuContent>
    );
  }),
);

// ──────────────────────────────────────────────────────────────────────────────
// Create Suite Modal
// ──────────────────────────────────────────────────────────────────────────────

const CreateFunctionTestSuiteModal = observer(
  (props: { functionTestableEditorState: FunctionTestableState }) => {
    const { functionTestableEditorState } = props;
    const applicationStore =
      functionTestableEditorState.editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);
    const handleEnter = (): void => inputRef.current?.focus();
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const isValid = suiteName && testName;

    const close = (): void => functionTestableEditorState.setCreateSuite(false);
    const create = (): void => {
      if (suiteName && testName) {
        flowResult(
          functionTestableEditorState.createSuite(suiteName, testName),
        ).catch(
          functionTestableEditorState.editorStore.applicationStore
            .alertUnhandledError,
        );
      }
    };
    return (
      <Dialog
        open={true}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          transition: {
            onEnter: handleEnter,
          },
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
            <ModalTitle title="Create Function Test Suite" />
          </ModalHeader>
          <ModalBody>
            <PanelFormTextField
              ref={inputRef}
              name="Test Suite Name"
              prompt="Unique Identifier for Test suite i.e Person_suite"
              value={suiteName}
              placeholder="Suite Name"
              update={(value: string | undefined): void =>
                setSuiteName(value ?? '')
              }
              errorMessage={validateTestableId(suiteName, undefined)}
            />
            <PanelFormTextField
              name="Test Name"
              prompt="Unique Identifier for first test in suite"
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

// ──────────────────────────────────────────────────────────────────────────────
// Main Testing Tab — suite tabs at top, suite editor below
// ──────────────────────────────────────────────────────────────────────────────

export const FunctionTestableEditor = observer(
  (props: { functionTestableState: FunctionTestableState }) => {
    const { functionTestableState } = props;
    const suites = functionTestableState.function.tests;
    const functionEditorState = functionTestableState.functionEditorState;
    const isReadOnly = functionEditorState.isReadOnly;
    const selectedSuiteState = functionTestableState.selectedTestSuite;

    useEffect(() => {
      functionTestableState.init();
    }, [functionTestableState]);

    const addSuite = (): void => {
      functionTestableState.setCreateSuite(true);
    };

    const changeSuite = (suite: FunctionTestSuite): void => {
      functionTestableState.changeSuite(suite);
    };

    const runSuites = (): void => {
      functionTestableState.runTestable();
    };

    const renameTestingComponent = (val: string): void => {
      functionTestableState.renameTestableComponent(val);
    };

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.FUNCTION_EDITOR_TEST,
    );

    return (
      <Panel className="service-test-suite-editor">
        {functionTestableState.createSuiteModal && (
          <CreateFunctionTestSuiteModal
            functionTestableEditorState={functionTestableState}
          />
        )}

        <PanelHeader>
          {suites.length ? (
            <PanelHeader className="service-test-suite-editor__header service-test-suite-editor__header--with-tabs">
              <div className="uml-element-editor__tabs">
                {suites.map((suite) => (
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
                          functionTestableState={functionTestableState}
                          suite={suite}
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
            <PanelHeaderActionItem onClick={runSuites} title="Run All Suites">
              <RunAllIcon />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem onClick={addSuite} title="Add Test Suite">
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <Panel className="service-test-suite-editor">
          {selectedSuiteState && (
            <FunctionTestSuiteEditor
              functionTestSuiteState={selectedSuiteState}
            />
          )}
          {!suites.length && (
            <BlankPanelPlaceholder
              text="Add Test Suite"
              onClick={addSuite}
              clickActionType="add"
              tooltipText="Click to add test suite"
            />
          )}
          {functionTestableState.testableComponentToRename && (
            <RenameModal
              val={functionTestableState.testableComponentToRename.id}
              isReadOnly={isReadOnly}
              showModal={true}
              closeModal={(): void =>
                functionTestableState.setRenameComponent(undefined)
              }
              setValue={(val: string): void => renameTestingComponent(val)}
              errorMessageFunc={(_val: string | undefined) =>
                validateTestableId(_val, undefined)
              }
            />
          )}
        </Panel>
      </Panel>
    );
  },
);
