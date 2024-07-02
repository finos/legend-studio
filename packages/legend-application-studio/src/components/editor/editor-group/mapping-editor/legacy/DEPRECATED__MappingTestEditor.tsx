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

import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type DEPRECATED__MappingTestState as DEPRECATED__MappingTestState,
  MAPPING_TEST_EDITOR_TAB_TYPE,
  TEST_RESULT,
  MappingTestObjectInputDataState,
  MappingTestFlatDataInputDataState,
  MappingTestExpectedOutputAssertionState,
  MappingTestRelationalInputDataState,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/legacy/DEPRECATED__MappingTestState.js';
import {
  clsx,
  PanelLoadingIndicator,
  BlankPanelPlaceholder,
  PlayIcon,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  ErrorIcon,
  RefreshIcon,
  WrenchIcon,
  PauseCircleIcon,
  PanelDropZone,
  PencilIcon,
  PanelContent,
} from '@finos/legend-art';
import { useDrop } from 'react-dnd';
import {
  type MappingElementDragSource,
  CORE_DND_TYPE,
} from '../../../../../stores/editor/utils/DnDUtils.js';
import {
  IllegalStateError,
  guaranteeType,
  tryToFormatLosslessJSONString,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  useApplicationStore,
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  ClassMappingSelectorModal,
  getRelationalInputTestDataEditorLanguage,
} from '../MappingExecutionBuilder.js';
import { flowResult } from 'mobx';
import { MappingTestStatusIndicator } from '../MappingTestsExplorer.js';
import {
  getMappingElementSource,
  getMappingElementTarget,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import {
  Class,
  SetImplementation,
  OperationSetImplementation,
  RelationalInputType,
  stub_RawLambda,
  isStubbed_RawLambda,
  DEPRECATED__validate_MappingTestAssert,
} from '@finos/legend-graph';
import { flatData_setData } from '../../../../../stores/graph-modifier/STO_FlatData_GraphModifierHelper.js';
import {
  relationalInputData_setData,
  relationalInputData_setInputType,
} from '../../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';
import {
  type QueryBuilderState,
  QueryBuilderTextEditorMode,
  ExecutionPlanViewer,
} from '@finos/legend-query-builder';
import { MappingExecutionQueryBuilderState } from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingExecutionQueryBuilderState.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
  JSONDiffView,
} from '@finos/legend-lego/code-editor';

