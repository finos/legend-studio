/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { useDrag } from 'react-dnd';
import {
  type TreeNodeContainerProps,
  type TreeData,
  type TreeNodeData,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import {
  addUniqueEntry,
  assertErrorThrown,
  isNonNullable,
} from '@finos/legend-shared';
import {
  type Type,
  RawLambda,
  type ConcreteFunctionDefinition,
} from '@finos/legend-graph';
import { renderColumnTypeIconFromType } from '../connection-editor/DatabaseEditorHelper.js';
import { CORE_DND_TYPE } from '../../../../stores/editor/utils/DnDUtils.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

export class RelationColumnTypeTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  columnName: string;
  columnType: string;

  constructor(
    id: string,
    label: string,
    columnName: string,
    columnType: string,
  ) {
    this.id = id;
    this.label = label;
    this.columnName = columnName;
    this.columnType = columnType;
  }
}

const getColumnTreeNodeData = (
  columnName: string,
  columnType: string,
): RelationColumnTypeTreeNodeData => {
  const columnNode = new RelationColumnTypeTreeNodeData(
    columnName,
    columnName,
    columnName,
    columnType,
  );
  return columnNode;
};

const getRelationTypeTreeData = async (
  relation: ConcreteFunctionDefinition,
  editorStore: EditorStore,
) => {
  const rootIds: string[] = [];
  const nodes = new Map<string, RelationColumnTypeTreeNodeData>();
  // columns
  // throw an error if more than one in concrete function definition
  const lambda = new RawLambda(
    relation.parameters.map((parameter) =>
      editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
        parameter,
      ),
    ),
    relation.expressionSequence,
  );
  try {
    const relationType =
      await editorStore.graphManagerState.graphManager.getLambdaRelationType(
        lambda,
        editorStore.graphManagerState.graph,
      );
    relationType.columns.forEach((column) => {
      const columnNode = getColumnTreeNodeData(column.name, column.type);
      addUniqueEntry(rootIds, columnNode.id);
      nodes.set(columnNode.id, columnNode);
    });
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.alertUnhandledError(error);
  }

  return { rootIds, nodes };
};

export class RelationTypeDragSource {
  data: RelationColumnTypeTreeNodeData | undefined;

  constructor(data: RelationColumnTypeTreeNodeData) {
    this.data = data;
  }
}

const RelationTypeTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    RelationColumnTypeTreeNodeData,
    { selectedType?: Type | undefined }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const [, dragConnector] = useDrag(
    () => ({
      type: CORE_DND_TYPE.PROJECT_EXPLORER_FUNCTION,
      item: new RelationTypeDragSource(node),
    }),
    [node],
  );
  const ref = useRef<HTMLDivElement>(null);
  dragConnector(ref);

  const isExpandable = Boolean(node.childrenIds?.length);
  const selectNode = (): void => onNodeSelect?.(node);
  const nodeTypeIcon = renderColumnTypeIconFromType(node.columnType);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );

  return (
    <div
      className="tree-view__node__container"
      onClick={selectNode}
      ref={ref}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon">
        <div className="tree-view__node__expand-icon">{nodeExpandIcon}</div>
        <div className="type-tree__type-icon">{nodeTypeIcon}</div>
      </div>
      <div className="tree-view__node__label type-tree__node__label">
        <button tabIndex={-1} title={`${node.id}`}>
          {node.label}
        </button>
        {node instanceof RelationColumnTypeTreeNodeData && (
          <div className="type-tree__node__type">
            <button
              className="type-tree__node__type__label"
              // TODO: match type
              // className={clsx('type-tree__node__type__label', {
              //   'type-tree__node__type__label--highlighted':
              //     primitiveType && primitiveType === selectedType,
              // })}
              tabIndex={-1}
              title="Column Type"
            >
              {node.columnType.split('::').pop()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const RelationTypeTree: React.FC<{
  relation: ConcreteFunctionDefinition;
  editorStore: EditorStore;
  selectedType?: Type | undefined;
}> = (props) => {
  const { relation, selectedType, editorStore } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-
  const [treeData, setTreeData] = useState(
    {} as TreeData<RelationColumnTypeTreeNodeData>,
  );
  const [loading, setLoading] = useState(false);

  const onNodeSelect = (node: RelationColumnTypeTreeNodeData): void => {
    //TODO: check for child nodes in this case
    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: RelationColumnTypeTreeNodeData,
  ): RelationColumnTypeTreeNodeData[] => {
    if (!node.childrenIds) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable)
      // sort so that column nodes come before join nodes
      .sort((a, b) => a.label.localeCompare(b.label))
      .sort(
        (a, b) =>
          (b instanceof RelationColumnTypeTreeNodeData ? 1 : 0) -
          (a instanceof RelationColumnTypeTreeNodeData ? 1 : 0),
      );
    return childrenNodes;
  };

  useEffect(() => {
    const fetchTypeTreeData = async () => {
      try {
        const response = await getRelationTypeTreeData(relation, editorStore);
        setTreeData(response);
        setLoading(true);
      } catch (error) {
        assertErrorThrown(error);
        setLoading(false);
      }
    };
    fetchTypeTreeData()
      .then()
      .catch((error) => assertErrorThrown(error));
  }, [relation, editorStore]);

  if (loading) {
    return (
      <TreeView
        components={{
          TreeNodeContainer: RelationTypeTreeNodeContainer,
        }}
        treeData={treeData}
        getChildNodes={getChildNodes}
        onNodeSelect={onNodeSelect}
        innerProps={{
          selectedType,
        }}
      />
    );
  }
  return <div></div>;
};
