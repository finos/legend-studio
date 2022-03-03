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

import { useApplicationStore } from '@finos/legend-application';
import {
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  type TooltipPlacement,
  BlankPanelPlaceholder,
  CaretDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClickAwayListener,
  clsx,
  ContextMenu,
  DropdownMenu,
  FilledTriangleIcon,
  MenuContent,
  MenuContentItem,
  TimesIcon,
  RefreshIcon,
  PlusIcon,
  ExpandIcon,
  CompressIcon,
  CircleIcon,
  BrushIcon,
  NewFolderIcon,
  PlusCircleIcon,
  InfoCircleIcon,
  Tooltip,
  StringTypeIcon,
  ToggleIcon,
  HashtagIcon,
  ClockIcon,
} from '@finos/legend-art';
import {
  type Type,
  Class,
  Enumeration,
  PrimitiveType,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type DropTargetMonitor,
  useDragLayer,
  useDrop,
  useDrag,
} from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { getColumnMultiplicity } from '../stores/postFilterOperators/QueryBuilderPostFilterOperatorHelper';
import { QueryBuilderAggregateColumnState } from '../stores/QueryBuilderAggregationState';

import { QUERY_BUILDER_LOGICAL_GROUP_OPERATION } from '../stores/QueryBuilderLogicalHelper';
import type { QueryBuilderPostFilterOperator } from '../stores/QueryBuilderPostFilterOperator';
import {
  type QueryBuilderPostFilterTreeNodeData,
  type QueryBuilderPostFilterDropTarget,
  PostFilterConditionState,
  type QueryBuilderPostFilterConditionDragSource,
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  QUERY_BUILDER_POST_FILTER_DND_TYPE,
  QueryBuilderPostFilterTreeBlankConditionNodeData,
} from '../stores/QueryBuilderPostFilterState';
import {
  type QueryBuilderProjectionColumnState,
  type QueryBuilderProjectionColumnDragSource,
  QUERY_BUILDER_PROJECTION_DND_TYPE,
  QueryBuilderDerivationProjectionColumnState,
} from '../stores/QueryBuilderProjectionState';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_TREE_DND_TYPE,
} from '../stores/QueryParametersState';
import { QueryBuilderValueSpecificationEditor } from './QueryBuilderValueSpecificationEditor';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';
import { getMultiplicityDescription } from './shared/QueryBuilderUtils';