const MappingTestQueryEditor = observer(
  (props: { testState: DEPRECATED__MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const queryState = testState.queryState;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    // actions
    const editWithQueryBuilder = (openInTextMode = false): (() => void) =>
      applicationStore.guardUnhandledError(async () => {
        const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
        await flowResult(
          embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
            setupQueryBuilderState: (): QueryBuilderState => {
              const queryBuilderState = new MappingExecutionQueryBuilderState(
                embeddedQueryBuilderState.editorStore.applicationStore,
                embeddedQueryBuilderState.editorStore.graphManagerState,
                testState.mappingEditorState.mapping,
                editorStore.applicationStore.config.options.queryBuilderConfig,
                editorStore.editorMode.getSourceInfo(),
              );
              queryBuilderState.initializeWithQuery(testState.queryState.query);
              if (openInTextMode) {
                queryBuilderState.textEditorState.openModal(
                  QueryBuilderTextEditorMode.TEXT,
                );
              }
              return queryBuilderState;
            },
            actionConfigs: [
              {
                key: 'save-query-btn',
                renderer: (
                  queryBuilderState: QueryBuilderState,
                ): React.ReactNode => {
                  const save = applicationStore.guardUnhandledError(
                    async (): Promise<void> => {
                      try {
                        const rawLambda = queryBuilderState.buildQuery();
                        await flowResult(
                          testState.queryState.updateLamba(rawLambda),
                        );
                        applicationStore.notificationService.notifySuccess(
                          `Mapping test query is updated`,
                        );
                        embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
                          undefined,
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        applicationStore.notificationService.notifyError(
                          `Can't save query: ${error.message}`,
                        );
                      }
                    },
                  );
                  return (
                    <button
                      className="query-builder__dialog__header__custom-action"
                      tabIndex={-1}
                      disabled={isReadOnly}
                      onClick={save}
                    >
                      Save Query
                    </button>
                  );
                },
              },
            ],
            disableCompile: isStubbed_RawLambda(testState.queryState.query),
          }),
        );
      });

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        // do all the necessary updates
        flowResult(
          queryState.updateLamba(
            setImplementation
              ? editorStore.graphManagerState.graphManager.createGetAllRawLambda(
                  guaranteeType(
                    getMappingElementTarget(setImplementation),
                    Class,
                  ),
                )
              : stub_RawLambda(),
          ),
        ).catch(applicationStore.alertUnhandledError);
        hideClassMappingSelectorModal();

        // Attempt to generate data for input data panel as we pick the class mapping
        if (setImplementation) {
          applicationStore.alertService.setActionAlertInfo({
            message: 'Mapping test input data is already set',
            prompt: 'Do you want to regenerate the input data?',
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'Regenerate',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void =>
                  testState.setInputDataStateBasedOnSource(
                    getMappingElementSource(
                      setImplementation,
                      editorStore.pluginManager.getApplicationPlugins(),
                    ),
                    true,
                  ),
              },
              {
                label: 'Keep my input data',
                type: ActionAlertActionType.PROCEED,
                default: true,
              },
            ],
          });
        }
      },
      [applicationStore, editorStore, testState, queryState],
    );

    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingElementDragSource): void => {
        changeClassMapping(guaranteeType(item.data, SetImplementation));
      },
      [changeClassMapping],
    );
    const [{ isDragOver, canDrop }, dropRef] = useDrop<
      MappingElementDragSource,
      void,
      { isDragOver: boolean; canDrop: boolean }
    >(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );

    const clearQuery = applicationStore.guardUnhandledError(() =>
      flowResult(testState.queryState.updateLamba(stub_RawLambda())),
    );

    return (
      <div className="panel mapping-test-editor__query-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
            <div className="btn__dropdown-combo">
              <button
                className="btn__dropdown-combo__label"
                onClick={editWithQueryBuilder()}
                title="Edit Query"
                tabIndex={-1}
              >
                <PencilIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">
                  Edit Query
                </div>
              </button>
              <ControlledDropdownMenu
                className="btn__dropdown-combo__dropdown-btn"
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={editWithQueryBuilder(true)}
                    >
                      Text Mode
                    </MenuContentItem>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={clearQuery}
                    >
                      Clear Query
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <CaretDownIcon />
              </ControlledDropdownMenu>
            </div>
          </div>
        </div>
        {!isStubbed_RawLambda(queryState.query) && (
          <PanelContent>
            <div className="mapping-test-editor__query-panel__query">
              <CodeEditor
                inputValue={queryState.lambdaString}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
                hideMinimap={true}
              />
            </div>
          </PanelContent>
        )}
        {isStubbed_RawLambda(queryState.query) && (
          <PanelContent>
            <PanelDropZone
              dropTargetConnector={dropRef}
              isDragOver={isDragOver}
            >
              <BlankPanelPlaceholder
                text="Choose a class mapping"
                onClick={showClassMappingSelectorModal}
                clickActionType="add"
                tooltipText="Drop a class mapping, or click to choose one to start building the query"
                isDropZoneActive={canDrop}
                disabled={isReadOnly}
              />
            </PanelDropZone>
          </PanelContent>
        )}
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={testState.mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
          />
        )}
      </div>
    );
  },
);

