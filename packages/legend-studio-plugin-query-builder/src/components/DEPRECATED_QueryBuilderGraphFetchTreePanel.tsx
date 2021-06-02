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

import { observer } from 'mobx-react-lite';
import { BlankPanelPlaceholder } from '@finos/legend-studio-components';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_Constants';
import { isNonNullable, addUniqueEntry } from '@finos/legend-studio-shared';
import {
  FaChevronDown,
  FaChevronRight,
  FaCheckCircle,
  FaRegCircle,
  FaCircle,
} from 'react-icons/fa';
import type { TreeNodeContainerProps } from '@finos/legend-studio-components';
import { clsx, TreeView, ContextMenu } from '@finos/legend-studio-components';
import {
  DEPRECATED_RootGraphFetchTreeNodeData,
  DEPRECATED_getPropertyGraphFetchTreeNodeData,
  DEPRECATED_selectMappedGraphFetchProperties,
} from '../stores/DEPRECATED_QueryBuilderGraphFetchTreeUtil';
import type {
  DEPRECATED_GraphFetchTreeData,
  DEPRECATED_GraphFetchTreeNodeData,
} from '../stores/DEPRECATED_QueryBuilderGraphFetchTreeUtil';
import type { Mapping } from '@finos/legend-studio';
import {
  getClassPropertyIcon,
  ClassIcon,
  useEditorStore,
  Class,
  Enumeration,
} from '@finos/legend-studio';

const DEPRECATED_QueryBuilderGraphFetchTreeContextMenu = observer(
  (
    props: {
      selectAllMappedPropertiesCallback?: () => void;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { selectAllMappedPropertiesCallback } = props;
    return (
      <div ref={ref} className="graph-fetch-tree__context-menu">
        {selectAllMappedPropertiesCallback && (
          <button
            className="graph-fetch-tree__context-menu__item"
            onClick={selectAllMappedPropertiesCallback}
          >
            Select Mapped Properties
          </button>
        )}
      </div>
    );
  },
  { forwardRef: true },
);

const QueryBuilderGraphFetchTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    DEPRECATED_GraphFetchTreeNodeData,
    {
      toggleCheckNode: (node: DEPRECATED_GraphFetchTreeNodeData) => void;
      isReadOnly: boolean;
      checkAllProperties?: (node: DEPRECATED_GraphFetchTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { toggleCheckNode, isReadOnly, checkAllProperties } = innerProps;
  const isExpandable = Boolean(node.childrenIds.length);
  const isTraversed = node.isTraversed();
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <FaChevronDown />
    ) : (
      <FaChevronRight />
    )
  ) : (
    <div />
  );
  const nodeTypeIcon = getClassPropertyIcon(node.type);
  const isRoot = node instanceof DEPRECATED_RootGraphFetchTreeNodeData;
  const toggleCheck = (): void => toggleCheckNode(node);
  const toggleExpandNode = (): void => {
    onNodeSelect?.(node);
    // NOTE: here we only allow checking non-complex properties to avoid infinite loop case
    // A button to select all non-complex properties when selecting a property of type class can be added in the future
    if (!isExpandable) {
      toggleCheck();
    }
  };
  return (
    <ContextMenu
      disabled={!isExpandable || isReadOnly}
      content={
        <DEPRECATED_QueryBuilderGraphFetchTreeContextMenu
          selectAllMappedPropertiesCallback={(): void =>
            checkAllProperties?.(node)
          }
        />
      }
      menuProps={{ elevation: 7 }}
    >
      {!isRoot && (
        <div
          className="tree-view__node__container"
          style={{
            paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
            display: 'flex',
          }}
        >
          <div className="tree-view__node__icon graph-fetch-tree__node__icon">
            <div
              className="graph-fetch-tree__expand-icon"
              onClick={toggleExpandNode}
            >
              {nodeExpandIcon}
            </div>
            {!isExpandable && (
              <div
                className={clsx('graph-fetch-tree__checker-icon', {
                  'graph-fetch-tree__checker-icon--disabled': isReadOnly,
                })}
                onClick={toggleCheck}
              >
                {node.isChecked ? <FaCheckCircle /> : <FaRegCircle />}
              </div>
            )}
            {isExpandable && (
              <div
                className={clsx('graph-fetch-tree__checker-icon', {
                  'graph-fetch-tree__checker-icon--disabled': isReadOnly,
                })}
              >
                {isTraversed ? (
                  <FaCircle />
                ) : (
                  <div className="graph-fetch-tree__checker-icon--dim">
                    <FaRegCircle />
                  </div>
                )}
              </div>
            )}
            <div
              className="graph-fetch-tree__type-icon"
              onClick={toggleExpandNode}
            >
              {nodeTypeIcon}
            </div>
          </div>
          <div
            className="tree-view__node__label graph-fetch-tree__node__label"
            onClick={toggleExpandNode}
          >
            {node.label}
            {node.subType && (
              <div className="graph-fetch-tree__node__sub-type">
                <div className="graph-fetch-tree__node__sub-type__label">
                  {node.subType.name}
                </div>
              </div>
            )}
            {
              <div className="graph-fetch-tree__node__type">
                <div className="graph-fetch-tree__node__type__label">
                  {node.type.name}
                </div>
              </div>
            }
          </div>
        </div>
      )}
      {isRoot && (
        <div
          className="tree-view__node__container"
          style={{
            paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
            display: 'flex',
          }}
        >
          <div
            onClick={toggleExpandNode}
            className="graph-fetch-tree__expand-icon"
          >
            {nodeExpandIcon}
          </div>
          <div className="tree-view__node__label graph-fetch-tree__root-node__label">
            <div className="graph-fetch-tree__root-node__label__icon">
              <ClassIcon />
            </div>
            <div className="graph-fetch-tree__root-node__label__text">
              {node.label}
            </div>
          </div>
        </div>
      )}
    </ContextMenu>
  );
};

