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
  MenuContent,
  MenuContentItem,
  PanelContent,
  PlayIcon,
  PlusIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  RunAllIcon,
  RunErrorsIcon,
  clsx,
} from '@finos/legend-art';
import { forwardRef, useEffect, useState } from 'react';
import {
  type FunctionTestSuite,
  type DataElement,
  type EmbeddedData,
  DataElementReference,
  PackageableElementExplicitReference,
  RelationalCSVData,
  ModelStoreData,
  ExternalFormatData,
  ModelEmbeddedData,
} from '@finos/legend-graph';
import type {
  FunctionStoreTestDataState,
  FunctionTestState,
  FunctionTestSuiteState,
  FunctionTestableState,
} from '../../../../../stores/editor/editor-state/element-editor-state/function-activator/testable/FunctionTestableState.js';
import {
  TESTABLE_RESULT,
  getTestableResultFromTestResult,
  getTestableResultFromTestResults,
} from '../../../../../stores/editor/sidebar-state/testable/GlobalTestRunnerState.js';
import { flowResult } from 'mobx';
import { getTestableResultIcon } from '../../../side-bar/testable/GlobalTestRunner.js';
import { atomicTest_setDoc } from '../../../../../stores/graph-modifier/Testable_GraphModifierHelper.js';
import {
  RenameModal,
  SharedDataElementModal,
  TestAssertionEditor,
} from '../../testable/TestableSharedComponents.js';
import { returnUndefOnError } from '@finos/legend-shared';
import {
  EmbeddedDataCreatorFromEmbeddedData,
  validateTestableId,
} from '../../../../../stores/editor/utils/TestableUtils.js';
import { EmbeddedDataEditor } from '../../data-editor/EmbeddedDataEditor.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useApplicationNavigationContext } from '@finos/legend-application';

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
        <div className="service-test-suite-editor__header">
          <div className="service-test-suite-editor__header__title">
            <div className="service-test-suite-editor__header__title__label">
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

const FunctionTestEditor = observer(
  (props: { functionTestState: FunctionTestState }) => {
    const { functionTestState } = props;
    const mappingTest = functionTestState.test;
    return (
      <div className="service-test-editor panel">
        <div className="panel mapping-testable-editor">
          <div className="mapping-testable-editor__content">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel size={120}>
                <div className="service-test-data-editor panel">
                  <div className="service-test-editor__setup__configuration">
                    <div className="panel__content__form__section">
                      <div className="panel__content__form__section__header__label">
                        Test Documentation
                      </div>
                      <textarea
                        className="panel__content__form__section__textarea mapping-testable-editor__doc__textarea"
                        spellCheck={false}
                        value={mappingTest.doc ?? ''}
                        onChange={(event) => {
                          atomicTest_setDoc(
                            mappingTest,
                            event.target.value ? event.target.value : undefined,
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                {functionTestState.selectedAsertionState && (
                  <TestAssertionEditor
                    testAssertionState={functionTestState.selectedAsertionState}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
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
    const mappingTest = functionTestState.test;
    const isRunning = functionTestState.runningTestAction.isInProgress;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const isReadOnly =
      suiteState.functionTestableState.functionEditorState.isReadOnly;
    const openTest = (): void => suiteState.changeTest(mappingTest);
    const isActive = suiteState.selectTestState?.test === mappingTest;
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
      suiteState.deleteTest(mappingTest);
    };

    const rename = (): void => {
      // suiteState.mappingTestableState.setRenameComponent(mappingTest);
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
            {mappingTest.id}
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

const FunctionTestSuiteEditor = observer(
  (props: { functionTestSuiteState: FunctionTestSuiteState }) => {
    const { functionTestSuiteState } = props;
    const dataState = functionTestSuiteState.dataState;
    const editorStore = functionTestSuiteState.editorStore;
    const selectedTestState = functionTestSuiteState.selectTestState;
    const addTest = (): void => {
      // TODO
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

    const addStoreTestData = (): void => {
      // mappingTestableDataState.setShowModal(true);
    };

    const renderMappingTestEditor = (): React.ReactNode => {
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
            {/* {mappingTestableDataState.showNewModal && (
              <CreateStoreTestDataModal mappingTestState={mappingTestState} />
            )} */}
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel minSize={56}>
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
                    title="Add Mapping Test"
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
                {/* {mappingTestSuiteState.showCreateModal && (
                  <CreateTestModal mappingSuiteState={mappingTestSuiteState} />
                )} */}
              </PanelContent>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={28}>
              {renderMappingTestEditor()}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
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
      // TODO
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
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MAPPING_EDITOR_TEST,
    );

    return (
      <div className="service-test-suite-editor panel">
        <div className="service-test-suite-editor">
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
              </PanelContent>
              {!suites.length && (
                <BlankPanelPlaceholder
                  disabled={functionEditorState.isReadOnly}
                  onClick={addSuite}
                  text="Add a Test Suite"
                  clickActionType="add"
                  tooltipText="Click to add a new function test suite"
                />
              )}
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel minSize={56}>
              <div className="panel mapping-testable-editorr">
                <div className="mapping-testable-editor__content">
                  {renderSuiteState()}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          {/* {mappingTestableState.createSuiteState && (
            <CreateTestSuiteModal
              creatorState={mappingTestableState.createSuiteState}
            />
          )} */}
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
