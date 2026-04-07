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

import { forwardRef, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  type TreeData,
  clsx,
  TreeView,
  BlankPanelContent,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  DragPreviewLayer,
  useDragPreviewLayer,
  PanelHeader,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoCircleIcon,
  Tooltip,
  PURE_DataProductIcon,
  PURE_IngestIcon,
  PURE_DatabaseIcon,
  PURE_UnknownElementTypeIcon,
} from '@finos/legend-art';
import { useDrag } from 'react-dnd';
import {
  type Accessor,
  type RelationColumn,
  DataProductAccessor,
  IngestionAccessor,
  InstanceValue,
  RelationalStoreAccessor,
} from '@finos/legend-graph';
import {
  type QueryBuilderExplorerTreeRelationColumnDragSource,
  type QueryBuilderExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  QueryBuilderExplorerTreeRelationColumnNodeData,
  QueryBuilderExplorerTreeRelationRootNodeData,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  isExplorerTreeNodeAlreadyUsed,
  renderPropertyTypeIcon,
} from './QueryBuilderExplorerPanel.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import { QueryBuilderBaseInfoTooltip } from '../shared/QueryBuilderPropertyInfoTooltip.js';
import { QueryBuilderTDSState } from '../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderRelationColumnProjectionColumnState } from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';

const RELATION_ROOT_NODE_ID = '__relation_root__';

const getAccessorIcon = (accessor: Accessor): React.ReactNode => {
  if (accessor instanceof DataProductAccessor) {
    return <PURE_DataProductIcon />;
  } else if (accessor instanceof IngestionAccessor) {
    return <PURE_IngestIcon />;
  } else if (accessor instanceof RelationalStoreAccessor) {
    return <PURE_DatabaseIcon />;
  }
  return <PURE_UnknownElementTypeIcon />;
};

const getAccessorPath = (accessor: Accessor): string =>
  [accessor.accessorOwner, accessor.schema, accessor.accessor]
    .filter(isNonNullable)
    .join('.');

const getColumnTypeLabel = (column: RelationColumn): string => {
  const typeName = column.genericType.value.rawType.name;
  const typeVariableValues = column.genericType.value.typeVariableValues;
  if (typeVariableValues && typeVariableValues.length > 0) {
    const args = typeVariableValues
      .map((v) => (v instanceof InstanceValue ? v.values[0] : undefined))
      .filter(isNonNullable);
    if (args.length > 0) {
      return `${typeName}(${args.join(', ')})`;
    }
  }
  return typeName;
};

const buildRelationTreeData = (
  accessor: Accessor,
): TreeData<QueryBuilderExplorerTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, QueryBuilderExplorerTreeNodeData>();

  const columnIds: string[] = [];
  accessor.relationType.columns.forEach((column) => {
    const type = column.genericType.value.rawType;
    const node = new QueryBuilderExplorerTreeRelationColumnNodeData(
      column.name,
      column.name,
      column.name,
      column,
      type,
      { mapped: true },
    );
    columnIds.push(node.id);
    nodes.set(node.id, node);
  });

  const rootNode = new QueryBuilderExplorerTreeRelationRootNodeData(
    RELATION_ROOT_NODE_ID,
    accessor.accessor,
    accessor.accessor,
    false,
    accessor.relationType,
    { mapped: true },
    columnIds,
  );
  rootNode.setIsOpen(true);
  rootIds.push(rootNode.id);
  nodes.set(rootNode.id, rootNode);

  return { rootIds, nodes };
};

const QueryBuilderRelationExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderExplorerTreeNodeData;
      accessor: Accessor;
    }
  >(function QueryBuilderRelationExplorerContextMenu(props, ref) {
    const { queryBuilderState, node, accessor } = props;
    const tdsState =
      queryBuilderState.fetchStructureState.implementation instanceof
      QueryBuilderTDSState
        ? queryBuilderState.fetchStructureState.implementation
        : undefined;

    const addColumnToFetchStructure = (): void => {
      if (
        tdsState &&
        node instanceof QueryBuilderExplorerTreeRelationColumnNodeData
      ) {
        tdsState.addColumn(
          new QueryBuilderRelationColumnProjectionColumnState(
            tdsState,
            node.column,
            true,
          ),
        );
      }
    };

    const addAllColumnsToFetchStructure = (): void => {
      if (tdsState) {
        accessor.relationType.columns.forEach((column) => {
          tdsState.addColumn(
            new QueryBuilderRelationColumnProjectionColumnState(
              tdsState,
              column,
              true,
            ),
          );
        });
      }
    };

    return (
      <MenuContent ref={ref}>
        {node instanceof QueryBuilderExplorerTreeRelationColumnNodeData && (
          <MenuContentItem onClick={addColumnToFetchStructure}>
            Add Column to Fetch Structure
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderExplorerTreeRelationRootNodeData && (
          <MenuContentItem onClick={addAllColumnsToFetchStructure}>
            Add Columns to Fetch Structure
          </MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

const QueryBuilderRelationNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderExplorerTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
        accessor: Accessor;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { queryBuilderState, accessor } = innerProps;
    const isRoot = node instanceof QueryBuilderExplorerTreeRelationRootNodeData;
    const isColumn =
      node instanceof QueryBuilderExplorerTreeRelationColumnNodeData;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);

    const [, dragConnector, dragPreviewConnector] =
      useDrag<QueryBuilderExplorerTreeRelationColumnDragSource>(
        () => ({
          type: QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.RELATION_COLUMN,
          item: () => ({
            node: node as QueryBuilderExplorerTreeRelationColumnNodeData,
          }),
        }),
        [node],
      );
    const ref = useRef<HTMLDivElement>(null);
    if (isColumn) {
      dragConnector(ref);
    }
    useDragPreviewLayer(dragPreviewConnector);

    const explorerState = queryBuilderState.explorerState;
    const columnLabel =
      isColumn && explorerState.humanizePropertyName
        ? prettyCONSTName(node.label)
        : node.label;

    const selectNode = (): void => onNodeSelect?.(node);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    if (isRoot) {
      const isExpanded = node.isOpen === true;
      const nodeExpandIcon = isExpanded ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      );

      return (
        <ContextMenu
          content={
            <QueryBuilderRelationExplorerContextMenu
              queryBuilderState={queryBuilderState}
              node={node}
              accessor={accessor}
            />
          }
          menuProps={{ elevation: 7 }}
          onOpen={onContextMenuOpen}
          onClose={onContextMenuClose}
        >
          <div
            className={clsx(
              'tree-view__node__container query-builder-explorer-tree__node__container',
              {
                'query-builder-explorer-tree__node__container--selected-from-context-menu':
                  isSelectedFromContextMenu,
                'query-builder-explorer-tree__node__container--highlighted':
                  explorerState.highlightUsedProperties &&
                  isExplorerTreeNodeAlreadyUsed(node, queryBuilderState),
              },
            )}
            onClick={selectNode}
            style={{
              paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
              display: 'flex',
            }}
          >
            <div className="tree-view__node__icon query-builder-explorer-tree__node__icon">
              <div className="query-builder-explorer-tree__expand-icon">
                {nodeExpandIcon}
              </div>
              <div className="query-builder-explorer-tree__type-icon">
                {getAccessorIcon(accessor)}
              </div>
            </div>
            <div className="tree-view__node__label query-builder-explorer-tree__node__label query-builder-explorer-tree__node__label--with-action">
              {node.label}
            </div>
            <div className="query-builder-explorer-tree__node__actions">
              <Tooltip
                arrow={true}
                classes={{
                  tooltip: 'query-builder__tooltip',
                  arrow: 'query-builder__tooltip__arrow',
                  tooltipPlacementRight: 'query-builder__tooltip--right',
                }}
                slotProps={{
                  transition: { timeout: 0 },
                }}
                title={
                  <div className="query-builder__tooltip__content">
                    <div className="query-builder__tooltip__item">
                      <div className="query-builder__tooltip__item__label">
                        Type
                      </div>
                      <div className="query-builder__tooltip__item__value">
                        {accessor.accessorOwnerLabel}
                      </div>
                    </div>
                    <div className="query-builder__tooltip__item">
                      <div className="query-builder__tooltip__item__label">
                        Path
                      </div>
                      <div className="query-builder__tooltip__item__value">
                        {getAccessorPath(accessor)}
                      </div>
                    </div>
                  </div>
                }
              >
                <div
                  className="query-builder-explorer-tree__node__action query-builder-explorer-tree__node__info"
                  data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TOOLTIP_ICON}
                >
                  <InfoCircleIcon />
                </div>
              </Tooltip>
            </div>
          </div>
        </ContextMenu>
      );
    }

    // Column node
    const columnNode = isColumn ? node : undefined;
    const nodeTypeIcon = isColumn
      ? renderPropertyTypeIcon(node.type)
      : undefined;
    const columnTypeLabel = columnNode
      ? getColumnTypeLabel(columnNode.column)
      : node.type.path;

    return (
      <ContextMenu
        content={
          <QueryBuilderRelationExplorerContextMenu
            queryBuilderState={queryBuilderState}
            node={node}
            accessor={accessor}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'tree-view__node__container query-builder-explorer-tree__node__container',
            {
              'query-builder-explorer-tree__node__container--selected-from-context-menu':
                isSelectedFromContextMenu,
              'query-builder-explorer-tree__node__container--highlighted':
                explorerState.highlightUsedProperties &&
                isExplorerTreeNodeAlreadyUsed(node, queryBuilderState),
            },
          )}
          onClick={selectNode}
          ref={ref}
          style={{
            paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
            display: 'flex',
          }}
        >
          <div className="tree-view__node__icon query-builder-explorer-tree__node__icon">
            <div className="query-builder-explorer-tree__expand-icon">
              <div />
            </div>
            <div className="query-builder-explorer-tree__type-icon">
              {nodeTypeIcon}
            </div>
          </div>
          <div className="tree-view__node__label query-builder-explorer-tree__node__label query-builder-explorer-tree__node__label--with-action">
            {columnLabel}
          </div>
          <div className="query-builder-explorer-tree__node__actions">
            <QueryBuilderBaseInfoTooltip
              title={columnLabel}
              data={[
                {
                  label: 'Type',
                  value: columnTypeLabel,
                },
                {
                  label: 'Column',
                  value: node.label,
                },
              ]}
            >
              <div
                className="query-builder-explorer-tree__node__action query-builder-explorer-tree__node__info"
                data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_TOOLTIP_ICON}
              >
                <InfoCircleIcon />
              </div>
            </QueryBuilderBaseInfoTooltip>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

const QueryBuilderRelationTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderExplorerTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
        accessor: Accessor;
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
      components,
    } = props;

    return (
      <div className="tree-view__node__block">
        <QueryBuilderRelationNodeContainer
          node={node}
          level={level + 1}
          stepPaddingInRem={stepPaddingInRem}
          onNodeSelect={onNodeSelect}
          innerProps={innerProps}
        />
        {node.isOpen &&
          getChildNodes(node).map((childNode) => (
            <QueryBuilderRelationTreeNodeView
              key={childNode.id}
              node={childNode}
              level={level + 1}
              components={components}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={innerProps}
            />
          ))}
      </div>
    );
  },
);

