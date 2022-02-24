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
  type TooltipPlacement,
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  ExpandIcon,
  FolderIcon,
  FolderOpenIcon,
  InfoCircleIcon,
  SubjectIcon,
  Tooltip,
  ViewHeadlineIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PURE_FunctionIcon,
  CompressIcon,
  TreeView,
  BlankPanelContent,
  MenuContentItem,
  DropdownMenu,
  MenuContent,
  CheckIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  MoreVerticalIcon,
  Divider,
  clsx,
} from '@finos/legend-art';
import {
  type QueryBuilderPackageElementTreeNodeData,
  type QueryBuilderFunctionDragSource,
  QUERY_BUILDER_FUNCTION_TREE_DND_TYPE,
  generateQueryBuilderPackableElementTreeNodeData,
  getTreeChildNodes,
  generateFunctionSignature,
} from '../stores/QueryFunctionsState';
import { useDrag, useDragLayer } from 'react-dnd';
import {
  ConcreteFunctionDefinition,
  Package,
  ROOT_PACKAGE_NAME,
} from '@finos/legend-graph';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useEffect, useState } from 'react';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { getMultiplicityDescription } from './shared/QueryBuilderUtils';

const QueryBuilderFunctionInfoTooltip: React.FC<{
  element: ConcreteFunctionDefinition;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { element, children, placement } = props;
  return (
    <Tooltip
      arrow={true}
      {...(placement !== undefined ? { placement } : {})}
      classes={{
        tooltip: 'query-builder__tooltip',
        arrow: 'query-builder__tooltip__arrow',
        tooltipPlacementRight: 'query-builder__tooltip--right',
      }}
      TransitionProps={{
        timeout: 0,
      }}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Function Name
            </div>
            <div className="query-builder__tooltip__item__value">
              {element.path}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Parameters
            </div>
            <div className="query-builder__tooltip__item__value">
              {element.parameters
                .map(
                  (t) =>
                    `${t.name}: ${
                      t.type.value.name
                    }${getMultiplicityDescription(t.multiplicity)}`,
                )
                .join('; ')}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Documentation
            </div>
            <div className="query-builder__tooltip__item__value">
              {element.taggedValues
                .filter((t) => t.tag.value.owner.name === 'doc')
                .map((t) => t.value)
                .join('; ')}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Tagged Values
            </div>
            <div className="query-builder__tooltip__item__value">
              {element.taggedValues
                .filter((t) => t.tag.value.owner.name !== 'doc')
                .map((t) => t.value)
                .join('; ')}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              StereoTypes
            </div>
            <div className="query-builder__tooltip__item__value">
              {element.stereotypes.map((s) => s.value.value).join('; ')}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Return Type
            </div>
            <div className="query-builder__tooltip__item__value">
              {element.returnType.value.name}
            </div>
          </div>
        </div>
      }
    >
      <span>{children}</span>
    </Tooltip>
  );
};

const QueryBuilderFunctionDragLayer = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { itemType, item, isDragging, currentPosition } = useDragLayer(
      (monitor) => ({
        itemType: monitor.getItemType() as QUERY_BUILDER_FUNCTION_TREE_DND_TYPE,
        item: monitor.getItem() as QueryBuilderFunctionDragSource | null,
        isDragging: monitor.isDragging(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentPosition: monitor.getClientOffset(),
      }),
    );
    if (
      !isDragging ||
      !item ||
      !Object.values(QUERY_BUILDER_FUNCTION_TREE_DND_TYPE).includes(itemType) ||
      item.node.dndType === QUERY_BUILDER_FUNCTION_TREE_DND_TYPE.PACKAGE
    ) {
      return null;
    }
    return (
      <div className="query-builder-function-explorer-tree__drag-preview-layer">
        <div
          className="query-builder-function-explorer-tree__drag-preview"
          style={
            !currentPosition
              ? { display: 'none' }
              : {
                  transform: `translate(${currentPosition.x + 20}px, ${
                    currentPosition.y + 10
                  }px)`,
                }
          }
        >
          {generateFunctionSignature(
            item.node.packageableElement as ConcreteFunctionDefinition,
            true,
          )}
        </div>
      </div>
    );
  },
);

