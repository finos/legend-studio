/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useEffect } from 'react';
import { isNonNullable, IllegalStateError, assertType, addUniqueEntry } from 'Utilities/GeneralUtil';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { TreeView, TreeNodeContainerProps } from 'Components/shared/TreeView';
import { useDrag } from 'react-dnd';
import { TypeDragSource, DND_TYPE } from 'Utilities/DnDUtil';
import { ElementIcon, EnumValueIcon } from 'Components/shared/Icon';
import clsx from 'clsx';
import { TreeData, TypeTreeNodeData } from 'Utilities/TreeUtil';
import { DEFAULT_SOURCE_PARAMETER_NAME } from 'MetaModelConst';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Enum } from 'MM/model/packageableElements/domain/Enum';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { Class, CLASS_PROPERTY_TYPE, getClassPropertyType } from 'MM/model/packageableElements/domain/Class';

const getEnumTypeTreeNodeData = (_enum: Enum, parent: TypeTreeNodeData): TypeTreeNodeData => {
  // NOTE: Enum is not a type
  assertType(parent.type, Enumeration, 'type of parent node for enum node must be enumeration');
  return { id: `${parent.id}.${_enum.name}`, label: _enum.name, parent: parent.type, dndType: DND_TYPE.TYPE_TREE_ENUM };
};

const getPropertyTypeTreeNodeData = (property: Property, parent: TypeTreeNodeData): TypeTreeNodeData => {
  assertType(parent.type, Class, 'type of parent node for class property node must be class');
  const nodeData: TypeTreeNodeData = { id: `${parent.id}.${property.name}`, label: property.name, type: property.genericType.value.rawType, parent: parent.type, dndType: DND_TYPE.TYPE_TREE_PRIMITIVE };
  switch (getClassPropertyType(property.genericType.value.rawType)) {
    case CLASS_PROPERTY_TYPE.CLASS:
      nodeData.childrenIds = property.genericType.value.getRawType(Class).getAllProperties().map(p => `${nodeData.id}.${p.name}`);
      nodeData.dndType = DND_TYPE.TYPE_TREE_CLASS;
      break;
    case CLASS_PROPERTY_TYPE.ENUMERATION:
      nodeData.childrenIds = property.genericType.value.getRawType(Enumeration).values.map(p => `${nodeData.id}.${p.name}`);
      nodeData.dndType = DND_TYPE.TYPE_TREE_ENUMERATION;
      break;
    default:
  }
  return nodeData;
};

const getTypeTreeData = (type: Type): TreeData<TypeTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, TypeTreeNodeData>();
  if (type instanceof Class) {
    type.getAllProperties()
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => (b instanceof Class ? 2 : b instanceof Enumeration ? 1 : 0) - (a instanceof Class ? 2 : a instanceof Enumeration ? 1 : 0))
      .forEach(property => {
        const propertyTreeNodeData = getPropertyTypeTreeNodeData(property, { id: `$${DEFAULT_SOURCE_PARAMETER_NAME}`, label: '', parent: type, dndType: DND_TYPE.TYPE_TREE_CLASS, type: type });
        addUniqueEntry(rootIds, propertyTreeNodeData.id);
        nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
      });
  } else if (type instanceof Enumeration) {
    type.values.forEach(enumValue => {
      const propertyTreeNodeData = getEnumTypeTreeNodeData(enumValue, { id: `$${DEFAULT_SOURCE_PARAMETER_NAME}`, label: '', parent: type, dndType: DND_TYPE.TYPE_TREE_ENUMERATION, type: type });
      addUniqueEntry(rootIds, propertyTreeNodeData.id);
      nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
    });
  } else {
    throw new IllegalStateError(`Can't use type tree with node type other than class and enumeration. Got type '${type.constructor.name}'`);
  }
  return { rootIds, nodes };
};

const TypeTreeNodeContainer: React.FC<TreeNodeContainerProps<TypeTreeNodeData, { selectedType?: Type }>> = props => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { selectedType } = innerProps;
  const dragItem = new TypeDragSource(node.dndType, node);
  const [, dragRef] = useDrag({ item: dragItem });
  const isExpandable = Boolean(node.childrenIds?.length);
  const nodeTypeIcon = node.type ? <ElementIcon element={node.type} /> : <EnumValueIcon />;
  const nodeExpandIcon = isExpandable ? node.isOpen ? <FaChevronDown /> : <FaChevronRight /> : <div></div>;
  const selectNode = (): void => onNodeSelect?.(node);
  return (
    <div className={clsx('tree-view__node__container', { 'type-tree__node__container--highlighted': node.type === selectedType })}
      onClick={selectNode}
      ref={dragRef}
      style={{ paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`, display: 'flex' }}>
      <div className="tree-view__node__icon type-tree__node__icon">
        <div className="type-tree__expand-icon">
          {nodeExpandIcon}
        </div>
        <div className="type-tree__type-icon">
          {nodeTypeIcon}
        </div>
      </div>
      <div className="tree-view__node__label type-tree__node__label">
        <button
          tabIndex={-1}
          title={`${node.id}`}
        >{node.label}</button>
        {Boolean(node.type) &&
          <div className="type-tree__node__type">
            <button
              className={clsx('type-tree__node__type__label', { 'type-tree__node__type__label--highlighted': node.type === selectedType })}
              tabIndex={-1}
              title={node.type?.path ?? ''}
            >{node.type?.name ?? 'unknown'}</button>
          </div>
        }
      </div>
    </div>
  );
};

export const TypeTree: React.FC<{
  type: Type;
  selectedType?: Type;
}> = props => {
  const { type, selectedType } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<TreeData<TypeTreeNodeData>>(() => getTypeTreeData(type));
  const onNodeSelect = (node: TypeTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node.type instanceof Class) {
        node.type.getAllProperties()
          .forEach(property => {
            const propertyTreeNodeData = getPropertyTypeTreeNodeData(property, node);
            treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
          });
      } else if (node.type instanceof Enumeration) {
        node.type.values.forEach(enumValue => {
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
      .map(id => treeData.nodes.get(id))
      .filter(isNonNullable)
      // class comes first then enumeration then primitive
      .sort((a, b) => a.label.localeCompare(b.label))
      .sort((a, b) => (b.type instanceof Class ? 2 : b.type instanceof Enumeration ? 1 : 0) - (a.type instanceof Class ? 2 : a.type instanceof Enumeration ? 1 : 0));
    return childrenNodes;
  };

  useEffect(() => { setTreeData(() => getTypeTreeData(type)) }, [type]);

  return (
    <TreeView
      components={{
        TreeNodeContainer: TypeTreeNodeContainer
      }}
      treeData={treeData}
      onNodeSelect={onNodeSelect}
      getChildNodes={getChildNodes}
      innerProps={{
        selectedType
      }}
    />
  );
};
