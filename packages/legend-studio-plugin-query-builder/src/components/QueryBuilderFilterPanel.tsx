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

import { useEffect, useRef, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  FaChevronDown,
  FaChevronRight,
  FaCompress,
  FaExpand,
  FaBrush,
  FaFolderPlus,
  FaPlus,
  FaPlusCircle,
  FaTimes,
  FaCircle,
  FaCaretDown,
} from 'react-icons/fa';
import { BsFillTriangleFill } from 'react-icons/bs';
import type {
  TreeNodeContainerProps,
  TreeNodeViewProps,
} from '@finos/legend-studio-components';
import {
  clsx,
  ContextMenu,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  BlankPanelPlaceholder,
} from '@finos/legend-studio-components';
import type {
  QueryBuilderFilterConditionDragSource,
  QueryBuilderFilterDropTarget,
  QueryBuilderFilterTreeNodeData,
  QueryBuilderOperator,
} from '../stores/QueryBuilderFilterState';
import {
  QUERY_BUILDER_FILTER_GROUP_OPERATION,
  QUERY_BUILDER_FILTER_DND_TYPE,
  FilterConditionState,
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeBlankConditionNodeData,
  QueryBuilderFilterTreeGroupNodeData,
} from '../stores/QueryBuilderFilterState';
import { ClickAwayListener } from '@material-ui/core';
import type { DropTargetMonitor } from 'react-dnd';
import { useDragLayer, useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import type {
  QueryBuilderExplorerTreeDragSource,
  QueryBuilderExplorerTreePropertyNodeData,
} from '../stores/QueryBuilderExplorerState';
import {
  getPropertyExpression,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../stores/QueryBuilderExplorerState';
import { QueryBuilderPropertyExpressionBadge } from './QueryBuilderPropertyExpressionEditor';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { assertErrorThrown } from '@finos/legend-studio-shared';
import { QueryBuilderValueSpecificationEditor } from './QueryBuilderValueSpecificationEditor';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_Constants';
import {
  TYPICAL_MULTIPLICITY_TYPE,
  useApplicationStore,
  useEditorStore,
} from '@finos/legend-studio';

const FilterConditionDragLayer: React.FC = () => {
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType() as QUERY_BUILDER_FILTER_DND_TYPE,
      item: monitor.getItem() as QueryBuilderFilterConditionDragSource | null,
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
        node.groupOperation === QUERY_BUILDER_FILTER_GROUP_OPERATION.AND
          ? QUERY_BUILDER_FILTER_GROUP_OPERATION.OR
          : QUERY_BUILDER_FILTER_GROUP_OPERATION.AND,
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
              node.groupOperation === QUERY_BUILDER_FILTER_GROUP_OPERATION.AND,
            'query-builder-filter-tree__group-node--or':
              node.groupOperation === QUERY_BUILDER_FILTER_GROUP_OPERATION.OR,
          })}
          title="Switch Operation"
          onClick={switchOperation}
        >
          <div className="query-builder-filter-tree__group-node__label">
            {node.groupOperation}
          </div>
          <button className="query-builder-filter-tree__group-node__action">
            <BsFillTriangleFill />
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
    const changeOperation = (val: QueryBuilderOperator) => (): void =>
      node.condition.changeOperator(val);
    const changeProperty = (
      propertyNode: QueryBuilderExplorerTreePropertyNodeData,
    ): void =>
      node.condition.changeProperty(
        getPropertyExpression(
          node.condition.filterState.queryBuilderState.explorerState
            .nonNullableTreeData,
          propertyNode,
          node.condition.filterState.editorStore.graphState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        ),
      );

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
              propertyEditorState={node.condition.propertyEditorState}
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
                    onClick={changeOperation(op)}
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
              <FaCaretDown />
            </button>
          </DropdownMenu>
          {node.condition.value && (
            <div className="query-builder-filter-tree__condition-node__value">
              <QueryBuilderValueSpecificationEditor
                valueSpecification={node.condition.value}
                graph={node.condition.editorStore.graphState.graph}
                expectedType={
                  node.condition.propertyEditorState.propertyExpression.func
                    .genericType.value.rawType
                }
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
  (
    props: {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderFilterTreeNodeData;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
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
      <div ref={ref} className="query-builder-tree__context-menu">
        {node instanceof QueryBuilderFilterTreeGroupNodeData && (
          <div
            className="query-builder-tree__context-menu__item"
            onClick={createCondition}
          >
            Add New Condition
          </div>
        )}
        {node instanceof QueryBuilderFilterTreeGroupNodeData && (
          <div
            className="query-builder-tree__context-menu__item"
            onClick={createGroupCondition}
          >
            Add New Logical Group
          </div>
        )}
        {node instanceof QueryBuilderFilterTreeConditionNodeData && (
          <div
            className="query-builder-tree__context-menu__item"
            onClick={newGroupWithCondition}
          >
            Form a New Logical Group
          </div>
        )}
        <div
          className="query-builder-tree__context-menu__item"
          onClick={removeNode}
        >
          Remove
        </div>
      </div>
    );
  },
  { forwardRef: true },
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
    const editorStore = useEditorStore();
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
              editorStore,
              filterState,
              getPropertyExpression(
                filterState.queryBuilderState.explorerState.nonNullableTreeData,
                dropNode,
                filterState.editorStore.graphState.graph.getTypicalMultiplicity(
                  TYPICAL_MULTIPLICITY_TYPE.ONE,
                ),
              ),
            );
          } catch (error: unknown) {
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
      [applicationStore, editorStore, filterState, node],
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
        //   console.log('check can drop - STUBBED');
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
                {node.isOpen ? <FaChevronDown /> : <FaChevronRight />}
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
              <FaTimes />
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
    const editorStore = useEditorStore();
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
      (item: QueryBuilderFilterDropTarget): void => {
        let filterConditionState: FilterConditionState;
        try {
          filterConditionState = new FilterConditionState(
            editorStore,
            filterState,
            getPropertyExpression(
              filterState.queryBuilderState.explorerState.nonNullableTreeData,
              (item as QueryBuilderExplorerTreeDragSource).node,
              filterState.editorStore.graphState.graph.getTypicalMultiplicity(
                TYPICAL_MULTIPLICITY_TYPE.ONE,
              ),
            ),
          );
        } catch (error: unknown) {
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
      [applicationStore, editorStore, filterState],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        ],
        drop: (
          item: QueryBuilderExplorerTreeDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
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
              <FaPlus />
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
              <FaPlusCircle />
            </button>
            <button
              className="panel__header__action"
              disabled={!allowGroupCreation}
              onClick={createGroupCondition}
              tabIndex={-1}
              title="Create Logical Group"
            >
              <FaFolderPlus />
            </button>
            <button
              className="panel__header__action"
              onClick={pruneTree}
              tabIndex={-1}
              title="Cleanup Tree"
            >
              <FaBrush />
            </button>
            <button
              className="panel__header__action"
              onClick={simplifyTree}
              tabIndex={-1}
              title="Simplify Tree"
            >
              <FaCircle />
            </button>
            <button
              className="panel__header__action"
              onClick={collapseTree}
              tabIndex={-1}
              title="Collapse Tree"
            >
              <FaCompress />
            </button>
            <button
              className="panel__header__action"
              onClick={expandTree}
              tabIndex={-1}
              title="Expand Tree"
            >
              <FaExpand />
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