const PostFilterConditionDragLayer: React.FC = () => {
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType() as QUERY_BUILDER_POST_FILTER_DND_TYPE,
      item: monitor.getItem<QueryBuilderPostFilterConditionDragSource | null>(),
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentPosition: monitor.getClientOffset(),
    }),
  );

  if (
    !isDragging ||
    !item ||
    !Object.values(QUERY_BUILDER_POST_FILTER_DND_TYPE).includes(itemType)
  ) {
    return null;
  }
  return (
    <div className="query-builder-post-filter-tree__drag-preview-layer">
      <div
        className="query-builder-post-filter-tree__drag-preview"
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

const QueryBuilderPostFilterConditionContextMenu = observer(
  (
    props: {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderPostFilterTreeNodeData;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { queryBuilderState, node } = props;
    const postFilterState = queryBuilderState.postFilterState;
    const removeNode = (): void =>
      postFilterState.removeNodeAndPruneBranch(node);
    const createCondition = (): void => {
      postFilterState.suppressClickawayEventListener();
      postFilterState.addNodeFromNode(
        new QueryBuilderPostFilterTreeBlankConditionNodeData(undefined),
        node,
      );
    };
    const createGroupCondition = (): void => {
      postFilterState.suppressClickawayEventListener();
      postFilterState.addGroupConditionNodeFromNode(node);
    };
    const newGroupWithCondition = (): void => {
      postFilterState.suppressClickawayEventListener();
      postFilterState.newGroupWithConditionFromNode(undefined, node);
    };

    return (
      <MenuContent ref={ref}>
        {node instanceof QueryBuilderPostFilterTreeGroupNodeData && (
          <MenuContentItem onClick={createCondition}>
            Add New Condition
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderPostFilterTreeGroupNodeData && (
          <MenuContentItem onClick={createGroupCondition}>
            Add New Logical Group
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderPostFilterTreeConditionNodeData && (
          <MenuContentItem onClick={newGroupWithCondition}>
            Form a New Logical Group
          </MenuContentItem>
        )}
        <MenuContentItem onClick={removeNode}>Remove</MenuContentItem>
      </MenuContent>
    );
  },
  { forwardRef: true },
);

const QueryBuilderPostFilterGroupConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeGroupNodeData;
    isPropertyDragOver: boolean;
  }) => {
    const { node, isPropertyDragOver } = props;
    const switchOperation: React.MouseEventHandler<HTMLDivElement> = (
      event,
    ): void => {
      event.stopPropagation(); // prevent triggering selecting the node
      node.setGroupOperation(
        node.groupOperation === QUERY_BUILDER_LOGICAL_GROUP_OPERATION.AND
          ? QUERY_BUILDER_LOGICAL_GROUP_OPERATION.OR
          : QUERY_BUILDER_LOGICAL_GROUP_OPERATION.AND,
      );
    };
    return (
      <div className="query-builder-post-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-post-filter-tree__node__dnd__overlay">
            Add to Logical Group
          </div>
        )}
        <div
          className={clsx('query-builder-post-filter-tree__group-node', {
            'query-builder-post-filter-tree__group-node--and':
              node.groupOperation === QUERY_BUILDER_LOGICAL_GROUP_OPERATION.AND,
            'query-builder-post-filter-tree__group-node--or':
              node.groupOperation === QUERY_BUILDER_LOGICAL_GROUP_OPERATION.OR,
          })}
          title="Switch Operation"
          onClick={switchOperation}
        >
          <div className="query-builder-post-filter-tree__group-node__label">
            {node.groupOperation}
          </div>
          <button className="query-builder-post-filter-tree__group-node__action">
            <FilledTriangleIcon />
          </button>
        </div>
      </div>
    );
  },
);

const renderPropertyTypeIcon = (type: Type): React.ReactNode => {
  if (type instanceof PrimitiveType) {
    if (type.name === PRIMITIVE_TYPE.STRING) {
      return <StringTypeIcon className="query-builder-column-badge__icon" />;
    } else if (type.name === PRIMITIVE_TYPE.BOOLEAN) {
      return <ToggleIcon className="query-builder-column-badge__icon" />;
    } else if (
      type.name === PRIMITIVE_TYPE.NUMBER ||
      type.name === PRIMITIVE_TYPE.INTEGER ||
      type.name === PRIMITIVE_TYPE.FLOAT ||
      type.name === PRIMITIVE_TYPE.DECIMAL
    ) {
      return <HashtagIcon className="query-builder-column-badge__icon" />;
    } else if (
      type.name === PRIMITIVE_TYPE.DATE ||
      type.name === PRIMITIVE_TYPE.DATETIME ||
      type.name === PRIMITIVE_TYPE.STRICTDATE
    ) {
      return <ClockIcon className="query-builder-column-badge__icon" />;
    }
  } else if (type instanceof Enumeration) {
    return <div className="icon query-builder-column-badge__icon">E</div>;
  }
  return null;
};

