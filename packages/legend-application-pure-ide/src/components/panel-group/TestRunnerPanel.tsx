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
} from '../../stores/TestRunnerState.js';
import {
  TestFailureResult,
  TestSuccessResult,
  type TestResult,
} from '../../server/models/Test.js';
import { flowResult } from 'mobx';
import {
  type TreeNodeContainerProps,
  clsx,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  BlankPanelContent,
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
  GoToFileIcon,
  SubjectIcon,
  ViewHeadlineIcon,
  TimesIcon,
  WordWrapIcon,
  Panel,
  PanelContent,
  PanelHeader,
  PanelHeaderActions,
  PanelHeaderActionItem,
} from '@finos/legend-art';
import {
  guaranteeNonNullable,
  isNonNullable,
  noop,
} from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { FileCoordinate } from '../../server/models/File.js';
import { ELEMENT_PATH_DELIMITER } from '@finos/legend-graph';
import { useEffect, useRef, useState } from 'react';
import {
  type IDisposable,
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
} from 'monaco-editor';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  getBaseCodeEditorOptions,
} from '@finos/legend-code-editor';
import { disposeCodeEditor } from '@finos/legend-lego/code-editor';

const TestTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      TestTreeNode,
      {
        testRunnerState: TestRunnerState;
        onNodeOpen: (node: TestTreeNode) => void;
        onNodeExpand: (node: TestTreeNode) => void;
        onNodeCompress: (node: TestTreeNode) => void;
        renderNodeLabel?: (node: TestTreeNode) => React.ReactNode;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const {
      testRunnerState,
      onNodeOpen,
      onNodeExpand,
      onNodeCompress,
      renderNodeLabel,
    } = innerProps;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const testResultInfo = testRunnerState.testResultInfo;
    const isExpandable = !node.data.type;
    // NOTE: the quirky thing here is since we make the node container an `observer`, effectively, we wrap `memo`
    // around this component, so since we use `isSelected = node.isSelected`, changing selection will not trigger
    // a re-render, hence, we have to make it observes the currently selected node to derive its `isSelected` state
    const isSelected = node.id === testRunnerState.selectedTestId;
    const nodeTestStatus = testResultInfo
      ? getTestTreeNodeStatus(node, testResultInfo)
      : undefined;
    let nodeIcon;
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
    const toggleExpansion = (): void => {
      if (node.isOpen) {
        onNodeCompress(node);
      } else {
        onNodeExpand(node);
      }
    };
    const selectNode: React.MouseEventHandler = (event) => {
      event.stopPropagation();
      event.preventDefault();
      onNodeSelect?.(node);
      if (isExpandable) {
        toggleExpansion();
      } else {
        onNodeOpen(node);
      }
    };
    const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = () => {
      if (isExpandable) {
        toggleExpansion();
      } else {
        flowResult(
          ideStore.loadFile(
            node.data.li_attr.file,
            new FileCoordinate(
              node.data.li_attr.file,
              Number.parseInt(node.data.li_attr.line, 10),
              Number.parseInt(node.data.li_attr.column, 10),
            ),
          ),
        ).catch(applicationStore.alertUnhandledError);
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
            onClick={(event) => {
              event.stopPropagation();
              toggleExpansion();
            }}
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
        >
          {renderNodeLabel?.(node) ?? node.label}
        </button>
      </div>
    );
  },
);

const TestRunnerList = observer(
  (props: { testRunnerState: TestRunnerState }) => {
    const { testRunnerState } = props;
    const treeData = testRunnerState.getTreeData();
    const onNodeOpen = (node: TestTreeNode): void =>
      testRunnerState.setSelectedTestId(node.id);
    const renderNodeLabel = (node: TestTreeNode): React.ReactNode => {
      let path = node.id.split('__')[0];
      if (!path) {
        return node.label;
      }
      const parts = path.split('_');
      path = parts.slice(1, parts.length).join(ELEMENT_PATH_DELIMITER);

      return (
        <div className="test-runner-list__item__label">
          <div className="test-runner-list__item__label__name">
            {node.label}
          </div>
          <div className="test-runner-list__item__label__path">{path}</div>
        </div>
      );
    };

    return (
      <div className="explorer__content">
        {Array.from(testRunnerState.allTests.keys())
          .map((id) => treeData.nodes.get(id))
          .filter(isNonNullable)
          .map((node) => (
            <TestTreeNodeContainer
              key={node.id}
              node={node}
              level={0}
              onNodeSelect={noop()}
              innerProps={{
                testRunnerState,
                onNodeOpen,
                renderNodeLabel,
                onNodeExpand: noop(),
                onNodeCompress: noop(),
              }}
            />
          ))}
      </div>
    );
  },
);

