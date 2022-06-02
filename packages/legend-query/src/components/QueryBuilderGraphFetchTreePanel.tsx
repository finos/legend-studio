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

import { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { type DropTargetMonitor, useDrop } from 'react-dnd';
import {
  type TreeNodeContainerProps,
  clsx,
  TreeView,
  BlankPanelPlaceholder,
  ChevronDownIcon,
  ChevronRightIcon,
  TimesIcon,
  CheckSquareIcon,
  SquareIcon,
} from '@finos/legend-art';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  type QueryBuilderGraphFetchTreeData,
  type QueryBuilderGraphFetchTreeNodeData,
  removeNodeRecursively,
  isGraphFetchTreeDataEmpty,
} from '../stores/QueryBuilderGraphFetchTreeUtil.js';
import {
  type QueryBuilderExplorerTreeDragSource,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../stores/QueryBuilderExplorerState.js';
import type { QueryBuilderGraphFetchTreeState } from '../stores/QueryBuilderGraphFetchTreeState.js';
import { getClassPropertyIcon } from './shared/ElementIconUtils.js';

const QueryBuilderGraphFetchTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    QueryBuilderGraphFetchTreeNodeData,
    {
      isReadOnly: boolean;
      removeNode: (node: QueryBuilderGraphFetchTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { removeNode } = innerProps;
  const property = node.tree.property.value;
  const type = property.genericType.value.rawType;
  const subType = node.tree.subType.value;
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
  const nodeTypeIcon = getClassPropertyIcon(type);
  const toggleExpandNode = (): void => onNodeSelect?.(node);
  const deleteNode = (): void => removeNode(node);

  return (
    <div
      className="tree-view__node__container query-builder-graph-fetch-tree__node__container"
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2)}rem`,
        display: 'flex',
      }}
    >
      <div className="query-builder-graph-fetch-tree__node__content">
        <div className="tree-view__node__icon query-builder-graph-fetch-tree__node__icon">
          <div
            className="query-builder-graph-fetch-tree__expand-icon"
            onClick={toggleExpandNode}
          >
            {nodeExpandIcon}
          </div>
          <div
            className="query-builder-graph-fetch-tree__type-icon"
            onClick={toggleExpandNode}
          >
            {nodeTypeIcon}
          </div>
        </div>
        <div
          className="tree-view__node__label query-builder-graph-fetch-tree__node__label"
          onClick={toggleExpandNode}
        >
          {node.label}
          {/* TODO: support alias */}
          {/* TODO: qualified properties */}
          {/* TODO: think of a better layout to represent subtype */}
          {subType && (
            <div className="query-builder-graph-fetch-tree__node__sub-type">
              <div className="query-builder-graph-fetch-tree__node__sub-type__label">
                {subType.name}
              </div>
            </div>
          )}
          {
            <div className="query-builder-graph-fetch-tree__node__type">
              <div className="query-builder-graph-fetch-tree__node__type__label">
                {type.name}
              </div>
            </div>
          }
        </div>
      </div>
      <div className="query-builder-graph-fetch-tree__node__actions">
        <button
          className="query-builder-graph-fetch-tree__node__action"
          title="Remove"
          tabIndex={-1}
          onClick={deleteNode}
        >
          <TimesIcon />
        </button>
      </div>
    </div>
  );
};

export const QueryBuilderGraphFetchTreeExplorer = observer(
  (props: {
    graphFetchState: QueryBuilderGraphFetchTreeState;
    treeData: QueryBuilderGraphFetchTreeData;
    updateTreeData: (data: QueryBuilderGraphFetchTreeData) => void;
    isReadOnly: boolean;
  }) => {
    const { graphFetchState, treeData, updateTreeData, isReadOnly } = props;

    const onNodeSelect = (node: QueryBuilderGraphFetchTreeNodeData): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
      }
      updateTreeData({ ...treeData });
    };

    const getChildNodes = (
      node: QueryBuilderGraphFetchTreeNodeData,
    ): QueryBuilderGraphFetchTreeNodeData[] =>
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable);

    const removeNode = (node: QueryBuilderGraphFetchTreeNodeData): void => {
      removeNodeRecursively(treeData, node);
      updateTreeData({ ...treeData });
    };

    const toggleChecked = (): void =>
      graphFetchState.setChecked(!graphFetchState.isChecked);

    return (
      <div className="query-builder-graph-fetch-tree">
        <div className="query-builder-graph-fetch-tree__settings">
          <div
            className={clsx('panel__content__form__section__toggler')}
            onClick={toggleChecked}
          >
            <button
              className={clsx('panel__content__form__section__toggler__btn', {
                'panel__content__form__section__toggler__btn--toggled':
                  graphFetchState.isChecked,
              })}
            >
              {graphFetchState.isChecked ? <CheckSquareIcon /> : <SquareIcon />}
            </button>
            <div className="panel__content__form__section__toggler__prompt">
              Check graph fetch
            </div>
          </div>
        </div>
        <div className="query-builder-graph-fetch-tree__container">
          <TreeView
            components={{
              TreeNodeContainer: QueryBuilderGraphFetchTreeNodeContainer,
            }}
            treeData={treeData}
            onNodeSelect={onNodeSelect}
            getChildNodes={getChildNodes}
            innerProps={{
              isReadOnly,
              removeNode,
            }}
          />
        </div>
      </div>
    );
  },
);

export const QueryBuilderGraphFetchTreePanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const graphFetchState = fetchStructureState.graphFetchTreeState;
    const treeData = graphFetchState.treeData;

    // Deep/Graph Fetch Tree
    const updateTreeData = (data: QueryBuilderGraphFetchTreeData): void => {
      graphFetchState.setGraphFetchTree(data);
    };

    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderExplorerTreeDragSource): void => {
        graphFetchState.addProperty(item.node);
        if (
          queryBuilderState.explorerState.propertySearchPanelState
            .searchedPropertyName.length >= 3
        ) {
          queryBuilderState.explorerState.propertySearchPanelState.setIsSearchPanelOpen(
            true,
          );
        }
      },
      [graphFetchState, queryBuilderState],
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
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}
        className="panel__content dnd__overlay__container"
        ref={dropConnector}
      >
        <div className={clsx({ dnd__overlay: isPropertyDragOver })} />
        {(!treeData || isGraphFetchTreeDataEmpty(treeData)) && (
          <BlankPanelPlaceholder
            placeholderText="Add a graph fetch property"
            tooltipText="Drag and drop properties here"
          />
        )}
        {treeData && !isGraphFetchTreeDataEmpty(treeData) && (
          <QueryBuilderGraphFetchTreeExplorer
            graphFetchState={graphFetchState}
            treeData={treeData}
            isReadOnly={false}
            updateTreeData={updateTreeData}
          />
        )}
      </div>
    );
  },
);
