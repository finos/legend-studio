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
  type TestResultInfo,
  type TestRunnerState,
  type TestTreeNode,
  getTestTreeNodeStatus,
  TestResultType,
  TestSuiteStatus,
} from '../../../stores/TestRunnerState.js';
import {
  TestFailureResult,
  TestSuccessResult,
} from '../../../server/models/Test.js';
import { flowResult } from 'mobx';
import {
  type TreeNodeContainerProps,
  clsx,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  BlankPanelContent,
  ContextMenu,
  PanelLoadingIndicator,
  TreeView,
  ProgressBar,
  QuestionCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TimesCircleIcon,
  CircleNotchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExpandIcon,
  CompressIcon,
  BanIcon,
  PlayIcon,
  PlusIcon,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import { useEditorStore } from '../EditorStoreProvider.js';

const TestTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      TestTreeNode,
      {
        testRunnerState: TestRunnerState;
        onNodeOpen: (node: TestTreeNode) => void;
        onNodeExpand: (node: TestTreeNode) => void;
        onNodeCompress: (node: TestTreeNode) => void;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { testRunnerState, onNodeOpen, onNodeExpand, onNodeCompress } =
      innerProps;
    const testResultInfo = testRunnerState.testResultInfo;
    const isExpandable = !node.data.type;
    // NOTE: the quirky thing here is since we make the node container an `observer`, effectively, we wrap `memo`
    // around this component, so since we use `isSelected = node.isSelected`, changing selection will not trigger
    // a re-render, hence, we have to make it observes the currently selected node to derive its `isSelected` state
    const isSelected = node.id === testRunnerState.selectedNode?.id;
    const nodeTestStatus = testResultInfo
      ? getTestTreeNodeStatus(node, testResultInfo)
      : undefined;
    let nodeIcon = <QuestionCircleIcon />;
    switch (nodeTestStatus) {
      case TestResultType.PASSED: {
        nodeIcon = (
          <div className="test-runner-panel__explorer__package-tree__status test-runner-panel__explorer__package-tree__status--passed">
            <CheckCircleIcon />
          </div>
        );
        break;
      }
      case TestResultType.FAILED: {
        nodeIcon = (
          <div className="test-runner-panel__explorer__package-tree__status test-runner-panel__explorer__package-tree__status--failed">
            <ExclamationCircleIcon />
          </div>
        );
        break;
      }
      case TestResultType.ERROR: {
        nodeIcon = (
          <div className="test-runner-panel__explorer__package-tree__status test-runner-panel__explorer__package-tree__status--error">
            <TimesCircleIcon />
          </div>
        );
        break;
      }
      case TestResultType.RUNNING: {
        nodeIcon = (
          <div className="test-runner-panel__explorer__package-tree__status test-runner-panel__explorer__package-tree__status--running">
            <CircleNotchIcon />
          </div>
        );
        break;
      }
      default: {
        nodeIcon = <QuestionCircleIcon />;
        break;
      }
    }
    const selectNode: React.MouseEventHandler = (event) => {
      event.stopPropagation();
      event.preventDefault();
      onNodeSelect?.(node);
    };
    const toggleExpansion = (): void => {
      if (node.isOpen) {
        onNodeCompress(node);
      } else {
        onNodeExpand(node);
      }
    };
    const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = () => {
      if (isExpandable) {
        toggleExpansion();
      } else {
        onNodeOpen(node);
      }
    };

    return (
      <div
        className={clsx(
          'tree-view__node__container explorer__package-tree__node__container',
          { 'explorer__package-tree__node__container--selected': isSelected },
        )}
        onClick={selectNode}
        onDoubleClick={onDoubleClick}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon explorer__package-tree__node__icon">
          <div
            className="explorer__package-tree__node__icon__expand"
            onClick={toggleExpansion}
          >
            {!isExpandable ? (
              <div />
            ) : node.isOpen ? (
              <ChevronDownIcon />
            ) : (
              <ChevronRightIcon />
            )}
          </div>
          <div className="explorer__package-tree__node__icon__type">
            {nodeIcon}
          </div>
        </div>
        <button
          className="tree-view__node__label explorer__package-tree__node__label"
          tabIndex={-1}
          dangerouslySetInnerHTML={{ __html: node.label }}
        />
      </div>
    );
  },
);

