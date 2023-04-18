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

import { useState } from 'react';
import {
  type TreeNodeContainerProps,
  type TreeData,
  Dialog,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanel,
  ResizablePanelSplitterLine,
  clsx,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
  MenuContentItem,
  MenuContent,
  DropdownMenu,
  BlankPanelContent,
  PanelContent,
  ModalHeader,
  Modal,
  ModalBody,
  ModalFooter,
  PanelSideBarHeader,
  ModalFooterButton,
} from '@finos/legend-art';
import {
  addUniqueEntry,
  filterByType,
  isNonNullable,
} from '@finos/legend-shared';
import {
  ExecutionNodeTreeNodeData,
  ExecutionPlanViewTreeNodeData,
  EXECUTION_PLAN_VIEW_MODE,
  type ExecutionPlanState,
} from '../../stores/execution-plan/ExecutionPlanState.js';
import { observer } from 'mobx-react-lite';
import {
  ExecutionPlan,
  ExecutionNode,
  SQLExecutionNode,
  RelationalTDSInstantiationExecutionNode,
  type RawExecutionPlan,
} from '@finos/legend-graph';
import { SQLExecutionNodeViewer } from './SQLExecutionNodeViewer.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  CODE_EDITOR_LANGUAGE,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';

/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */
const generateExecutionNodeLabel = (type: ExecutionNode): string => {
  if (type instanceof SQLExecutionNode) {
    return `SQL Execution Node`;
  } else if (type instanceof RelationalTDSInstantiationExecutionNode) {
    return `Relational TDS Instantiation Execution Node`;
  } else {
    return 'Other';
  }
};

const generateExecutionNodeTreeNodeData = (
  executionNode: ExecutionNode,
  label: string,
  parentNode:
    | ExecutionNodeTreeNodeData
    | ExecutionPlanViewTreeNodeData
    | undefined,
): ExecutionNodeTreeNodeData => {
  const executionNodeTreeNode = new ExecutionNodeTreeNodeData(
    executionNode._UUID,
    label,
    executionNode,
  );

  const childrenIds: string[] = [];

  executionNode.executionNodes
    .slice()
    .filter(filterByType(ExecutionNode))
    .forEach((childExecutionNode) => {
      addUniqueEntry(childrenIds, childExecutionNode._UUID);
    });

  executionNodeTreeNode.childrenIds = childrenIds;

  return executionNodeTreeNode;
};

const generateExecutionPlanTreeNodeData = (
  executionPlan: ExecutionPlan,
): ExecutionPlanViewTreeNodeData => {
  const executionPlanNode = new ExecutionPlanViewTreeNodeData(
    `Execution Plan`,
    `Execution Plan`,
    executionPlan,
  );

  const childrenIds: string[] = [];

  const rootNodeId = executionPlan.rootExecutionNode._UUID;
  addUniqueEntry(childrenIds, rootNodeId);
  executionPlanNode.childrenIds = childrenIds;
  return executionPlanNode;
};

const getExecutionPlanTreeData = (
  executionPlan: ExecutionPlan,
): TreeData<ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<
    string,
    ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData
  >();
  const executionPlanTreeNode =
    generateExecutionPlanTreeNodeData(executionPlan);
  addUniqueEntry(rootIds, executionPlanTreeNode.id);
  nodes.set(executionPlanTreeNode.id, executionPlanTreeNode);
  return { rootIds, nodes };
};

const ExecutionNodeElementTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
    {
      onNodeExpand: (
        node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
      ) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { onNodeExpand } = innerProps;
  const isExpandable = Boolean(node.childrenIds?.length);
  const selectNode = (): void => onNodeSelect?.(node);
  const expandNode = (): void => onNodeExpand(node);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );

  return (
    <div
      className={clsx(
        'tree-view__node__container execution-plan-viewer__explorer-tree__node__container',
        {
          'menu__trigger--on-menu-open': !node.isSelected,
        },
        {
          'execution-plan-viewer__explorer-tree__node__container--selected':
            node.isSelected,
        },
      )}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
      }}
      onClick={selectNode}
    >
      <div className="tree-view__node__icon">
        <div className="tree-view__node__expand-icon" onClick={expandNode}>
          {nodeExpandIcon}
        </div>
      </div>
      <button
        className="tree-view__node__label execution-plan-viewer__explorer-tree__node__label"
        tabIndex={-1}
        title={node.id}
      >
        {node.label}
      </button>
    </div>
  );
};

