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
import { useDrag } from 'react-dnd';
import {
  type TreeNodeContainerProps,
  type TreeData,
  type TreeNodeData,
  PURE_DatabaseTableJoinIcon,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import {
  addUniqueEntry,
  assertTrue,
  filterByType,
  guaranteeType,
  isNonNullable,
} from '@finos/legend-shared';
import { renderColumnTypeIcon } from '../../connection-editor/DatabaseEditorHelper.js';
import {
  type Type,
  type Table,
  type Join,
  type View,
  Column,
  stringifyDataType,
} from '@finos/legend-graph';

export const TABLE_ELEMENT_DND_TYPE = 'TABLE_ELEMENT_DND_TYPE';

const JOIN_OPERATOR = '>';
const JOIN_AT_SYMBOL = '@';
const JOIN_PIPE_SYMBOL = '|';

const generateDatabasePointerText = (database: string): string =>
  `[${database}]`;

export abstract class TableOrViewTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  relation: Table | View;

  constructor(id: string, label: string, relation: Table | View) {
    this.id = id;
    this.label = label;
    this.relation = relation;
  }
}

export class ColumnNodeData extends TableOrViewTreeNodeData {
  column: Column;

  constructor(
    id: string,
    label: string,
    relation: Table | View,
    column: Column,
  ) {
    super(id, label, relation);
    this.column = column;
  }
}

export class JoinNodeData extends TableOrViewTreeNodeData {
  join: Join;

  constructor(id: string, label: string, relation: Table | View, join: Join) {
    super(id, label, relation);
    this.join = join;
  }
}

export class TableOrViewTreeNodeDragSource {
  data: TableOrViewTreeNodeData;

  constructor(data: TableOrViewTreeNodeData) {
    this.data = data;
  }
}

const generateColumnTreeNodeId = (
  column: Column,
  relation: Table | View,
  parentNode: TableOrViewTreeNodeData | undefined,
): string =>
  parentNode
    ? parentNode instanceof JoinNodeData
      ? `${parentNode.id} ${JOIN_PIPE_SYMBOL} ${relation.name}.${column.name}`
      : `${parentNode.id}.${column.name}`
    : `${generateDatabasePointerText(relation.schema._OWNER.path)}${
        relation.schema.name
      }.${relation.name}.${column.name}`;

const getColumnTreeNodeData = (
  column: Column,
  relation: Table | View,
  parentNode: TableOrViewTreeNodeData | undefined,
): TableOrViewTreeNodeData => {
  const columnNode = new ColumnNodeData(
    generateColumnTreeNodeId(column, relation, parentNode),
    column.name,
    relation,
    column,
  );
  return columnNode;
};

// TODO: support more complex join feature (with operation, direction, etc.)
const generateJoinTreeNodeId = (
  join: Join,
  parentNode: TableOrViewTreeNodeData | undefined,
): string =>
  parentNode
    ? `${parentNode.id} ${JOIN_OPERATOR} ${JOIN_AT_SYMBOL}${join.name}`
    : `${generateDatabasePointerText(join.owner.path)}${JOIN_AT_SYMBOL}${
        join.name
      }`;

const resolveJoinTargetRelation = (
  join: Join,
  sourceRelation: Table | View,
): Table | View => {
  const potentialTargetRelations = new Set<Table | View>();
  join.aliases.forEach((alias) => {
    if (alias.first.relation.value !== sourceRelation) {
      potentialTargetRelations.add(alias.first.relation.value as Table);
    }
    if (alias.second.relation.value !== sourceRelation) {
      potentialTargetRelations.add(alias.second.relation.value as Table);
    }
  });
  assertTrue(
    potentialTargetRelations.size < 2,
    `Can't resolve target relation for join`,
  );
  return potentialTargetRelations.size === 0
    ? sourceRelation
    : (Array.from(potentialTargetRelations.values())[0] as Table | View);
};

