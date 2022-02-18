import { useApplicationStore } from '@finos/legend-application';
import type {
  TreeNodeContainerProps,
  TreeNodeViewProps,
} from '@finos/legend-art';
import {
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
} from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { toJS } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useCallback, useRef, useState } from 'react';
import { QUERY_BUILDER_FILTER_GROUP_OPERATION } from '../stores/QueryBuilderFilterState';
import type { QueryBuilderPostFilterTreeNodeData } from '../stores/QueryBuilderPostFilterState';
import {
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
} from '../stores/QueryBuilderPostFilterState';
import { QueryBuilderSimpleProjectionColumnState } from '../stores/QueryBuilderProjectionState';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryBuilderValueSpecificationEditor } from './QueryBuilderValueSpecificationEditor';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';

const QueryBuilderPostFilterConditionContextMenu = observer(
  (
    props: {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderPostFilterTreeNodeData;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { queryBuilderState, node } = props;
    const filterState = queryBuilderState.filterState;
    const removeNode = (): void => filterState.removeNodeAndPruneBranch(node);
    // const createCondition = (): void => {
    //   filterState.suppressClickawayEventListener();
    //   filterState.addNodeFromNode(
    //     new QueryBuilderFilterTreeBlankConditionNodeData(undefined),
    //     node,
    //   );
    // };
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
        {node instanceof QueryBuilderPostFilterTreeGroupNodeData && (
          <MenuContentItem
          // onClick={createCondition}
          >
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
            <FilledTriangleIcon />
          </button>
        </div>
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
    console.log('maiun', toJS(node));
    // const changeOperator = (val: QueryBuilderPostFilterOperator) => (): void =>
    //   node.condition.changeOperator(val);
    // const changeProperty = (
    //   propertyNode: QueryBuilderExplorerTreePropertyNodeData,
    // ): void =>
    //   node.condition.changeProperty(
    //     buildPropertyExpressionFromExplorerTreeNodeData(
    //       node.condition.filterState.queryBuilderState.explorerState
    //         .nonNullableTreeData,
    //       propertyNode,
    //       node.condition.filterState.queryBuilderState.graphManagerState.graph,
    //     ),
    //   );
    // Drag and Drop on filter condition value
    // const handleDrop = useCallback(
    //   (item: QueryBuilderParameterDragSource): void => {
    //     node.condition.setValue(item.variable.parameter);
    //   },
    //   [node],
    // );
    // const [{ isFilterValueDragOver }, dropConnector] = useDrop(
    //   () => ({
    //     accept: [QUERY_BUILDER_PARAMETER_TREE_DND_TYPE.VARIABLE],
    //     drop: (
    //       item: QueryBuilderParameterDragSource,
    //       monitor: DropTargetMonitor,
    //     ): void => {
    //       if (!monitor.didDrop()) {
    //         handleDrop(item);
    //       }
    //     },
    //     collect: (monitor): { isFilterValueDragOver: boolean } => ({
    //       isFilterValueDragOver: monitor.isOver({ shallow: true }),
    //     }),
    //   }),
    //   [handleDrop],
    // );

    return (
      <div className="query-builder-filter-tree__node__label__content dnd__overlay__container">
        {isPropertyDragOver && (
          <div className="query-builder-filter-tree__node__dnd__overlay">
            Add New Logical Group
          </div>
        )}
        <div className="query-builder-filter-tree__condition-node">
          <div className="query-builder-filter-tree__condition-node__property">
            {/* <QueryBuilderPropertyExpressionBadge
              propertyExpressionState={node.condition.propertyExpressionState}
              onPropertyExpressionChange={changeProperty}
            /> */}
            <div>{node.condition.columnName}</div>
          </div>
          <DropdownMenu
            className="query-builder-filter-tree__condition-node__operator"
            content={
              <MenuContent>
                {/* {node.condition.operators.map((op) => (
                  <MenuContentItem
                    key={op.uuid}
                    className="query-builder-filter-tree__condition-node__operator__dropdown__option"
                    // onClick={changeOperator(op)}
                  >
                    {op.getLabel(node.condition)}
                  </MenuContentItem>
                ))} */}
              </MenuContent>
            }
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              elevation: 7,
            }}
          >
            <div className="query-builder-filter-tree__condition-node__operator__label">
              {/* {node.condition.operator.getLabel(node.condition)} */}
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
              // ref={dropConnector}
              className="query-builder-filter-tree__condition-node__value dnd__overlay__container"
            >
              {/* {isFilterValueDragOver && (
                <div className="query-builder-filter-tree__node__dnd__overlay">
                  Change Filter Value
                </div>
              )} */}
              <QueryBuilderValueSpecificationEditor
                valueSpecification={node.condition.value}
                graph={
                  node.condition.postFilterState.queryBuilderState
                    .graphManagerState.graph
                }
                expectedType={
                  guaranteeType(
                    node.condition.colState,
                    QueryBuilderSimpleProjectionColumnState,
                  ).propertyExpressionState.propertyExpression.func.genericType
                    .value.rawType
                }
              />
            </div>
          )}
        </div>
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
    const filterState = queryBuilderState.filterState;
    const isExpandable =
      node instanceof QueryBuilderPostFilterTreeGroupNodeData;
    const selectNode = (): void => onNodeSelect?.(node);
    const toggleExpandNode = (): void => node.setIsOpen(!node.isOpen);
    // const resetNode = (): void => {
    //   if (node instanceof QueryBuilderPostFilterTreeConditionNodeData) {
    //     node.condition.value =
    //       node.condition.operator.getDefaultFilterConditionValue(
    //         node.condition,
    //       );
    //   }
    // };
    const removeNode = (): void => filterState.removeNodeAndPruneBranch(node);

    // Drag and Drop
    // const handleDrop = useCallback(
    //   (item: QueryBuilderFilterDropTarget, type: string): void => {
    //     if (
    //       Object.values<string>(QUERY_BUILDER_FILTER_DND_TYPE).includes(type)
    //     ) {
    //       // const dropNode = (item as QueryBuilderFilterConditionDragSource).node;
    //       // TODO: re-arrange
    //     } else {
    //       const dropNode = (item as QueryBuilderExplorerTreeDragSource).node;
    //       let filterConditionState: FilterConditionState;
    //       try {
    //         filterConditionState = new FilterConditionState(
    //           filterState,
    //           buildPropertyExpressionFromExplorerTreeNodeData(
    //             filterState.queryBuilderState.explorerState.nonNullableTreeData,
    //             dropNode,
    //             filterState.queryBuilderState.graphManagerState.graph,
    //           ),
    //         );
    //       } catch (error) {
    //         assertErrorThrown(error);
    //         applicationStore.notifyWarning(error.message);
    //         return;
    //       }
    //       if (node instanceof QueryBuilderFilterTreeGroupNodeData) {
    //         filterState.addNodeFromNode(
    //           new QueryBuilderFilterTreeConditionNodeData(
    //             undefined,
    //             filterConditionState,
    //           ),
    //           node,
    //         );
    //       } else if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
    //         filterState.newGroupWithConditionFromNode(
    //           new QueryBuilderFilterTreeConditionNodeData(
    //             undefined,
    //             filterConditionState,
    //           ),
    //           node,
    //         );
    //       } else if (
    //         node instanceof QueryBuilderFilterTreeBlankConditionNodeData
    //       ) {
    //         filterState.replaceBlankNodeWithNode(
    //           new QueryBuilderFilterTreeConditionNodeData(
    //             undefined,
    //             filterConditionState,
    //           ),
    //           node,
    //         );
    //       }
    //     }
    //   },
    //   [applicationStore, filterState, node],
    // );
    // const [{ isPropertyDragOver }, dropConnector] = useDrop(
    //   () => ({
    //     accept: [
    //       ...Object.values(QUERY_BUILDER_FILTER_DND_TYPE),
    //       QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
    //       QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
    //     ],
    //     drop: (
    //       item: QueryBuilderFilterConditionDragSource,
    //       monitor: DropTargetMonitor,
    //     ): void => {
    //       if (!monitor.didDrop()) {
    //         handleDrop(item, monitor.getItemType() as string);
    //       } // prevent drop event propagation to accomondate for nested DnD
    //     },
    //     // canDrop: (item: QueryBuilderFilterConditionDragSource, monitor: DropTargetMonitor): boolean => {
    //     //   console.log('check can drop - STUBBED');
    //     //   // prevent drop inside of children
    //     //   // prevent dropping inside my direct ancestor
    //     //   return true;
    //     // },
    //     collect: (monitor): { isPropertyDragOver: boolean } => ({
    //       isPropertyDragOver: monitor.isOver({ shallow: true }),
    //     }),
    //   }),
    //   [handleDrop],
    // );
    // const [, dragConnector, dragPreviewConnector] = useDrag(
    //   () => ({
    //     type:
    //       node instanceof QueryBuilderFilterTreeGroupNodeData
    //         ? QUERY_BUILDER_FILTER_DND_TYPE.GROUP_CONDITION
    //         : node instanceof QueryBuilderFilterTreeConditionNodeData
    //         ? QUERY_BUILDER_FILTER_DND_TYPE.CONDITION
    //         : QUERY_BUILDER_FILTER_DND_TYPE.BLANK_CONDITION,
    //     item: (): QueryBuilderFilterConditionDragSource => ({ node }),
    //     end: (): void => filterState.setRearrangingConditions(false),
    //   }),
    //   [node, filterState],
    // );
    // dragConnector(dropConnector(ref));
    // // hide default HTML5 preview image
    // useEffect(() => {
    //   dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    // }, [dragPreviewConnector]);
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
              {node instanceof QueryBuilderPostFilterTreeGroupNodeData && (
                <QueryBuilderPostFilterGroupConditionEditor
                  node={node}
                  isPropertyDragOver={false}
                />
              )}
              {node instanceof QueryBuilderPostFilterTreeConditionNodeData && (
                <QueryBuilderPostFilterConditionEditor
                  node={node}
                  isPropertyDragOver={false}
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
    console.log(rootNodes);
    const onNodeSelect = (node: QueryBuilderPostFilterTreeNodeData): void =>
      postFilterState.setSelectedNode(node);
    const getChildNodes = (
      node: QueryBuilderPostFilterTreeNodeData,
    ): QueryBuilderPostFilterTreeNodeData[] =>
      node instanceof QueryBuilderPostFilterTreeGroupNodeData
        ? node.childrenIds.map((id) => postFilterState.getNode(id))
        : [];
    const onClickAway = (): void => {
      console.log('onClickAway');
      // postFilterState.handleClickaway();
    };
    return (
      <ClickAwayListener onClickAway={onClickAway}>
        <div className="tree-view__node__root query-builder-filter-tree__root">
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

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER}
        className="panel query-builder__filter"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">post-filter</div>
          </div>
          {/* <div className="panel__header__actions">
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
          </div> */}
        </div>
        <div className="panel__content query-builder__filter__content dnd__overlay__container">
          <div />
          {postFilterState.isEmpty && (
            <BlankPanelPlaceholder
              placeholderText="Add a filter condition"
              tooltipText="Drag and drop properties here"
            />
          )}
          {!postFilterState.isEmpty && (
            <>
              {/* <FilterConditionDragLayer /> */}
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
