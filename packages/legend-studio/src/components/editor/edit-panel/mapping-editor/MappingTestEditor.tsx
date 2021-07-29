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

import { Fragment, useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import type { MappingTestState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import {
  MAPPING_TEST_EDITOR_TAB_TYPE,
  TEST_RESULT,
  MappingTestObjectInputDataState,
  MappingTestFlatDataInputDataState,
  MappingTestExpectedOutputAssertionState,
  MappingTestRelationalInputDataState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { FaScroll, FaWrench } from 'react-icons/fa';
import { JsonDiffView } from '../../../shared/DiffView';
import { useEditorStore } from '../../../../stores/EditorStore';
import {
  clsx,
  PanelLoadingIndicator,
  BlankPanelPlaceholder,
  TimesIcon,
  PencilIcon,
  PlayIcon,
} from '@finos/legend-studio-components';
import { MdRefresh } from 'react-icons/md';
import { useDrop } from 'react-dnd';
import type { MappingElementDragSource } from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import { EDITOR_LANGUAGE } from '../../../../stores/EditorConfig';
import {
  IllegalStateError,
  isNonNullable,
  guaranteeType,
  tryToFormatLosslessJSONString,
} from '@finos/legend-studio-shared';
import { TextInputEditor } from '../../../shared/TextInputEditor';
import { VscError } from 'react-icons/vsc';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '../../../../stores/ApplicationStore';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import {
  getMappingElementSource,
  getMappingElementTarget,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { ClassMappingSelectorModal } from './MappingExecutionBuilder';
import { OperationSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { flowResult } from 'mobx';
import { MappingTestStatusIndicator } from './MappingTestsExplorer';
import { ExecutionPlanViewer } from './execution-plan-viewer/ExecutionPlanViewer';

const MappingTestQueryEditor = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const queryState = testState.queryState;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    const extraQueryEditors = applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraMappingTestQueryEditorRendererConfigurations?.() ?? [],
      )
      .filter(isNonNullable)
      .map((config) => (
        <Fragment key={config.key}>
          {config.renderer(testState, isReadOnly)}
        </Fragment>
      ));
    if (extraQueryEditors.length === 0) {
      extraQueryEditors.push(
        <Fragment key={'unsupported-query-editor'}>
          <div>{`No query editor available`}</div>
        </Fragment>,
      );
    }

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
              ? editorStore.graphState.graphManager.HACKY_createGetAllLambda(
                  guaranteeType(
                    getMappingElementTarget(setImplementation),
                    Class,
                  ),
                )
              : RawLambda.createStub(),
          ),
        ).catch(applicationStore.alertIllegalUnhandledError);
        hideClassMappingSelectorModal();

        // Attempt to generate data for input data panel as we pick the class mapping
        if (setImplementation) {
          editorStore.setActionAltertInfo({
            message: 'Mapping test input data is already set',
            prompt: 'Do you want to regenerate the input data?',
            type: ActionAlertType.CAUTION,
            onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
            onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
            actions: [
              {
                label: 'Regenerate',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void =>
                  testState.setInputDataStateBasedOnSource(
                    getMappingElementSource(setImplementation),
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
    const [{ isDragOver, canDrop }, dropRef] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item: MappingElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean; canDrop: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );

    const clearQuery = (): Promise<void> =>
      flowResult(
        testState.queryState.updateLamba(RawLambda.createStub()),
      ).catch(applicationStore.alertIllegalUnhandledError);

    return (
      <div className="panel mapping-test-editor__query-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">query</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              tabIndex={-1}
              disabled={isReadOnly}
              onClick={clearQuery}
              title={'Clear query'}
            >
              <TimesIcon />
            </button>
            <button
              className="panel__header__action"
              tabIndex={-1}
              disabled={isReadOnly}
              onClick={showClassMappingSelectorModal}
              title={'Choose target...'}
            >
              <PencilIcon />
            </button>
          </div>
        </div>
        {!queryState.query.isStub && (
          <div className="panel__content">
            <ReflexContainer orientation="vertical">
              <ReflexElement minSize={250}>
                <div className="mapping-test-editor__query-panel__query">
                  <TextInputEditor
                    inputValue={queryState.lambdaString}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.PURE}
                    showMiniMap={false}
                  />
                </div>
              </ReflexElement>
              <ReflexSplitter />
              <ReflexElement size={250} minSize={250}>
                <div className="mapping-test-editor__query-panel__query-editor">
                  {extraQueryEditors}
                </div>
              </ReflexElement>
            </ReflexContainer>
          </div>
        )}
        {queryState.query.isStub && (
          <div ref={dropRef} className="panel__content">
            <BlankPanelPlaceholder
              placeholderText="Choose a class mapping"
              onClick={showClassMappingSelectorModal}
              clickActionType="add"
              tooltipText="Drop a class mapping, or click to choose one to start building the query"
              dndProps={{
                isDragOver: isDragOver,
                canDrop: canDrop,
              }}
            />
          </div>
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

export const MappingTestObjectInputDataBuilder = observer(
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
        <TextInputEditor
          language={EDITOR_LANGUAGE.JSON}
          inputValue={inputDataState.data}
          isReadOnly={isReadOnly}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

export const MappingTestFlatDataInputDataBuilder = observer(
  (props: {
    inputDataState: MappingTestFlatDataInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    // Input data
    const updateInput = (val: string): void =>
      inputDataState.inputData.setData(val);

    return (
      <div className="panel__content mapping-test-editor__input-data-panel__content">
        <TextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
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
export const MappingTestRelationalInputDataBuilder = observer(
  (props: {
    inputDataState: MappingTestRelationalInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    // Input data
    const updateInput = (val: string): void =>
      inputDataState.inputData.setData(val);

    // TODO: handle CSV input type

    return (
      <div className="panel__content mapping-test-editor__input-data-panel__content">
        <TextInputEditor
          language={EDITOR_LANGUAGE.SQL}
          inputValue={inputDataState.inputData.data}
          isReadOnly={isReadOnly}
          updateInput={updateInput}
        />
      </div>
    );
  },
);

export const MappingTestInputDataBuilder = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const inputDataState = testState.inputDataState;

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
            ? getMappingElementSource(setImplementation)
            : undefined,
          true,
        );
        hideClassMappingSelectorModal();
      },
      [testState],
    );
    const classMappingFilterFn = (setImp: SetImplementation): boolean =>
      !(setImp instanceof OperationSetImplementation);

    // Input data builder
    let inputDataBuilder: React.ReactNode;
    if (inputDataState instanceof MappingTestObjectInputDataState) {
      inputDataBuilder = (
        <MappingTestObjectInputDataBuilder
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else if (inputDataState instanceof MappingTestFlatDataInputDataState) {
      inputDataBuilder = (
        <MappingTestFlatDataInputDataBuilder
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else if (inputDataState instanceof MappingTestRelationalInputDataState) {
      inputDataBuilder = (
        <MappingTestRelationalInputDataBuilder
          inputDataState={inputDataState}
          isReadOnly={isReadOnly}
        />
      );
    } else {
      inputDataBuilder = null;
    }

    return (
      <div className="panel mapping-test-editor__input-data-panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">input data</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              tabIndex={-1}
              disabled={isReadOnly}
              onClick={showClassMappingSelectorModal}
              title={'Choose a class mapping...'}
            >
              <PencilIcon />
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

export const MappingTestExpectedOutputAssertionBuilder = observer(
  (props: {
    testState: MappingTestState;
    assertionState: MappingTestExpectedOutputAssertionState;
    isReadOnly: boolean;
  }) => {
    const { testState, assertionState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const validationResult = testState.test.assert.validationResult;
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
    const regenerateExpectedResult = applicationStore.guaranteeSafeAction(() =>
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
              title={'Regenerate Result'}
            >
              <MdRefresh className="mapping-test-editor__icon__regenerate-result" />
            </button>
            <button
              className="panel__header__action"
              disabled={isReadOnly}
              tabIndex={-1}
              onClick={formatExpectedResultJSONString}
              title={'Format JSON'}
            >
              <FaWrench />
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
              title={validationResult?.messages.join('\n') ?? ''}
            >
              <VscError />
            </div>
          )}
          <TextInputEditor
            inputValue={assertionState.expectedResult}
            updateInput={updateExpectedResult}
            isReadOnly={isReadOnly}
            language={EDITOR_LANGUAGE.JSON}
          />
        </div>
      </div>
    );
  },
);

export const MappingTestAssertionBuilder = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const assertionState = testState.assertionState;

    if (assertionState instanceof MappingTestExpectedOutputAssertionState) {
      return (
        <MappingTestExpectedOutputAssertionBuilder
          testState={testState}
          assertionState={assertionState}
          isReadOnly={isReadOnly}
        />
      );
    }
    return null;
  },
);

export const MappingTestBuilder = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = useApplicationStore();

    // In case we switch out to another tab to do editing on some class, we want to refresh the test state data so that we can detect problem in deep fetch tree
    useEffect(() => {
      flowResult(testState.onTestStateOpen()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }, [applicationStore, testState]);

    return (
      <div className="mapping-test-editor">
        <PanelLoadingIndicator isLoading={testState.isExecutingTest} />
        <ReflexContainer orientation="horizontal">
          <ReflexElement size={250} minSize={28}>
            {/* use UUID key to make sure these components refresh when we change the state */}
            <MappingTestQueryEditor
              key={testState.queryState.uuid}
              testState={testState}
              isReadOnly={isReadOnly}
            />
          </ReflexElement>
          <ReflexSplitter />
          <ReflexElement size={250} minSize={28}>
            {/* use UUID key to make sure these components refresh when we change the state */}
            <MappingTestInputDataBuilder
              key={testState.inputDataState.uuid}
              testState={testState}
              isReadOnly={isReadOnly}
            />
          </ReflexElement>
          <ReflexSplitter />
          <ReflexElement minSize={28}>
            <MappingTestAssertionBuilder
              key={testState.assertionState.uuid}
              testState={testState}
              isReadOnly={isReadOnly}
            />
          </ReflexElement>
        </ReflexContainer>
      </div>
    );
  },
);

export const MappingTestEditor = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { testState, isReadOnly } = props;
    const applicationStore = useApplicationStore();
    const selectedTab = testState.selectedTab;
    const changeTab =
      (tab: MAPPING_TEST_EDITOR_TAB_TYPE): (() => void) =>
      (): void =>
        testState.setSelectedTab(tab);

    const runTest = applicationStore.guaranteeSafeAction(() =>
      flowResult(testState.runTest()),
    );
    // Plan
    const executionPlanState = testState.executionPlanState;
    const generatePlan = applicationStore.guaranteeSafeAction(() =>
      flowResult(testState.generatePlan()),
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
          <div className="mapping-test-editor__header__actions">
            <button
              className="mapping-test-editor__header__action"
              disabled={testState.isExecutingTest}
              onClick={runTest}
              tabIndex={-1}
              title={'Run Test'}
            >
              <PlayIcon className="mapping-test-editor__icon__run" />
            </button>
            <button
              className="mapping-test-editor__header__action"
              onClick={generatePlan}
              tabIndex={-1}
              title="View Execution Plan"
            >
              <FaScroll className="mapping-test-editor__icon__generate-plan" />
            </button>
          </div>
        </div>
        <div className="mapping-test-editor__content">
          {selectedTab === MAPPING_TEST_EDITOR_TAB_TYPE.SETUP && (
            <MappingTestBuilder testState={testState} isReadOnly={isReadOnly} />
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
                      <JsonDiffView
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