const QueryBuilderSimplePackableElementTreeNodeContainer = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    element: ConcreteFunctionDefinition;
    rootPackageName: ROOT_PACKAGE_NAME;
  }) => {
    const { queryBuilderState, element, rootPackageName } = props;
    const node = generateQueryBuilderPackableElementTreeNodeData(
      queryBuilderState,
      element,
      rootPackageName,
    );
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: QUERY_BUILDER_FUNCTION_TREE_DND_TYPE.FUNCTION,
        item: { node: node },
      }),
      [node],
    );
    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div className="query-builder__functions__function" ref={dragConnector}>
        <div className="query-builder__functions__function__content">
          <div className="query-builder__functions__function__icon">
            <div className="query-builder__functions__function-icon">
              <PURE_FunctionIcon />
            </div>
          </div>
          <div className="query-builder__functions__function__label">
            {generateFunctionSignature(element, true)}
          </div>
        </div>
        <div className="query-builder__functions__function__actions">
          <div className="query-builder__functions__function__action">
            <QueryBuilderFunctionInfoTooltip
              element={node.packageableElement as ConcreteFunctionDefinition}
            >
              <div className="query-builder__functions__function__action query-builder__functions__function__node__info">
                <InfoCircleIcon />
              </div>
            </QueryBuilderFunctionInfoTooltip>
          </div>
        </div>
      </div>
    );
  },
);

const QueryBuilderFunctionExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderPackageElementTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
        fromDependency: boolean;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { fromDependency } = innerProps;
    const isPackage = node.packageableElement instanceof Package;
    const name =
      node.packageableElement instanceof ConcreteFunctionDefinition
        ? generateFunctionSignature(node.packageableElement, false)
        : node.packageableElement.name;
    const isExpandable = Boolean(node.childrenIds.length);
    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const nodeTypeIcon = isPackage ? (
      node.isOpen ? (
        <FolderOpenIcon
          className={clsx({
            'query-builder-function-explorer-tree__icon': !fromDependency,
            'query-builder-function-explorer-tree__dependency-icon':
              fromDependency,
          })}
        />
      ) : (
        <FolderIcon
          className={clsx({
            'query-builder-function-explorer-tree__icon': !fromDependency,
            'query-builder-function-explorer-tree__dependency-icon':
              fromDependency,
          })}
        />
      )
    ) : (
      <PURE_FunctionIcon />
    );
    const selectNode = (): void => onNodeSelect?.(node);
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type:
          node.packageableElement instanceof ConcreteFunctionDefinition
            ? QUERY_BUILDER_FUNCTION_TREE_DND_TYPE.FUNCTION
            : QUERY_BUILDER_FUNCTION_TREE_DND_TYPE.PACKAGE,
        item: (): { node?: QueryBuilderPackageElementTreeNodeData } =>
          node.packageableElement instanceof ConcreteFunctionDefinition
            ? { node }
            : {},
      }),
      [node],
    );
    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div>
        <div
          className="tree-view__node__container query-builder-function-explorer-tree__node__container"
          onClick={selectNode}
          ref={!isExpandable ? dragConnector : undefined}
          style={{
            paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
            display: 'flex',
          }}
        >
          {
            <>
              <div className="tree-view__node__icon query-builder-function-explorer-tree__node__icon">
                <div className="query-builder-function-explorer-tree__expand-icon">
                  {nodeExpandIcon}
                </div>
                <div
                  className={'query-builder-function-explorer-tree__type-icon'}
                >
                  {nodeTypeIcon}
                </div>
              </div>
              <div className="tree-view__node__label query-builder-function-explorer-tree__node__label--with-action">
                {name}
              </div>
              <div className="query-builder-function-explorer-tree__node__actions">
                {node.packageableElement instanceof
                  ConcreteFunctionDefinition && (
                  <QueryBuilderFunctionInfoTooltip
                    element={node.packageableElement}
                  >
                    <div className="query-builder-function-explorer-tree__node__action query-builder-function-explorer-tree__node__info">
                      <InfoCircleIcon />
                    </div>
                  </QueryBuilderFunctionInfoTooltip>
                )}
              </div>
            </>
          }
        </div>
      </div>
    );
  },
);

const QueryBuilderFunctionExplorerTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderPackageElementTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
        fromDependency: boolean;
      }
    >,
  ) => {
    const {
      node,
      level,
      onNodeSelect,
      getChildNodes,
      stepPaddingInRem,
      innerProps,
    } = props;

    return (
      <div className="tree-view__node__block">
        <QueryBuilderFunctionExplorerTreeNodeContainer
          node={node}
          level={level + 1}
          stepPaddingInRem={stepPaddingInRem}
          onNodeSelect={onNodeSelect}
          innerProps={innerProps}
        />
        {node.isOpen &&
          getChildNodes(node).map((childNode) => (
            <QueryBuilderFunctionExplorerTreeNodeView
              key={childNode.id}
              node={childNode}
              level={level + 1}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={innerProps}
            />
          ))}
      </div>
    );
  },
);

const QueryBuilderPackableElementExplorerTree = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    rootPackageName: ROOT_PACKAGE_NAME;
    showDependencyFuncions: boolean;
  }) => {
    const { queryBuilderState, rootPackageName, showDependencyFuncions } =
      props;
    const queryFunctionsState = queryBuilderState.queryFunctionsState;
    const treeData = queryFunctionsState.nonNullableTreeData;
    const onNodeSelect = (node: QueryBuilderPackageElementTreeNodeData): void =>
      queryFunctionsState.onTreeNodeSelect(queryBuilderState, node, treeData);

    const getChildNodes = (
      node: QueryBuilderPackageElementTreeNodeData,
    ): QueryBuilderPackageElementTreeNodeData[] =>
      getTreeChildNodes(queryBuilderState, node, treeData);

    const dependencyTreeData = queryFunctionsState.getTreeData(
      ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
    );
    const onDependencyTreeSelect = (
      node: QueryBuilderPackageElementTreeNodeData,
    ): void => {
      if (dependencyTreeData) {
        queryFunctionsState.onTreeNodeSelect(
          queryBuilderState,
          node,
          dependencyTreeData,
          ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
        );
      }
    };

    const getDependencyTreeChildNodes = (
      node: QueryBuilderPackageElementTreeNodeData,
    ): QueryBuilderPackageElementTreeNodeData[] => {
      if (dependencyTreeData) {
        return getTreeChildNodes(
          queryBuilderState,
          node,
          dependencyTreeData,
          ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
        );
      }
      return [];
    };

    return (
      <>
        {rootPackageName === ROOT_PACKAGE_NAME.MAIN && (
          <TreeView
            components={{
              TreeNodeContainer: QueryBuilderFunctionExplorerTreeNodeContainer,
              TreeNodeView: QueryBuilderFunctionExplorerTreeNodeView,
            }}
            className="query-builder-function-explorer-tree__root"
            treeData={treeData}
            onNodeSelect={onNodeSelect}
            getChildNodes={getChildNodes}
            innerProps={{
              queryBuilderState,
              fromDependency: false,
            }}
          />
        )}
        {rootPackageName === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT &&
          dependencyTreeData &&
          showDependencyFuncions && (
            <>
              <Divider variant="middle" sx={{ bgcolor: 'lightblue' }} />
              <TreeView
                components={{
                  TreeNodeContainer:
                    QueryBuilderFunctionExplorerTreeNodeContainer,
                  TreeNodeView: QueryBuilderFunctionExplorerTreeNodeView,
                }}
                className="query-builder-function-explorer-tree__root"
                treeData={dependencyTreeData}
                onNodeSelect={onDependencyTreeSelect}
                getChildNodes={getDependencyTreeChildNodes}
                innerProps={{
                  queryBuilderState,
                  fromDependency: true,
                }}
              />
            </>
          )}
      </>
    );
  },
);

