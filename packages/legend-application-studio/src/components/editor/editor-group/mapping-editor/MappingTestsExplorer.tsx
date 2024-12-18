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

import { useState, useCallback, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import {
  type DEPRECATED__MappingTestState,
  MAPPING_TEST_EDITOR_TAB_TYPE,
  TEST_RESULT,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/legacy/DEPRECATED__MappingTestState.js';
import {
  clsx,
  ContextMenu,
  ProgressBar,
  PlayIcon,
  EmptyCircleIcon,
  TimesCircleIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  PlusIcon,
  EmptyStopCircleIcon,
  ExclamationCircleIcon,
  PauseCircleIcon,
  PanelDropZone,
  MenuContent,
  MenuContentItem,
  Panel,
  WarningIcon,
} from '@finos/legend-art';
import {
  type MappingElementDragSource,
  CORE_DND_TYPE,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { ClassMappingSelectorModal } from './MappingExecutionBuilder.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { SetImplementation } from '@finos/legend-graph';
import { MappingEditorState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';

export const MappingTestExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      mappingTestState?: DEPRECATED__MappingTestState;
      showCreateNewTestModal?: () => void;
      isReadOnly: boolean;
    }
  >(function MappingTestExplorerContextMenu(props, ref) {
    const { mappingTestState, isReadOnly, showCreateNewTestModal } = props;
    const applicationStore = useApplicationStore();
    const runMappingTest = (): void => {
      if (mappingTestState) {
        flowResult(mappingTestState.runTest()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const removeMappingTest = (): void => {
      if (mappingTestState) {
        flowResult(
          mappingTestState.mappingEditorState.deleteTest(mappingTestState.test),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const toggleSkipTest = (): void => mappingTestState?.toggleSkipTest();
    const viewTestResult = (): void => {
      if (mappingTestState) {
        mappingTestState.mappingEditorState.openTest(
          mappingTestState.test,
          MAPPING_TEST_EDITOR_TAB_TYPE.RESULT,
        );
      }
    };
    const editTest = (): void => {
      if (mappingTestState) {
        mappingTestState.mappingEditorState.openTest(
          mappingTestState.test,
          MAPPING_TEST_EDITOR_TAB_TYPE.SETUP,
        );
      }
    };

    return (
      <MenuContent ref={ref}>
        {mappingTestState && (
          <MenuContentItem onClick={runMappingTest}>Run</MenuContentItem>
        )}
        {mappingTestState && mappingTestState.result !== TEST_RESULT.NONE && (
          <MenuContentItem onClick={viewTestResult}>
            View Result
          </MenuContentItem>
        )}
        {mappingTestState && (
          <MenuContentItem onClick={editTest}>Edit</MenuContentItem>
        )}
        {mappingTestState && (
          <MenuContentItem onClick={toggleSkipTest}>
            {mappingTestState.isSkipped ? 'Unskip' : 'Skip'}
          </MenuContentItem>
        )}
        {!isReadOnly && mappingTestState && (
          <MenuContentItem onClick={removeMappingTest}>Delete</MenuContentItem>
        )}
        {!isReadOnly && !mappingTestState && showCreateNewTestModal && (
          <MenuContentItem onClick={showCreateNewTestModal}>
            Create new test
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

export const MappingTestStatusIndicator: React.FC<{
  testState: DEPRECATED__MappingTestState;
}> = (props) => {
  const { testState } = props;
  if (testState.isSkipped) {
    return (
      <div
        title="Test is skipped"
        className="mapping-test-status-indicator mapping-test-status-indicator--skipped"
      >
        <EmptyStopCircleIcon />
      </div>
    );
  }
  if (testState.isRunningTest) {
    return (
      <div
        title="Test is running"
        className="mapping-test-status-indicator mapping-test-status-indicator--in-progress"
      >
        <CircleNotchIcon />
      </div>
    );
  }
  return (
    <>
      {testState.result === TEST_RESULT.NONE && (
        <div
          title="Test did not run"
          className="mapping-test-status-indicator mapping-test-status-indicator--none"
        >
          <EmptyCircleIcon />
        </div>
      )}
      {testState.result === TEST_RESULT.ERROR && (
        <div
          title="Test failed due to error"
          className="mapping-test-status-indicator mapping-test-status-indicator--error"
        >
          <TimesCircleIcon />
        </div>
      )}
      {testState.result === TEST_RESULT.FAILED && (
        <div
          title="Test failed assertion"
          className="mapping-test-status-indicator mapping-test-status-indicator--failed"
        >
          <ExclamationCircleIcon />
        </div>
      )}
      {testState.result === TEST_RESULT.PASSED && (
        <div
          title="Test passed"
          className="mapping-test-status-indicator mapping-test-status-indicator--passed"
        >
          <CheckCircleIcon />
        </div>
      )}
    </>
  );
};

export const MappingTestExplorer = observer(
  (props: { testState: DEPRECATED__MappingTestState; isReadOnly: boolean }) => {
    const { isReadOnly, testState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const openTest = applicationStore.guardUnhandledError(() =>
      flowResult(mappingEditorState.openTest(testState.test)),
    );
    const runTest = applicationStore.guardUnhandledError(() =>
      flowResult(testState.runTest()),
    );
    const cancelTest = (): void => {
      testState.setIsRunningTest(false);
      testState.setTestRunPromise(undefined);
    };
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const isActive = mappingEditorState.currentTabState === testState;

    return (
      <ContextMenu
        content={
          <MappingTestExplorerContextMenu
            mappingTestState={testState}
            isReadOnly={isReadOnly}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'mapping-test-explorer__item',
            {
              'mapping-explorer__item--selected-from-context-menu':
                !isActive && isSelectedFromContextMenu,
            },
            { 'mapping-test-explorer__item--active': isActive },
          )}
        >
          <button
            className="mapping-test-explorer__item__label"
            onClick={openTest}
            tabIndex={-1}
          >
            <div className="mapping-test-explorer__item__label__icon mapping-test-explorer__test-result-indicator__container">
              <MappingTestStatusIndicator testState={testState} />
            </div>
            <div className="mapping-test-explorer__item__label__text">
              {testState.test.name}
            </div>
            {testState.result !== TEST_RESULT.NONE && (
              <div className="mapping-test-explorer__item__run-time">
                {testState.runTime}ms
              </div>
            )}
          </button>
          <div className="mapping-test-explorer__item__actions">
            {testState.isRunningTest ? (
              <button
                className="mapping-test-explorer__item__action mapping-test-explorer__stop-test-btn"
                onClick={cancelTest}
                disabled={testState.mappingEditorState.isRunningAllTests}
                tabIndex={-1}
                title={`Stop ${testState.test.name}`}
              >
                {<PauseCircleIcon />}
              </button>
            ) : (
              <button
                className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
                onClick={runTest}
                disabled={testState.mappingEditorState.isRunningAllTests}
                tabIndex={-1}
                title={`Run ${testState.test.name}`}
              >
                {<PlayIcon />}
              </button>
            )}
          </div>
        </div>
      </ContextMenu>
    );
  },
);

export const MappingTestsExplorer = observer(
  (props: { isReadOnly: boolean }) => {
    const { isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const runAllTests = applicationStore.guardUnhandledError(() =>
      flowResult(mappingEditorState.runTests()),
    );
    // all test run report summary
    const numberOfTests =
      mappingEditorState.DEPRECATED_mappingTestStates.length;
    const numberOfTestsPassed =
      mappingEditorState.DEPRECATED_mappingTestStates.filter(
        (testState) => testState.result === TEST_RESULT.PASSED,
      ).length;
    const numberOfTestsFailed =
      mappingEditorState.DEPRECATED_mappingTestStates.filter(
        (testState) =>
          testState.result === TEST_RESULT.FAILED ||
          testState.result === TEST_RESULT.ERROR,
      ).length;
    const numberOfTestSkipped =
      mappingEditorState.DEPRECATED_mappingTestStates.filter(
        (testState) => testState.isSkipped,
      ).length;
    const percentageTestRun = Math.floor(
      (mappingEditorState.DEPRECATED_mappingTestStates.filter(
        (testState) => testState.result !== TEST_RESULT.NONE,
      ).length /
        numberOfTests) *
        100,
    );
    let testReportSummary = '';
    switch (mappingEditorState.testSuiteResult) {
      case TEST_RESULT.NONE:
        testReportSummary = mappingEditorState.isRunningAllTests
          ? `Running ${numberOfTests} tests...`
          : 'No tests run!';
        break;
      case TEST_RESULT.FAILED:
        testReportSummary = `${numberOfTestsFailed} of ${numberOfTests} failed`;
        break;
      case TEST_RESULT.PASSED:
        testReportSummary =
          numberOfTestsPassed === numberOfTests
            ? `All ${numberOfTests} passed`
            : `${numberOfTestsPassed} of ${numberOfTests} passed`;
        break;
      default:
        break;
    }
    // Drag and Drop
    const handleDrop = useCallback(
      (item: MappingElementDragSource): void => {
        if (isReadOnly) {
          return;
        }
        if (item.data instanceof SetImplementation) {
          flowResult(mappingEditorState.createNewTest(item.data)).catch(
            applicationStore.alertUnhandledError,
          );
        }
      },
      [applicationStore.alertUnhandledError, isReadOnly, mappingEditorState],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      MappingElementDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);

    const openMigrationtool = (): void =>
      mappingEditorState.openMigrationTool();
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        if (setImplementation) {
          flowResult(mappingEditorState.createNewTest(setImplementation)).catch(
            applicationStore.alertUnhandledError,
          );
          hideClassMappingSelectorModal();
        }
      },
      [applicationStore, mappingEditorState],
    );

    return (
      <Panel className="mapping-test-explorer">
        <div className="panel__header" title={testReportSummary}>
          <div className="mapping-test-explorer__header__info">
            <div className="panel__header__title">
              <div className="panel__header__title__content mapping-test-explorer__header__report">
                <div className="mapping-test-explorer__header__report__overview">
                  <div className="mapping-test-explorer__header__report__overview__stat mapping-test-explorer__header__report__overview__stat--total">
                    {numberOfTests} total
                  </div>
                  <div className="mapping-test-explorer__header__report__overview__stat mapping-test-explorer__header__report__overview__stat--passed">
                    {numberOfTestsPassed} passed
                  </div>
                  <div className="mapping-test-explorer__header__report__overview__stat mapping-test-explorer__header__report__overview__stat--failed">
                    {numberOfTestsFailed} failed
                  </div>
                  {Boolean(numberOfTestSkipped) && (
                    <div className="mapping-test-explorer__header__report__overview__stat mapping-test-explorer__header__report__overview__stat--skipped">
                      {numberOfTestSkipped} skipped
                    </div>
                  )}
                </div>
                {mappingEditorState.testSuiteResult !== TEST_RESULT.NONE && (
                  <div className="mapping-test-explorer__header__report__time">
                    {mappingEditorState.allTestRunTime}ms
                  </div>
                )}
              </div>
            </div>
            <div className="panel__header__actions">
              {Boolean(mappingEditorState.mapping.test.length) && (
                <button
                  className="panel__header__action"
                  onClick={openMigrationtool}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Please migrate to new mapping test framework"
                >
                  <WarningIcon />
                </button>
              )}
              <button
                className="panel__header__action"
                onClick={showClassMappingSelectorModal}
                disabled={isReadOnly}
                tabIndex={-1}
                title="Add Test"
              >
                <PlusIcon />
              </button>
              <button
                className="panel__header__action"
                onClick={runAllTests}
                disabled={
                  !mappingEditorState.DEPRECATED_mappingTestStates.length ||
                  mappingEditorState.isRunningAllTests
                }
                tabIndex={-1}
                title="Run All Tests"
              >
                <PlayIcon />
              </button>
            </div>
          </div>
          <div className="mapping-test-explorer__header__status">
            <ProgressBar
              className={`mapping-test-explorer__header__progress-bar mapping-test-explorer__header__progress-bar--${mappingEditorState.testSuiteResult.toLowerCase()}`}
              classes={{
                bar: `mapping-test-explorer__header__progress-bar__bar mapping-test-explorer__header__progress-bar__bar--${mappingEditorState.testSuiteResult.toLowerCase()}`,
              }}
              variant="determinate"
              value={percentageTestRun}
            />
          </div>
        </div>
        <ContextMenu
          className="panel__content"
          disabled={isReadOnly}
          content={
            <MappingTestExplorerContextMenu
              isReadOnly={isReadOnly}
              showCreateNewTestModal={showClassMappingSelectorModal}
            />
          }
          menuProps={{ elevation: 7 }}
        >
          <PanelDropZone
            isDragOver={isDragOver && !isReadOnly}
            dropTargetConnector={dropConnector}
          >
            <div className="mapping-test-explorer__content">
              {Boolean(
                mappingEditorState.DEPRECATED_mappingTestStates.length,
              ) &&
                mappingEditorState.DEPRECATED_mappingTestStates.slice().map(
                  (testState) => (
                    <MappingTestExplorer
                      key={testState.test._UUID}
                      testState={testState}
                      isReadOnly={isReadOnly}
                    />
                  ),
                )}
            </div>
          </PanelDropZone>
        </ContextMenu>
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
          />
        )}
      </Panel>
    );
  },
);