const TestRunnerTree = observer(
  (props: { testRunnerState: TestRunnerState }) => {
    const { testRunnerState } = props;
    const treeData = testRunnerState.getTreeData();
    const isEmptyTree = treeData.nodes.size === 0;
    const onNodeSelect = (node: TestTreeNode): void =>
      testRunnerState.setSelectedNode(node);
    const onNodeOpen = (node: TestTreeNode): void =>
      testRunnerState.setSelectedTestId(node.id);
    const onNodeExpand = (node: TestTreeNode): void => {
      node.isOpen = true;
      testRunnerState.refreshTree();
    };
    const onNodeCompress = (node: TestTreeNode): void => {
      node.isOpen = false;
      testRunnerState.refreshTree();
    };
    const getChildNodes = (node: TestTreeNode): TestTreeNode[] => {
      if (node.isLoading || !node.childrenIds) {
        return [];
      }
      return node.childrenIds
        .map((childId) => treeData.nodes.get(childId))
        .filter(isNonNullable);
    };
    const deselectTreeNode = (): void =>
      testRunnerState.setSelectedNode(undefined);

    return (
      <ContextMenu className="explorer__content" disabled={true}>
        <div className="explorer__content__inner" onClick={deselectTreeNode}>
          {isEmptyTree && <BlankPanelContent>No tests found</BlankPanelContent>}
          {!isEmptyTree && (
            <TreeView
              components={{
                TreeNodeContainer: TestTreeNodeContainer,
              }}
              treeData={treeData}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={{
                testRunnerState,
                onNodeOpen,
                onNodeExpand,
                onNodeCompress,
              }}
            />
          )}
        </div>
      </ContextMenu>
    );
  },
);

const TestResultViewer = observer(
  (props: {
    testRunnerState: TestRunnerState;
    testResultInfo: TestResultInfo;
    selectedTestId: string;
  }) => {
    const { testRunnerState, selectedTestId, testResultInfo } = props;
    const result = testResultInfo.results.get(selectedTestId);
    const testInfo = guaranteeNonNullable(
      testRunnerState.allTests.get(selectedTestId),
      `Can't find info for test with ID '${selectedTestId}'`,
    );
    return (
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">{testInfo.text}</div>
          </div>
        </div>
        <div className="panel__content test-runner-panel__result">
          {!result && (
            <div className="test-runner-panel__result__content">Running...</div>
          )}
          {result instanceof TestSuccessResult && (
            <div className="test-runner-panel__result__content">
              Test passed!
            </div>
          )}
          {result instanceof TestFailureResult && (
            <pre className="test-runner-panel__result__content">
              {result.error.text}
            </pre>
          )}
        </div>
      </div>
    );
  },
);

