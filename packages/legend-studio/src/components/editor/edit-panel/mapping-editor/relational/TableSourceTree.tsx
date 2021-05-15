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
import { PrimitiveTypeIcon, TableJoinIcon } from '../../../../shared/Icon';
import {
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-studio-components';
import { CORE_DND_TYPE } from '../../../../../stores/shared/DnDUtil';
import {
  addUniqueEntry,
  getClass,
  guaranteeType,
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

export abstract class TableElementTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  parentNode?: TableElementTreeNodeData;

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }
}

export class ColumnNodeData extends TableElementTreeNodeData {
  column: Column;

  constructor(id: string, label: string, column: Column) {
    super(id, label);
    this.column = column;
  }
}

export class JoinNodeData extends TableElementTreeNodeData {
  join: Join;

  constructor(id: string, label: string, join: Join) {
    super(id, label);
    this.join = join;
  }
}

export class TableDragSource {
  data: TableElementTreeNodeData;

  constructor(data: TableElementTreeNodeData) {
    this.data = data;
  }
}

const getColumnTreeNodeData = (
  column: Column,
  parentTable: Table,
  parentNode: TableElementTreeNodeData | undefined,
): TableElementTreeNodeData => {
  const SOURCE_PARAMETER_NAME = `[${parentTable.schema.owner.path}]${parentTable.schema.name}`;
  const columnNode = new ColumnNodeData(
    `${SOURCE_PARAMETER_NAME}.${column.name}`,
    column.name,
    column,
  );
  columnNode.parentNode = parentNode;
  return columnNode;
};

const getJoinTreeNodeData = (
  join: Join,
  parentTable: Table,
  parentNode: TableElementTreeNodeData | undefined,
): TableElementTreeNodeData => {
  const SOURCE_PARAMETER_NAME = `[${parentTable.schema.owner.path}]`;
  const columnNode = new JoinNodeData(
    `${SOURCE_PARAMETER_NAME}@${join.name}`,
    join.name,
    join,
  );
  columnNode.childrenIds = ['asd', 'ad12'];
  columnNode.parentNode = parentNode;
  return columnNode;
};

const getTableTreeData = (table: Table): TreeData<TableElementTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, TableElementTreeNodeData>();
  table.columns
    .slice()
    .filter((col): col is Column => col instanceof Column)
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((col) => {
      const columnNode = getColumnTreeNodeData(col, table, undefined);
      addUniqueEntry(rootIds, columnNode.id);
      nodes.set(columnNode.id, columnNode);
    });
  // TODO: joins
  table.schema.owner.joins
    .slice()
    .filter((join) =>
      join.aliases.filter(
        (alias) =>
          alias.first.relation.value === table ||
          alias.second.relation.value === table,
      ),
    )
    .sort((a, b) => a.name.toString().localeCompare(b.name.toString()))
    .forEach((join) => {
      // TODO: drill down further
      const joinNode = getJoinTreeNodeData(join, table, undefined);
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
    `Can't generate column type label of type '${getClass(type).name}'`,
  );
};

const RelationalOperationElementTreeNodeContainer: React.FC<
  TreeNodeContainerProps<TableElementTreeNodeData, { selectedType?: Type }>
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const [, dragRef] = useDrag(
    () => ({
      type: CORE_DND_TYPE.TYPE_TREE_PRIMITIVE,
      item: new TableDragSource(node),
    }),
    [node],
  );
  const isExpandable = Boolean(node.childrenIds?.length);
  const nodeTypeIcon =
    node instanceof ColumnNodeData ? <PrimitiveTypeIcon /> : <TableJoinIcon />;
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

export const TableSourceTree: React.FC<{
  table: Table;
  selectedType?: Type;
}> = (props) => {
  const { table, selectedType } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<TreeData<TableElementTreeNodeData>>(
    () => getTableTreeData(table),
  );
  const onNodeSelect = (node: TableElementTreeNodeData): void => {
    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: TableElementTreeNodeData,
  ): TableElementTreeNodeData[] => [];
  useEffect(() => {
    setTreeData(() => getTableTreeData(table));
  }, [table]);

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
