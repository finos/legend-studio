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
import type {
  TreeNodeContainerProps,
  TreeData,
  TreeNodeData,
} from '@finos/legend-studio-components';
import { TableJoinIcon } from '../../../../shared/Icon';
import {
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
  StringTypeIcon,
  BooleanTypeIcon,
  NumberTypeIcon,
  DateTypeIcon,
  BinaryTypeIcon,
  UnknownTypeIcon,
} from '@finos/legend-studio-components';
import {
  addUniqueEntry,
  assertTrue,
  getClass,
  guaranteeType,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Type } from '../../../../../models/metamodels/pure/model/packageableElements/domain/Type';
import type { Table } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Table';
import { Column } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Column';
import {
  Real,
  Binary,
  Bit,
  Other,
  Date,
  Timestamp,
  Numeric,
  Decimal,
  VarBinary,
  Char,
  VarChar,
  Double,
  Float,
  Integer,
  TinyInt,
  SmallInt,
  BigInt,
} from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
import type { DataType } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RelationalDataType';
import type { Join } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Join';
import type { View } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/model/View';

export const TABLE_ELEMENT_DND_TYPE = 'TABLE_ELEMENT_DND_TYPE';
const JOIN_OPERATOR = '>';
const JOIN_AT_SYMBOL = '@';
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
  `${
    parentNode?.id ??
    `${generateDatabasePointerText(relation.schema.owner.path)}${
      relation.schema.name
    }.${relation.name}`
  }.${column.name}`;

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
  relation: Table | View,
  parentNode: TableOrViewTreeNodeData | undefined,
): string =>
  parentNode
    ? `${parentNode.id} ${JOIN_OPERATOR} ${JOIN_AT_SYMBOL}${join.name}`
    : `${generateDatabasePointerText(
        relation.schema.owner.path,
      )}${JOIN_AT_SYMBOL}${join.name}`;

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
    : Array.from(potentialTargetRelations.values())[0];
};

const getJoinTreeNodeData = (
  join: Join,
  relation: Table | View,
  parentNode: TableOrViewTreeNodeData | undefined,
): TableOrViewTreeNodeData => {
  const joinNode = new JoinNodeData(
    generateJoinTreeNodeId(join, relation, parentNode),
    join.name,
    relation,
    join,
  );
  const childrenIds: string[] = [];
  // columns
  relation.columns
    .slice()
    .filter((col): col is Column => col instanceof Column)
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((col) => {
      addUniqueEntry(
        childrenIds,
        generateColumnTreeNodeId(col, relation, joinNode),
      );
    });
  // joins
  relation.schema.owner.joins
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
      addUniqueEntry(
        childrenIds,
        generateJoinTreeNodeId(
          childJoin,
          resolveJoinTargetRelation(childJoin, relation),
          joinNode,
        ),
      );
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
    .filter((col): col is Column => col instanceof Column)
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((col) => {
      const columnNode = getColumnTreeNodeData(col, relation, undefined);
      addUniqueEntry(rootIds, columnNode.id);
      nodes.set(columnNode.id, columnNode);
    });
  // joins
  relation.schema.owner.joins
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

const generateColumnTypeLabel = (type: DataType): string => {
  if (type instanceof VarChar) {
    return `VARCHAR(${type.size})`;
  } else if (type instanceof Char) {
    return `CHAR(${type.size})`;
  } else if (type instanceof VarBinary) {
    return `VARBINARY(${type.size})`;
  } else if (type instanceof Binary) {
    return `BINARY(${type.size})`;
  } else if (type instanceof Bit) {
    return `BIT`;
  } else if (type instanceof Numeric) {
    return `NUMERIC(${type.precision},${type.scale})`;
  } else if (type instanceof Decimal) {
    return `DECIMAL(${type.precision},${type.scale})`;
  } else if (type instanceof Double) {
    return `DOUBLE`;
  } else if (type instanceof Float) {
    return `FLOAT`;
  } else if (type instanceof Real) {
    return `REAL`;
  } else if (type instanceof Integer) {
    return `INT`;
  } else if (type instanceof BigInt) {
    return `BIGINT`;
  } else if (type instanceof SmallInt) {
    return `SMALLINT`;
  } else if (type instanceof TinyInt) {
    return `TINYINT`;
  } else if (type instanceof Date) {
    return `DATE`;
  } else if (type instanceof Timestamp) {
    return `TIMESTAMP`;
  } else if (type instanceof Other) {
    return `OTHER`;
  }
  throw new UnsupportedOperationError(
    `Can't generate column label of data type '${getClass(type).name}'`,
  );
};

const renderColumnTypeIcon = (type: DataType): React.ReactNode => {
  if (type instanceof VarChar || type instanceof Char) {
    return (
      <StringTypeIcon className="relation-source-tree__icon relation-source-tree__icon__string" />
    );
  } else if (type instanceof VarBinary || type instanceof Binary) {
    return (
      <BinaryTypeIcon className="relation-source-tree__icon relation-source-tree__icon__binary" />
    );
  } else if (type instanceof Bit) {
    return (
      <BooleanTypeIcon className="relation-source-tree__icon relation-source-tree__icon__boolean" />
    );
  } else if (
    type instanceof Numeric ||
    type instanceof Decimal ||
    type instanceof Double ||
    type instanceof Float ||
    type instanceof Real ||
    type instanceof Integer ||
    type instanceof BigInt ||
    type instanceof SmallInt ||
    type instanceof TinyInt
  ) {
    return (
      <NumberTypeIcon className="relation-source-tree__icon relation-source-tree__icon__number" />
    );
  } else if (type instanceof Date || type instanceof Timestamp) {
    return (
      <DateTypeIcon className="relation-source-tree__icon relation-source-tree__icon__time" />
    );
  } else if (type instanceof Other) {
    return (
      <UnknownTypeIcon className="relation-source-tree__icon relation-source-tree__icon__unknown" />
    );
  }
  throw new UnsupportedOperationError(
    `Can't render column of data type '${getClass(type).name}'`,
  );
};

const RelationalOperationElementTreeNodeContainer: React.FC<
  TreeNodeContainerProps<TableOrViewTreeNodeData, { selectedType?: Type }>
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const [, dragRef] = useDrag(
    () => ({
      type: TABLE_ELEMENT_DND_TYPE,
      item: new TableOrViewTreeNodeDragSource(node),
    }),
    [node],
  );
  const isExpandable = Boolean(node.childrenIds?.length);
  const nodeTypeIcon =
    node instanceof ColumnNodeData ? (
      renderColumnTypeIcon(node.column.type)
    ) : (
      <TableJoinIcon />
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
      ref={dragRef}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon flat-data-column-tree__node__icon">
        <div className="type-tree__expand-icon">{nodeExpandIcon}</div>
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
              title={'Column Type'}
            >
              {generateColumnTypeLabel(guaranteeType(node.column, Column).type)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const TableOrViewSourceTree: React.FC<{
  relation: Table | View;
  selectedType?: Type;
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
      node.relation.columns
        .filter((col): col is Column => col instanceof Column)
        .forEach((col) => {
          const columnNode = getColumnTreeNodeData(col, node.relation, node);
          treeData.nodes.set(columnNode.id, columnNode);
        });
      // joins
      node.relation.schema.owner.joins
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
