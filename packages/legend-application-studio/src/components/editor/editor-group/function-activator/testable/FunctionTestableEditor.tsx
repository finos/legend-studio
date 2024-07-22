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
  ContextMenu,
  CustomSelectorInput,
  Dialog,
  FilledWindowMaximizeIcon,
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
  getTestableResultFromTestResults,
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

const FunctionTestSuiteItem = observer(
  (props: {
    suite: FunctionTestSuite;
    functionTestableState: FunctionTestableState;
  }) => {
    const { suite, functionTestableState } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly = functionTestableState.functionEditorState.isReadOnly;
    const openSuite = (): void => functionTestableState.changeSuite(suite);
    const results = functionTestableState.testableResults?.filter(
      (t) => t.parentSuite?.id === suite.id,
    );
    const isRunning =
      functionTestableState.isRunningTestableSuitesState.isInProgress ||
      (functionTestableState.isRunningFailingSuitesState.isInProgress &&
        functionTestableState.failingSuites.includes(suite)) ||
      functionTestableState.runningSuite === suite;
    const isActive = functionTestableState.selectedTestSuite?.suite === suite;
    const _testableResult = getTestableResultFromTestResults(results);
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
      functionTestableState.deleteTestSuite(suite);
    };
    const rename = (): void => {
      functionTestableState.setRenameComponent(suite);
    };
    const runSuite = (): void => {
      flowResult(functionTestableState.runSuite(suite)).catch(
        functionTestableState.editorStore.applicationStore.alertUnhandledError,
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
            addName="Suite"
            add={add}
            _delete={_delete}
            rename={rename}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <button
          className={clsx('testable-test-explorer__item__label')}
          onClick={openSuite}
          tabIndex={-1}
        >
          <div className="testable-test-explorer__item__label__icon">
            {resultIcon}
          </div>
          <div className="testable-test-explorer__item__label__text">
            {suite.id}
          </div>
          <div className="mapping-test-explorer__item__actions">
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={runSuite}
              disabled={isRunning}
              tabIndex={-1}
              title={`Run ${suite.id}`}
            >
              {<PlayIcon />}
            </button>
          </div>
        </button>
      </ContextMenu>
    );
  },
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
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
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
            disable={isReadOnly}
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
        <button
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
        </button>
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
        functionSuiteState.addNewTest(id);
        close();
      }
    };

    return (
      <Dialog
        open={functionSuiteState.showCreateModal}
        onClose={close}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
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
const FunctionTestSuiteEditorInner = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    const editorStore = functionTestSuiteState.editorStore;
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
    const renderFunctionTestEditor = (): React.ReactNode => {
      if (selectedTestState) {
        return <FunctionTestEditor functionTestState={selectedTestState} />;
      } else if (!functionTestSuiteState.suite.tests.length) {
        return (
          <BlankPanelPlaceholder
            text="Add Function Test"
            onClick={addTest}
            clickActionType="add"
            tooltipText="Click to add function test"
          />
        );
      }
      return null;
    };

    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={200} minSize={28}>
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
              <button
                className="panel__header__action"
                tabIndex={-1}
                onClick={addTest}
                title="Add Function Test"
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <PanelContent>
            {functionTestSuiteState.testStates.map((test) => (
              <FunctionTestItem
                key={test.uuid}
                functionTestState={test}
                suiteState={functionTestSuiteState}
              />
            ))}
            {functionTestSuiteState.showCreateModal && (
              <CreateTestModal functionSuiteState={functionTestSuiteState} />
            )}
          </PanelContent>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={28}>
          {renderFunctionTestEditor()}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const FunctionTestSuiteEditor = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    const dataState = functionTestSuiteState.dataState;
    const addStoreTestData = (): void => {
      // TODO
    };

    if (!functionTestSuiteState.functionTestableState.containsRuntime) {
      return (
        <FunctionTestSuiteEditorInner
          functionTestSuiteState={functionTestSuiteState}
        />
      );
    }
    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel size={300} minSize={28}>
          <div className="service-test-data-editor panel">
            {functionTestSuiteState.dataState.dataHolder.testData?.length ? (
              <>
                {dataState.selectedDataState && (
                  <FunctionTestDataStateEditor
                    functionTestSuiteState={functionTestSuiteState}
                    storeTestDataState={dataState.selectedDataState}
                  />
                )}
              </>
            ) : (
              <BlankPanelPlaceholder
                text="Add Store Test Data"
                onClick={addStoreTestData}
                clickActionType="add"
                tooltipText="Click to add store test data"
              />
            )}
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={56}>
          {
            <FunctionTestSuiteEditorInner
              functionTestSuiteState={functionTestSuiteState}
            />
          }
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

const CreateFucntionTestSuiteModal = observer(
  (props: { functionTestableEditorState: FunctionTestableState }) => {
    const { functionTestableEditorState } = props;
    const applicationStore =
      functionTestableEditorState.editorStore.applicationStore;
    const inputRef = useRef<HTMLInputElement>(null);
    const handleEnter = (): void => inputRef.current?.focus();
    const [suiteName, setSuiteName] = useState<string | undefined>(undefined);
    const [testName, setTestName] = useState<string | undefined>(undefined);
    const isValid = suiteName && testName;

    // model
    const close = (): void => functionTestableEditorState.setCreateSuite(false);
    const create = (): void => {
      if (suiteName && testName) {
        functionTestableEditorState.createSuite(suiteName, testName);
      }
    };
    return (
      <Dialog
        open={true}
        onClose={close}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader>
            <ModalTitle title="Create Mapping Test Suite" />
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

export const FunctionTestableEditor = observer(
  (props: { functionTestableState: FunctionTestableState }) => {
    const { functionTestableState } = props;
    const suites = functionTestableState.function.tests;
    const functionEditorState = functionTestableState.functionEditorState;
    const isReadOnly = functionEditorState.isReadOnly;
    const selectedSuiteState = functionTestableState.selectedTestSuite;
    // use effect
    useEffect(() => {
      functionTestableState.init();
    }, [functionTestableState]);

    const runSuites = (): void => {
      functionTestableState.runTestable();
    };

    const runFailingTests = (): void => {
      functionTestableState.runAllFailingSuites();
    };
    const addSuite = (): void => {
      functionTestableState.setCreateSuite(true);
    };

    const renderSuiteState = (): React.ReactNode => {
      if (selectedSuiteState) {
        return (
          <FunctionTestSuiteEditor
            functionTestSuiteState={selectedSuiteState}
          />
        );
      } else if (!suites.length) {
        return (
          <BlankPanelPlaceholder
            text="Add Test Suite"
            onClick={addSuite}
            clickActionType="add"
            tooltipText="Click to add test suite"
          />
        );
      }
      return null;
    };

    const renameTestingComponent = (val: string): void => {
      functionTestableState.renameTestableComponent(val);
    };
    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.FUNCTION_EDITOR_TEST,
    );

    return (
      <div className="function-testable-editor panel">
        <div className="function-testable-editor">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={200} minSize={28}>
              <div className="binding-editor__header">
                <div className="binding-editor__header__title">
                  <div className="panel__header__title__content">
                    Test Suites
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action testable-test-explorer__play__all__icon"
                    tabIndex={-1}
                    onClick={runSuites}
                    title="Run All Suites"
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
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={addSuite}
                    title="Add Function Suite"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <PanelContent>
                {suites.map((suite) => (
                  <FunctionTestSuiteItem
                    key={suite.id}
                    functionTestableState={functionTestableState}
                    suite={suite}
                  />
                ))}
                {!suites.length && (
                  <BlankPanelPlaceholder
                    text="Add Test Suite"
                    onClick={addSuite}
                    clickActionType="add"
                    tooltipText="Click to add test suite"
                  />
                )}
                {!suites.length && (
                  <BlankPanelPlaceholder
                    disabled={functionEditorState.isReadOnly}
                    onClick={addSuite}
                    text="Add a Test Suite"
                    clickActionType="add"
                    tooltipText="Click to add a new function test suite"
                  />
                )}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div className="function-test-suite-editor">
                <div className="function-test-suite-editor__content">
                  {renderSuiteState()}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          {functionTestableState.createSuiteModal && (
            <CreateFucntionTestSuiteModal
              functionTestableEditorState={functionTestableState}
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
        </div>
      </div>
    );
  },
);