const TestRunnerResultDisplay = observer(
  (props: { testRunnerState: TestRunnerState }) => {
    const { testRunnerState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const numberOfTests = testRunnerState.testExecutionResult.count;
    const testResultInfo = testRunnerState.testResultInfo;
    const overallResult = testResultInfo?.suiteStatus ?? TestSuiteStatus.NONE;
    const runPercentage = testResultInfo?.runPercentage ?? 0;
    const collapseTree = (): void => testRunnerState.collapseTree();
    const expandTree = (): void => testRunnerState.expandTree();
    const runSuite = (): Promise<void> =>
      flowResult(testRunnerState.rerunTestSuite()).catch(
        applicationStore.alertUnhandledError,
      );
    const cancelTestRun = (): Promise<void> =>
      flowResult(testRunnerState.cancelTestRun()).catch(
        applicationStore.alertUnhandledError,
      );

    return (
      <div className="test-runner-panel__content">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={400}>
            <div className="panel test-runner-panel__explorer">
              <PanelLoadingIndicator
                isLoading={testRunnerState.treeBuildingState.isInProgress}
              />
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content test-runner-panel__explorer__report">
                    <div className="test-runner-panel__explorer__report__overview">
                      <div className="test-runner-panel__explorer__report__overview__stat test-runner-panel__explorer__report__overview__stat--total">
                        {numberOfTests} total
                      </div>
                      <div className="test-runner-panel__explorer__report__overview__stat test-runner-panel__explorer__report__overview__stat--passed">
                        {testResultInfo?.passed ?? 0} <CheckCircleIcon />
                      </div>
                      <div className="test-runner-panel__explorer__report__overview__stat test-runner-panel__explorer__report__overview__stat--failed">
                        {testResultInfo?.failed ?? 0} <ExclamationCircleIcon />
                      </div>
                      <div className="test-runner-panel__explorer__report__overview__stat test-runner-panel__explorer__report__overview__stat--error">
                        {testResultInfo?.error ?? 0} <TimesCircleIcon />
                      </div>
                    </div>
                    {testResultInfo && (
                      <div className="test-runner-panel__explorer__report__time">
                        {testResultInfo.time}ms
                      </div>
                    )}
                  </div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    onClick={expandTree}
                    title="Expand All"
                  >
                    <ExpandIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    onClick={collapseTree}
                    title="Collapse All"
                  >
                    <CompressIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    disabled={!editorStore.testRunState.isInProgress}
                    onClick={cancelTestRun}
                    title="Stop"
                  >
                    <BanIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={runSuite}
                    disabled={editorStore.testRunState.isInProgress}
                    title="Run Suite"
                  >
                    <PlayIcon />
                  </button>
                </div>
              </div>
              <div className="test-runner-panel__header__status">
                <ProgressBar
                  className={`test-runner-panel__progress-bar test-runner-panel__progress-bar--${overallResult.toLowerCase()}`}
                  classes={{
                    bar: `test-runner-panel__progress-bar__bar test-runner-panel__progress-bar__bar--${overallResult.toLowerCase()}`,
                  }}
                  variant="determinate"
                  value={runPercentage}
                />
              </div>
              <div className="panel__content">
                {testRunnerState.treeData && (
                  <TestRunnerTree testRunnerState={testRunnerState} />
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine
              color={
                editorStore.auxPanelDisplayState.isMaximized
                  ? 'transparent'
                  : 'var(--color-dark-grey-250)'
              }
            />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={400}>
            {testRunnerState.selectedTestId && !testResultInfo && <div />}
            {testRunnerState.selectedTestId && testResultInfo && (
              <TestResultViewer
                testRunnerState={testRunnerState}
                selectedTestId={testRunnerState.selectedTestId}
                testResultInfo={testResultInfo}
              />
            )}
            {!testRunnerState.selectedTestId && (
              <div className="panel">
                <div className="panel__header"></div>
                <div className="panel__content">
                  <BlankPanelContent>No test selected</BlankPanelContent>
                </div>
              </div>
            )}
            <div />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const TestRunnerPanel = observer(() => {
  const editorStore = useEditorStore();
  const testRunnerState = editorStore.testRunnerState;

  return (
    <div className="test-runner-panel">
      {!testRunnerState && (
        <BlankPanelContent>
          <div className="auxiliary-panel__splash-screen">
            <div className="auxiliary-panel__splash-screen__content">
              <div className="auxiliary-panel__splash-screen__content__item">
                <div className="auxiliary-panel__splash-screen__content__item__label">
                  Run full test suite
                </div>
                <div className="auxiliary-panel__splash-screen__content__item__hot-keys">
                  <div className="hotkey__key">F10</div>
                </div>
              </div>
              <div className="auxiliary-panel__splash-screen__content__item">
                <div className="auxiliary-panel__splash-screen__content__item__label">
                  Run relevant tests only
                </div>
                <div className="auxiliary-panel__splash-screen__content__item__hot-keys">
                  <div className="hotkey__key">Shift</div>
                  <div className="hotkey__plus">
                    <PlusIcon />
                  </div>
                  <div className="hotkey__key">F10</div>
                </div>
              </div>
            </div>
          </div>
        </BlankPanelContent>
      )}
      {testRunnerState && (
        <TestRunnerResultDisplay testRunnerState={testRunnerState} />
      )}
    </div>
  );
});