const QueryBuilderRelationExplorerTree = observer(
  (props: { queryBuilderState: QueryBuilderState; accessor: Accessor }) => {
    const { queryBuilderState, accessor } = props;
    // NOTE: we must memoize tree data so node state (e.g. isOpen) persists across re-renders
    const treeData = useMemo(() => buildRelationTreeData(accessor), [accessor]);
    const onNodeSelect = (node: QueryBuilderExplorerTreeNodeData): void => {
      if (node instanceof QueryBuilderExplorerTreeRelationRootNodeData) {
        node.setIsOpen(!node.isOpen);
      }
    };
    const getChildNodes = (
      node: QueryBuilderExplorerTreeNodeData,
    ): QueryBuilderExplorerTreeNodeData[] => {
      if (node instanceof QueryBuilderExplorerTreeRelationRootNodeData) {
        return node.childrenIds
          .map((id) => treeData.nodes.get(id))
          .filter(isNonNullable);
      }
      return [];
    };

    return (
      <TreeView
        components={{
          TreeNodeContainer: QueryBuilderRelationNodeContainer,
          TreeNodeView: QueryBuilderRelationTreeNodeView,
        }}
        className="query-builder-explorer-tree__root"
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          queryBuilderState,
          accessor,
        }}
      />
    );
  },
);

export const QueryBuilderRelationExplorerPanel = observer(
  (props: { queryBuilderState: QueryBuilderState; accessor: Accessor }) => {
    const { queryBuilderState, accessor } = props;

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER}
        className="panel query-builder__explorer"
      >
        <PanelHeader title="columns" />
        <div className="panel__content query-builder-explorer-tree__content">
          <DragPreviewLayer
            labelGetter={(
              item: QueryBuilderExplorerTreeRelationColumnDragSource,
            ): string => {
              const dragNode = item.node;
              return queryBuilderState.explorerState.humanizePropertyName
                ? prettyCONSTName(dragNode.label)
                : dragNode.label;
            }}
            types={[QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.RELATION_COLUMN]}
          />
          {accessor.relationType.columns.length === 0 ? (
            <BlankPanelContent>No columns</BlankPanelContent>
          ) : (
            <QueryBuilderRelationExplorerTree
              queryBuilderState={queryBuilderState}
              accessor={accessor}
            />
          )}
        </div>
      </div>
    );
  },
);