export const DEPRECATED__MappingTestObjectInputDataBuilder = observer(
  (props: {
    inputDataState: MappingTestObjectInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    // TODO?: handle XML/type

    // Input data
    const updateInput = (val: string): void => inputDataState.setData(val);

    return (
      <div className="panel__content mapping-test-editor__input-data-panel__content">
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.JSON}
          inputValue={inputDataState.data}
          isReadOnly={isReadOnly}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

export const DEPRECATED__MappingTestFlatDataInputDataBuilder = observer(
  (props: {
    inputDataState: MappingTestFlatDataInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    // Input data
    const updateInput = (val: string): void =>
      flatData_setData(inputDataState.inputData, val);

    return (
      <div className="panel__content mapping-test-editor__input-data-panel__content">
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={inputDataState.inputData.data}
          isReadOnly={isReadOnly}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

/**
 * Right now, we always default this to use Local H2 connection.
 */
export const DEPRECATED__MappingTestRelationalInputDataBuilder = observer(
  (props: {
    inputDataState: MappingTestRelationalInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    // Input data
    const updateInput = (val: string): void =>
      relationalInputData_setData(inputDataState.inputData, val);

    return (
      <div className="panel__content mapping-test-editor__input-data-panel__content">
        <CodeEditor
          language={getRelationalInputTestDataEditorLanguage(
            inputDataState.inputData.inputType,
          )}
          inputValue={inputDataState.inputData.data}
          isReadOnly={isReadOnly}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

const RelationalMappingTestInputDataTypeSelector = observer(
  (props: {
    inputDataState: MappingTestRelationalInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    const changeInputType =
      (val: string): (() => void) =>
      (): void => {
        relationalInputData_setInputType(inputDataState.inputData, val);
      };
    return (
      <ControlledDropdownMenu
        className="mapping-test-editor__input-data-panel__type-selector"
        title="Choose input data type..."
        disabled={isReadOnly}
        content={
          <MenuContent>
            {Object.keys(RelationalInputType).map((mode) => (
              <MenuContentItem
                key={mode}
                className="mapping-test-editor__input-data-panel__type-selector__option"
                onClick={changeInputType(mode)}
              >
                {mode}
              </MenuContentItem>
            ))}
          </MenuContent>
        }
      >
        <div className="mapping-test-editor__input-data-panel__type-selector__value">
          <div className="mapping-test-editor__input-data-panel__type-selector__value__label">
            {inputDataState.inputData.inputType}
          </div>
          <CaretDownIcon />
        </div>
      </ControlledDropdownMenu>
    );
  },
);

export const DEPRECATED__MappingTestInputDataBuilder = observer(
  (props: { testState: DEPRECATED__MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const inputDataState = testState.inputDataState;
    const editorStore = useEditorStore();

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        testState.setInputDataStateBasedOnSource(
          setImplementation
            ? getMappingElementSource(
                setImplementation,
                editorStore.pluginManager.getApplicationPlugins(),
              )
            : undefined,
          true,
        );
        hideClassMappingSelectorModal();
      },
      [testState, editorStore],
    );
    const classMappingFilterFn = (setImp: SetImplementation): boolean =>
      !(setImp instanceof OperationSetImplementation);

    // input data builder
    let inputDataBuilder: React.ReactNode;
    if (inputDataState instanceof MappingTestObjectInputDataState) {
      inputDataBuilder = (
        <DEPRECATED__MappingTestObjectInputDataBuilder
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else if (inputDataState instanceof MappingTestFlatDataInputDataState) {
      inputDataBuilder = (
        <DEPRECATED__MappingTestFlatDataInputDataBuilder
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else if (inputDataState instanceof MappingTestRelationalInputDataState) {
      inputDataBuilder = (
        <DEPRECATED__MappingTestRelationalInputDataBuilder
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else {
      inputDataBuilder = null;
    }

    // input type
    let inputTypeSelector: React.ReactNode;
    if (inputDataState instanceof MappingTestRelationalInputDataState) {
      inputTypeSelector = (
        <RelationalMappingTestInputDataTypeSelector
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else {
      inputTypeSelector = null;
    }

    return (
      <div className="panel mapping-test-editor__input-data-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">input data</div>
          </div>
          <div className="panel__header__actions">
            {inputTypeSelector}
            <button
              className="panel__header__action"
              tabIndex={-1}
              disabled={isReadOnly}
              onClick={showClassMappingSelectorModal}
              title="Regenerate..."
            >
              <RefreshIcon className="mapping-test-editor__icon--refresh" />
            </button>
          </div>
        </div>
        {inputDataBuilder}
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={testState.mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
            classMappingFilterFn={classMappingFilterFn}
          />
        )}
      </div>
    );
  },
);

export const DEPRECATED__MappingTestExpectedOutputAssertionBuilder = observer(
  (props: {
    testState: DEPRECATED__MappingTestState;
    assertionState: MappingTestExpectedOutputAssertionState;
    isReadOnly: boolean;
  }) => {
    const { testState, assertionState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const validationResult = DEPRECATED__validate_MappingTestAssert(
      testState.test,
    );
    const isValid = !validationResult;
    // Expected Result
    const updateExpectedResult = (val: string): void => {
      assertionState.setExpectedResult(val);
      testState.updateAssertion();
    };
    const formatExpectedResultJSONString = (): void =>
      assertionState.setExpectedResult(
        tryToFormatLosslessJSONString(assertionState.expectedResult),
      );
    // Actions
    const regenerateExpectedResult = applicationStore.guardUnhandledError(() =>
      flowResult(testState.regenerateExpectedResult()),
    );

    return (
      <div className="panel mapping-test-editor__result-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">expected</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={testState.isExecutingTest || isReadOnly}
              onClick={regenerateExpectedResult}
              tabIndex={-1}
              title="Regenerate Result"
            >
              <RefreshIcon className="mapping-test-editor__icon__regenerate-result" />
            </button>
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              tabIndex={-1}
              onClick={formatExpectedResultJSONString}
              title="Format JSON"
            >
              <WrenchIcon />
            </button>
          </div>
        </div>
        <div
          className={clsx(
            'panel__content mapping-test-editor__text-editor mapping-test-editor__result-panel__content',
            { 'panel__content--has-validation-error': !isValid },
          )}
        >
          {!isValid && (
            <div
              className="panel__content__validation-error"
              title={validationResult.messages.join('\n')}
            >
              <ErrorIcon />
            </div>
          )}
          <CodeEditor
            inputValue={assertionState.expectedResult}
            updateInput={updateExpectedResult}
            isReadOnly={isReadOnly}
            language={CODE_EDITOR_LANGUAGE.JSON}
          />
        </div>
      </div>
    );
  },
);

export const DEPRECATED__MappingTestAssertionBuilder = observer(
  (props: { testState: DEPRECATED__MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const assertionState = testState.assertionState;

    if (assertionState instanceof MappingTestExpectedOutputAssertionState) {
      return (
        <DEPRECATED__MappingTestExpectedOutputAssertionBuilder
          testState={testState}
          assertionState={assertionState}
          isReadOnly={isReadOnly}
        />
      );
    }
    return null;
  },
);

export const DEPRECATED__MappingTestBuilder = observer(
  (props: { testState: DEPRECATED__MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = useApplicationStore();

    // In case we switch out to another tab to do editing on some class, we want to refresh the test state data so that we can detect problem in deep fetch tree
    useEffect(() => {
      flowResult(testState.onTestStateOpen()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, testState]);

    return (
      <div className="mapping-test-editor">
        <PanelLoadingIndicator isLoading={testState.isExecutingTest} />
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={250} minSize={28}>
            {/* use UUID key to make sure these components refresh when we change the state */}
            <MappingTestQueryEditor
              key={testState.queryState.uuid}
              testState={testState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-50)" />
          </ResizablePanelSplitter>
          <ResizablePanel size={250} minSize={28}>
            {/* use UUID key to make sure these components refresh when we change the state */}
            <DEPRECATED__MappingTestInputDataBuilder
              key={testState.inputDataState.uuid}
              testState={testState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-50)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={28}>
            <DEPRECATED__MappingTestAssertionBuilder
              key={testState.assertionState.uuid}
              testState={testState}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const DEPRECATED__MappingTestEditor = observer(
  (props: { testState: DEPRECATED__MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const selectedTab = testState.selectedTab;
    const changeTab =
      (tab: MAPPING_TEST_EDITOR_TAB_TYPE): (() => void) =>
      (): void =>
        testState.setSelectedTab(tab);
    // execute
    const runTest = applicationStore.guardUnhandledError(() =>
      flowResult(testState.runTest()),
    );

    const cancelTest = applicationStore.guardUnhandledError(() =>
      flowResult(testState.cancelTest()),
    );

    const executionPlanState = testState.executionPlanState;
    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(testState.generatePlan(false)),
    );
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(testState.generatePlan(true)),
    );
    // Test Result
    let testResult = '';
    switch (testState.result) {
      case TEST_RESULT.NONE:
        testResult = 'Test did not run';
        break;
      case TEST_RESULT.FAILED:
        testResult = `Test failed in ${testState.runTime}ms, see comparison (expected <-> actual) below:`;
        break;
      case TEST_RESULT.PASSED:
        testResult = `Test passed in ${testState.runTime}ms`;
        break;
      case TEST_RESULT.ERROR:
        testResult = `Test failed in ${testState.runTime}ms due to error:\n${
          testState.errorRunningTest?.message ?? '(unknown)'
        }`;
        break;
      default:
        throw new IllegalStateError('Unknown test result state');
    }
    testResult = testState.isRunningTest ? 'Running test...' : testResult;

    return (
      <div className="mapping-test-editor">
        <div className="mapping-test-editor__header">
          <div className="mapping-test-editor__header__tabs">
            {Object.values(MAPPING_TEST_EDITOR_TAB_TYPE).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('mapping-test-editor__header__tab', {
                  'mapping-test-editor__header__tab--active':
                    tab === selectedTab,
                })}
              >
                {tab === MAPPING_TEST_EDITOR_TAB_TYPE.RESULT && (
                  <div className="mapping-test-editor__header__tab__test-status-indicator__container">
                    <MappingTestStatusIndicator testState={testState} />
                  </div>
                )}
                {tab}
              </div>
            ))}
          </div>
          <div className="panel__header__actions mapping-test-editor__header__actions">
            <div className="mapping-test-editor__action-btn btn__dropdown-combo btn__dropdown-combo--primary">
              {testState.isRunningTest ? (
                <button
                  className="btn__dropdown-combo__canceler"
                  onClick={cancelTest}
                  tabIndex={-1}
                >
                  <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label">
                    <PauseCircleIcon className="btn__dropdown-combo__canceler__label__icon" />
                    <div className="btn__dropdown-combo__canceler__label__title">
                      Stop
                    </div>
                  </div>
                </button>
              ) : (
                <>
                  <button
                    className="btn__dropdown-combo__label"
                    onClick={runTest}
                    disabled={
                      testState.isExecutingTest || testState.isGeneratingPlan
                    }
                    tabIndex={-1}
                  >
                    <PlayIcon className="btn__dropdown-combo__label__icon" />
                    <div className="btn__dropdown-combo__label__title">
                      Run Test
                    </div>
                  </button>
                  <ControlledDropdownMenu
                    className="btn__dropdown-combo__dropdown-btn"
                    disabled={
                      testState.isExecutingTest || testState.isGeneratingPlan
                    }
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                        >
                          Generate Plan
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={debugPlanGeneration}
                        >
                          Debug
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                      transformOrigin: { vertical: 'top', horizontal: 'right' },
                    }}
                  >
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mapping-test-editor__content">
          {selectedTab === MAPPING_TEST_EDITOR_TAB_TYPE.SETUP && (
            <DEPRECATED__MappingTestBuilder
              testState={testState}
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === MAPPING_TEST_EDITOR_TAB_TYPE.RESULT && (
            <div className="mapping-test-editor__result">
              <div
                className={`mapping-test-editor__result__status mapping-test-editor__result__status--${
                  testState.isRunningTest
                    ? 'running'
                    : testState.result.toLowerCase()
                }`}
              >
                {testResult}
              </div>
              {/*
                TODO: when we use mapping runner in the backend, we won't have the execution result
                to do comparison this conveniently, then, we would need to create a button to compute
                the comparison. This UI might change
              */}
              {testState.result === TEST_RESULT.FAILED && (
                <>
                  {testState.assertionState instanceof
                    MappingTestExpectedOutputAssertionState && (
                    <div className="mapping-test-editor__result__diff">
                      <JSONDiffView
                        from={testState.assertionState.expectedResult} // expected
                        to={testState.testExecutionResultText} // actual
                        lossless={true}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <ExecutionPlanViewer executionPlanState={executionPlanState} />
      </div>
    );
  },
);