export const ExecutionPlanTree: React.FC<{
  executionPlanState: ExecutionPlanState;
  executionPlan: ExecutionPlan;
}> = (props) => {
  const { executionPlanState, executionPlan } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<
    TreeData<ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData>
  >(() => getExecutionPlanTreeData(executionPlan));
  const onNodeSelect = (
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): void => {
    if (node instanceof ExecutionPlanViewTreeNodeData) {
      executionPlanState.transformMetadataToProtocolJson(node.executionPlan);
    } else if (node instanceof ExecutionNodeTreeNodeData) {
      executionPlanState.transformMetadataToProtocolJson(node.executionNode);
    }
    executionPlanState.setSelectedNode(node);
  };

  const onNodeExpand = (
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node instanceof ExecutionPlanViewTreeNodeData) {
        const rootNode = node.executionPlan.rootExecutionNode;
        const rootNodeTreeNode = generateExecutionNodeTreeNodeData(
          rootNode,
          generateExecutionNodeLabel(rootNode),
          node,
        );
        treeData.nodes.set(rootNodeTreeNode.id, rootNodeTreeNode);
      } else if (node instanceof ExecutionNodeTreeNodeData) {
        if (node.executionNode.executionNodes.length > 0) {
          node.executionNode.executionNodes.forEach((exen) => {
            const executionNodeTreeNode = generateExecutionNodeTreeNodeData(
              exen,
              generateExecutionNodeLabel(exen),
              node,
            );

            treeData.nodes.set(executionNodeTreeNode.id, executionNodeTreeNode);
          });
        }
      }
    }

    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): (ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData)[] => {
    if (!node.childrenIds || node.childrenIds.length === 0) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable);

    return childrenNodes;
  };
  return (
    <TreeView
      components={{
        TreeNodeContainer: ExecutionNodeElementTreeNodeContainer,
      }}
      treeData={treeData}
      getChildNodes={getChildNodes}
      onNodeSelect={onNodeSelect}
      innerProps={{
        onNodeExpand,
      }}
    />
  );
};

const ExecutionNodeViewer = observer(
  (props: {
    executionNode: ExecutionNode;
    executionPlanState: ExecutionPlanState;
  }) => {
    const { executionNode, executionPlanState } = props;
    if (executionNode instanceof SQLExecutionNode) {
      return (
        <SQLExecutionNodeViewer
          query={executionNode.sqlQuery}
          resultColumns={executionNode.resultColumns}
          executionPlanState={executionPlanState}
        />
      );
    }
    return (
      <BlankPanelContent>
        <div className="execution-node-viewer__unsupported-view">
          <div className="execution-node-viewer__unsupported-view__summary">
            {`Can't display execution node`}
          </div>
          <button
            className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
            onClick={(): void =>
              executionPlanState.setViewMode(EXECUTION_PLAN_VIEW_MODE.JSON)
            }
          >
            View JSON
          </button>
        </div>
      </BlankPanelContent>
    );
  },
);

