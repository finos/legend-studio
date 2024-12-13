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

import { useState, useEffect, useRef } from 'react';
import {
  isNonNullable,
  IllegalStateError,
  assertType,
  addUniqueEntry,
  printObject,
} from '@finos/legend-shared';
import {
  type TreeNodeContainerProps,
  type TreeData,
  PURE_EnumValueIcon,
  clsx,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import { useDrag } from 'react-dnd';
import {
  TypeDragSource,
  CORE_DND_TYPE,
} from '../../../../stores/editor/utils/DnDUtils.js';
import type { TypeTreeNodeData } from '../../../../stores/editor/utils/TreeUtils.js';
import {
  type Type,
  type Enum,
  type AbstractProperty,
  Enumeration,
  Class,
  DEFAULT_SOURCE_PARAMETER_NAME,
  VARIABLE_REFERENCE_TOKEN,
  getAllClassProperties,
  getAllClassDerivedProperties,
  getRawGenericType,
} from '@finos/legend-graph';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import { getClassPropertyIcon } from '@finos/legend-lego/graph-editor';

const getEnumTypeTreeNodeData = (
  _enum: Enum,
  parent: TypeTreeNodeData,
): TypeTreeNodeData => {
  // NOTE: Enum is not a type
  assertType(
    parent.type,
    Enumeration,
    'type of parent node for enum node must be enumeration',
  );
  return {
    id: `${parent.id}.${_enum.name}`,
    label: _enum.name,
    parent: parent.type,
    dndType: CORE_DND_TYPE.TYPE_TREE_ENUM,
  };
};

const getPropertyTypeTreeNodeData = (
  property: AbstractProperty,
  parent: TypeTreeNodeData,
): TypeTreeNodeData => {
  assertType(
    parent.type,
    Class,
    'type of parent node for class property node must be class',
  );
  const nodeData: TypeTreeNodeData = {
    id: `${parent.id}.${property.name}`,
    label: property.name,
    type: property.genericType.value.rawType,
    parent: parent.type,
    dndType: CORE_DND_TYPE.TYPE_TREE_PRIMITIVE,
    property,
  };
  switch (getClassPropertyType(property.genericType.value.rawType)) {
    case CLASS_PROPERTY_TYPE.CLASS:
      nodeData.childrenIds = getAllClassProperties(
        getRawGenericType(property.genericType.value, Class),
      ).map((p) => `${nodeData.id}.${p.name}`);
      nodeData.dndType = CORE_DND_TYPE.TYPE_TREE_CLASS;
      break;
    case CLASS_PROPERTY_TYPE.ENUMERATION:
      nodeData.childrenIds = getRawGenericType(
        property.genericType.value,
        Enumeration,
      ).values.map((p) => `${nodeData.id}.${p.name}`);
      nodeData.dndType = CORE_DND_TYPE.TYPE_TREE_ENUMERATION;
      break;
    default:
  }
  return nodeData;
};

const getTypeTreeData = (type: Type): TreeData<TypeTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, TypeTreeNodeData>();
  if (type instanceof Class) {
    getAllClassProperties(type)
      .concat(getAllClassDerivedProperties(type))
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort(
        (a, b) =>
          (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) -
          (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0),
      )
      .forEach((property) => {
        const propertyTreeNodeData = getPropertyTypeTreeNodeData(property, {
          id: `${VARIABLE_REFERENCE_TOKEN}${DEFAULT_SOURCE_PARAMETER_NAME}`,
          label: '',
          parent: type,
          dndType: CORE_DND_TYPE.TYPE_TREE_CLASS,
          type: type,
        });
        addUniqueEntry(rootIds, propertyTreeNodeData.id);
        nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
      });
  } else if (type instanceof Enumeration) {
    type.values.forEach((enumValue) => {
      const propertyTreeNodeData = getEnumTypeTreeNodeData(enumValue, {
        id: `${VARIABLE_REFERENCE_TOKEN}${DEFAULT_SOURCE_PARAMETER_NAME}`,
        label: '',
        parent: type,
        dndType: CORE_DND_TYPE.TYPE_TREE_ENUMERATION,
        type: type,
      });
      addUniqueEntry(rootIds, propertyTreeNodeData.id);
      nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
    });
  } else {
    throw new IllegalStateError(
      `Can't use type tree with node type other than class and enumeration. Found:\n${printObject(
        type,
      )}`,
    );
  }
  return { rootIds, nodes };
};

const TypeTreeNodeContainer: React.FC<
  TreeNodeContainerProps<TypeTreeNodeData, { selectedType?: Type | undefined }>
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { selectedType } = innerProps;
  const [, dragConnector] = useDrag(
    () => ({ type: node.dndType, item: new TypeDragSource(node) }),
    [node],
  );
  const ref = useRef<HTMLDivElement>(null);
  dragConnector(ref);

  const isExpandable = Boolean(node.childrenIds?.length);
  const nodeTypeIcon = node.type ? (
    getClassPropertyIcon(node.type)
  ) : (
    <PURE_EnumValueIcon />
  );
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );
  const selectNode = (): void => onNodeSelect?.(node);

  return (
    <div
      className={clsx('tree-view__node__container', {
        'type-tree__node__container--highlighted': node.type === selectedType,
      })}
      onClick={selectNode}
      ref={ref}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon type-tree__node__icon">
        <div className="tree-view__node__expand-icon">{nodeExpandIcon}</div>
        <div className="type-tree__type-icon">{nodeTypeIcon}</div>
      </div>
      <div className="tree-view__node__label type-tree__node__label">
        <button tabIndex={-1} title={`${node.id}`}>
          {node.label}
        </button>
        {Boolean(node.type) && (
          <div className="type-tree__node__type">
            <button
              className={clsx('type-tree__node__type__label', {
                'type-tree__node__type__label--highlighted':
                  node.type === selectedType,
              })}
              tabIndex={-1}
              title={node.type?.path ?? ''}
            >
              {node.type?.name ?? 'unknown'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const TypeTree: React.FC<{
  type: Type;
  selectedType?: Type | undefined;
}> = (props) => {
  const { type, selectedType } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<TreeData<TypeTreeNodeData>>(() =>
    getTypeTreeData(type),
  );
  const onNodeSelect = (node: TypeTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.type instanceof Class) {
        getAllClassProperties(node.type)
          .concat(getAllClassDerivedProperties(node.type))
          .forEach((property) => {
            const propertyTreeNodeData = getPropertyTypeTreeNodeData(
              property,
              node,
            );
            treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
          });
      } else if (node.type instanceof Enumeration) {
        node.type.values.forEach((enumValue) => {
          const propertyTreeNodeData = getEnumTypeTreeNodeData(enumValue, node);
          treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
        });
      }
    }
    setTreeData({ ...treeData });
  };

  const getChildNodes = (node: TypeTreeNodeData): TypeTreeNodeData[] => {
    if (!node.childrenIds || !node.type) {
      return [];
    }
    const childrenNodes = node.childrenIds
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
          (a.type instanceof Class ? 2 : a.type instanceof Enumeration ? 1 : 0),
      );
    return childrenNodes;
  };

  useEffect(() => {
    setTreeData(() => getTypeTreeData(type));
  }, [type]);

  return (
    <TreeView
      components={{
        TreeNodeContainer: TypeTreeNodeContainer,
      }}
      treeData={treeData}
      onNodeSelect={onNodeSelect}
      getChildNodes={getChildNodes}
      innerProps={{
        selectedType,
      }}
    />
  );
};