const TestRunnerTree = observer(
  (props: { testRunnerState: TestRunnerState }) => {
    const { testRunnerState } = props;
    const treeData = testRunnerState.getTreeData();
    const isEmptyTree = treeData.nodes.size === 0;
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

    return (
      <div className="explorer__content">
        {isEmptyTree && <BlankPanelContent>No tests found</BlankPanelContent>}
        {!isEmptyTree && (
          <TreeView
            components={{
              TreeNodeContainer: TestTreeNodeContainer,
            }}
            treeData={treeData}
            onNodeSelect={noop()}
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
    );
  },
);

// NOTE: we need the global match hence, including /g in the regexp
const TEST_ERROR_LOCATION_PATTERN =
  /(?<path>resource:(?<path_sourceId>\/?(?:\w+\/)*\w+(?:\.\w+)*) (?:line:(?<path_line>\d+)) (?:column:(?<path_column>\d+)))/g;

type TestErrorLocationLink = monacoLanguagesAPI.ILink & {
  sourceId: string;
  line: string;
  column: string;
};

const TestResultConsole: React.FC<{
  result: TestResult | undefined;
  wrapText: boolean;
}> = (props) => {
  const { wrapText, result } = props;
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const locationLinkProviderDisposer = useRef<IDisposable | undefined>(
    undefined,
  );
  const textInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor && textInputRef.current) {
      const element = textInputRef.current;
      const newEditor = monacoEditorAPI.create(element, {
        ...getBaseCodeEditorOptions(),
        fontSize: 12,
        extraEditorClassName: 'monaco-editor--small-font',
        readOnly: true,
        glyphMargin: false,
        folding: false,
        lineNumbers: 'off',
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 0,
        minimap: {
          enabled: false,
        },
        guides: {
          bracketPairs: false,
          bracketPairsHorizontal: false,
          highlightActiveBracketPair: false,
          indentation: false,
          highlightActiveIndentation: false,
        },
        renderLineHighlight: 'none',
        theme: CODE_EDITOR_THEME.DEFAULT_DARK,
        language: CODE_EDITOR_LANGUAGE.TEXT,
      });
      setEditor(newEditor);
    }
  }, [applicationStore, editor]);

  if (editor) {
    locationLinkProviderDisposer.current?.dispose();
    locationLinkProviderDisposer.current =
      monacoLanguagesAPI.registerLinkProvider(CODE_EDITOR_LANGUAGE.TEXT, {
        provideLinks: (model) => {
          const links: TestErrorLocationLink[] = [];

          for (let i = 1; i <= model.getLineCount(); ++i) {
            Array.from(
              model.getLineContent(i).matchAll(TEST_ERROR_LOCATION_PATTERN),
            ).forEach((match) => {
              if (
                match.groups?.path &&
                match.groups.path_sourceId &&
                match.groups.path_column &&
                match.groups.path_line
              ) {
                links.push({
                  range: {
                    startLineNumber: i,
                    startColumn: match.index + 1,
                    endLineNumber: i,
                    endColumn: match.index + 1 + match.groups.path.length,
                  },
                  tooltip: 'Click to go to location',
                  sourceId: match.groups.path_sourceId,
                  line: match.groups.path_line,
                  column: match.groups.path_column,
                });
              }
            });
          }
          return {
            links,
          };
        },
        // NOTE: this is a hacky way to customize the behavior of clicking on a link
        // there is no good solution right now to intercept this cleanly and prevent the default behavior
        // this will produce a warning in the console since link resolved is not navigatable by monaco-editor
        resolveLink: (link) => {
          const locationLink = link as TestErrorLocationLink;
          flowResult(
            ideStore.loadFile(
              locationLink.sourceId,
              new FileCoordinate(
                locationLink.sourceId,
                Number.parseInt(locationLink.line, 10),
                Number.parseInt(locationLink.column, 10),
              ),
            ),
          ).catch(ideStore.applicationStore.alertUnhandledError);
          return undefined;
        },
      });
  }

  useEffect(() => {
    if (editor) {
      const value =
        result instanceof TestSuccessResult
          ? 'Test passed!'
          : result instanceof TestFailureResult
            ? result.error.text
            : 'Running...';
      editor.setValue(value);
      // color text based on test result/status
      if (
        result instanceof TestSuccessResult ||
        result instanceof TestFailureResult
      ) {
        editor.createDecorationsCollection([
          {
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: Number.MAX_SAFE_INTEGER,
              endColumn: Number.MAX_SAFE_INTEGER,
            },
            options: {
              inlineClassName:
                result instanceof TestSuccessResult
                  ? 'test-runner-panel__result__content--success'
                  : 'test-runner-panel__result__content--failure',
            },
          },
        ]);
      }
    }
  }, [editor, result]);

  useEffect(() => {
    if (editor) {
      editor.updateOptions({
        wordWrap: wrapText ? 'on' : 'off',
      });
    }
  }, [editor, wrapText]);

  // dispose editor
  useEffect(
    () => (): void => {
      if (editor) {
        disposeCodeEditor(editor);

        locationLinkProviderDisposer.current?.dispose();
      }
    },
    [editor],
  );

  return (
    <div className="code-editor__container">
      <div className="code-editor__body" ref={textInputRef} />
    </div>
  );
};