const ExecutionPlanViewPanel = observer(
  (props: { displayData: string; executionPlanState: ExecutionPlanState }) => {
    const { displayData, executionPlanState } = props;
    let currentElement;
    if (executionPlanState.selectedNode !== undefined) {
      if (
        executionPlanState.selectedNode instanceof ExecutionPlanViewTreeNodeData
      ) {
        currentElement = executionPlanState.selectedNode.executionPlan;
      } else if (
        executionPlanState.selectedNode instanceof ExecutionNodeTreeNodeData
      ) {
        currentElement = executionPlanState.selectedNode.executionNode;
      }
    }
    const nativeViewModes = Object.values(EXECUTION_PLAN_VIEW_MODE);

    return (
      <div className="execution-plan-viewer__panel">
        {executionPlanState.selectedNode !== undefined && (
          <>
            <div className="panel__header execution-plan-viewer__panel__header">
              <div className="execution-plan-viewer__panel__header__tabs">
                <button className="execution-plan-viewer__panel__header__tab execution-plan-viewer__panel__header__tab--active">
                  {executionPlanState.selectedNode.label}
                </button>
              </div>
              <DropdownMenu
                className="execution-plan-viewer__panel__view-mode__type"
                title="View as..."
                content={
                  <MenuContent className="execution-plan-viewer__panel__view-mode__options execution-plan-viewer__panel__view-mode__options--with-group">
                    <div className="execution-plan-viewer__panel__view-mode__option__group execution-plan-viewer__panel__view-mode__option__group--native">
                      <div className="execution-plan-viewer__panel__view-mode__option__group__name">
                        native
                      </div>
                      <div className="execution-plan-viewer__panel__view-mode__option__group__options">
                        {nativeViewModes.map((mode) => (
                          <MenuContentItem
                            key={mode}
                            className="execution-plan-viewer__panel__view-mode__option"
                            onClick={(): void =>
                              executionPlanState.setViewMode(mode)
                            }
                          >
                            {mode}
                          </MenuContentItem>
                        ))}
                      </div>
                    </div>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <div className="execution-plan-viewer__panel__view-mode__type__label">
                  {executionPlanState.viewMode}
                </div>
              </DropdownMenu>
            </div>
            <div className="panel__content execution-plan-viewer__panel__content">
              {executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.JSON &&
                Boolean(displayData) && (
                  <CodeEditor
                    inputValue={displayData}
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.JSON}
                    showMiniMap={false}
                  />
                )}
              {executionPlanState.viewMode ===
                EXECUTION_PLAN_VIEW_MODE.FORM && (
                <>
                  {currentElement instanceof ExecutionNode && (
                    <ExecutionNodeViewer
                      executionNode={currentElement}
                      executionPlanState={executionPlanState}
                    />
                  )}
                  {currentElement instanceof ExecutionPlan && (
                    <BlankPanelContent>
                      <div className="execution-plan-viewer__unsupported-view">
                        <div className="execution-plan-viewer__unsupported-view__summary">
                          {`Can't display full execution plan`}
                        </div>
                        <button
                          className="btn--dark execution-plan-viewer__unsupported-view__to-text-mode__btn"
                          onClick={(): void =>
                            executionPlanState.setViewMode(
                              EXECUTION_PLAN_VIEW_MODE.JSON,
                            )
                          }
                        >
                          View JSON
                        </button>
                      </div>
                    </BlankPanelContent>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  },
);

const ExecutionPlanViewerContent = observer(
  (props: {
    executionPlanState: ExecutionPlanState;
    rawPlan: RawExecutionPlan;
  }) => {
    const { executionPlanState, rawPlan } = props;
    const plan = executionPlanState.plan;

    return (
      <div className="execution-plan-viewer__content">
        {plan ? (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={300} minSize={300}>
              <div className="panel execution-plan-viewer__explorer">
                <PanelSideBarHeader
                  darkMode={true}
                  title="execution plan explorer"
                />
                <div className="panel__content execution-plan-viewer__explorer__content__container">
                  <ExecutionPlanTree
                    executionPlanState={executionPlanState}
                    executionPlan={plan}
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <ExecutionPlanViewPanel
                displayData={executionPlanState.displayData}
                executionPlanState={executionPlanState}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <CodeEditor
            inputValue={JSON.stringify(rawPlan, undefined, DEFAULT_TAB_SIZE)}
            isReadOnly={true}
            language={CODE_EDITOR_LANGUAGE.JSON}
            showMiniMap={true}
          />
        )}
      </div>
    );
  },
);

export const ExecutionPlanViewer = observer(
  (props: { executionPlanState: ExecutionPlanState }) => {
    const { executionPlanState } = props;
    const closePlanViewer = (): void => {
      executionPlanState.setRawPlan(undefined);
      executionPlanState.setPlan(undefined);
      executionPlanState.setExecutionPlanDisplayData('');
      executionPlanState.setSelectedNode(undefined);
      executionPlanState.setDebugText(undefined);
    };
    const rawPlan = executionPlanState.rawPlan;

    if (!rawPlan) {
      return null;
    }
    return (
      <Dialog
        open={Boolean(executionPlanState.rawPlan)}
        onClose={closePlanViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal className="editor-modal" darkMode={true}>
          <ModalHeader title="Execution Plan" />
          <ModalBody>
            {executionPlanState.debugText ? (
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel minSize={100}>
                  <ExecutionPlanViewerContent
                    executionPlanState={executionPlanState}
                    rawPlan={rawPlan}
                  />
                </ResizablePanel>
                <ResizablePanelSplitter>
                  <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                </ResizablePanelSplitter>
                <ResizablePanel size={200} minSize={28}>
                  <div className="panel execution-plan-viewer__debug-panel">
                    <div className="panel__header">
                      <div className="panel__header__title">
                        <div className="panel__header__title__label">
                          DEBUG LOG
                        </div>
                      </div>
                    </div>
                    <PanelContent>
                      <CodeEditor
                        inputValue={executionPlanState.debugText}
                        isReadOnly={true}
                        language={CODE_EDITOR_LANGUAGE.TEXT}
                        showMiniMap={true}
                      />
                    </PanelContent>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <ExecutionPlanViewerContent
                executionPlanState={executionPlanState}
                rawPlan={rawPlan}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton onClick={closePlanViewer} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
