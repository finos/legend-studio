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

import { useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../../stores/EditorStore';
import { useDrop } from 'react-dnd';
import type { MappingTestState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { TEST_RESULT } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import {
  FaPlay,
  FaRegCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaCheckCircle,
  FaCircleNotch,
  FaRegStopCircle,
  FaPlus,
} from 'react-icons/fa';
import { MdVerticalAlignBottom, MdAdd } from 'react-icons/md';
import { getRandomItemInCollection } from '@finos/legend-studio-shared';
import { clsx, ContextMenu } from '@finos/legend-studio-components';
import LinearProgress from '@material-ui/core/LinearProgress';
import type { MappingElementDragSource } from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { ClassMappingSelectorModal } from '../../aux-panel/MappingExecution';

const addTestPromps = [
  "Let's add some test!",
  '"A test a day keeps the QA away"',
];

export const MappingTestExplorerContextMenu = observer(
  (
    props: {
      mappingTestState?: MappingTestState;
      showCreateNewTestModal?: () => void;
      isReadOnly: boolean;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { mappingTestState, isReadOnly, showCreateNewTestModal } = props;
    const applicationStore = useApplicationStore();
    const runMappingTest = (): void => {
      mappingTestState
        ?.runTest()
        ?.catch(applicationStore.alertIllegalUnhandledError);
    };
    const removeMappingTest = (): void => {
      mappingTestState?.mappingEditorState
        .deleteMappingTest(mappingTestState.test)
        ?.catch(applicationStore.alertIllegalUnhandledError);
    };
    const toggleSkipTest = (): void => mappingTestState?.toggleSkipTest();
    return (
      <div ref={ref} className="mapping-test-explorer__context-menu">
        {mappingTestState && (
          <div
            className="mapping-test-explorer__context-menu__item"
            onClick={runMappingTest}
          >
            Run
          </div>
        )}
        {mappingTestState && (
          <div
            className="mapping-test-explorer__context-menu__item"
            onClick={toggleSkipTest}
          >
            {mappingTestState.isSkipped ? 'Unskip' : 'Skip'}
          </div>
        )}
        {!isReadOnly && mappingTestState && (
          <div
            className="mapping-test-explorer__context-menu__item"
            onClick={removeMappingTest}
          >
            Delete
          </div>
        )}
        {!isReadOnly && !mappingTestState && (
          <div
            className="mapping-test-explorer__context-menu__item"
            onClick={showCreateNewTestModal}
          >
            Create new test
          </div>
        )}
      </div>
    );
  },
  { forwardRef: true },
);

export const MappingTestExplorer = observer(
  (props: { testState: MappingTestState; isReadOnly: boolean }) => {
    const { isReadOnly, testState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const openTest = applicationStore.guaranteeSafeAction(() =>
      mappingEditorState.openTest(testState.test),
    );
    const runTest = applicationStore.guaranteeSafeAction(() =>
      testState.runTest(),
    );
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const isActive = mappingEditorState.currentTabState === testState;
    // first set the icon by the test result, but if the test is running or skipped, we will prioritize that for display
    let testStatusIcon: React.ReactNode = null;
    switch (testState.result) {
      case TEST_RESULT.NONE:
        testStatusIcon = (
          <div
            title="Test did not run"
            className="mapping-test-explorer__test-result-indicator mapping-test-explorer__test-result-indicator--none"
          >
            <FaRegCircle />
          </div>
        );
        break;
      case TEST_RESULT.ERROR:
        testStatusIcon = (
          <div
            title="Test failed due to error"
            className="mapping-test-explorer__test-result-indicator mapping-test-explorer__test-result-indicator--error"
          >
            <FaTimesCircle />
          </div>
        );
        break;
      case TEST_RESULT.FAILED:
        testStatusIcon = (
          <div
            title="Test failed assertion"
            className="mapping-test-explorer__test-result-indicator mapping-test-explorer__test-result-indicator--failed"
          >
            <FaExclamationCircle />
          </div>
        );
        break;
      case TEST_RESULT.PASSED:
        testStatusIcon = (
          <div
            title="Test passed"
            className="mapping-test-explorer__test-result-indicator mapping-test-explorer__test-result-indicator--passed"
          >
            <FaCheckCircle />
          </div>
        );
        break;
      default:
        break;
    }
    testStatusIcon = testState.isSkipped ? (
      <div
        title="Test is skipped"
        className="mapping-test-explorer__test-result-indicator mapping-test-explorer__test-result-indicator--skipped"
      >
        <FaRegStopCircle />
      </div>
    ) : (
      testStatusIcon
    );
    testStatusIcon = testState.isRunningTest ? (
      <div
        title="Test is running"
        className="mapping-test-explorer__test-result-indicator mapping-test-explorer__test-result-indicator--in-progress"
      >
        <FaCircleNotch />
      </div>
    ) : (
      testStatusIcon
    );

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
              {testStatusIcon}
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
            <button
              className="mapping-test-explorer__item__action mapping-test-explorer__run-test-btn"
              onClick={runTest}
              disabled={
                isReadOnly ||
                testState.isRunningTest ||
                testState.mappingEditorState.isRunningAllTests
              }
              tabIndex={-1}
              title={`Run ${testState.test.name}`}
            >
              <FaPlay />
            </button>
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
      editorStore.getCurrentEditorState(MappingEditorState);
    const runAllTests = applicationStore.guaranteeSafeAction(() =>
      mappingEditorState.runTests(),
    );
    // all test run report summary
    const numberOfTests = mappingEditorState.mappingTestStates.length;
    const numberOfTestsPassed = mappingEditorState.mappingTestStates.filter(
      (testState) => testState.result === TEST_RESULT.PASSED,
    ).length;
    const numberOfTestsFailed = mappingEditorState.mappingTestStates.filter(
      (testState) =>
        testState.result === TEST_RESULT.FAILED ||
        testState.result === TEST_RESULT.ERROR,
    ).length;
    const numberOfTestSkipped = mappingEditorState.mappingTestStates.filter(
      (testState) => testState.isSkipped,
    ).length;
    const percentageTestRun = Math.floor(
      (mappingEditorState.mappingTestStates.filter(
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
        if (item.data instanceof SetImplementation) {
          mappingEditorState
            .createNewTest(item.data)
            .catch(applicationStore.alertIllegalUnhandledError);
        }
      },
      [applicationStore.alertIllegalUnhandledError, mappingEditorState],
    );
    const [{ isDragOver }, dropRef] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item: MappingElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    // Class mapping selector
    const [openClassMappingSelectorModal, setOpenClassMappingSelectorModal] =
      useState(false);
    const showClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(true);
    const hideClassMappingSelectorModal = (): void =>
      setOpenClassMappingSelectorModal(false);
    const changeClassMapping = useCallback(
      (setImplementation: SetImplementation | undefined): void => {
        if (setImplementation) {
          mappingEditorState
            .createNewTest(setImplementation)
            .catch(applicationStore.alertIllegalUnhandledError);
          hideClassMappingSelectorModal();
        }
      },
      [applicationStore, mappingEditorState],
    );

    return (
      <div className="panel mapping-test-explorer">
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
              <button
                className="panel__header__action"
                onClick={showClassMappingSelectorModal}
                disabled={isReadOnly}
                tabIndex={-1}
                title="Add Test"
              >
                <FaPlus />
              </button>
              <button
                className="panel__header__action"
                onClick={runAllTests}
                disabled={
                  !mappingEditorState.mappingTestStates.length ||
                  mappingEditorState.isRunningAllTests
                }
                tabIndex={-1}
                title="Run All Tests"
              >
                <FaPlay />
              </button>
            </div>
          </div>
          <div className="mapping-test-explorer__header__status">
            <LinearProgress
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
          <div
            ref={dropRef}
            className={clsx('mapping-test-explorer__content', {
              'mapping-test-explorer__content--dnd-over':
                isDragOver && !isReadOnly,
            })}
          >
            {Boolean(mappingEditorState.mappingTestStates.length) &&
              mappingEditorState.mappingTestStates
                .slice()
                .sort((a, b) => a.test.name.localeCompare(b.test.name))
                .map((testState) => (
                  <MappingTestExplorer
                    key={testState.test.uuid}
                    testState={testState}
                    isReadOnly={isReadOnly}
                  />
                ))}
            {/* TODO: use BlankPanelPlaceholder */}
            {!isReadOnly && !mappingEditorState.mappingTestStates.length && (
              <div
                className="mapping-test-explorer__content mapping-test-explorer__content__adder"
                onClick={showClassMappingSelectorModal}
              >
                <div className="mapping-test-explorer__content__adder__text">
                  {getRandomItemInCollection(addTestPromps)}
                </div>
                <div className="mapping-test-explorer__content__adder__action">
                  <MdVerticalAlignBottom className="mapping-test-explorer__content__adder__action__dnd-icon" />
                  <MdAdd className="mapping-test-explorer__content__adder__action__add-icon" />
                </div>
              </div>
            )}
          </div>
        </ContextMenu>
        {openClassMappingSelectorModal && (
          <ClassMappingSelectorModal
            mappingEditorState={mappingEditorState}
            hideClassMappingSelectorModal={hideClassMappingSelectorModal}
            changeClassMapping={changeClassMapping}
          />
        )}
      </div>
    );
  },
);
