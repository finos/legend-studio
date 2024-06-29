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

import { useEffect } from 'react';
import {
  type TreeNodeContainerProps,
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
  ControlledDropdownMenu,
  BlankPanelContent,
  PanelContent,
  ModalHeader,
  Modal,
  ModalBody,
  ModalFooter,
  PanelSideBarHeader,
  ModalFooterButton,
  PanelHeader,
  Panel,
  PanelDivider,
  Button,
} from '@finos/legend-art';
import { isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import {
  ExecutionNodeTreeNodeData,
  ExecutionPlanViewTreeNodeData,
  EXECUTION_PLAN_VIEW_MODE,
  type ExecutionPlanState,
  generateExecutionNodeTreeNodeData,
  PLAN_TABS,
} from '../../stores/execution-plan/ExecutionPlanState.js';
import { observer } from 'mobx-react-lite';
import {
  ExecutionPlan,
  ExecutionNode,
  SQLExecutionNode,
  RelationalTDSInstantiationExecutionNode,
  FunctionParametersValidationNode,
  AllocationExecutionNode,
  ConstantExecutionNode,
  SequenceExecutionNode,
  type RawExecutionPlan,
  StoreMappingGlobalGraphFetchExecutionNode,
  PureExpressionPlatformExecutionNode,
  RelationalClassQueryTempTableGraphFetchExecutionNode,
  RelationalRootQueryTempTableGraphFetchExecutionNode,
  RelationalCrossRootQueryTempTableGraphFetchExecutionNode,
  RelationalGraphFetchExecutionNode,
  JavaPlatformImplementation,
  RootGraphFetchTree,
  PropertyGraphFetchTree,
  LocalGraphFetchExecutionNode,
} from '@finos/legend-graph';
import { SQLExecutionNodeViewer } from './SQLExecutionNodeViewer.js';
import { StoreMappingGlobalGraphFetchExecutionNodeViewer } from './StoreMappingGlobalGraphFetchExecutionNodeViewer.js';
import { FunctionParametersValidationNodeViewer } from './FunctionParametersValidationNodeViewer.js';
import { AllocationExecutionNodeViewer } from './AllocationExecutionNodeViewer.js';
import { ConstantExecutionNodeViewer } from './ConstantExecutionNodeViewer.js';
import { SequenceExecutionNodeViewer } from './SequenceExecutionNodeViewer.js';
import { RelationalTDSInstantiationExecutionNodeViewer } from './RelationalTDSInstantiationExecutionNodeViewer.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { RelationalRootQueryTempTableGraphFetchExecutionNodeViewer } from './RelationalRootQueryTempTableGraphFetchExecutionNodeViewer.js';
import { RelationalClassQueryTempTableGraphFetchExecutionNodeViewer } from './RelationalClassQueryTempTableGraphFetchExecutionNodeViewer.js';
import { RelationalCrossRootQueryTempTableGraphFetchExecutionNodeViewer } from './RelationalCrossRootQueryTempTableGraphFetchExecutionNodeViewer.js';

const EXECUTION_PLAN = 'Execution Plan';

const generateExecutionNodePrefixLabel = (node: ExecutionNode): string => {
  if (
    node instanceof StoreMappingGlobalGraphFetchExecutionNode ||
    node instanceof LocalGraphFetchExecutionNode
  ) {
    if (node.graphFetchTree instanceof RootGraphFetchTree) {
      return node.graphFetchTree.class.value.name;
    }
    if (node.graphFetchTree instanceof PropertyGraphFetchTree) {
      return node.graphFetchTree.property.value.name;
    }
  }
  return '';
};

/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */
export const generateExecutionNodeLabel = (type: ExecutionNode): string => {
  if (type instanceof SQLExecutionNode) {
    return `SQL Execution Node`;
  } else if (type instanceof RelationalTDSInstantiationExecutionNode) {
    return `Relational TDS Instantiation Execution Node`;
  } else if (type instanceof FunctionParametersValidationNode) {
    return `Function Parameters Validation Node`;
  } else if (type instanceof AllocationExecutionNode) {
    return `Allocation Execution Node (${type.varName})`;
  } else if (type instanceof ConstantExecutionNode) {
    return `Constant Execution Node`;
  } else if (type instanceof SequenceExecutionNode) {
    return `Sequence Execution Node`;
  } else if (type instanceof StoreMappingGlobalGraphFetchExecutionNode) {
    return `Store Mapping Global Graph Fetch Execution Node`;
  } else if (
    type instanceof RelationalRootQueryTempTableGraphFetchExecutionNode
  ) {
    return `Relational Root Query TempTable Graph Fetch Execution Node`;
  } else if (
    type instanceof RelationalCrossRootQueryTempTableGraphFetchExecutionNode
  ) {
    return `Relational Cross Root Query TempTable Graph Fetch Execution Node`;
  } else if (
    type instanceof RelationalClassQueryTempTableGraphFetchExecutionNode
  ) {
    return `Relational Class Query TempTable Graph Fetch Execution Node`;
  } else if (type instanceof PureExpressionPlatformExecutionNode) {
    return `Pure Expression Platform Execution Node`;
  } else {
    return 'Other';
  }
};

export const ExecutionPlanViewerPanelContent: React.FC<{
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { executionPlanState } = props;
  const globalImplementationSupport =
    executionPlanState.plan?.globalImplementationSupport;
  const templateFunctions =
    executionPlanState.plan?.processingTemplateFunctions ?? [];
  const isDarkMode =
    !executionPlanState.applicationStore.layoutService
      .TEMPORARY__isLightColorThemeEnabled;

  if (
    globalImplementationSupport &&
    globalImplementationSupport instanceof JavaPlatformImplementation
  ) {
    globalImplementationSupport.classes.sort((a, b) =>
      (a.package + a.name).toLowerCase() > (b.package + b.name).toLowerCase()
        ? 1
        : -1,
    );
    if (
      globalImplementationSupport.classes.length > 0 &&
      globalImplementationSupport.classes[0] &&
      executionPlanState.globalImplementationSupportState.selectedJavaClass ===
        undefined
    ) {
      executionPlanState.globalImplementationSupportState.setSelectedJavaClass(
        `${globalImplementationSupport.classes[0]?.package}.${globalImplementationSupport.classes[0]?.name}`,
      );
    }
  }

  return (
    <div className="query-builder__execution-plan-form--editor">
      <div className="panel">
        <div className="panel__header query-builder__execution-plan-form--editor__header--with-tabs">
          <div className="uml-element-editor__tabs">
            {Object.values(PLAN_TABS).map((tab) => (
              <div
                key={tab}
                onClick={() =>
                  executionPlanState.globalImplementationSupportState.setSelectedTab(
                    tab,
                  )
                }
                className={clsx(
                  'query-builder__execution-plan-form--editor__tab',
                  {
                    'query-builder__execution-plan-form--editor__tab--active':
                      tab ===
                      executionPlanState.globalImplementationSupportState
                        .selectedTab,
                  },
                )}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        {executionPlanState.globalImplementationSupportState.selectedTab ===
          PLAN_TABS.GLOBAL_IMPLEMENTATION_SUPPORT &&
          globalImplementationSupport &&
          globalImplementationSupport instanceof JavaPlatformImplementation && (
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={30} size={400}>
                <PanelContent
                  darkMode={isDarkMode}
                  className="query-builder__java__container__panel"
                >
                  <div className="query-builder__java__container">
                    <div>
                      {globalImplementationSupport.classes.map((cl) => (
                        <div
                          className={clsx(
                            'query-builder__java__container__item',
                            {
                              'query-builder__java__container__item--active':
                                `${cl.package}.${cl.name}` ===
                                executionPlanState
                                  .globalImplementationSupportState
                                  .selectedJavaClass,
                            },
                          )}
                          key={cl.package + cl.name}
                        >
                          <button
                            className="query-builder__java__container__item__btn"
                            onClick={() =>
                              executionPlanState.globalImplementationSupportState.setSelectedJavaClass(
                                `${cl.package}.${cl.name}`,
                              )
                            }
                            tabIndex={-1}
                            title={`Go to ${cl.package}.${cl.name}`}
                          >
                            {`${cl.package}.${cl.name}`}
                          </button>
                        </div>
                      ))}
                      <PanelDivider />
                    </div>
                  </div>
                </PanelContent>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                {executionPlanState.globalImplementationSupportState
                  .selectedJavaClass && (
                  <CodeEditor
                    inputValue={globalImplementationSupport.classes.reduce(
                      (value, cl) => {
                        if (
                          executionPlanState.globalImplementationSupportState
                            .selectedJavaClass === `${cl.package}.${cl.name}`
                        ) {
                          return cl.source;
                        }
                        return value;
                      },
                      '',
                    )}
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.JAVA}
                    hideMinimap={true}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        {executionPlanState.globalImplementationSupportState.selectedTab ===
          PLAN_TABS.GENERAL &&
          templateFunctions.length > 0 && (
            <>
              <div className="query-builder__template--function--editor__header">
                {`AuthDependent: ${executionPlanState.plan?.authDependent.toString()}`}
              </div>
              <div className="query-builder__template--function--editor__title">
                Template Functions
              </div>
              <div className="query-builder__template--function--editor__code">
                <CodeEditor
                  inputValue={templateFunctions.reduce(
                    (total, func) => (total += `${func}\n`),
                    '',
                  )}
                  isReadOnly={true}
                  language={CODE_EDITOR_LANGUAGE.XML}
                  hideMinimap={true}
                  hideActionBar={true}
                />
              </div>
              <div className="query-builder__template--function--editor__json">
                <Button
                  className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
                  onClick={(): void =>
                    executionPlanState.setViewMode(
                      EXECUTION_PLAN_VIEW_MODE.JSON,
                    )
                  }
                  text="View JSON"
                />
              </div>
            </>
          )}
      </div>
    </div>
  );
});

const ExecutionNodeElementTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
      {
        onNodeExpand: (
          node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
        ) => void;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect } = props;
    const isExpandable = Boolean(node.childrenIds?.length);
    const selectNode = (): void => onNodeSelect?.(node);
    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    let details = '';
    let prefixLabel = '';
    const STORE_MAPPING_LABEL = `Store Mapping Global Graph Fetch Execution Node`;
    if (node instanceof ExecutionNodeTreeNodeData) {
      if (node.parentNodeId === STORE_MAPPING_LABEL) {
        if (
          node.executionNode instanceof
          StoreMappingGlobalGraphFetchExecutionNode
        ) {
          details = 'Cross';
        } else if (node.executionNode instanceof LocalGraphFetchExecutionNode) {
          details = 'Local';
        }
      }
      prefixLabel = generateExecutionNodePrefixLabel(node.executionNode);
    }

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
          <div className="tree-view__node__expand-icon">{nodeExpandIcon}</div>
        </div>
        {details !== '' && (
          <div className="execution-plan-viewer__node__sub-type">
            <div className="execution-plan-viewer__node__sub-type__label">
              {details}
            </div>
          </div>
        )}
        {prefixLabel !== '' && (
          <div className="execution-plan-viewer__node__type">
            <div className="execution-plan-viewer__node__type__label">
              {prefixLabel}
            </div>
          </div>
        )}
        <button
          className="tree-view__node__label execution-plan-viewer__explorer-tree__node__label"
          tabIndex={-1}
          title={node.id}
        >
          {node.label}
        </button>
      </div>
    );
  },
);

export const ExecutionPlanTree = observer(
  (props: {
    executionPlanState: ExecutionPlanState;
    executionPlan: ExecutionPlan;
  }) => {
    const { executionPlanState } = props;

    const onNodeExpand = (
      node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
    ): void => {
      if (node.childrenIds?.length) {
        node.setIsOpen(!node.isOpen);
        if (node instanceof ExecutionPlanViewTreeNodeData) {
          const rootNode = node.executionPlan.rootExecutionNode;
          const rootNodeTreeNode = generateExecutionNodeTreeNodeData(
            rootNode,
            generateExecutionNodeLabel(rootNode),
            node,
          );
          executionPlanState.setTreeNode(rootNodeTreeNode.id, rootNodeTreeNode);
        } else if (node instanceof ExecutionNodeTreeNodeData) {
          if (node.executionNode.executionNodes.length > 0) {
            node.executionNode.executionNodes.forEach((exen) => {
              const executionNodeTreeNode = generateExecutionNodeTreeNodeData(
                exen,
                generateExecutionNodeLabel(exen),
                node,
              );
              executionPlanState.setTreeNode(
                executionNodeTreeNode.id,
                executionNodeTreeNode,
              );
            });
          }
          if (
            node.executionNode instanceof
            StoreMappingGlobalGraphFetchExecutionNode
          ) {
            const localNode = node.executionNode.localGraphFetchExecutionNode;
            const localNodeTreeData = generateExecutionNodeTreeNodeData(
              localNode,
              generateExecutionNodeLabel(localNode),
              node,
            );
            executionPlanState.setTreeNode(
              localNodeTreeData.id,
              localNodeTreeData,
            );
            node.executionNode.children.forEach((childExecutionNode) => {
              const executionNodeTreeNode = generateExecutionNodeTreeNodeData(
                childExecutionNode,
                generateExecutionNodeLabel(childExecutionNode),
                node,
              );
              executionPlanState.setTreeNode(
                executionNodeTreeNode.id,
                executionNodeTreeNode,
              );
            });
          }
          if (node.executionNode instanceof RelationalGraphFetchExecutionNode) {
            node.executionNode.children.forEach((childExecutionNode) => {
              const executionNodeTreeNode = generateExecutionNodeTreeNodeData(
                childExecutionNode,
                generateExecutionNodeLabel(childExecutionNode),
                node,
              );
              executionPlanState.setTreeNode(
                executionNodeTreeNode.id,
                executionNodeTreeNode,
              );
            });
          }
        }
      }

      executionPlanState.refreshTreeData();
    };

    const onNodeSelect = (
      node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
    ): void => {
      if (node instanceof ExecutionPlanViewTreeNodeData) {
        executionPlanState.transformMetadataToProtocolJson(node.executionPlan);
      } else if (node instanceof ExecutionNodeTreeNodeData) {
        executionPlanState.transformMetadataToProtocolJson(node.executionNode);
      }
      if (!(node.isOpen === true && node.isSelected === false)) {
        onNodeExpand(node);
      }
      executionPlanState.setSelectedNode(node);
    };

    const getChildNodes = (
      node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
    ): (ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData)[] => {
      if (!node.childrenIds || node.childrenIds.length === 0) {
        return [];
      }
      const childrenNodes = node.childrenIds
        .map((id) => executionPlanState.nonNullableTreeData.nodes.get(id))
        .filter(isNonNullable);
      return childrenNodes;
    };
    return (
      <TreeView
        components={{
          TreeNodeContainer: ExecutionNodeElementTreeNodeContainer,
        }}
        treeData={executionPlanState.nonNullableTreeData}
        getChildNodes={getChildNodes}
        onNodeSelect={onNodeSelect}
        innerProps={{
          onNodeExpand,
        }}
      />
    );
  },
);

export const ExecutionNodeViewer = observer(
  (props: {
    executionNode: ExecutionNode;
    executionPlanState: ExecutionPlanState;
    viewJson?: boolean | undefined;
  }) => {
    const { executionNode, executionPlanState, viewJson } = props;
    if (executionNode instanceof SQLExecutionNode) {
      return (
        <SQLExecutionNodeViewer
          query={executionNode.sqlQuery}
          resultColumns={executionNode.resultColumns}
          resultType={executionNode.resultType}
          executionPlanState={executionPlanState}
          viewJson={viewJson}
        />
      );
    }
    if (executionNode instanceof RelationalTDSInstantiationExecutionNode) {
      return (
        <RelationalTDSInstantiationExecutionNodeViewer
          node={executionNode}
          executionPlanState={executionPlanState}
        />
      );
    }
    if (executionNode instanceof FunctionParametersValidationNode) {
      return (
        <FunctionParametersValidationNodeViewer
          functionParameters={executionNode.functionParameters}
          parameterValidationContext={executionNode.parameterValidationContext}
          executionPlanState={executionPlanState}
          resultType={executionNode.resultType}
        />
      );
    }
    if (executionNode instanceof AllocationExecutionNode) {
      return (
        <AllocationExecutionNodeViewer
          node={executionNode}
          executionPlanState={executionPlanState}
        />
      );
    }
    if (executionNode instanceof ConstantExecutionNode) {
      return (
        <ConstantExecutionNodeViewer
          cnode={executionNode}
          executionPlanState={executionPlanState}
        />
      );
    }
    if (executionNode instanceof SequenceExecutionNode) {
      return (
        <SequenceExecutionNodeViewer
          node={executionNode}
          executionPlanState={executionPlanState}
          viewJson={viewJson}
        />
      );
    }
    if (executionNode instanceof StoreMappingGlobalGraphFetchExecutionNode) {
      return (
        <StoreMappingGlobalGraphFetchExecutionNodeViewer
          storeMappingNode={executionNode}
          executionPlanState={executionPlanState}
        />
      );
    }
    if (
      executionNode instanceof
      RelationalCrossRootQueryTempTableGraphFetchExecutionNode
    ) {
      return (
        <RelationalCrossRootQueryTempTableGraphFetchExecutionNodeViewer
          node={executionNode}
          executionPlanState={executionPlanState}
        />
      );
    }
    if (
      executionNode instanceof
      RelationalRootQueryTempTableGraphFetchExecutionNode
    ) {
      return (
        <RelationalRootQueryTempTableGraphFetchExecutionNodeViewer
          node={executionNode}
          executionPlanState={executionPlanState}
        />
      );
    }
    if (
      executionNode instanceof
      RelationalClassQueryTempTableGraphFetchExecutionNode
    ) {
      return (
        <RelationalClassQueryTempTableGraphFetchExecutionNodeViewer
          node={executionNode}
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

    useEffect(() => {
      if (executionPlanState.selectedNode === undefined) {
        const firstNode =
          executionPlanState.treeData?.nodes.get(EXECUTION_PLAN);
        if (firstNode instanceof ExecutionPlanViewTreeNodeData) {
          executionPlanState.transformMetadataToProtocolJson(
            firstNode.executionPlan,
          );
          executionPlanState.setSelectedNode(firstNode);
        }
      }
    }, [executionPlanState]);
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
              <ControlledDropdownMenu
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
              </ControlledDropdownMenu>
            </div>
            <div className="panel__content execution-plan-viewer__panel__content">
              {executionPlanState.viewMode === EXECUTION_PLAN_VIEW_MODE.JSON &&
                Boolean(displayData) && (
                  <CodeEditor
                    inputValue={displayData}
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.JSON}
                    hideMinimap={true}
                  />
                )}
              {executionPlanState.viewMode ===
                EXECUTION_PLAN_VIEW_MODE.FORM && (
                <>
                  {currentElement instanceof ExecutionNode && (
                    <ExecutionNodeViewer
                      executionNode={currentElement}
                      executionPlanState={executionPlanState}
                      viewJson={true}
                    />
                  )}
                  {currentElement instanceof ExecutionPlan && (
                    <ExecutionPlanViewerPanelContent
                      executionPlanState={executionPlanState}
                    />
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
    const isDarkMode =
      !executionPlanState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    return (
      <div className="execution-plan-viewer__content">
        {plan ? (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={300} minSize={300}>
              <div className="panel execution-plan-viewer__explorer">
                <PanelSideBarHeader
                  darkMode={isDarkMode}
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
              <ResizablePanelSplitterLine
                color={
                  isDarkMode
                    ? 'var(--color-dark-grey-200)'
                    : 'var(--color-legacylight-light-grey-300)'
                }
              />
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
      executionPlanState.initialize(undefined);
      executionPlanState.setExecutionPlanDisplayData('');
      executionPlanState.setSelectedNode(undefined);
      executionPlanState.setDebugText(undefined);
      executionPlanState.globalImplementationSupportState.setSelectedTab(
        PLAN_TABS.GENERAL,
      );
      executionPlanState.globalImplementationSupportState.setSelectedJavaClass(
        undefined,
      );
    };
    const rawPlan = executionPlanState.rawPlan;
    const isDarkMode =
      !executionPlanState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

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
        <Modal className="editor-modal" darkMode={isDarkMode}>
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
                  <ResizablePanelSplitterLine
                    color={
                      isDarkMode
                        ? 'var(--color-dark-grey-200)'
                        : 'var(--color-legacylight-light-grey-300)'
                    }
                  />
                </ResizablePanelSplitter>
                <ResizablePanel size={200} minSize={28}>
                  <Panel className="panel execution-plan-viewer__debug-panel">
                    <PanelHeader
                      title="DEBUG LOG"
                      keepTitleFormat={true}
                      darkMode={isDarkMode}
                    />
                    <PanelContent>
                      <CodeEditor
                        inputValue={executionPlanState.debugText}
                        isReadOnly={true}
                        language={CODE_EDITOR_LANGUAGE.TEXT}
                      />
                    </PanelContent>
                  </Panel>
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
            <ModalFooterButton
              onClick={closePlanViewer}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