const QueryBuilderColumnInfoTooltip: React.FC<{
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { columnState, placement, children } = props;
  const type = columnState.getReturnType();
  const multiplicity = returnUndefOnError(() =>
    getColumnMultiplicity(columnState),
  );
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
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="query-builder__tooltip__content">
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Name</div>
            <div className="query-builder__tooltip__item__value">
              {columnState.columnName}
            </div>
          </div>
          <div className="query-builder__tooltip__item">
            <div className="query-builder__tooltip__item__label">Type</div>
            <div className="query-builder__tooltip__item__value">
              {type?.path}
            </div>
          </div>
          {multiplicity && (
            <div className="query-builder__tooltip__item">
              <div className="query-builder__tooltip__item__label">
                Multiplicity
              </div>
              <div className="query-builder__tooltip__item__value">
                {getMultiplicityDescription(multiplicity)}
              </div>
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

export const QueryBuilderColumnBadge = observer(
  (props: {
    postFilterConditionState: PostFilterConditionState;
    onColumnChange: (
      columnState: QueryBuilderProjectionColumnState,
    ) => Promise<void>;
  }) => {
    const { postFilterConditionState, onColumnChange } = props;
    const type = postFilterConditionState.columnState.getReturnType();
    const handleDrop = useCallback(
      (item: QueryBuilderProjectionColumnDragSource): Promise<void> =>
        onColumnChange(item.columnState),
      [onColumnChange],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN],
        drop: (
          item: QueryBuilderProjectionColumnDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item).catch(
              postFilterConditionState.postFilterState.queryBuilderState
                .applicationStore.alertUnhandledError,
            );
          }
        },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div ref={dropConnector} className="query-builder-column-badge">
        {isPropertyDragOver && (
          <div className="query-builder__dnd__placeholder query-builder-column-badge__dnd__placeholder">
            Change Property
          </div>
        )}
        {!isPropertyDragOver && (
          <div className="query-builder-column-badge__content">
            {type && (
              <div
                className={clsx('query-builder-column-badge__type', {
                  'query-builder-column-badge__type--class':
                    type instanceof Class,
                  'query-builder-column-badge__type--enumeration':
                    type instanceof Enumeration,
                  'query-builder-column-badge__type--primitive':
                    type instanceof PrimitiveType,
                })}
              >
                {renderPropertyTypeIcon(type)}
              </div>
            )}
            <div
              className="query-builder-column-badge__property"
              title={`${postFilterConditionState.columnName}`}
            >
              {postFilterConditionState.columnName}
            </div>
            <QueryBuilderColumnInfoTooltip
              columnState={postFilterConditionState.columnState}
              placement="bottom-end"
            >
              <div className="query-builder-column-badge__property__info">
                <InfoCircleIcon />
              </div>
            </QueryBuilderColumnInfoTooltip>
          </div>
        )}
      </div>
    );
  },
);
const QueryBuilderPostFilterConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeConditionNodeData;
    isPropertyDragOver: boolean;
  }) => {
    const { node, isPropertyDragOver } = props;
    const changeOperator = (val: QueryBuilderPostFilterOperator) => (): void =>
      node.condition.changeOperator(val);
    const changeColumn = async (
      columnState: QueryBuilderProjectionColumnState,
    ): Promise<void> => {
      const currentColState =
        node.condition.columnState instanceof QueryBuilderAggregateColumnState
          ? node.condition.columnState.projectionColumnState
          : node.condition.columnState;
      if (currentColState !== columnState) {
        await flowResult(node.condition.changeColumn(columnState));
      }
    };
    // Drag and Drop on filter condition value
    const handleDrop = useCallback(
      (item: QueryBuilderParameterDragSource): void => {
        node.condition.setValue(item.variable.parameter);
      },
      [node],
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

    return (
      <div className="query-builder-post-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-post-filter-tree__node__dnd__overlay">
            Add New Logical Group
          </div>
        )}
        <div className="query-builder-post-filter-tree__condition-node">
          <div className="query-builder-post-filter-tree__condition-node__property">
            <QueryBuilderColumnBadge
              postFilterConditionState={node.condition}
              onColumnChange={changeColumn}
            />
          </div>
          <DropdownMenu
            className="query-builder-post-filter-tree__condition-node__operator"
            content={
              <MenuContent>
                {node.condition.operators.map((op) => (
                  <MenuContentItem
                    key={op.uuid}
                    className="query-builder-post-filter-tree__condition-node__operator__dropdown__option"
                    onClick={changeOperator(op)}
                  >
                    {op.getLabel()}
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
            <div className="query-builder-post-filter-tree__condition-node__operator__label">
              {node.condition.operator.getLabel()}
            </div>
            <button
              className="query-builder-post-filter-tree__condition-node__operator__dropdown__trigger"
              tabIndex={-1}
              title="Choose Operator..."
            >
              <CaretDownIcon />
            </button>
          </DropdownMenu>
          {node.condition.value && (
            <div
              ref={dropConnector}
              className="query-builder-post-filter-tree__condition-node__value dnd__overlay__container"
            >
              {isFilterValueDragOver && (
                <div className="query-builder-post-filter-tree__node__dnd__overlay">
                  Change Filter Value
                </div>
              )}
              <QueryBuilderValueSpecificationEditor
                valueSpecification={node.condition.value}
                graph={
                  node.condition.postFilterState.queryBuilderState
                    .graphManagerState.graph
                }
                expectedType={guaranteeNonNullable(
                  node.condition.columnState.getReturnType(),
                )}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

const QueryBuilderPostFilterBlankConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeBlankConditionNodeData;
    isPropertyDragOver: boolean;
  }) => {
    const { isPropertyDragOver } = props;
    return (
      <div className="query-builder-post-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-post-filter-tree__node__dnd__overlay">
            Create Condition
          </div>
        )}
        <div className="query-builder-post-filter-tree__blank-node">blank</div>
      </div>
    );
  },
);

const QueryBuilderPostFilterTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderPostFilterTreeNodeData,
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
    const postFilterState = queryBuilderState.postFilterState;
    const isExpandable =
      node instanceof QueryBuilderPostFilterTreeGroupNodeData;
    const selectNode = (): void => onNodeSelect?.(node);
    const toggleExpandNode = (): void => node.setIsOpen(!node.isOpen);
    const resetNode = (): void => {
      if (node instanceof QueryBuilderPostFilterTreeConditionNodeData) {
        node.condition.value =
          node.condition.operator.getDefaultFilterConditionValue(
            node.condition,
          );
      }
    };
    const removeNode = (): void =>
      postFilterState.removeNodeAndPruneBranch(node);
    const handleDrop = useCallback(
      (item: QueryBuilderPostFilterDropTarget, type: string): void => {
        if (type === QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN) {
          const columnState = (item as QueryBuilderProjectionColumnDragSource)
            .columnState;
          let conditionState: PostFilterConditionState;
          try {
            conditionState = new PostFilterConditionState(
              postFilterState,
              columnState,
              undefined,
              undefined,
            );
            conditionState.setValue(
              conditionState.operator.getDefaultFilterConditionValue(
                conditionState,
              ),
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notifyWarning(error.message);
            return;
          }

          if (node instanceof QueryBuilderPostFilterTreeGroupNodeData) {
            postFilterState.addNodeFromNode(
              new QueryBuilderPostFilterTreeConditionNodeData(
                undefined,
                conditionState,
              ),
              node,
            );
          } else if (
            node instanceof QueryBuilderPostFilterTreeConditionNodeData
          ) {
            postFilterState.newGroupWithConditionFromNode(
              new QueryBuilderPostFilterTreeConditionNodeData(
                undefined,
                conditionState,
              ),
              node,
            );
          } else if (
            node instanceof QueryBuilderPostFilterTreeBlankConditionNodeData
          ) {
            postFilterState.replaceBlankNodeWithNode(
              new QueryBuilderPostFilterTreeConditionNodeData(
                undefined,
                conditionState,
              ),
              node,
            );
          }
        }
      },
      [applicationStore, postFilterState, node],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [
          ...Object.values(QUERY_BUILDER_POST_FILTER_DND_TYPE),
          QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN,
        ],
        drop: (
          item: QueryBuilderPostFilterConditionDragSource,
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

    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type:
          node instanceof QueryBuilderPostFilterTreeGroupNodeData
            ? QUERY_BUILDER_POST_FILTER_DND_TYPE.GROUP_CONDITION
            : node instanceof QueryBuilderPostFilterTreeConditionNodeData
            ? QUERY_BUILDER_POST_FILTER_DND_TYPE.CONDITION
            : QUERY_BUILDER_POST_FILTER_DND_TYPE.BLANK_CONDITION,
        item: (): QueryBuilderPostFilterConditionDragSource => ({ node }),
        end: (): void => postFilterState.setRearrangingConditions(false),
      }),
      [node, postFilterState],
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
          <QueryBuilderPostFilterConditionContextMenu
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
            'tree-view__node__container query-builder-post-filter-tree__node__container',
            {
              'query-builder-post-filter-tree__node__container--no-hover':
                postFilterState.isRearrangingConditions,
              'query-builder-post-filter-tree__node__container--selected':
                node === postFilterState.selectedNode,
              'query-builder-post-filter-tree__node__container--selected-from-context-menu':
                isSelectedFromContextMenu,
            },
          )}
        >
          <div
            className="query-builder-post-filter-tree__node__content"
            style={{
              paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2) + 1.5}rem`,
              display: 'flex',
            }}
            onClick={selectNode}
          >
            {isExpandable && (
              <div
                className="query-builder-post-filter-tree__expand-icon"
                onClick={toggleExpandNode}
              >
                {node.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
              </div>
            )}
            <div
              className={clsx(
                'tree-view__node__label query-builder-post-filter-tree__node__label',
                {
                  'query-builder-post-filter-tree__node__label--expandable':
                    isExpandable,
                },
              )}
            >
              {node instanceof QueryBuilderPostFilterTreeGroupNodeData && (
                <QueryBuilderPostFilterGroupConditionEditor
                  node={node}
                  isPropertyDragOver={isPropertyDragOver}
                />
              )}
              {node instanceof QueryBuilderPostFilterTreeConditionNodeData && (
                <QueryBuilderPostFilterConditionEditor
                  node={node}
                  isPropertyDragOver={isPropertyDragOver}
                />
              )}
              {node instanceof
                QueryBuilderPostFilterTreeBlankConditionNodeData && (
                <QueryBuilderPostFilterBlankConditionEditor
                  node={node}
                  isPropertyDragOver={isPropertyDragOver}
                />
              )}
            </div>
          </div>
          <div className="query-builder-post-filter-tree__node__actions">
            {node instanceof QueryBuilderPostFilterTreeConditionNodeData && (
              <button
                className="query-builder-post-filter-tree__node__action"
                tabIndex={-1}
                title="Reset Filter Value"
                onClick={resetNode}
              >
                <RefreshIcon style={{ fontSize: '1.6rem' }} />
              </button>
            )}
            <button
              className="query-builder-post-filter-tree__node__action"
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

const QueryBuilderPostFilterTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderPostFilterTreeNodeData,
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
        <QueryBuilderPostFilterTreeNodeContainer
          node={node}
          level={level + 1}
          stepPaddingInRem={stepPaddingInRem}
          onNodeSelect={onNodeSelect}
          innerProps={innerProps}
        />
        {node.isOpen &&
          getChildNodes(node).map((childNode) => (
            <QueryBuilderPostFilterTreeNodeView
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

const QueryBuilderPostFilterTree = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const postFilterState = queryBuilderState.postFilterState;
    const rootNodes = postFilterState.rootIds.map((rootId) =>
      postFilterState.getNode(rootId),
    );
    const onNodeSelect = (node: QueryBuilderPostFilterTreeNodeData): void =>
      postFilterState.setSelectedNode(node);
    const getChildNodes = (
      node: QueryBuilderPostFilterTreeNodeData,
    ): QueryBuilderPostFilterTreeNodeData[] =>
      node instanceof QueryBuilderPostFilterTreeGroupNodeData
        ? node.childrenIds.map((id) => postFilterState.getNode(id))
        : [];
    const onClickAway = (): void => {
      postFilterState.handleClickaway();
    };
    return (
      <ClickAwayListener onClickAway={onClickAway}>
        <div className="tree-view__node__root query-builder-post-filter-tree__root">
          {rootNodes.map((node) => (
            <QueryBuilderPostFilterTreeNodeView
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

export const QueryBuilderPostFilterPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const postFilterState = queryBuilderState.postFilterState;
    const rootNode = postFilterState.getRootNode();
    // actions
    const collapseTree = (): void => {
      postFilterState.setSelectedNode(undefined);
      postFilterState.collapseTree();
    };
    const expandTree = (): void => {
      postFilterState.setSelectedNode(undefined);
      postFilterState.expandTree();
    };
    const pruneTree = (): void => {
      postFilterState.suppressClickawayEventListener();
      postFilterState.pruneTree();
    };
    const simplifyTree = (): void => {
      postFilterState.suppressClickawayEventListener();
      postFilterState.simplifyTree();
    };
    const createCondition = (): void => {
      postFilterState.suppressClickawayEventListener();
      postFilterState.addNodeFromNode(
        new QueryBuilderPostFilterTreeBlankConditionNodeData(undefined),
        postFilterState.selectedNode,
      );
    };
    const allowGroupCreation =
      postFilterState.isEmpty || // either the tree is empty
      (postFilterState.selectedNode && // or a node is currently selected which is...
        (postFilterState.selectedNode !== rootNode || // either not a root node
          rootNode instanceof QueryBuilderPostFilterTreeGroupNodeData)); // or if it is the root note, it has to be a group node

    const createGroupCondition = (): void => {
      postFilterState.suppressClickawayEventListener();
      if (allowGroupCreation) {
        postFilterState.addGroupConditionNodeFromNode(
          postFilterState.selectedNode,
        );
      }
    };
    const newGroupWithCondition = (): void => {
      postFilterState.suppressClickawayEventListener();
      if (
        postFilterState.selectedNode instanceof
        QueryBuilderPostFilterTreeConditionNodeData
      ) {
        postFilterState.newGroupWithConditionFromNode(
          undefined,
          postFilterState.selectedNode,
        );
      }
    };
    // Drag and Drop
    const handleDrop = useCallback(
      async (item: QueryBuilderPostFilterDropTarget): Promise<void> => {
        let postFilterConditionState: PostFilterConditionState;
        try {
          const columnState = (item as QueryBuilderProjectionColumnDragSource)
            .columnState;
          const aggregateColumnState =
            queryBuilderState.fetchStructureState.projectionState.aggregationState.columns.find(
              (column) => column.projectionColumnState === columnState,
            );
          if (
            !aggregateColumnState &&
            columnState instanceof QueryBuilderDerivationProjectionColumnState
          ) {
            await columnState.fetchLambaReturnType();
          }

          postFilterConditionState = new PostFilterConditionState(
            postFilterState,
            aggregateColumnState ?? columnState,
            undefined,
            undefined,
          );
          postFilterConditionState.setValue(
            postFilterConditionState.operator.getDefaultFilterConditionValue(
              postFilterConditionState,
            ),
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notifyWarning(error.message);
          return;
        }
        // NOTE: unfocus the current node when DnD a new node to the tree
        postFilterState.setSelectedNode(undefined);
        postFilterState.addNodeFromNode(
          new QueryBuilderPostFilterTreeConditionNodeData(
            undefined,
            postFilterConditionState,
          ),
          undefined,
        );
      },
      [
        applicationStore,
        postFilterState,
        queryBuilderState.fetchStructureState.projectionState.aggregationState
          .columns,
      ],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [QUERY_BUILDER_PROJECTION_DND_TYPE.PROJECTION_COLUMN],
        drop: (
          item: QueryBuilderProjectionColumnDragSource,
          monitor: DropTargetMonitor,
        ): void => {
          if (!monitor.didDrop()) {
            handleDrop(item).catch(
              queryBuilderState.applicationStore.alertUnhandledError,
            );
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
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER}
        className="panel query-builder__filter"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">post-filter</div>
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
                  postFilterState.selectedNode instanceof
                  QueryBuilderPostFilterTreeConditionNodeData
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
          {postFilterState.isEmpty && (
            <BlankPanelPlaceholder
              placeholderText="Add a post filter condition"
              tooltipText="Drag and drop properties here"
            />
          )}
          {!postFilterState.isEmpty && (
            <>
              <PostFilterConditionDragLayer />
              <QueryBuilderPostFilterTree
                queryBuilderState={queryBuilderState}
              />
            </>
          )}
        </div>
      </div>
    );
  },
);
