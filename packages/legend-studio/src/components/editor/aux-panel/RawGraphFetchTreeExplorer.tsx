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
import type {
  RawGraphFetchTreeNodeData,
  RawGraphFetchTreeData,
} from '../../../stores/shared/RawGraphFetchTreeUtil';
import {
  RootGraphFetchTreeNodeData,
  getRawPropertyGraphFetchTreeNodeData,
  selectMappedGraphFetchProperties,
} from '../../../stores/shared/RawGraphFetchTreeUtil';
import { ClassIcon, getClassPropertyIcon } from '../../shared/Icon';
import { observer } from 'mobx-react-lite';
import { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import type { Mapping } from '../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { useEditorStore } from '../../../stores/EditorStore';

export const RawGraphFetchContextMenu = observer(
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

const RawGraphFetchTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    RawGraphFetchTreeNodeData,
    {
      toggleCheckNode: (node: RawGraphFetchTreeNodeData) => void;
      isReadOnly: boolean;
      checkAllProperties?: (node: RawGraphFetchTreeNodeData) => void;
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
  const isRoot = node instanceof RootGraphFetchTreeNodeData;
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
        <RawGraphFetchContextMenu
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

export const RawGraphFetchTreeExplorer = observer(
  (props: {
    treeData: RawGraphFetchTreeData;
    updateTreeData: (data: RawGraphFetchTreeData) => void;
    isReadOnly: boolean;
    parentMapping?: Mapping;
  }) => {
    const { treeData, updateTreeData, isReadOnly, parentMapping } = props;
    const editorStore = useEditorStore();
    const onNodeSelect = (
      node: RawGraphFetchTreeNodeData,
      leaveOpen?: boolean,
    ): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen || leaveOpen;
        const type = node.subType ?? node.type;
        if (type instanceof Class) {
          type.getAllProperties().forEach((property) => {
            const propertyTreeNodeData = getRawPropertyGraphFetchTreeNodeData(
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
                    getRawPropertyGraphFetchTreeNodeData(
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

    const checkAllProperties = (node: RawGraphFetchTreeNodeData): void => {
      if (parentMapping) {
        onNodeSelect(node, true);
        selectMappedGraphFetchProperties(treeData, node);
        updateTreeData({ ...treeData });
      }
    };

    const getChildNodes = (
      node: RawGraphFetchTreeNodeData,
    ): RawGraphFetchTreeNodeData[] =>
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

    const toggleCheckNode = (node: RawGraphFetchTreeNodeData): void => {
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
          TreeNodeContainer: RawGraphFetchTreeNodeContainer,
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
