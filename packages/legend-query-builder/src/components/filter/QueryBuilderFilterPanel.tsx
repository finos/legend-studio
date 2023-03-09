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

import { useRef, useState, useCallback, forwardRef, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  clsx,
  ClickAwayListener,
  ContextMenu,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  BlankPanelPlaceholder,
  FilledTriangleIcon,
  CompressIcon,
  ExpandIcon,
  TrashIcon,
  NewFolderIcon,
  CircleIcon,
  CaretDownIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  TimesIcon,
  PanelDropZone,
  DragPreviewLayer,
  PanelEntryDropZonePlaceholder,
  useDragPreviewLayer,
  PanelContent,
} from '@finos/legend-art';
import {
  type QueryBuilderFilterConditionDragSource,
  type QueryBuilderFilterDropTarget,
  type QueryBuilderFilterTreeNodeData,
  QUERY_BUILDER_FILTER_DND_TYPE,
  FilterConditionState,
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeBlankConditionNodeData,
  QueryBuilderFilterTreeGroupNodeData,
} from '../../stores/filter/QueryBuilderFilterState.js';
import { useDrag, useDrop } from 'react-dnd';
import {
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import { QueryBuilderPropertyExpressionBadge } from '../QueryBuilderPropertyExpressionEditor.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  assertErrorThrown,
  debounce,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';
import { useApplicationStore } from '@finos/legend-application';
import type { ValueSpecification } from '@finos/legend-graph';
import {
  type QueryBuilderProjectionColumnDragSource,
  QueryBuilderSimpleProjectionColumnState,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderFilterOperator } from '../../stores/filter/QueryBuilderFilterOperator.js';
import { isTypeCompatibleForAssignment } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_GROUP_OPERATION } from '../../stores/QueryBuilderGroupOperationHelper.js';
import {
  BasicValueSpecificationEditor,
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
} from '../shared/BasicValueSpecificationEditor.js';

const QueryBuilderFilterGroupConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeGroupNodeData;
    isDragOver: boolean;
  }) => {
    const { node, isDragOver } = props;
    const switchOperation: React.MouseEventHandler<HTMLDivElement> = (
      event,
    ): void => {
      event.stopPropagation(); // prevent triggering selecting the node
      node.setGroupOperation(
        node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND
          ? QUERY_BUILDER_GROUP_OPERATION.OR
          : QUERY_BUILDER_GROUP_OPERATION.AND,
      );
    };
    return (
      <div className="query-builder-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isDragOver}
          label="Add to Logical Group"
          className="query-builder__dnd__placeholder"
        >
          <div
            className={clsx('query-builder-filter-tree__group-node', {
              'query-builder-filter-tree__group-node--and':
                node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND,
              'query-builder-filter-tree__group-node--or':
                node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.OR,
            })}
            title="Switch Operation"
            onClick={switchOperation}
          >
            <div className="query-builder-filter-tree__group-node__label">
              {node.groupOperation}
            </div>
            <button className="query-builder-filter-tree__group-node__action">
              <FilledTriangleIcon />
            </button>
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeConditionNodeData;
    isDragOver: boolean;
  }) => {
    const { node, isDragOver } = props;
    const graph =
      node.condition.filterState.queryBuilderState.graphManagerState.graph;
    const queryBuilderState = node.condition.filterState.queryBuilderState;
    const applicationStore = useApplicationStore();
    const changeOperator = (val: QueryBuilderFilterOperator) => (): void =>
      node.condition.changeOperator(val);
    const changeProperty = (
      propertyNode: QueryBuilderExplorerTreePropertyNodeData,
    ): void =>
      node.condition.changeProperty(
        buildPropertyExpressionFromExplorerTreeNodeData(
          propertyNode,
          queryBuilderState.explorerState,
        ),
      );
    // Drag and Drop on filter condition value
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        const parameterType = item.variable.genericType?.value.rawType;
        const conditionValueType =
          node.condition.propertyExpressionState.propertyExpression.func.value
            .genericType.value.rawType;
        if (isTypeCompatibleForAssignment(parameterType, conditionValueType)) {
          node.condition.setValue(item.variable);
        } else {
          applicationStore.notificationService.notifyWarning(
            `Incompatible parameter type ${parameterType?.name}. ${parameterType?.name} is not compatible with type ${conditionValueType.name}.`,
          );
        }
      },
      [applicationStore, node.condition],
    );
    const [{ isFilterValueDragOver }, dropConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isFilterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isFilterValueDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    const resetNode = (): void => {
      node.condition.setValue(
        node.condition.operator.getDefaultFilterConditionValue(node.condition),
      );
    };
    const debouncedTypeaheadSearch = useMemo(
      () =>
        debounce(
          (inputVal: string) => node.condition.handleTypeaheadSearch(),
          1000,
        ),
      [node],
    );
    const cleanUpReloadValues = (): void => {
      node.condition.typeaheadSearchState.complete();
    };
    const changeValueSpecification = (val: ValueSpecification): void => {
      node.condition.setValue(val);
    };
    const selectorConfig = {
      values: node.condition.typeaheadSearchResults,
      isLoading: node.condition.typeaheadSearchState.isInProgress,
      reloadValues: debouncedTypeaheadSearch,
      cleanUpReloadValues,
    };
    return (
      <div className="query-builder-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isDragOver}
          label="Add New Logical Group"
          className="query-builder__dnd__placeholder"
        >
          <div className="query-builder-filter-tree__condition-node">
            <div className="query-builder-filter-tree__condition-node__property">
              <QueryBuilderPropertyExpressionBadge
                propertyExpressionState={node.condition.propertyExpressionState}
                onPropertyExpressionChange={changeProperty}
              />
            </div>
            <DropdownMenu
              className="query-builder-filter-tree__condition-node__operator"
              title="Choose Operator..."
              content={
                <MenuContent>
                  {node.condition.operators.map((op) => (
                    <MenuContentItem
                      key={op.uuid}
                      className="query-builder-filter-tree__condition-node__operator__dropdown__option"
                      onClick={changeOperator(op)}
                    >
                      {op.getLabel(node.condition)}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                elevation: 7,
              }}
            >
              <div className="query-builder-filter-tree__condition-node__operator__label">
                {node.condition.operator.getLabel(node.condition)}
              </div>
              <div className="query-builder-filter-tree__condition-node__operator__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
            {node.condition.value && (
              <div
                ref={dropConnector}
                className="query-builder-filter-tree__condition-node__value"
              >
                <PanelEntryDropZonePlaceholder
                  showPlaceholder={isFilterValueDragOver}
                  label="Change Filter Value"
                  className="query-builder__dnd__placeholder"
                >
                  <BasicValueSpecificationEditor
                    valueSpecification={node.condition.value}
                    setValueSpecification={changeValueSpecification}
                    graph={graph}
                    obseverContext={queryBuilderState.observableContext}
                    typeCheckOption={{
                      expectedType:
                        node.condition.propertyExpressionState
                          .propertyExpression.func.value.genericType.value
                          .rawType,
                    }}
                    resetValue={resetNode}
                    selectorConfig={selectorConfig}
                    isConstant={queryBuilderState.constantState.isValueSpecConstant(
                      node.condition.value,
                    )}
                  />
                </PanelEntryDropZonePlaceholder>
              </div>
            )}
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterBlankConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeBlankConditionNodeData;
    isDragOver: boolean;
  }) => {
    const { isDragOver } = props;
    return (
      <div className="query-builder-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isDragOver}
          label="Create Condition"
          className="query-builder__dnd__placeholder"
        >
          <div className="query-builder-filter-tree__blank-node">blank</div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterConditionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderFilterTreeNodeData;
    }
  >(function QueryBuilderFilterConditionContextMenu(props, ref) {
    const { queryBuilderState, node } = props;
    const filterState = queryBuilderState.filterState;
    const removeNode = (): void => filterState.removeNodeAndPruneBranch(node);
    const createCondition = (): void => {
      filterState.suppressClickawayEventListener();
      filterState.addNodeFromNode(
        new QueryBuilderFilterTreeBlankConditionNodeData(undefined),
        node,
      );
    };
    const createGroupCondition = (): void => {
      filterState.suppressClickawayEventListener();
      filterState.addGroupConditionNodeFromNode(node);
    };
    const newGroupWithCondition = (): void => {
      filterState.suppressClickawayEventListener();
      filterState.newGroupWithConditionFromNode(undefined, node);
    };

    return (
      <MenuContent ref={ref}>
        {node instanceof QueryBuilderFilterTreeGroupNodeData && (
          <MenuContentItem onClick={createCondition}>
            Add New Condition
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderFilterTreeGroupNodeData && (
          <MenuContentItem onClick={createGroupCondition}>
            Add New Logical Group
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderFilterTreeConditionNodeData && (
          <MenuContentItem onClick={newGroupWithCondition}>
            Form a New Logical Group
          </MenuContentItem>
        )}
        <MenuContentItem onClick={removeNode}>Remove</MenuContentItem>
      </MenuContent>
    );
  }),
);

const QueryBuilderFilterTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderFilterTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { queryBuilderState } = innerProps;
    const ref = useRef<HTMLDivElement>(null);
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore();
    const filterState = queryBuilderState.filterState;
    const isExpandable = node instanceof QueryBuilderFilterTreeGroupNodeData;
    const selectNode = (): void => onNodeSelect?.(node);
    const toggleExpandNode = (): void => node.setIsOpen(!node.isOpen);
    const removeNode = (): void => filterState.removeNodeAndPruneBranch(node);

    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderFilterDropTarget, type: string): void => {
        if (
          Object.values<string>(QUERY_BUILDER_FILTER_DND_TYPE).includes(type)
        ) {
          // const dropNode = (item as QueryBuilderFilterConditionDragSource).node;
          // TODO: re-arrange
        } else {
          let filterConditionState: FilterConditionState;
          try {
            let propertyExpression;
            if (type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE) {
              if (
                (item as QueryBuilderProjectionColumnDragSource)
                  .columnState instanceof
                QueryBuilderSimpleProjectionColumnState
              ) {
                propertyExpression = (
                  (item as QueryBuilderProjectionColumnDragSource)
                    .columnState as QueryBuilderSimpleProjectionColumnState
                ).propertyExpressionState.propertyExpression;
              } else {
                throw new UnsupportedOperationError(
                  `Dragging and Dropping derivation projection column is not supported.`,
                );
              }
            } else {
              propertyExpression =
                buildPropertyExpressionFromExplorerTreeNodeData(
                  (item as QueryBuilderExplorerTreeDragSource).node,
                  filterState.queryBuilderState.explorerState,
                );
            }
            filterConditionState = new FilterConditionState(
              filterState,
              propertyExpression,
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notificationService.notifyWarning(error.message);
            return;
          }
          if (node instanceof QueryBuilderFilterTreeGroupNodeData) {
            filterState.addNodeFromNode(
              new QueryBuilderFilterTreeConditionNodeData(
                undefined,
                filterConditionState,
              ),
              node,
            );
          } else if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
            filterState.newGroupWithConditionFromNode(
              new QueryBuilderFilterTreeConditionNodeData(
                undefined,
                filterConditionState,
              ),
              node,
            );
          } else if (
            node instanceof QueryBuilderFilterTreeBlankConditionNodeData
          ) {
            filterState.replaceBlankNodeWithNode(
              new QueryBuilderFilterTreeConditionNodeData(
                undefined,
                filterConditionState,
              ),
              node,
            );
          }
        }
      },
      [applicationStore, filterState, node],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderFilterConditionDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept:
          queryBuilderState.TEMPORARY__isDnDFetchStructureToFilterSupported
            ? [
                ...Object.values(QUERY_BUILDER_FILTER_DND_TYPE),
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
                QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
              ]
            : [
                ...Object.values(QUERY_BUILDER_FILTER_DND_TYPE),
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
              ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    const [, dragConnector, dragPreviewConnector] =
      useDrag<QueryBuilderFilterConditionDragSource>(
        () => ({
          type:
            node instanceof QueryBuilderFilterTreeGroupNodeData
              ? QUERY_BUILDER_FILTER_DND_TYPE.GROUP_CONDITION
              : node instanceof QueryBuilderFilterTreeConditionNodeData
              ? QUERY_BUILDER_FILTER_DND_TYPE.CONDITION
              : QUERY_BUILDER_FILTER_DND_TYPE.BLANK_CONDITION,
          item: () => ({ node }),
          end: (): void => filterState.setRearrangingConditions(false),
        }),
        [node, filterState],
      );
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    // context menu
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    return (
      <ContextMenu
        content={
          <QueryBuilderFilterConditionContextMenu
            queryBuilderState={queryBuilderState}
            node={node}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          ref={ref}
          className={clsx(
            'tree-view__node__container query-builder-filter-tree__node__container',
            {
              'query-builder-filter-tree__node__container--no-hover':
                filterState.isRearrangingConditions,
              'query-builder-filter-tree__node__container--selected':
                node === filterState.selectedNode,
              'query-builder-filter-tree__node__container--selected-from-context-menu':
                isSelectedFromContextMenu,
            },
          )}
        >
          <div
            className="query-builder-filter-tree__node__content"
            style={{
              paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2) + 1.5}rem`,
              display: 'flex',
            }}
            onClick={selectNode}
          >
            {isExpandable && (
              <div
                className="query-builder-filter-tree__expand-icon"
                onClick={toggleExpandNode}
              >
                {node.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
              </div>
            )}
            <div
              className={clsx(
                'tree-view__node__label query-builder-filter-tree__node__label',
                {
                  'query-builder-filter-tree__node__label--expandable':
                    isExpandable,
                },
              )}
            >
              {node instanceof QueryBuilderFilterTreeGroupNodeData && (
                <QueryBuilderFilterGroupConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeConditionNodeData && (
                <QueryBuilderFilterConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeBlankConditionNodeData && (
                <QueryBuilderFilterBlankConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                />
              )}
            </div>
          </div>
          <div className="query-builder-filter-tree__node__actions">
            <button
              className="query-builder-filter-tree__node__action"
              tabIndex={-1}
              title="Remove"
              onClick={removeNode}
            >
              <TimesIcon />
            </button>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

const QueryBuilderFilterTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderFilterTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
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
        <QueryBuilderFilterTreeNodeContainer
          node={node}
          level={level + 1}
          stepPaddingInRem={stepPaddingInRem}
          onNodeSelect={onNodeSelect}
          innerProps={innerProps}
        />
        {node.isOpen &&
          getChildNodes(node).map((childNode) => (
            <QueryBuilderFilterTreeNodeView
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

const QueryBuilderFilterTree = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const filterState = queryBuilderState.filterState;
    const rootNodes = filterState.rootIds.map((rootId) =>
      filterState.getNode(rootId),
    );
    const onNodeSelect = (node: QueryBuilderFilterTreeNodeData): void =>
      filterState.setSelectedNode(node);
    const getChildNodes = (
      node: QueryBuilderFilterTreeNodeData,
    ): QueryBuilderFilterTreeNodeData[] =>
      node instanceof QueryBuilderFilterTreeGroupNodeData
        ? node.childrenIds.map((id) => filterState.getNode(id))
        : [];
    const onClickAway = (): void => filterState.handleClickaway();
    return (
      <ClickAwayListener onClickAway={onClickAway}>
        <div className="tree-view__node__root query-builder-filter-tree__root">
          {rootNodes.map((node) => (
            <QueryBuilderFilterTreeNodeView
              key={node.id}
              level={0}
              node={node}
              getChildNodes={getChildNodes}
              onNodeSelect={onNodeSelect}
              innerProps={{
                queryBuilderState,
              }}
            />
          ))}
        </div>
      </ClickAwayListener>
    );
  },
);

export const QueryBuilderFilterPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const filterState = queryBuilderState.filterState;
    const rootNode = filterState.getRootNode();
    const collapseTree = (): void => {
      filterState.setSelectedNode(undefined);
      filterState.collapseTree();
    };
    const expandTree = (): void => {
      filterState.setSelectedNode(undefined);
      filterState.expandTree();
    };
    const pruneTree = (): void => {
      filterState.suppressClickawayEventListener();
      filterState.pruneTree();
    };
    const simplifyTree = (): void => {
      filterState.suppressClickawayEventListener();
      filterState.simplifyTree();
    };
    const createCondition = (): void => {
      filterState.suppressClickawayEventListener();
      filterState.addNodeFromNode(
        new QueryBuilderFilterTreeBlankConditionNodeData(undefined),
        filterState.selectedNode,
      );
    };
    const allowGroupCreation =
      filterState.isEmpty || // either the tree is empty
      (filterState.selectedNode && // or a node is currently selected which is...
        (filterState.selectedNode !== rootNode || // either not a root node
          rootNode instanceof QueryBuilderFilterTreeGroupNodeData)); // or if it is the root note, it has to be a group node
    const createGroupCondition = (): void => {
      filterState.suppressClickawayEventListener();
      if (allowGroupCreation) {
        filterState.addGroupConditionNodeFromNode(filterState.selectedNode);
      }
    };
    const newGroupWithCondition = (): void => {
      filterState.suppressClickawayEventListener();
      if (
        filterState.selectedNode instanceof
        QueryBuilderFilterTreeConditionNodeData
      ) {
        filterState.newGroupWithConditionFromNode(
          undefined,
          filterState.selectedNode,
        );
      }
    };
    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderFilterDropTarget, type: string): void => {
        let filterConditionState: FilterConditionState;
        try {
          let propertyExpression;
          if (type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE) {
            if (
              (item as QueryBuilderProjectionColumnDragSource)
                .columnState instanceof QueryBuilderSimpleProjectionColumnState
            ) {
              propertyExpression = (
                (item as QueryBuilderProjectionColumnDragSource)
                  .columnState as QueryBuilderSimpleProjectionColumnState
              ).propertyExpressionState.propertyExpression;
            } else {
              throw new UnsupportedOperationError(
                `Dragging and Dropping derivation projection column is not supported.`,
              );
            }
          } else {
            propertyExpression =
              buildPropertyExpressionFromExplorerTreeNodeData(
                (item as QueryBuilderExplorerTreeDragSource).node,
                filterState.queryBuilderState.explorerState,
              );
          }
          filterConditionState = new FilterConditionState(
            filterState,
            propertyExpression,
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notificationService.notifyWarning(error.message);
          return;
        }
        // NOTE: unfocus the current node when DnD a new node to the tree
        filterState.setSelectedNode(undefined);
        filterState.addNodeFromNode(
          new QueryBuilderFilterTreeConditionNodeData(
            undefined,
            filterConditionState,
          ),
          undefined,
        );
      },
      [applicationStore, filterState],
    );
    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderExplorerTreeDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept:
          queryBuilderState.TEMPORARY__isDnDFetchStructureToFilterSupported
            ? [
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
                QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
              ]
            : [
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
              ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER}
        className="panel"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">filter</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={createCondition}
              tabIndex={-1}
              title="Create Condition"
            >
              <PlusIcon />
            </button>
            <button
              className="panel__header__action"
              disabled={
                !(
                  filterState.selectedNode instanceof
                  QueryBuilderFilterTreeConditionNodeData
                )
              }
              onClick={newGroupWithCondition}
              tabIndex={-1}
              title="Create Group From Condition"
            >
              <PlusCircleIcon />
            </button>
            <button
              className="panel__header__action"
              disabled={!allowGroupCreation}
              onClick={createGroupCondition}
              tabIndex={-1}
              title="Create Logical Group"
            >
              <NewFolderIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={pruneTree}
              tabIndex={-1}
              title="Cleanup Tree"
            >
              <TrashIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={simplifyTree}
              tabIndex={-1}
              title="Simplify Tree"
            >
              <CircleIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={collapseTree}
              tabIndex={-1}
              title="Collapse Tree"
            >
              <CompressIcon />
            </button>
            <button
              className="panel__header__action"
              onClick={expandTree}
              tabIndex={-1}
              title="Expand Tree"
            >
              <ExpandIcon />
            </button>
          </div>
        </div>
        <PanelContent>
          <PanelDropZone
            isDragOver={isDragOver}
            dropTargetConnector={dropTargetConnector}
          >
            {filterState.isEmpty && (
              <BlankPanelPlaceholder
                text="Add a filter condition"
                tooltipText="Drag and drop properties here"
              />
            )}
            {!filterState.isEmpty && (
              <>
                <DragPreviewLayer
                  labelGetter={(
                    item: QueryBuilderFilterConditionDragSource,
                  ): string => item.node.dragPreviewLabel}
                  types={Object.values(QUERY_BUILDER_FILTER_DND_TYPE)}
                />
                <QueryBuilderFilterTree queryBuilderState={queryBuilderState} />
              </>
            )}
          </PanelDropZone>
        </PanelContent>
      </div>
    );
  },
);
