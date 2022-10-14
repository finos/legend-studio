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

import { EDITOR_LANGUAGE, TextInputEditor } from '@finos/legend-application';
import {
  type TreeData,
  type TreeNodeContainerProps,
  clsx,
  PanelLoadingIndicator,
  PlayIcon,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
  RefreshIcon,
  TimesCircleIcon,
  CheckCircleIcon,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  Dialog,
  WarningIcon,
  CircleNotchIcon,
  EmptyCircleIcon,
  PanelContent,
} from '@finos/legend-art';
import {
  AssertFail,
  EqualToJsonAssertFail,
  PackageableElement,
  TestError,
} from '@finos/legend-graph';
import { type GeneratorFn, isNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect } from 'react';
import {
  type TestableExplorerTreeNodeData,
  type GlobalTestRunnerState,
  type TestableState,
  TESTABLE_RESULT,
  AtomicTestTreeNodeData,
  AssertionTestTreeNodeData,
  TestableTreeNodeData,
  TestSuiteTreeNodeData,
  TestBatchTreeNodeData,
  getNodeTestableResult,
  getAtomicTest_TestResult,
  getAssertionStatus,
} from '../../../../stores/sidebar-state/testable/GlobalTestRunnerState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID.js';
import { TextDiffView } from '../../../shared/DiffView.js';
import { getElementTypeIcon } from '../../../shared/ElementIconUtils.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

export const getTestableResultIcon = (
  testableResult: TESTABLE_RESULT,
): React.ReactNode => {
  switch (testableResult) {
    case TESTABLE_RESULT.PASSED:
      return (
        <div
          title="Test passed"
          className="global-test-runner__item__link__content__status__indicator global-test-runner__item__link__content__status__indicator--succeeded"
        >
          <CheckCircleIcon />
        </div>
      );
    case TESTABLE_RESULT.IN_PROGRESS:
      return (
        <div
          title="Test is running"
          className="global-test-runner__item__link__content__status__indicator workflow-manager__item__link__content__status__indicator--in-progress"
        >
          <CircleNotchIcon />
        </div>
      );
    case TESTABLE_RESULT.FAILED:
      return (
        <div
          title="Test Failed"
          className="global-test-runner__item__link__content__status__indicator global-test-runner__item__link__content__status__indicator--failed"
        >
          <TimesCircleIcon />
        </div>
      );
    case TESTABLE_RESULT.ERROR:
      return (
        <div
          title="Test has an error"
          className="global-test-runner__item__link__content__status__indicator global-test-runner__item__link__content__status__indicator--failed"
        >
          <WarningIcon />
        </div>
      );
    default:
      return (
        <div
          title="Test did not run"
          className="global-test-runner__item__link__content__status__indicator global-test-runner__item__link__content__status__indicator--unknown"
        >
          <EmptyCircleIcon />
        </div>
      );
  }
};
const getOptionalError = (
  node: TestableExplorerTreeNodeData,
  testableState: TestableState,
): TestError | AssertFail | undefined => {
  if (node instanceof AtomicTestTreeNodeData) {
    const result = getAtomicTest_TestResult(
      node.atomicTest,
      testableState.results,
    );
    if (result instanceof TestError) {
      return result;
    }
  } else if (node instanceof AssertionTestTreeNodeData) {
    const status = getAssertionStatus(node.assertion, testableState.results);
    if (status instanceof AssertFail) {
      return status;
    }
  }
  return undefined;
};