export const QueryBuilderFunctionPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const queryFunctionsState = queryBuilderState.queryFunctionsState;
    const [viewAsTree, setViewAsTree] = useState(false);
    const [expandTree, setExpandTree] = useState(true);
    const [showDependencyFuncions, setShowDependencyFuncions] = useState(false);
    const toggleViewAsListOrAsTree = (): void => {
      setViewAsTree(!viewAsTree);
    };
    const expandOrCollapseTree = (): void => {
      if (queryFunctionsState.treeData) {
        Array.from(queryFunctionsState.treeData.nodes.values()).forEach(
          (node) => {
            node.isOpen = expandTree;
          },
        );
        if (queryFunctionsState.dependencyTreeData) {
          Array.from(
            queryFunctionsState.dependencyTreeData.nodes.values(),
          ).forEach((node) => {
            node.isOpen = expandTree;
          });
        }
        setExpandTree(!expandTree);
        queryFunctionsState.refreshTree();
      }
    };
    const toggleShowDependencyFuncions = (): void => {
      setShowDependencyFuncions(!showDependencyFuncions);
    };

    return (
      <div className="panel query-builder__functions">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">functions</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={expandOrCollapseTree}
              tabIndex={-1}
            >
              {viewAsTree &&
                (!expandTree ? (
                  <CompressIcon title="Collapse Tree" />
                ) : (
                  <ExpandIcon title="Expand Tree" />
                ))}
            </button>
            <div className="panel__header__action">
              {!viewAsTree ? (
                <SubjectIcon
                  title="View as Tree"
                  onClick={toggleViewAsListOrAsTree}
                />
              ) : (
                <ViewHeadlineIcon
                  title="View as List"
                  onClick={toggleViewAsListOrAsTree}
                />
              )}
            </div>
            <DropdownMenu
              className="panel__header__action"
              content={
                <MenuContent>
                  <MenuContentItem onClick={toggleShowDependencyFuncions}>
                    <MenuContentItemIcon>
                      {showDependencyFuncions ? <CheckIcon /> : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show functions from dependency projects
                    </MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                elevation: 7,
              }}
            >
              <MoreVerticalIcon
                title="Show Options Menu..."
                className="query-builder__icon__more-options"
              />
            </DropdownMenu>
          </div>
        </div>
        <div className="panel__content query-builder__functions__content">
          <QueryBuilderFunctionDragLayer
            queryBuilderState={queryBuilderState}
          />
          {((showDependencyFuncions &&
            (!queryFunctionsState.dependencyTreeData ||
              queryFunctionsState.dependencyTreeData.rootIds.length === 0)) ||
            !showDependencyFuncions) &&
            queryFunctionsState.treeData?.rootIds.length === 0 && (
              <BlankPanelContent>No user-defined functions</BlankPanelContent>
            )}
          {/* tree view */}
          {viewAsTree && queryFunctionsState.treeData && (
            <QueryBuilderPackableElementExplorerTree
              queryBuilderState={queryBuilderState}
              rootPackageName={ROOT_PACKAGE_NAME.MAIN}
              showDependencyFuncions={showDependencyFuncions}
            />
          )}
          {viewAsTree &&
            showDependencyFuncions &&
            queryFunctionsState.dependencyTreeData &&
            queryFunctionsState.dependencyTreeData.rootIds.length !== 0 && (
              <QueryBuilderPackableElementExplorerTree
                queryBuilderState={queryBuilderState}
                rootPackageName={ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT}
                showDependencyFuncions={showDependencyFuncions}
              />
            )}
          {/* list view */}
          {!viewAsTree &&
            queryFunctionsState.concreteFunctionDefinitionStates.map(
              (funcState) => (
                <QueryBuilderSimplePackableElementTreeNodeContainer
                  key={funcState.uuid}
                  queryBuilderState={queryBuilderState}
                  element={funcState.concreteFunctionDefinition}
                  rootPackageName={ROOT_PACKAGE_NAME.MAIN}
                />
              ),
            )}
          {!viewAsTree &&
            showDependencyFuncions &&
            queryFunctionsState.dependencyTreeData &&
            queryFunctionsState.dependencyTreeData.rootIds.length !== 0 && (
              <>
                <Divider variant="middle" sx={{ bgcolor: 'lightblue' }} />
                {queryFunctionsState.dependencyConcreteFunctionDefinitionStates.map(
                  (funcState) => (
                    <QueryBuilderSimplePackableElementTreeNodeContainer
                      key={funcState.uuid}
                      queryBuilderState={queryBuilderState}
                      element={funcState.concreteFunctionDefinition}
                      rootPackageName={
                        ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT
                      }
                    />
                  ),
                )}
              </>
            )}
        </div>
      </div>
    );
  },
);