const TestResultViewer = observer(
  (props: {
    testRunnerState: TestRunnerState;
    testResultInfo: TestResultInfo;
    selectedTestId: string;
  }) => {
    const { testRunnerState, selectedTestId, testResultInfo } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const [wrapText, setWrapText] = useState(false);
    const result = testResultInfo.results.get(selectedTestId);
    const testInfo = guaranteeNonNullable(
      testRunnerState.allTests.get(selectedTestId),
      `Can't find info for test with ID '${selectedTestId}'`,
    );
    const goToFile = (): void => {
      flowResult(
        ideStore.loadFile(
          testInfo.li_attr.file,
          new FileCoordinate(
            testInfo.li_attr.file,
            Number.parseInt(testInfo.li_attr.line, 10),
            Number.parseInt(testInfo.li_attr.column, 10),
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);
    };

    return (
      <Panel>
        <PanelHeader title={testInfo.text}>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              className={clsx({
                'panel__header__action--active': wrapText,
              })}
              onClick={(): void => setWrapText(!wrapText)}
              title="Toggle Text Wrap"
            >
              <WordWrapIcon className="test-runner-panel__result__header__icon--text-wrap" />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem title="Open File" onClick={goToFile}>
              <GoToFileIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent className="test-runner-panel__result">
          <TestResultConsole result={result} wrapText={wrapText} />
        </PanelContent>
      </Panel>
    );
  },
);

const TestRunnerResultDisplay = observer(
  (props: { testRunnerState: TestRunnerState }) => {
    const { testRunnerState } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const numberOfTests = testRunnerState.testExecutionResult.count;
    const testResultInfo = testRunnerState.testResultInfo;
    const overallResult = testResultInfo?.suiteStatus ?? TestSuiteStatus.NONE;
    const runPercentage = testResultInfo?.runPercentage ?? 0;
    const collapseTree = (): void => testRunnerState.collapseTree();
    const expandTree = (): void => testRunnerState.expandTree();
    const runSuite = (): void => {
      flowResult(testRunnerState.rerunTestSuite()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const cancelTestRun = (): void => {
      flowResult(testRunnerState.cancelTestRun()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const toggleViewMode = (): void =>
      testRunnerState.setViewAsList(!testRunnerState.viewAsList);
    const removeTestResult = (): void => {
      flowResult(testRunnerState.cancelTestRun())
        .catch(applicationStore.alertUnhandledError)
        .finally(() => {
          ideStore.setTestRunnerState(undefined);
        });
    };

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
                    onClick={toggleViewMode}
                    title={
                      testRunnerState.viewAsList
                        ? 'View As Tree'
                        : 'View As List'
                    }
                  >
                    {testRunnerState.viewAsList ? (
                      <SubjectIcon className="test-runner-panel__icon--tree-view" />
                    ) : (
                      <ViewHeadlineIcon className="test-runner-panel__icon--list-view" />
                    )}
                  </button>
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
                    disabled={!ideStore.testRunState.isInProgress}
                    onClick={cancelTestRun}
                    title="Stop"
                  >
                    <BanIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={runSuite}
                    disabled={ideStore.testRunState.isInProgress}
                    title="Run Suite"
                  >
                    <PlayIcon />
                  </button>
                  <button
                    className="panel__header__action"
                    tabIndex={-1}
                    onClick={removeTestResult}
                    title="Reset"
                  >
                    <TimesIcon />
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
                  <>
                    {!testRunnerState.viewAsList && (
                      <TestRunnerTree testRunnerState={testRunnerState} />
                    )}
                    {testRunnerState.viewAsList && (
                      <TestRunnerList testRunnerState={testRunnerState} />
                    )}
                  </>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine
              color={
                ideStore.panelGroupDisplayState.isMaximized
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
  const ideStore = usePureIDEStore();
  const testRunnerState = ideStore.testRunnerState;

  return (
    <div className="test-runner-panel">
      {!testRunnerState && (
        <BlankPanelContent>
          <div className="panel-group__splash-screen">
            <div className="panel-group__splash-screen__content">
              <div className="panel-group__splash-screen__content__item">
                <div className="panel-group__splash-screen__content__item__label">
                  Run full test suite
                </div>
                <div className="panel-group__splash-screen__content__item__hot-keys">
                  <div className="hotkey__key">F10</div>
                </div>
              </div>
              <div className="panel-group__splash-screen__content__item">
                <div className="panel-group__splash-screen__content__item__label">
                  Run relevant tests only
                </div>
                <div className="panel-group__splash-screen__content__item__hot-keys">
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
