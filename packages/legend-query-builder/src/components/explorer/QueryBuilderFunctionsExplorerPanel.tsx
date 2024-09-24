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

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TooltipPlacement,
  type TreeNodeContainerProps,
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
  ControlledDropdownMenu,
  MenuContent,
  CheckIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  MoreVerticalIcon,
  DragPreviewLayer,
  useDragPreviewLayer,
} from '@finos/legend-art';
import {
  type QueryBuilderFunctionsExplorerTreeNodeData,
  type QueryBuilderFunctionsExplorerDragSource,
  generateFunctionsExplorerTreeNodeData,
  getFunctionsExplorerTreeNodeChildren,
  QUERY_BUILDER_FUNCTION_DND_TYPE,
} from '../../stores/explorer/QueryFunctionsExplorerState.js';
import { useDrag } from 'react-dnd';
import {
  type FunctionAnalysisInfo,
  ConcreteFunctionDefinition,
  generateFunctionPrettyName,
  getElementRootPackage,
  Package,
  ROOT_PACKAGE_NAME,
  getMultiplicityDescription,
  CORE_PURE_PATH,
  PURE_DOC_TAG,
} from '@finos/legend-graph';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';

const isDependencyTreeNode = (
  node: QueryBuilderFunctionsExplorerTreeNodeData,
): boolean =>
  getElementRootPackage(node.packageableElement).name ===
  ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT;

const QueryBuilderFunctionInfoTooltip: React.FC<{
  element: ConcreteFunctionDefinition;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
  functionInfo?: FunctionAnalysisInfo | undefined;
}> = (props) => {
  const { element, children, placement, functionInfo } = props;
  const documentation = element.taggedValues
    .filter(
      (taggedValue) =>
        taggedValue.tag.ownerReference.value.path ===
          CORE_PURE_PATH.PROFILE_DOC &&
        taggedValue.tag.value.value === PURE_DOC_TAG,
    )
    .map((taggedValue) => taggedValue.value);

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
                .map((param) => {
                  const paramInfo = functionInfo?.parameterInfoList.filter(
                    (p) => p.name === param.name,
                  )[0];
                  if (paramInfo) {
                    return `${paramInfo.name}: ${
                      paramInfo.type
                    }${getMultiplicityDescription(paramInfo.multiplicity)}`;
                  } else {
                    return `${param.name}: ${
                      param.type.value.name
                    }${getMultiplicityDescription(param.multiplicity)}`;
                  }
                })
                .join('; ')}
            </div>
          </div>
          {Boolean(documentation.length) && (
            <div className="query-builder__tooltip__item">
              <div className="query-builder__tooltip__item__label">
                Documentation
              </div>
              <div className="query-builder__tooltip__item__value">
                {documentation.join('\n\n')}
              </div>
            </div>
          )}
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">
              Return Type
            </div>
            <div className="query-builder__tooltip__item__value">
              {functionInfo?.returnType ?? element.returnType.value.name}
            </div>
          </div>
        </div>
      }
    >
      <span>{children}</span>
    </Tooltip>
  );
};

const QueryBuilderFunctionsExplorerListEntry = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    element: ConcreteFunctionDefinition;
    rootPackageName: ROOT_PACKAGE_NAME;
  }) => {
    const { queryBuilderState, element, rootPackageName } = props;
    const node = generateFunctionsExplorerTreeNodeData(
      queryBuilderState,
      element,
      rootPackageName,
    );
    const functionInfo =
      queryBuilderState.functionsExplorerState.functionInfoMap?.get(
        element.path,
      );
    const functionPrettyName =
      functionInfo?.functionPrettyName ??
      generateFunctionPrettyName(element, {
        fullPath: true,
      });
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: QUERY_BUILDER_FUNCTION_DND_TYPE,
        item: { node: node },
      }),
      [node],
    );
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        className="query-builder__functions-explorer__function"
        ref={dragConnector}
      >
        <div className="query-builder__functions-explorer__function__content">
          <div className="query-builder__functions-explorer__function__icon">
            <div className="query-builder__functions-explorer__function-icon">
              <PURE_FunctionIcon />
            </div>
          </div>
          <div
            className="query-builder__functions-explorer__function__label"
            title={functionPrettyName}
          >
            {functionPrettyName}
          </div>
        </div>
        <div className="query-builder__functions-explorer__function__actions">
          <QueryBuilderFunctionInfoTooltip
            element={node.packageableElement as ConcreteFunctionDefinition}
            functionInfo={functionInfo}
          >
            <div className="query-builder__functions-explorer__function__action query-builder__functions-explorer__function__node__info">
              <InfoCircleIcon />
            </div>
          </QueryBuilderFunctionInfoTooltip>
        </div>
      </div>
    );
  },
);

const QueryBuilderFunctionsExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderFunctionsExplorerTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const isPackage = node.packageableElement instanceof Package;
    const functionInfo =
      innerProps.queryBuilderState.functionsExplorerState.functionInfoMap?.get(
        node.packageableElement.path,
      );
    const name =
      node.packageableElement instanceof ConcreteFunctionDefinition
        ? (functionInfo?.functionPrettyName.split(
            `${functionInfo.packagePath}::`,
          )[1] ?? generateFunctionPrettyName(node.packageableElement))
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

    const iconPackageColor = isDependencyTreeNode(node)
      ? 'color--dependency'
      : '';
    const nodeTypeIcon = isPackage ? (
      node.isOpen ? (
        <FolderOpenIcon className={iconPackageColor} />
      ) : (
        <FolderIcon className={iconPackageColor} />
      )
    ) : (
      <PURE_FunctionIcon />
    );
    const selectNode = (): void => {
      onNodeSelect?.(node);
    };
    const [, dragConnector, dragPreviewConnector] = useDrag<{
      node?: QueryBuilderFunctionsExplorerTreeNodeData;
    }>(
      () => ({
        type: QUERY_BUILDER_FUNCTION_DND_TYPE,
        item: () =>
          node.packageableElement instanceof ConcreteFunctionDefinition
            ? { node }
            : {},
      }),
      [node],
    );
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div>
        <div
          className="tree-view__node__container query-builder__functions-explorer__tree__node__container"
          onClick={selectNode}
          ref={!isExpandable ? dragConnector : undefined}
          style={{
            paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
            display: 'flex',
          }}
        >
          {
            <>
              <div className="tree-view__node__icon query-builder__functions-explorer__tree__node__icon">
                <div className="query-builder__functions-explorer__tree__expand-icon">
                  {nodeExpandIcon}
                </div>
                <div
                  className={
                    'query-builder__functions-explorer__tree__type-icon'
                  }
                >
                  {nodeTypeIcon}
                </div>
              </div>
              <div
                className="tree-view__node__label query-builder__functions-explorer__tree__node__label--with-action"
                title={name}
              >
                {name}
              </div>
              <div className="query-builder__functions-explorer__tree__node__actions">
                {node.packageableElement instanceof
                  ConcreteFunctionDefinition && (
                  <QueryBuilderFunctionInfoTooltip
                    element={node.packageableElement}
                    functionInfo={functionInfo}
                  >
                    <div className="query-builder__functions-explorer__tree__node__action query-builder__functions-explorer__tree__node__info">
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

const QueryBuilderPackableElementExplorerTree = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    rootPackageName: ROOT_PACKAGE_NAME;
    showDependencyFuncions: boolean;
  }) => {
    const { queryBuilderState, rootPackageName, showDependencyFuncions } =
      props;
    const queryFunctionsState = queryBuilderState.functionsExplorerState;
    const treeData = queryFunctionsState.nonNullableTreeData;
    const onNodeSelect = (
      node: QueryBuilderFunctionsExplorerTreeNodeData,
    ): void =>
      queryFunctionsState.onTreeNodeSelect(queryBuilderState, node, treeData);

    const getChildNodes = (
      node: QueryBuilderFunctionsExplorerTreeNodeData,
    ): QueryBuilderFunctionsExplorerTreeNodeData[] =>
      getFunctionsExplorerTreeNodeChildren(queryBuilderState, node, treeData);

    const dependencyTreeData = queryFunctionsState.getTreeData(
      ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT,
    );
    const onDependencyTreeSelect = (
      node: QueryBuilderFunctionsExplorerTreeNodeData,
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
      node: QueryBuilderFunctionsExplorerTreeNodeData,
    ): QueryBuilderFunctionsExplorerTreeNodeData[] => {
      if (dependencyTreeData) {
        return getFunctionsExplorerTreeNodeChildren(
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
              TreeNodeContainer: QueryBuilderFunctionsExplorerTreeNodeContainer,
            }}
            className="query-builder__functions-explorer__tree__root"
            treeData={treeData}
            onNodeSelect={onNodeSelect}
            getChildNodes={getChildNodes}
            innerProps={{
              queryBuilderState,
            }}
          />
        )}
        {rootPackageName === ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT &&
          dependencyTreeData &&
          showDependencyFuncions && (
            <>
              <TreeView
                components={{
                  TreeNodeContainer:
                    QueryBuilderFunctionsExplorerTreeNodeContainer,
                }}
                className="query-builder__functions-explorer__tree__root"
                treeData={dependencyTreeData}
                onNodeSelect={onDependencyTreeSelect}
                getChildNodes={getDependencyTreeChildNodes}
                innerProps={{
                  queryBuilderState,
                }}
              />
            </>
          )}
      </>
    );
  },
);

export const QueryBuilderFunctionsExplorerPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const queryFunctionsState = queryBuilderState.functionsExplorerState;
    const [viewAsTree, setViewAsTree] = useState(false);
    const [showDependencyFuncions, setShowDependencyFuncions] = useState(false);
    const toggleViewAsListOrAsTree = (): void => {
      setViewAsTree(!viewAsTree);
    };
    const collapseTree = (): void => {
      if (queryFunctionsState.treeData) {
        Array.from(queryFunctionsState.treeData.nodes.values()).forEach(
          (node) => {
            node.isOpen = false;
          },
        );
      }
      if (queryFunctionsState.dependencyTreeData) {
        Array.from(
          queryFunctionsState.dependencyTreeData.nodes.values(),
        ).forEach((node) => {
          node.isOpen = false;
        });
      }
      queryFunctionsState.refreshTree();
    };
    const toggleShowDependencyFunctions = (): void => {
      QueryBuilderTelemetryHelper.logEvent_TogglePanelFunctionExplorerDependencyView(
        queryBuilderState.applicationStore.telemetryService,
      );
      setShowDependencyFuncions(!showDependencyFuncions);
    };

    useEffect(() => {
      QueryBuilderTelemetryHelper.logEvent_RenderPanelFunctionExplorer(
        queryBuilderState.applicationStore.telemetryService,
      );
    }, [queryBuilderState.applicationStore]);

    return (
      <div className="panel query-builder__functions-explorer">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">functions</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={collapseTree}
              tabIndex={-1}
            >
              {viewAsTree && <CompressIcon title="Collapse Tree" />}
            </button>
            <div className="panel__header__action query-builder__functions-explorer__custom-icon">
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
            <ControlledDropdownMenu
              className="panel__header__action"
              title="Show Options Menu..."
              content={
                <MenuContent>
                  <MenuContentItem onClick={toggleShowDependencyFunctions}>
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
              <MoreVerticalIcon className="query-builder__icon__more-options" />
            </ControlledDropdownMenu>
          </div>
        </div>
        <div className="panel__content query-builder__functions-explorer__content">
          <DragPreviewLayer
            labelGetter={(
              item: QueryBuilderFunctionsExplorerDragSource,
            ): string => {
              const functionInfo =
                queryBuilderState.functionsExplorerState.functionInfoMap?.get(
                  item.node.packageableElement.path,
                );
              return (
                functionInfo?.functionPrettyName ??
                generateFunctionPrettyName(
                  item.node.packageableElement as ConcreteFunctionDefinition,
                  { fullPath: true },
                )
              );
            }}
            types={[QUERY_BUILDER_FUNCTION_DND_TYPE]}
          />
          {((showDependencyFuncions &&
            (!queryFunctionsState.dependencyTreeData ||
              queryFunctionsState.dependencyTreeData.rootIds.length === 0)) ||
            !showDependencyFuncions) &&
            queryFunctionsState.treeData?.rootIds.length === 0 && (
              <BlankPanelContent>
                No user-defined functions available
              </BlankPanelContent>
            )}
          {/* tree view */}
          {viewAsTree && (
            <>
              {queryFunctionsState.treeData && (
                <QueryBuilderPackableElementExplorerTree
                  queryBuilderState={queryBuilderState}
                  rootPackageName={ROOT_PACKAGE_NAME.MAIN}
                  showDependencyFuncions={showDependencyFuncions}
                />
              )}
              {showDependencyFuncions &&
                queryFunctionsState.dependencyTreeData &&
                queryFunctionsState.dependencyTreeData.rootIds.length !== 0 && (
                  <QueryBuilderPackableElementExplorerTree
                    queryBuilderState={queryBuilderState}
                    rootPackageName={ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT}
                    showDependencyFuncions={showDependencyFuncions}
                  />
                )}
            </>
          )}
          {/* list view */}
          {!viewAsTree && (
            <>
              {queryFunctionsState.functionExplorerStates.map(
                (funcExplorerState) => (
                  <QueryBuilderFunctionsExplorerListEntry
                    key={funcExplorerState.uuid}
                    queryBuilderState={queryBuilderState}
                    element={funcExplorerState.concreteFunctionDefinition}
                    rootPackageName={ROOT_PACKAGE_NAME.MAIN}
                  />
                ),
              )}
              {showDependencyFuncions &&
                queryFunctionsState.dependencyTreeData &&
                queryFunctionsState.dependencyTreeData.rootIds.length !== 0 && (
                  <>
                    {queryFunctionsState.treeData?.rootIds.length !== 0 && (
                      <div className="query-builder__functions-explorer__separator" />
                    )}
                    {queryFunctionsState.dependencyFunctionExplorerStates.map(
                      (funcExplorerState) => (
                        <QueryBuilderFunctionsExplorerListEntry
                          key={funcExplorerState.uuid}
                          queryBuilderState={queryBuilderState}
                          element={funcExplorerState.concreteFunctionDefinition}
                          rootPackageName={
                            ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT
                          }
                        />
                      ),
                    )}
                  </>
                )}
            </>
          )}
        </div>
      </div>
    );
  },
);