export const DEPRECATED_QueryBuilderGraphFetchTreeExplorer = observer(
  (props: {
    treeData: DEPRECATED_GraphFetchTreeData;
    updateTreeData: (data: DEPRECATED_GraphFetchTreeData) => void;
    isReadOnly: boolean;
    parentMapping?: Mapping;
  }) => {
    const { treeData, updateTreeData, isReadOnly, parentMapping } = props;
    const editorStore = useEditorStore();
    const onNodeSelect = (
      node: DEPRECATED_GraphFetchTreeNodeData,
      leaveOpen?: boolean,
    ): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen || leaveOpen;
        const type = node.subType ?? node.type;
        if (type instanceof Class) {
          type.getAllProperties().forEach((property) => {
            const propertyTreeNodeData =
              DEPRECATED_getPropertyGraphFetchTreeNodeData(
                editorStore,
                property,
                undefined,
                node,
              );
            treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
            const propertyType = property.genericType.value.rawType;
            if (propertyType instanceof Class) {
              propertyType.allSubClasses
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach((subClass) => {
                  const subTypePropertyTreeNodeData =
                    DEPRECATED_getPropertyGraphFetchTreeNodeData(
                      editorStore,
                      property,
                      subClass,
                      node,
                    );
                  treeData.nodes.set(
                    subTypePropertyTreeNodeData.id,
                    subTypePropertyTreeNodeData,
                  );
                  addUniqueEntry(
                    node.childrenIds,
                    subTypePropertyTreeNodeData.id,
                  );
                });
            }
          });
        }
      }
      updateTreeData({ ...treeData });
    };

    const checkAllProperties = (
      node: DEPRECATED_GraphFetchTreeNodeData,
    ): void => {
      if (parentMapping) {
        onNodeSelect(node, true);
        DEPRECATED_selectMappedGraphFetchProperties(treeData, node);
        updateTreeData({ ...treeData });
      }
    };

    const getChildNodes = (
      node: DEPRECATED_GraphFetchTreeNodeData,
    ): DEPRECATED_GraphFetchTreeNodeData[] =>
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable)
        // class comes first then enumeration then primitive
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            (b.type instanceof Class
              ? 2
              : b.type instanceof Enumeration
              ? 1
              : 0) -
            (a.type instanceof Class
              ? 2
              : a.type instanceof Enumeration
              ? 1
              : 0),
        );

    const toggleCheckNode = (node: DEPRECATED_GraphFetchTreeNodeData): void => {
      if (!isReadOnly) {
        const isChecking = !node.isChecked;
        if (isChecking) {
          let currentNode = node;
          while (currentNode.parentId) {
            const parentNode = treeData.nodes.get(currentNode.parentId);
            if (parentNode) {
              parentNode.graphFetchTreeNode.addSubTree(
                currentNode.graphFetchTreeNode,
              );
              currentNode = parentNode;
            } else {
              break;
            }
          }
        } else {
          let currentNode = node;
          while (currentNode.parentId) {
            const parentNode = treeData.nodes.get(currentNode.parentId);
            if (parentNode) {
              if (!currentNode.isTraversed()) {
                parentNode.graphFetchTreeNode.removeSubTree(
                  currentNode.graphFetchTreeNode,
                );
                currentNode = parentNode;
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }
        node.isChecked = !node.isChecked;
        updateTreeData({ ...treeData });
      }
    };

    return (
      <TreeView
        components={{
          TreeNodeContainer: QueryBuilderGraphFetchTreeNodeContainer,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          toggleCheckNode,
          isReadOnly,
          checkAllProperties: parentMapping ? checkAllProperties : undefined,
        }}
      />
    );
  },
);

export const DEPRECATED_QueryBuilderGraphFetchTreePanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const _class = queryBuilderState.querySetupState._class;
    const _mapping = queryBuilderState.querySetupState.mapping;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const graphFetchState = fetchStructureState.graphFetchTreeState;
    const graphFetchTree = graphFetchState.DEPRECATED_graphFetchTree;
    // Deep/Graph Fetch Tree
    const updateTreeData = (data: DEPRECATED_GraphFetchTreeData): void => {
      graphFetchState.setGraphFetchTree(data);
    };

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}
        className="panel__content"
      >
        {!_class && (
          <BlankPanelPlaceholder
            placeholderText="No class selected for graph fetch tree"
            tooltipText="Please select class to get a graph fetch tree"
          />
        )}
        {graphFetchTree && (
          <div className="mapping-test-editor-panel__target-panel__query-container">
            <DEPRECATED_QueryBuilderGraphFetchTreeExplorer
              treeData={graphFetchTree}
              isReadOnly={false}
              updateTreeData={updateTreeData}
              parentMapping={_mapping}
            />
          </div>
        )}
      </div>
    );
  },
);
