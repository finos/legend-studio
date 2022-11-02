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
  ClickAwayListener,
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
  BrushIcon,
  NewFolderIcon,
  PlusCircleIcon,
  InfoCircleIcon,
  PanelDropZone,
  DragPreviewLayer,
  PanelEntryDropZonePlaceholder,
  useDragPreviewLayer,
  BlankPanelContent,
  PanelContent,
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
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { QueryBuilderAggregateColumnState } from '../../stores/fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import type { QueryBuilderPostFilterOperator } from '../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterOperator.js';
import {
  type QueryBuilderPostFilterTreeNodeData,
  type QueryBuilderPostFilterDropTarget,
  PostFilterConditionState,
  type QueryBuilderPostFilterConditionDragSource,
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  QUERY_BUILDER_POST_FILTER_DND_TYPE,
  QueryBuilderPostFilterTreeBlankConditionNodeData,
} from '../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  type QueryBuilderProjectionColumnState,
  type QueryBuilderProjectionColumnDragSource,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
  QueryBuilderDerivationProjectionColumnState,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  type QueryBuilderParameterDragSource,
  QUERY_BUILDER_PARAMETER_DND_TYPE,
} from '../../stores/QueryBuilderParametersState.js';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';
import { isTypeCompatibleForAssignment } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_GROUP_OPERATION } from '../../stores/QueryBuilderGroupOperationHelper.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { BasicValueSpecificationEditor } from '../shared/BasicValueSpecificationEditor.js';
import {
  QueryBuilderColumnInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderTDSComponentHelper.js';
import {
  type QueryBuilderOLAPColumnDragSource,
  QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/olapGroupBy/QueryBuilderOLAPGroupByState_.js';
import type { QueryBuilderTDSColumnState } from '../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';

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
  }),
);

const QueryBuilderPostFilterGroupConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeGroupNodeData;
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
      <div className="query-builder-post-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isDragOver}
          label="Add to Logical Group"
          className="query-builder__dnd__placeholder"
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
    postFilterConditionState: PostFilterConditionState;
    onColumnChange: (
      columnState: QueryBuilderProjectionColumnState,
    ) => Promise<void>;
  }) => {
    const { postFilterConditionState, onColumnChange } = props;
    const applicationStore = useApplicationStore();
    const type = postFilterConditionState.columnState.getColumnType();
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
          QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
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
          showPlaceholder={isDragOver}
          label="Change Property"
          className="query-builder__dnd__placeholder"
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
    const graph =
      node.condition.postFilterState.tdsState.queryBuilderState
        .graphManagerState.graph;
    const applicationStore = useApplicationStore();
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
        const parameterType =
          item.variable.parameter.genericType?.value.rawType;
        const conditionValueType = node.condition.columnState.getColumnType();
        if (
          conditionValueType &&
          isTypeCompatibleForAssignment(parameterType, conditionValueType)
        ) {
          node.condition.setValue(item.variable.parameter);
        } else {
          applicationStore.notifyWarning(
            `Incompatible parameter type ${parameterType?.name}. ${parameterType?.name} is not compatible with type ${conditionValueType?.name}.`,
          );
        }
      },
      [applicationStore, node.condition],
    );
    const [{ isFilterValueDragOver }, dropConnector] = useDrop<
      QueryBuilderParameterDragSource,
      void,
      { isFilterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_PARAMETER_DND_TYPE],
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
      <div className="query-builder-post-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isDragOver}
          label="Add New Logical Group"
          className="query-builder__dnd__placeholder"
        >
          <div className="query-builder-post-filter-tree__condition-node">
            <div className="query-builder-post-filter-tree__condition-node__property">
              <QueryBuilderColumnBadge
                postFilterConditionState={node.condition}
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
            {node.condition.value && (
              <div
                ref={dropConnector}
                className="query-builder-post-filter-tree__condition-node__value"
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
                    obseverContext={
                      node.condition.postFilterState.tdsState.queryBuilderState
                        .observableContext
                    }
                    typeCheckOption={{
                      expectedType: guaranteeNonNullable(
                        node.condition.columnState.getColumnType(),
                      ),
                    }}
                    resetValue={resetNode}
                    selectorConfig={selectorConfig}
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

const QueryBuilderPostFilterBlankConditionEditor = observer(
  (props: {
    node: QueryBuilderPostFilterTreeBlankConditionNodeData;
    isDragOver: boolean;
  }) => {
    const { isDragOver } = props;
    return (
      <div className="query-builder-post-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          showPlaceholder={isDragOver}
          label="Create Condition"
          className="query-builder__dnd__placeholder"
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
        if (
          type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE ||
          type === QUERY_BUILDER_OLAP_COLUMN_DND_TYPE
        ) {
          const columnState = (
            item as
              | QueryBuilderProjectionColumnDragSource
              | QueryBuilderOLAPColumnDragSource
          ).columnState as QueryBuilderTDSColumnState;
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
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderPostFilterConditionDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          ...Object.values(QUERY_BUILDER_POST_FILTER_DND_TYPE),
          QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
          QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
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
                tdsState: tdsState,
              }}
            />
          ))}
        </div>
      </ClickAwayListener>
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
          const aggregateColumnState = tdsState.aggregationState.columns.find(
            (column) => column.projectionColumnState === columnState,
          );
          if (
            !aggregateColumnState &&
            columnState instanceof QueryBuilderDerivationProjectionColumnState
          ) {
            await flowResult(columnState.fetchDerivationLambdaReturnType());
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
          applicationStore.notifyError(error.message);
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
          QUERY_BUILDER_OLAP_COLUMN_DND_TYPE,
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

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER}
        className="panel"
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
        <PanelContent>
          <PanelDropZone
            isDragOver={isDragOver}
            dropTargetConnector={dropTargetConnector}
          >
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
          </PanelDropZone>
        </PanelContent>
      </div>
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
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_POST_FILTER}
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