const TestFailViewer = observer(
  (props: {
    globalTestRunnerState: GlobalTestRunnerState;
    failure: TestError | AssertFail;
  }) => {
    const { globalTestRunnerState, failure } = props;
    const id =
      failure instanceof TestError
        ? failure.atomicTestId.atomicTest.id
        : failure.assertion.id;
    const closeLogViewer = (): void =>
      globalTestRunnerState.setFailureViewing(undefined);

    return (
      <Dialog
        open={Boolean(failure)}
        onClose={closeLogViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal">
          <PanelLoadingIndicator
            isLoading={globalTestRunnerState.isDispatchingAction}
          />
          <div className="modal__header">
            <div className="modal__title">{id}</div>
          </div>
          <div className="modal__body">
            {failure instanceof TestError && (
              <TextInputEditor
                inputValue={failure.error}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.TEXT}
                showMiniMap={true}
              />
            )}
            {failure instanceof EqualToJsonAssertFail && (
              <TextDiffView
                language={EDITOR_LANGUAGE.JSON}
                from={failure.expected}
                to={failure.actual}
              />
            )}
            {failure instanceof AssertFail &&
              !(failure instanceof EqualToJsonAssertFail) && (
                <TextInputEditor
                  inputValue={failure.message ?? ''}
                  isReadOnly={true}
                  language={EDITOR_LANGUAGE.TEXT}
                />
              )}
          </div>
          <div className="modal__footer">
            <button
              className="btn modal__footer__close-btn"
              onClick={closeLogViewer}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

const TestableExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      globalTestRunnerState: GlobalTestRunnerState;
      testableState: TestableState;
      node: TestableExplorerTreeNodeData;
      treeData: TreeData<TestableExplorerTreeNodeData>;
      error?: TestError | AssertFail | undefined;
    }
  >(function TestableExplorerContextMenu(props, ref) {
    const { node, error, globalTestRunnerState, testableState } = props;
    const runTest = (): void => {
      testableState.run(node);
    };
    const viewError = (): void =>
      globalTestRunnerState.setFailureViewing(error);
    return (
      <MenuContent data-testid={LEGEND_STUDIO_TEST_ID.EXPLORER_CONTEXT_MENU}>
        <MenuContentItem
          disabled={globalTestRunnerState.isDispatchingAction}
          onClick={runTest}
        >
          Run
        </MenuContentItem>
        {error && (
          <MenuContentItem onClick={viewError}>
            {error instanceof TestError ? 'View Error' : 'View assert fail'}
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const TestableTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    TestableExplorerTreeNodeData,
    {
      globalTestRunnerState: GlobalTestRunnerState;
      testableState: TestableState;
      treeData: TreeData<TestableExplorerTreeNodeData>;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const { treeData, testableState, globalTestRunnerState } = props.innerProps;
  const editorStore = useEditorStore();
  const results = testableState.results;
  const expandIcon =
    node instanceof AssertionTestTreeNodeData ? (
      <div />
    ) : node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    );
  const nodeIcon =
    node instanceof TestableTreeNodeData
      ? node.testableMetadata.testable instanceof PackageableElement
        ? getElementTypeIcon(
            editorStore,
            editorStore.graphState.getPackageableElementType(
              node.testableMetadata.testable,
            ),
          )
        : null
      : null;
  const resultIcon = getTestableResultIcon(
    getNodeTestableResult(
      node,
      testableState.globalTestRunnerState.isRunningTests.isInProgress,
      results,
    ),
  );
  const optionalError = getOptionalError(node, testableState);
  // );
  const selectNode: React.MouseEventHandler = (event) => onNodeSelect?.(node);

  return (
    <ContextMenu
      content={
        <TestableExplorerContextMenu
          globalTestRunnerState={globalTestRunnerState}
          testableState={testableState}
          treeData={treeData}
          node={node}
          error={optionalError}
        />
      }
      menuProps={{ elevation: 7 }}
    >
      <div
        className={clsx(
          'tree-view__node__container global-test-runner__explorer__testable-tree__node__container',
        )}
        onClick={selectNode}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon global-test-runner__explorer__testable-tree__node__icon">
          <div className="global-test-runner__explorer__testable-tree__node__icon__expand">
            {expandIcon}
          </div>
          <div className="global-test-runner__explorer__testable-tree__node__icon__type">
            {resultIcon}
          </div>
          {nodeIcon && (
            <div className="global-test-runner__explorer__testable-tree__node__result__icon__type">
              {nodeIcon}
            </div>
          )}
        </div>
        {node instanceof TestableTreeNodeData && (
          <div className="global-test-runner__item__link__content">
            <span className="global-test-runner__item__link__content__id">
              {node.testableMetadata.name}
            </span>
          </div>
        )}
        {node instanceof TestSuiteTreeNodeData && (
          <div className="global-test-runner__item__link__content">
            <span className="global-test-runner__item__link__content__id">
              {node.label}
            </span>
          </div>
        )}
        {node instanceof AtomicTestTreeNodeData && (
          <div className="global-test-runner__item__link__content">
            <span className="global-test-runner__item__link__content__id">
              {node.label}
            </span>
          </div>
        )}
        {node instanceof TestBatchTreeNodeData && (
          <div className="global-test-runner__item__link__content">
            <span className="global-test-runner__item__link__content__id">
              {node.label}
            </span>
          </div>
        )}
        {node instanceof AssertionTestTreeNodeData && (
          <div className="global-test-runner__item__link__content">
            <span className="global-test-runner__item__link__content__id">
              {node.label}
            </span>
          </div>
        )}
      </div>
    </ContextMenu>
  );
};

// TODO:
// - Handle Multi Execution Test Results
// - Add `Visit Test` to open test editors when Testable Editors are complete
export const GlobalTestRunner = observer(
  (props: { globalTestRunnerState: GlobalTestRunnerState }) => {
    const editorStore = useEditorStore();
    const globalTestRunnerState = props.globalTestRunnerState;
    const isDispatchingAction = globalTestRunnerState.isDispatchingAction;
    const renderTestables = (): React.ReactNode => (
      <>
        {(globalTestRunnerState.testableStates ?? []).map((testableState) => {
          const onNodeSelect = (node: TestableExplorerTreeNodeData): void => {
            testableState.onTreeNodeSelect(node, testableState.treeData);
          };
          const getChildNodes = (
            node: TestableExplorerTreeNodeData,
          ): TestableExplorerTreeNodeData[] => {
            if (node.childrenIds) {
              return node.childrenIds
                .map((id) => testableState.treeData.nodes.get(id))
                .filter(isNonNullable);
            }
            return [];
          };
          return (
            <TreeView
              components={{
                TreeNodeContainer: TestableTreeNodeContainer,
              }}
              key={testableState.uuid}
              treeData={testableState.treeData}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={{
                globalTestRunnerState,
                testableState,
                treeData: testableState.treeData,
              }}
            />
          );
        })}
      </>
    );

    useEffect(() => {
      editorStore.globalTestRunnerState.init();
    }, [editorStore.globalTestRunnerState]);

    const runAllTests = (): GeneratorFn<void> =>
      globalTestRunnerState.runAllTests(undefined);

    const reset = (): void => globalTestRunnerState.init(true);
    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.GLOBAL_TEST_RUNNER}
        className="panel global-test-runner"
      >
        <div className="panel__header side-bar__header">
          <div className="panel__header__title global-test-runner__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              GLOBAL TEST RUNNER
            </div>
          </div>
          <div className="panel__header__actions side-bar__header__actions">
            <button
              className={clsx(
                'panel__header__action side-bar__header__action global-test-runner__refresh-btn',
                {
                  'global-test-runner__refresh-btn--loading':
                    isDispatchingAction,
                },
              )}
              disabled={isDispatchingAction}
              onClick={reset}
              tabIndex={-1}
              title="Run All Tests"
            >
              <RefreshIcon />
            </button>
            <button
              className="panel__header__action side-bar__header__action global-test-runner__refresh-btn"
              disabled={isDispatchingAction}
              onClick={runAllTests}
              tabIndex={-1}
              title="Run All Tests"
            >
              <PlayIcon />
            </button>
          </div>
        </div>
        <div className="panel__content side-bar__content">
          <PanelLoadingIndicator isLoading={isDispatchingAction} />
          <div className="panel side-bar__panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">TESTABLES</div>
              </div>
              <div
                className="side-bar__panel__header__changes-count"
                data-testid={
                  LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
                }
              ></div>
            </div>
            <PanelContent>{renderTestables()}</PanelContent>
            {globalTestRunnerState.failureViewing && (
              <TestFailViewer
                globalTestRunnerState={globalTestRunnerState}
                failure={globalTestRunnerState.failureViewing}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);
