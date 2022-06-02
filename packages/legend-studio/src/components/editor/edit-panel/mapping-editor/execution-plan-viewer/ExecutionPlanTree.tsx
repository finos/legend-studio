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

import { useState } from 'react';
import {
  type TreeNodeContainerProps,
  type TreeData,
  type TreeNodeData,
  clsx,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import {
  addUniqueEntry,
  filterByType,
  isNonNullable,
} from '@finos/legend-shared';
import type { ExecutionPlanState } from '../../../../../stores/ExecutionPlanState.js';
import {
  type ExecutionPlan,
  ExecutionNode,
  SQLExecutionNode,
  RelationalTDSInstantiationExecutionNode,
} from '@finos/legend-graph';

export class ExecutionPlanViewTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  executionPlan!: ExecutionPlan;

  constructor(id: string, label: string, executionPlan: ExecutionPlan) {
    this.id = id;
    this.label = label;
    this.executionPlan = executionPlan;
  }
}

export class ExecutionNodeTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  executionNode: ExecutionNode;

  constructor(id: string, label: string, executionNode: ExecutionNode) {
    this.id = id;
    this.label = label;
    this.executionNode = executionNode;
  }
}
export class ExecutionNodesTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  executionNodes: ExecutionNode[];

  constructor(id: string, label: string, executionNodes: ExecutionNode[]) {
    this.id = id;
    this.label = label;
    this.executionNodes = executionNodes;
  }
}

const generateExecutionNodeTypeLabel = (type: ExecutionNode): string => {
  if (type instanceof SQLExecutionNode) {
    return `SQL Execution Node`;
  } else if (type instanceof RelationalTDSInstantiationExecutionNode) {
    return `Relational TDS Instantiation Execution Node`;
  } else {
    return 'Other';
  }
};

const generateExecutionNodeTreeNodeId = (
  executionNode: ExecutionNode,
  parentNode:
    | ExecutionNodeTreeNodeData
    | ExecutionPlanViewTreeNodeData
    | undefined,
): string => {
  if (executionNode instanceof SQLExecutionNode) {
    return `SQL::${parentNode?.id ?? ``}`;
  } else if (executionNode instanceof RelationalTDSInstantiationExecutionNode) {
    return `RELTDS::${parentNode?.id ?? ``}`;
  }
  return `EXEC::${parentNode?.id ?? ``}`;
};

const generateExecutionNodeTreeNodeData = (
  executionNode: ExecutionNode,
  label: string,
  parentNode:
    | ExecutionNodeTreeNodeData
    | ExecutionPlanViewTreeNodeData
    | undefined,
): ExecutionNodeTreeNodeData => {
  const executionNodeTreeNode = new ExecutionNodeTreeNodeData(
    generateExecutionNodeTreeNodeId(executionNode, parentNode),
    label,
    executionNode,
  );

  const childrenIds: string[] = [];

  executionNode.executionNodes
    .slice()
    .filter(filterByType(ExecutionNode))
    .forEach((exen) => {
      addUniqueEntry(
        childrenIds,
        generateExecutionNodeTreeNodeId(exen, executionNodeTreeNode),
      );
    });

  executionNodeTreeNode.childrenIds = childrenIds;

  return executionNodeTreeNode;
};

const generateExecutionPlanTreeNodeData = (
  executionPlan: ExecutionPlan,
): ExecutionPlanViewTreeNodeData => {
  const executionPlanNode = new ExecutionPlanViewTreeNodeData(
    `Execution Plan`,
    `Execution Plan`,
    executionPlan,
  );

  const childrenIds: string[] = [];

  const rootNodeId = generateExecutionNodeTreeNodeId(
    executionPlan.rootExecutionNode,
    executionPlanNode,
  );
  addUniqueEntry(childrenIds, rootNodeId);
  executionPlanNode.childrenIds = childrenIds;
  return executionPlanNode;
};

const getExecutionPlanTreeData = (
  executionPlan: ExecutionPlan,
): TreeData<ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<
    string,
    ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData
  >();
  const executionPlanTreeNode =
    generateExecutionPlanTreeNodeData(executionPlan);
  addUniqueEntry(rootIds, executionPlanTreeNode.id);
  nodes.set(executionPlanTreeNode.id, executionPlanTreeNode);
  return { rootIds, nodes };
};

const ExecutionNodeElementTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
    {
      onNodeExpand: (
        node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
      ) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { onNodeExpand } = innerProps;
  const isExpandable = Boolean(node.childrenIds?.length);
  const selectNode = (): void => onNodeSelect?.(node);
  const expandNode = (): void => onNodeExpand(node);
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
      className={clsx(
        'tree-view__node__container explorer__package-tree__node__container',
        {
          'menu__trigger--on-menu-open': !node.isSelected,
        },
        {
          'explorer__package-tree__node__container--selected': node.isSelected,
        },
      )}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1)}rem`,
        paddingTop: `0.1rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon">
        <div className="type-tree__expand-icon" onClick={expandNode}>
          {nodeExpandIcon}
        </div>
      </div>

      <button
        onClick={selectNode}
        className="tree-view__node__label explorer__package-tree__node__label"
        tabIndex={-1}
        title={`${node.id}`}
      >
        {node.label}
      </button>
    </div>
  );
};

export const ExecutionPlanTree: React.FC<{
  executionPlanState: ExecutionPlanState;
  executionPlan: ExecutionPlan;
}> = (props) => {
  const { executionPlanState, executionPlan } = props;
  // NOTE: We only need to compute this once so we use lazy initial state syntax
  // See https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [treeData, setTreeData] = useState<
    TreeData<ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData>
  >(() => getExecutionPlanTreeData(executionPlan));
  const onNodeSelect = (
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): void => {
    if (node instanceof ExecutionPlanViewTreeNodeData) {
      executionPlanState.transformMetadataToProtocolJson(node.executionPlan);
    } else if (node instanceof ExecutionNodeTreeNodeData) {
      executionPlanState.transformMetadataToProtocolJson(node.executionNode);
    }
    executionPlanState.setSelectedNode(node);
  };

  const onNodeExpand = (
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
      if (node instanceof ExecutionPlanViewTreeNodeData) {
        const rootNode = node.executionPlan.rootExecutionNode;
        const rootNodeTreeNode = generateExecutionNodeTreeNodeData(
          rootNode,
          generateExecutionNodeTypeLabel(rootNode),
          node,
        );

        treeData.nodes.set(rootNodeTreeNode.id, rootNodeTreeNode);
      } else if (node instanceof ExecutionNodeTreeNodeData) {
        if (node.executionNode.executionNodes.length > 0) {
          node.executionNode.executionNodes.forEach((exen) => {
            const executionNodeTreeNode = generateExecutionNodeTreeNodeData(
              exen,
              generateExecutionNodeTypeLabel(exen),
              node,
            );

            treeData.nodes.set(executionNodeTreeNode.id, executionNodeTreeNode);
          });
        }
      }
    }

    setTreeData({ ...treeData });
  };

  const getChildNodes = (
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): (ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData)[] => {
    if (!node.childrenIds || node.childrenIds.length === 0) {
      return [];
    }
    const childrenNodes = node.childrenIds
      .map((id) => treeData.nodes.get(id))
      .filter(isNonNullable);

    return childrenNodes;
  };

  return (
    <TreeView
      components={{
        TreeNodeContainer: ExecutionNodeElementTreeNodeContainer,
      }}
      treeData={treeData}
      getChildNodes={getChildNodes}
      onNodeSelect={onNodeSelect}
      innerProps={{
        onNodeExpand,
      }}
    />
  );
};