const getJoinTreeNodeData = (
  join: Join,
  relation: Table | View,
  parentNode: TableOrViewTreeNodeData | undefined,
): TableOrViewTreeNodeData => {
  const joinNode = new JoinNodeData(
    generateJoinTreeNodeId(join, parentNode),
    join.name,
    relation,
    join,
  );
  const childrenIds: string[] = [];
  // columns
  relation.columns
    .slice()
    .filter(filterByType(Column))
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((col) => {
      addUniqueEntry(
        childrenIds,
        generateColumnTreeNodeId(col, relation, joinNode),
      );
    });
  // joins
  relation.schema._OWNER.joins
    .slice()
    .filter(
      (_join) =>
        _join.aliases.filter(
          (alias) =>
            alias.first.relation.value === relation ||
            alias.second.relation.value === relation,
        ).length > 0,
    )
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((childJoin) => {
      addUniqueEntry(childrenIds, generateJoinTreeNodeId(childJoin, joinNode));
    });
  joinNode.childrenIds = childrenIds;
  return joinNode;
};

const getRelationTreeData = (
  relation: Table | View,
): TreeData<TableOrViewTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, TableOrViewTreeNodeData>();
  // columns
  relation.columns
    .slice()
    .filter(filterByType(Column))
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((col) => {
      const columnNode = getColumnTreeNodeData(col, relation, undefined);
      addUniqueEntry(rootIds, columnNode.id);
      nodes.set(columnNode.id, columnNode);
    });
  // joins
  relation.schema._OWNER.joins
    .slice()
    .filter(
      (join) =>
        join.aliases.filter(
          (alias) =>
            alias.first.relation.value === relation ||
            alias.second.relation.value === relation,
        ).length > 0,
    )
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((join) => {
      const joinNode = getJoinTreeNodeData(
        join,
        resolveJoinTargetRelation(join, relation),
        undefined,
      );
      addUniqueEntry(rootIds, joinNode.id);
      nodes.set(joinNode.id, joinNode);
    });
  return { rootIds, nodes };
};

const RelationalOperationElementTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    TableOrViewTreeNodeData,
    { selectedType?: Type | undefined }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const [, dragConnector] = useDrag(
    () => ({
      type: TABLE_ELEMENT_DND_TYPE,
      item: new TableOrViewTreeNodeDragSource(node),
    }),
    [node],
  );
  const ref = useRef<HTMLDivElement>(null);
  dragConnector(ref);

  const isExpandable = Boolean(node.childrenIds?.length);
  const nodeTypeIcon =
    node instanceof ColumnNodeData ? (
      renderColumnTypeIcon(node.column.type)
    ) : (
      <PURE_DatabaseTableJoinIcon />
    );
  const selectNode = (): void => onNodeSelect?.(node);
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
        {node instanceof ColumnNodeData && (
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
              {stringifyDataType(guaranteeType(node.column, Column).type)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const TableOrViewSourceTree: React.FC<{
  relation: Table | View;
  selectedType?: Type | undefined;
}> = (props) => {
  const { relation, selectedType } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<TreeData<TableOrViewTreeNodeData>>(
    () => getRelationTreeData(relation),
  );
  const onNodeSelect = (node: TableOrViewTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      // columns
      node.relation.columns.filter(filterByType(Column)).forEach((col) => {
        const columnNode = getColumnTreeNodeData(col, node.relation, node);
        treeData.nodes.set(columnNode.id, columnNode);
      });
      // joins
      node.relation.schema._OWNER.joins
        .filter(
          (join) =>
            join.aliases.filter(
              (alias) =>
                alias.first.relation.value === node.relation ||
                alias.second.relation.value === node.relation,
            ).length > 0,
        )
        .forEach((join) => {
          const joinNode = getJoinTreeNodeData(
            join,
            resolveJoinTargetRelation(join, node.relation),
            node,
          );
          treeData.nodes.set(joinNode.id, joinNode);
        });
    }
    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: TableOrViewTreeNodeData,
  ): TableOrViewTreeNodeData[] => {
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
          (b instanceof ColumnNodeData ? 1 : 0) -
          (a instanceof ColumnNodeData ? 1 : 0),
      );
    return childrenNodes;
  };

  useEffect(() => {
    setTreeData(() => getRelationTreeData(relation));
  }, [relation]);

  return (
    <TreeView
      components={{
        TreeNodeContainer: RelationalOperationElementTreeNodeContainer,
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
