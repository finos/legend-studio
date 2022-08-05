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

import { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
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
  BrushIcon,
  NewFolderIcon,
  CircleIcon,
  CaretDownIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  type QueryBuilderFilterConditionDragSource,
  type QueryBuilderFilterDropTarget,
  type QueryBuilderFilterTreeNodeData,
  type QueryBuilderFilterOperator,
  QUERY_BUILDER_FILTER_DND_TYPE,
  FilterConditionState,
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeBlankConditionNodeData,
  QueryBuilderFilterTreeGroupNodeData,
} from '../stores/QueryBuilderFilterState.js';
import {
  type DropTargetMonitor,
  useDragLayer,
  useDrag,
  useDrop,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import {
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../stores/QueryBuilderExplorerState.js';
import { QueryBuilderPropertyExpressionBadge } from './QueryBuilderPropertyExpressionEditor.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  assertErrorThrown,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';
import {
  useApplicationStore,
  BasicValueSpecificationEditor,
} from '@finos/legend-application';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_TREE_DND_TYPE,
} from '../stores/QueryParametersState.js';
import {
  isTypeCompatibleWithConditionValueType,
  QUERY_BUILDER_GROUP_OPERATION,
} from '../stores/QueryBuilderOperatorsHelper.js';
import type { ValueSpecification } from '@finos/legend-graph';
import {
  type QueryBuilderProjectionColumnDragSource,
  QueryBuilderSimpleProjectionColumnState,
  QUERY_BUILDER_PROJECTION_DND_TYPE,
} from '../stores/QueryBuilderProjectionState.js';

const FilterConditionDragLayer: React.FC = () => {
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType() as QUERY_BUILDER_FILTER_DND_TYPE,
      item: monitor.getItem<QueryBuilderFilterConditionDragSource | null>(),
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentPosition: monitor.getClientOffset(),
    }),
  );

  if (
    !isDragging ||
    !item ||
    !Object.values(QUERY_BUILDER_FILTER_DND_TYPE).includes(itemType)
  ) {
    return null;
  }
  return (
    <div className="query-builder-filter-tree__drag-preview-layer">
      <div
        className="query-builder-filter-tree__drag-preview"
        // added some offset so the mouse doesn't overlap the label too much
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
        {item.node.dragLayerLabel}
      </div>
    </div>
  );
};

const QueryBuilderFilterGroupConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeGroupNodeData;
    isPropertyDragOver: boolean;
  }) => {
    const { node, isPropertyDragOver } = props;
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
      <div className="query-builder-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-filter-tree__node__dnd__overlay">
            Add to Logical Group
          </div>
        )}
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
      </div>
    );
  },
);

const QueryBuilderFilterConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeConditionNodeData;
    isPropertyDragOver: boolean;
  }) => {
    const { node, isPropertyDragOver } = props;
    const graph =
      node.condition.filterState.queryBuilderState.graphManagerState.graph;
    const applicationStore = useApplicationStore();
    const changeOperator = (val: QueryBuilderFilterOperator) => (): void =>
      node.condition.changeOperator(val);
    const changeProperty = (
      propertyNode: QueryBuilderExplorerTreePropertyNodeData,
    ): void =>
      node.condition.changeProperty(
        buildPropertyExpressionFromExplorerTreeNodeData(
          node.condition.filterState.queryBuilderState.explorerState
            .nonNullableTreeData,
          propertyNode,
          graph,
          node.condition.filterState.queryBuilderState.explorerState
            .propertySearchPanelState.allMappedPropertyNodes,
        ),
      );
    // Drag and Drop on filter condition value
    const handleDrop = useCallback(
      (item: QueryBuilderParameterDragSource): void => {
        const parameterType =
          item.variable.parameter.genericType?.value.rawType;
        const conditionValueType =
          node.condition.propertyExpressionState.propertyExpression.func
            .genericType.value.rawType;
        if (
          isTypeCompatibleWithConditionValueType(
            parameterType,
            conditionValueType,
          )
        ) {
          node.condition.setValue(item.variable.parameter);
        } else {
          applicationStore.notifyWarning(
            `Incompatible parameter type ${parameterType?.name}. ${parameterType?.name} is not compatible with type ${conditionValueType.name}.`,
          );
        }
      },
      [applicationStore, node.condition],
    );
    const [{ isFilterValueDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [QUERY_BUILDER_PARAMETER_TREE_DND_TYPE.VARIABLE],
        drop: (
          item: QueryBuilderParameterDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          }
        },
        collect: (monitor): { isFilterValueDragOver: boolean } => ({
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

    return (
      <div className="query-builder-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-filter-tree__node__dnd__overlay">
            Add New Logical Group
          </div>
        )}
        <div className="query-builder-filter-tree__condition-node">
          <div className="query-builder-filter-tree__condition-node__property">
            <QueryBuilderPropertyExpressionBadge
              propertyExpressionState={node.condition.propertyExpressionState}
              onPropertyExpressionChange={changeProperty}
            />
          </div>
          <DropdownMenu
            className="query-builder-filter-tree__condition-node__operator"
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
            <button
              className="query-builder-filter-tree__condition-node__operator__dropdown__trigger"
              tabIndex={-1}
              title="Choose Operator..."
            >
              <CaretDownIcon />
            </button>
          </DropdownMenu>
          {node.condition.value && (
            <div
              ref={dropConnector}
              className="query-builder-filter-tree__condition-node__value dnd__overlay__container"
            >
              {isFilterValueDragOver && (
                <div className="query-builder-filter-tree__node__dnd__overlay">
                  Change Filter Value
                </div>
              )}
              <BasicValueSpecificationEditor
                valueSpecification={node.condition.value}
                setValueSpecification={(val: ValueSpecification): void =>
                  node.condition.setValue(val)
                }
                graph={graph}
                typeCheckOption={{
                  expectedType:
                    node.condition.propertyExpressionState.propertyExpression
                      .func.genericType.value.rawType,
                }}
                resetValue={resetNode}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

const QueryBuilderFilterBlankConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeBlankConditionNodeData;
    isPropertyDragOver: boolean;
  }) => {
    const { isPropertyDragOver } = props;
    return (
      <div className="query-builder-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-filter-tree__node__dnd__overlay">
            Create Condition
          </div>
        )}
        <div className="query-builder-filter-tree__blank-node">blank</div>
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
          const dropNode = (item as QueryBuilderExplorerTreeDragSource).node;
          let filterConditionState: FilterConditionState;
          try {
            filterConditionState = new FilterConditionState(
              filterState,
              buildPropertyExpressionFromExplorerTreeNodeData(
                filterState.queryBuilderState.explorerState.nonNullableTreeData,
                dropNode,
                filterState.queryBuilderState.graphManagerState.graph,
                filterState.queryBuilderState.explorerState
                  .propertySearchPanelState.allMappedPropertyNodes,
              ),
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notifyWarning(error.message);
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
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [
          ...Object.values(QUERY_BUILDER_FILTER_DND_TYPE),
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        ],
        drop: (
          item: QueryBuilderFilterConditionDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        // canDrop: (item: QueryBuilderFilterConditionDragSource, monitor: DropTargetMonitor): boolean => {
        //   // prevent drop inside of children
        //   // prevent dropping inside my direct ancestor
        //   return true;
        // },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type:
          node instanceof QueryBuilderFilterTreeGroupNodeData
            ? QUERY_BUILDER_FILTER_DND_TYPE.GROUP_CONDITION
            : node instanceof QueryBuilderFilterTreeConditionNodeData
            ? QUERY_BUILDER_FILTER_DND_TYPE.CONDITION
            : QUERY_BUILDER_FILTER_DND_TYPE.BLANK_CONDITION,
        item: (): QueryBuilderFilterConditionDragSource => ({ node }),
        end: (): void => filterState.setRearrangingConditions(false),
      }),
      [node, filterState],
    );
    dragConnector(dropConnector(ref));
    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);
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
                  isPropertyDragOver={isPropertyDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeConditionNodeData && (
                <QueryBuilderFilterConditionEditor
                  node={node}
                  isPropertyDragOver={isPropertyDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeBlankConditionNodeData && (
                <QueryBuilderFilterBlankConditionEditor
                  node={node}
                  isPropertyDragOver={isPropertyDragOver}
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
          if (type === QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN) {
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
                filterState.queryBuilderState.explorerState.nonNullableTreeData,
                (item as QueryBuilderExplorerTreeDragSource).node,
                filterState.queryBuilderState.graphManagerState.graph,
                filterState.queryBuilderState.explorerState
                  .propertySearchPanelState.allMappedPropertyNodes,
              );
          }
          filterConditionState = new FilterConditionState(
            filterState,
            propertyExpression,
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notifyWarning(error.message);
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
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: filterState.allowDnDProjectionToFilter
          ? [
              QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
              QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
              QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN,
            ]
          : [
              QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
              QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
            ],
        drop: (
          item: QueryBuilderExplorerTreeDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER}
        className="panel query-builder__filter"
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
              <BrushIcon />
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
        <div
          className="panel__content query-builder__filter__content dnd__overlay__container"
          ref={dropConnector}
        >
          <div className={clsx({ dnd__overlay: isPropertyDragOver })} />
          {filterState.isEmpty && (
            <BlankPanelPlaceholder
              placeholderText="Add a filter condition"
              tooltipText="Drag and drop properties here"
            />
          )}
          {!filterState.isEmpty && (
            <>
              <FilterConditionDragLayer />
              <QueryBuilderFilterTree queryBuilderState={queryBuilderState} />
            </>
          )}
        </div>
      </div>
    );
  },
);
