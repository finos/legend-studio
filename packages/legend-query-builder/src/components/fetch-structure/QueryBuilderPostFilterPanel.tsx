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
  BlankPanelPlaceholder,
  CaretDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  ContextMenu,
  DropdownMenu,
  FilledTriangleIcon,
  MenuContent,
  MenuContentItem,
  TimesIcon,
  PlusIcon,
  ExpandIcon,
  CompressIcon,
  CircleIcon,
  TrashIcon,
  NewFolderIcon,
  PlusCircleIcon,
  InfoCircleIcon,
  PanelDropZone,
  DragPreviewLayer,
  PanelEntryDropZonePlaceholder,
  useDragPreviewLayer,
  BlankPanelContent,
  PanelContent,
  MoreVerticalIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import {
  type ValueSpecification,
  Class,
  Enumeration,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  debounce,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDrop, useDrag, useDragLayer } from 'react-dnd';
import { QueryBuilderAggregateColumnState } from '../../stores/fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import type { QueryBuilderPostFilterOperator } from '../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterOperator.js';
import {
  type QueryBuilderPostFilterTreeNodeData,
  type QueryBuilderPostFilterDropTarget,
  PostFilterConditionState,
  type QueryBuilderPostFilterConditionDragSource,
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  QueryBuilderPostFilterTreeBlankConditionNodeData,
  QUERY_BUILDER_POST_FILTER_DND_TYPE,
  PostFilterValueSpecConditionValueState,
  PostFilterTDSColumnValueConditionValueState,
} from '../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  type QueryBuilderProjectionColumnState,
  type QueryBuilderProjectionColumnDragSource,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
  QueryBuilderDerivationProjectionColumnState,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { isTypeCompatibleForAssignment } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_GROUP_OPERATION } from '../../stores/QueryBuilderGroupOperationHelper.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import {
  type QueryBuilderVariableDragSource,
  BasicValueSpecificationEditor,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
} from '../shared/BasicValueSpecificationEditor.js';
import {
  QueryBuilderColumnInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderTDSComponentHelper.js';
import {
  type QueryBuilderWindowColumnDragSource,
  QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/window/QueryBuilderWindowState.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';

const QueryBuilderPostFilterConditionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      tdsState: QueryBuilderTDSState;
      node: QueryBuilderPostFilterTreeNodeData;
    }
  >(function QueryBuilderPostFilterConditionContextMenu(props, ref) {
    const { tdsState, node } = props;
    const postFilterState = tdsState.postFilterState;
    const removeNode = (): void =>
      postFilterState.removeNodeAndPruneBranch(node);
    const createCondition = (): void => {
      postFilterState.addNodeFromNode(
        new QueryBuilderPostFilterTreeBlankConditionNodeData(undefined),
        node,
      );
    };
    const createGroupCondition = (): void => {
      postFilterState.addGroupConditionNodeFromNode(node);
    };
    const newGroupWithCondition = (): void => {
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
  }),
);

const QueryBuilderPostFilterGroupConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeGroupNodeData;
    isDragOver: boolean;
    isDroppable: boolean;
  }) => {
    const { node, isDragOver, isDroppable: isDroppable } = props;
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

    const operationName =
      node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND ? 'AND' : 'OR';

    return (
      <div className="query-builder-post-filter-tree__node__label__content dnd__entry__container">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label={`Add to Logical Group '${operationName}'`}
        >
          <div
            className={clsx('query-builder-post-filter-tree__group-node', {
              'query-builder-post-filter-tree__group-node--and':
                node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND,
              'query-builder-post-filter-tree__group-node--or':
                node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.OR,
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
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

export const QueryBuilderColumnBadge = observer(
  (props: {
    colState: QueryBuilderTDSColumnState;
    onColumnChange: (
      columnState: QueryBuilderProjectionColumnState,
    ) => Promise<void>;
  }) => {
    const { colState, onColumnChange } = props;
    const applicationStore = useApplicationStore();
    const type = colState.getColumnType();
    const handleDrop = useCallback(
      (item: QueryBuilderProjectionColumnDragSource): Promise<void> =>
        onColumnChange(item.columnState),
      [onColumnChange],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderProjectionColumnDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item).catch(applicationStore.alertUnhandledError);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [applicationStore, handleDrop],
    );

    return (
      <div ref={dropConnector} className="query-builder-column-badge">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          label="Change Property"
        >
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
              title={`${colState.columnName}`}
            >
              {colState.columnName}
            </div>
            <QueryBuilderColumnInfoTooltip
              columnState={colState}
              placement="bottom-end"
            >
              <div className="query-builder-column-badge__property__info">
                <InfoCircleIcon />
              </div>
            </QueryBuilderColumnInfoTooltip>
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);
const QueryBuilderPostFilterConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeConditionNodeData;
    isDragOver: boolean;
  }) => {
    const { node, isDragOver } = props;
    const queryBuilderState =
      node.condition.postFilterState.tdsState.queryBuilderState;
    const graph = queryBuilderState.graphManagerState.graph;
    const applicationStore = useApplicationStore();
    const changeOperator = (val: QueryBuilderPostFilterOperator) => (): void =>
      node.condition.changeOperator(val);
    const rightConditionValue = node.condition.rightConditionValue;
    const changeColumn = async (
      columnState: QueryBuilderProjectionColumnState,
    ): Promise<void> => {
      const currentColState =
        node.condition.leftConditionValue instanceof
        QueryBuilderAggregateColumnState
          ? node.condition.leftConditionValue.projectionColumnState
          : node.condition.leftConditionValue;
      if (currentColState !== columnState) {
        await flowResult(node.condition.changeColumn(columnState));
      }
    };
    // Drag and Drop on filter condition value
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        const parameterType = item.variable.genericType?.value.rawType;
        const conditionValueType =
          node.condition.leftConditionValue.getColumnType();
        if (
          conditionValueType &&
          isTypeCompatibleForAssignment(parameterType, conditionValueType)
        ) {
          node.condition.buildFromValueSpec(item.variable);
        } else {
          applicationStore.notificationService.notifyWarning(
            `Incompatible parameter type ${parameterType?.name}. ${parameterType?.name} is not compatible with type ${conditionValueType?.name}.`,
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
      node.condition.buildFromValueSpec(
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
      node.condition.buildFromValueSpec(val);
    };
    const selectorConfig = {
      values: node.condition.typeaheadSearchResults,
      isLoading: node.condition.typeaheadSearchState.isInProgress,
      reloadValues: debouncedTypeaheadSearch,
      cleanUpReloadValues,
    };

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        (monitor.getItemType() === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE ||
          monitor.getItemType() === QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE),
    }));

    const renderRightVal = (): React.ReactNode => {
      if (
        rightConditionValue instanceof PostFilterValueSpecConditionValueState &&
        rightConditionValue.value
      ) {
        return (
          <div
            ref={dropConnector}
            className="query-builder-post-filter-tree__condition-node__value"
          >
            <PanelEntryDropZonePlaceholder
              isDragOver={isFilterValueDragOver}
              label="Change Filter Value"
            >
              <BasicValueSpecificationEditor
                valueSpecification={rightConditionValue.value}
                setValueSpecification={changeValueSpecification}
                graph={graph}
                obseverContext={queryBuilderState.observerContext}
                typeCheckOption={{
                  expectedType: guaranteeNonNullable(
                    node.condition.leftConditionValue.getColumnType(),
                  ),
                }}
                resetValue={resetNode}
                selectorConfig={selectorConfig}
                isConstant={queryBuilderState.constantState.isValueSpecConstant(
                  rightConditionValue.value,
                )}
              />
            </PanelEntryDropZonePlaceholder>
          </div>
        );
      } else if (
        rightConditionValue instanceof
        PostFilterTDSColumnValueConditionValueState
      ) {
        const changeRightCol = async (
          columnState: QueryBuilderProjectionColumnState,
        ): Promise<void> => {
          rightConditionValue.changeCol(columnState);
        };
        return (
          <div
            ref={dropConnector}
            className="query-builder-post-filter-tree__condition-node__value"
          >
            <PanelEntryDropZonePlaceholder
              isDragOver={isFilterValueDragOver}
              label="Change Filter Value"
            >
              <div className="query-builder-post-filter-tree__condition-node__property">
                <QueryBuilderColumnBadge
                  colState={rightConditionValue.tdsColumn}
                  onColumnChange={changeRightCol}
                />
              </div>
            </PanelEntryDropZonePlaceholder>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="query-builder-post-filter-tree__node__label__content dnd__entry__container">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label="Add New Logical Group"
        >
          <div className="query-builder-post-filter-tree__condition-node">
            <div className="query-builder-post-filter-tree__condition-node__property">
              <QueryBuilderColumnBadge
                colState={node.condition.leftConditionValue}
                onColumnChange={changeColumn}
              />
            </div>
            <DropdownMenu
              className="query-builder-post-filter-tree__condition-node__operator"
              title="Choose Operator..."
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
              <div className="query-builder-post-filter-tree__condition-node__operator__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
            {renderRightVal()}
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderPostFilterBlankConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeBlankConditionNodeData;
    isDragOver: boolean;
    isDroppable: boolean;
  }) => {
    const { isDragOver, isDroppable } = props;
    return (
      <div className="query-builder-post-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label="Create Condition"
        >
          <div className="query-builder-post-filter-tree__blank-node">
            blank
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderPostFilterTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderPostFilterTreeNodeData,
      {
        tdsState: QueryBuilderTDSState;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { tdsState } = innerProps;
    const ref = useRef<HTMLDivElement>(null);
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore();
    const postFilterState = tdsState.postFilterState;
    const isExpandable =
      node instanceof QueryBuilderPostFilterTreeGroupNodeData;
    const selectNode = (): void => onNodeSelect?.(node);
    const toggleExpandNode = (): void => node.setIsOpen(!node.isOpen);
    const removeNode = (): void =>
      postFilterState.removeNodeAndPruneBranch(node);
    const handleDrop = useCallback(
      (item: QueryBuilderPostFilterDropTarget, type: string): void => {
        if (QUERY_BUILDER_POST_FILTER_DND_TYPE.CONDITION === type) {
          const nodeBeingDragged = (
            item as QueryBuilderPostFilterConditionDragSource
          ).node;

          const newCreatedNode =
            new QueryBuilderPostFilterTreeConditionNodeData(
              undefined,
              (
                postFilterState.nodes.get(
                  nodeBeingDragged.id,
                ) as QueryBuilderPostFilterTreeConditionNodeData
              ).condition,
            );

          if (node instanceof QueryBuilderPostFilterTreeConditionNodeData) {
            postFilterState.newGroupWithConditionFromNode(newCreatedNode, node);
            postFilterState.removeNodeAndPruneBranch(nodeBeingDragged);
          } else if (node instanceof QueryBuilderPostFilterTreeGroupNodeData) {
            postFilterState.addNodeFromNode(newCreatedNode, node);
            postFilterState.removeNodeAndPruneBranch(nodeBeingDragged);
          } else if (
            node instanceof QueryBuilderPostFilterTreeBlankConditionNodeData
          ) {
            postFilterState.replaceBlankNodeWithNode(newCreatedNode, node);
            postFilterState.removeNodeAndPruneBranch(nodeBeingDragged);
          }
        } else if (
          type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE ||
          type === QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE
        ) {
          const columnState = (
            item as
              | QueryBuilderProjectionColumnDragSource
              | QueryBuilderWindowColumnDragSource
          ).columnState as QueryBuilderTDSColumnState;
          let conditionState: PostFilterConditionState;
          try {
            conditionState = new PostFilterConditionState(
              postFilterState,
              columnState,
              undefined,
            );
            conditionState.buildFromValueSpec(
              conditionState.operator.getDefaultFilterConditionValue(
                conditionState,
              ),
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notificationService.notifyWarning(error.message);
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
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderPostFilterConditionDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          ...Object.values(QUERY_BUILDER_POST_FILTER_DND_TYPE),
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
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
      useDrag<QueryBuilderPostFilterConditionDragSource>(
        () => ({
          type:
            node instanceof QueryBuilderPostFilterTreeGroupNodeData
              ? QUERY_BUILDER_POST_FILTER_DND_TYPE.GROUP_CONDITION
              : node instanceof QueryBuilderPostFilterTreeConditionNodeData
              ? QUERY_BUILDER_POST_FILTER_DND_TYPE.CONDITION
              : QUERY_BUILDER_POST_FILTER_DND_TYPE.BLANK_CONDITION,
          item: () => ({ node }),
          end: (): void => postFilterState.setRearrangingConditions(false),
        }),
        [node, postFilterState],
      );
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    // context menu
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        (monitor.getItemType() === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE ||
          monitor.getItemType() === QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE),
    }));

    return (
      <ContextMenu
        content={
          <QueryBuilderPostFilterConditionContextMenu
            tdsState={tdsState}
            node={node}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          ref={ref}
          data-testid={
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_TREE_NODE_CONTENT
          }
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
                  isDroppable={isDroppable}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof QueryBuilderPostFilterTreeConditionNodeData && (
                <QueryBuilderPostFilterConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof
                QueryBuilderPostFilterTreeBlankConditionNodeData && (
                <QueryBuilderPostFilterBlankConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                  isDroppable={isDroppable}
                />
              )}
            </div>
          </div>
          <div className="query-builder-post-filter-tree__node__actions">
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
        tdsState: QueryBuilderTDSState;
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
  (props: { tdsState: QueryBuilderTDSState }) => {
    const { tdsState } = props;
    const postFilterState = tdsState.postFilterState;
    const rootNodes = postFilterState.rootIds.map((rootId) =>
      postFilterState.getNode(rootId),
    );
    const onNodeSelect = (node: QueryBuilderPostFilterTreeNodeData): void =>
      postFilterState.setSelectedNode(
        postFilterState.selectedNode !== node ? node : undefined,
      );
    const getChildNodes = (
      node: QueryBuilderPostFilterTreeNodeData,
    ): QueryBuilderPostFilterTreeNodeData[] =>
      node instanceof QueryBuilderPostFilterTreeGroupNodeData
        ? node.childrenIds.map((id) => postFilterState.getNode(id))
        : [];
    return (
      <div className="tree-view__node__root query-builder-post-filter-tree__root">
        {rootNodes.map((node) => (
          <QueryBuilderPostFilterTreeNodeView
            key={node.id}
            level={0}
            node={node}
            getChildNodes={getChildNodes}
            onNodeSelect={onNodeSelect}
            innerProps={{
              tdsState: tdsState,
            }}
          />
        ))}
      </div>
    );
  },
);

const QueryBuilderPostFilterPanelContent = observer(
  (props: { tdsState: QueryBuilderTDSState }) => {
    const { tdsState } = props;
    const applicationStore = useApplicationStore();
    const postFilterState = tdsState.postFilterState;
    const rootNode = postFilterState.getRootNode();
    // actions
    const collapseTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_PostFilterCollapseTreeLaunched(
        applicationStore.telemetryService,
      );
      postFilterState.setSelectedNode(undefined);
      postFilterState.collapseTree();
    };
    const expandTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_PostFilterExpandTreeLaunched(
        applicationStore.telemetryService,
      );
      postFilterState.setSelectedNode(undefined);
      postFilterState.expandTree();
    };
    const pruneTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_PostFilterCleanupTreeLaunched(
        applicationStore.telemetryService,
      );
      postFilterState.pruneTree();
    };
    const simplifyTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_PostFilterSimplifyTreeLaunched(
        applicationStore.telemetryService,
      );
      postFilterState.simplifyTree();
    };
    const createCondition = (): void => {
      QueryBuilderTelemetryHelper.logEvent_PostFilterCreateConditionLaunched(
        applicationStore.telemetryService,
      );
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
      QueryBuilderTelemetryHelper.logEvent_PostFilterCreateLogicalGroupLaunched(
        applicationStore.telemetryService,
      );
      if (allowGroupCreation) {
        postFilterState.addGroupConditionNodeFromNode(
          postFilterState.selectedNode,
        );
      }
    };
    const newGroupWithCondition = (): void => {
      QueryBuilderTelemetryHelper.logEvent_PostFilterCreateGroupFromConditionLaunched(
        applicationStore.telemetryService,
      );
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
          const aggregateColumnState = tdsState.aggregationState.columns.find(
            (column) => column.projectionColumnState === columnState,
          );
          if (
            !aggregateColumnState &&
            columnState instanceof QueryBuilderDerivationProjectionColumnState
          ) {
            await flowResult(
              columnState.fetchDerivationLambdaReturnType({
                isBeingDropped: true,
              }),
            );
          }
          postFilterConditionState = new PostFilterConditionState(
            postFilterState,
            aggregateColumnState ?? columnState,
            undefined,
          );
          postFilterConditionState.buildFromValueSpec(
            postFilterConditionState.operator.getDefaultFilterConditionValue(
              postFilterConditionState,
            ),
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notificationService.notifyError(error.message);
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
      [applicationStore, postFilterState, tdsState.aggregationState.columns],
    );
    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderProjectionColumnDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item).catch(applicationStore.alertUnhandledError);
          }
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [applicationStore, handleDrop],
    );

    const addPostFilterRef = useRef<HTMLInputElement>(null);
    dropTargetConnector(addPostFilterRef);

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        (monitor.getItemType() === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE ||
          monitor.getItemType() === QUERY_BUILDER_WINDOW_COLUMN_DND_TYPE),
    }));

    return (
      <>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">post-filter</div>
          </div>
          <div className="panel__header__actions">
            <DropdownMenu
              className="panel__header__action"
              title="Show Post-Filter Options Menu..."
              content={
                <MenuContent>
                  <MenuContentItem onClick={createCondition}>
                    <MenuContentItemIcon>
                      <PlusIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Create Condition
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    disabled={
                      !(
                        postFilterState.selectedNode instanceof
                        QueryBuilderPostFilterTreeConditionNodeData
                      )
                    }
                    onClick={newGroupWithCondition}
                  >
                    <MenuContentItemIcon>
                      <PlusCircleIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Create Group From Condition
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    disabled={!allowGroupCreation}
                    title={
                      !allowGroupCreation
                        ? 'Please select a filter node first to create logical group'
                        : ''
                    }
                    onClick={createGroupCondition}
                  >
                    <MenuContentItemIcon>
                      <NewFolderIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Create Logical Group
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={pruneTree}>
                    <MenuContentItemIcon>
                      <TrashIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Cleanup Tree</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={simplifyTree}>
                    <MenuContentItemIcon>
                      <CircleIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Simplify Tree</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={collapseTree}>
                    <MenuContentItemIcon>
                      <CompressIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Collapse Tree</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={expandTree}>
                    <MenuContentItemIcon>
                      <ExpandIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Expand Tree</MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon className="query-builder__icon__more-options" />
            </DropdownMenu>
          </div>
        </div>
        <PanelContent>
          <PanelDropZone
            isDragOver={isDragOver && postFilterState.isEmpty}
            isDroppable={isDroppable && postFilterState.isEmpty}
            dropTargetConnector={dropTargetConnector}
          >
            {
              <PanelLoadingIndicator
                isLoading={Boolean(postFilterState.derivedColumnBeingDropped)}
              />
            }
            {postFilterState.isEmpty && (
              <BlankPanelPlaceholder
                text="Add a post-filter condition"
                tooltipText="Drag and drop properties here"
              />
            )}
            {!postFilterState.isEmpty && (
              <>
                <DragPreviewLayer
                  labelGetter={(
                    item: QueryBuilderPostFilterConditionDragSource,
                  ): string => item.node.dragPreviewLabel}
                  types={Object.values(QUERY_BUILDER_POST_FILTER_DND_TYPE)}
                />
                <QueryBuilderPostFilterTree tdsState={tdsState} />
              </>
            )}
            {isDroppable && !postFilterState.isEmpty && (
              <div
                ref={addPostFilterRef}
                className="query-builder-post-filter-tree__free-drop-zone__container"
              >
                <PanelEntryDropZonePlaceholder
                  isDragOver={isDragOver}
                  isDroppable={isDroppable}
                  className="query-builder-post-filter-tree__free-drop-zone"
                  label="Add post-filter to main group"
                >
                  <></>{' '}
                </PanelEntryDropZonePlaceholder>
              </div>
            )}
          </PanelDropZone>
        </PanelContent>
      </>
    );
  },
);

export const QueryBuilderPostFilterPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const fetchStructureImplementation =
      queryBuilderState.fetchStructureState.implementation;

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER_PANEL}
        className="panel"
      >
        {fetchStructureImplementation instanceof QueryBuilderTDSState && (
          <QueryBuilderPostFilterPanelContent
            tdsState={fetchStructureImplementation}
          />
        )}
        {!(fetchStructureImplementation instanceof QueryBuilderTDSState) && (
          <>
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">post-filter</div>
              </div>
            </div>
            <PanelContent>
              <BlankPanelContent>
                Post-filter is not supported for the current fetch-structure
              </BlankPanelContent>
            </PanelContent>
          </>
        )}
      </div>
    );
  },
);
