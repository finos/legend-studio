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

import { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import {
  type TreeNodeContainerProps,
  type TreeData,
  clsx,
  TreeView,
  PURE_PrimitiveTypeIcon,
} from '@finos/legend-art';
import {
  CORE_DND_TYPE,
  FlatDataColumnDragSource,
} from '../../../../stores/editor/utils/DnDUtils.js';
import type { FlatDataRecordTypeTreeNodeData } from '../../../../stores/editor/utils/TreeUtils.js';
import { addUniqueEntry } from '@finos/legend-shared';
import {
  DEFAULT_SOURCE_PARAMETER_NAME,
  type Type,
  type RootFlatDataRecordType,
  type FlatDataRecordField,
} from '@finos/legend-graph';

const getRecordTypeTreeNodeData = (
  field: FlatDataRecordField,
  parentRecordType: RootFlatDataRecordType,
): FlatDataRecordTypeTreeNodeData => ({
  id: `${DEFAULT_SOURCE_PARAMETER_NAME}[${
    field.address ? field.address : `'${field.label}'`
  }]`,
  label: field.label,
  field: field,
  parentType: parentRecordType,
  isOpen: true,
});

const getRecordTypeTreeData = (
  recordType: RootFlatDataRecordType,
): TreeData<FlatDataRecordTypeTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, FlatDataRecordTypeTreeNodeData>();
  recordType.fields
    .toSorted((a, b) => a.label.toString().localeCompare(b.label.toString()))
    .forEach((field) => {
      const recordTypeTreeNodeData = getRecordTypeTreeNodeData(
        field,
        recordType,
      );
      addUniqueEntry(rootIds, recordTypeTreeNodeData.id);
      nodes.set(recordTypeTreeNodeData.id, recordTypeTreeNodeData);
    });
  return { rootIds, nodes };
};

const RecordFieldTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    FlatDataRecordTypeTreeNodeData,
    { selectedType?: Type | undefined }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { selectedType } = innerProps;
  const [, dragRef] = useDrag(
    () => ({
      type: CORE_DND_TYPE.TYPE_TREE_PRIMITIVE,
      item: new FlatDataColumnDragSource(node),
    }),
    [node],
  );
  const nodeTypeIcon = <PURE_PrimitiveTypeIcon />;
  const selectNode = (): void => onNodeSelect?.(node);
  const primitiveType = node.field.flatDataDataType._correspondingPrimitiveType;

  return (
    <div
      className="tree-view__node__container"
      onClick={selectNode}
      ref={dragRef}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon flat-data-column-tree__node__icon">
        <div className="type-tree__type-icon">{nodeTypeIcon}</div>
      </div>
      <div className="tree-view__node__label type-tree__node__label">
        <button tabIndex={-1} title={`${node.id}`}>
          {node.label}
        </button>
        {
          <div className="type-tree__node__type">
            <button
              className={clsx('type-tree__node__type__label', {
                'type-tree__node__type__label--highlighted':
                  primitiveType && primitiveType === selectedType,
              })}
              tabIndex={-1}
              title="Column Type"
            >
              {primitiveType?.path ?? 'RecordType'}
            </button>
          </div>
        }
      </div>
    </div>
  );
};

export const FlatDataRecordTypeTree: React.FC<{
  recordType: RootFlatDataRecordType;
  selectedType?: Type | undefined;
}> = (props) => {
  const { recordType, selectedType } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<
    TreeData<FlatDataRecordTypeTreeNodeData>
  >(() => getRecordTypeTreeData(recordType));
  const onNodeSelect = (node: FlatDataRecordTypeTreeNodeData): void => {
    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: FlatDataRecordTypeTreeNodeData,
  ): FlatDataRecordTypeTreeNodeData[] => [];
  useEffect(() => {
    setTreeData(() => getRecordTypeTreeData(recordType));
  }, [recordType]);

  return (
    <TreeView
      components={{
        TreeNodeContainer: RecordFieldTreeNodeContainer,
      }}
      treeData={treeData}
      getChildNodes={getChildNodes}
      onNodeSelect={onNodeSelect}
      innerProps={{
        selectedType,
      }}
    />
  );
};
