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

import { observable, action, makeObservable, computed } from 'mobx';
import {
  type RawExecutionPlan,
  type GraphManagerState,
  ExecutionPlan,
  ExecutionNode,
  StoreMappingGlobalGraphFetchExecutionNode,
  RelationalGraphFetchExecutionNode,
} from '@finos/legend-graph';
import type { TreeNodeData, TreeData } from '@finos/legend-art';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  addUniqueEntry,
  filterByType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { generateExecutionNodeLabel } from '../../components/execution-plan/ExecutionPlanViewer.js';

export class ExecutionPlanViewTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  executionPlan!: ExecutionPlan;

  constructor(id: string, label: string, executionPlan: ExecutionPlan) {
    makeObservable(this, {
      isSelected: observable,
      isOpen: observable,
      setIsSelected: action,
      setIsOpen: action,
    });
    this.id = id;
    this.label = label;
    this.executionPlan = executionPlan;
  }
  setIsSelected(val: boolean): void {
    this.isSelected = val;
  }
  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }
}

export class ExecutionNodeTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  executionNode: ExecutionNode;
  parentNodeId: string | undefined;

  constructor(
    id: string,
    label: string,
    executionNode: ExecutionNode,
    parentNodeId: string | undefined,
  ) {
    makeObservable(this, {
      isSelected: observable,
      isOpen: observable,
      setIsSelected: action,
      setIsOpen: action,
    });
    this.id = id;
    this.label = label;
    this.executionNode = executionNode;
    this.parentNodeId = parentNodeId;
  }

  setIsSelected(val: boolean): void {
    this.isSelected = val;
  }
  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }
}

export const generateExecutionNodeTreeNodeData = (
  executionNode: ExecutionNode,
  label: string,
  parentNode:
    | ExecutionNodeTreeNodeData
    | ExecutionPlanViewTreeNodeData
    | undefined,
): ExecutionNodeTreeNodeData => {
  const executionNodeTreeNode = new ExecutionNodeTreeNodeData(
    executionNode._UUID,
    label,
    executionNode,
    parentNode instanceof ExecutionNodeTreeNodeData
      ? generateExecutionNodeLabel(parentNode.executionNode)
      : undefined,
  );

  const childrenIds: string[] = [];

  executionNode.executionNodes
    .slice()
    .filter(filterByType(ExecutionNode))
    .forEach((childExecutionNode) => {
      addUniqueEntry(childrenIds, childExecutionNode._UUID);
    });

  if (executionNode instanceof StoreMappingGlobalGraphFetchExecutionNode) {
    addUniqueEntry(
      childrenIds,
      executionNode.localGraphFetchExecutionNode._UUID,
    );
    executionNode.children
      .slice()
      .filter(filterByType(ExecutionNode))
      .forEach((childExecutionNode) => {
        addUniqueEntry(childrenIds, childExecutionNode._UUID);
      });
  }

  if (executionNode instanceof RelationalGraphFetchExecutionNode) {
    executionNode.children
      .slice()
      .filter(filterByType(ExecutionNode))
      .forEach((childExecutionNode) => {
        addUniqueEntry(childrenIds, childExecutionNode._UUID);
      });
  }
  executionNodeTreeNode.childrenIds = childrenIds;

  return executionNodeTreeNode;
};

export const generateExecutionPlanTreeNodeData = (
  executionPlan: ExecutionPlan,
): ExecutionPlanViewTreeNodeData => {
  const executionPlanNode = new ExecutionPlanViewTreeNodeData(
    `Execution Plan`,
    `Execution Plan`,
    executionPlan,
  );

  const childrenIds: string[] = [];

  const rootNodeId = executionPlan.rootExecutionNode._UUID;
  addUniqueEntry(childrenIds, rootNodeId);
  executionPlanNode.childrenIds = childrenIds;
  return executionPlanNode;
};

export const getExecutionPlanTreeData = (
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

export enum EXECUTION_PLAN_VIEW_MODE {
  FORM = 'Form',
  JSON = 'JSON',
}

export enum PLAN_TABS {
  GENERAL = 'GENERAL',
  GLOBAL_IMPLEMENTATION_SUPPORT = 'GLOBAL_IMPLEMENTATION_SUPPORT',
}

class GlobalImplementationSupportState {
  selectedTab: PLAN_TABS = PLAN_TABS.GENERAL;
  selectedJavaClass: string | undefined = undefined;
  constructor() {
    makeObservable(this, {
      selectedTab: observable,
      selectedJavaClass: observable,
      setSelectedTab: action,
      setSelectedJavaClass: action,
    });
  }

  setSelectedTab(tab: PLAN_TABS): void {
    this.selectedTab = tab;
  }

  setSelectedJavaClass(javaClass: string | undefined): void {
    this.selectedJavaClass = javaClass;
  }
}

export class ExecutionPlanState {
  applicationStore: GenericLegendApplicationStore;
  graphManagerState: GraphManagerState;
  displayDataJson: object = {};
  displayData = '';
  selectedNode:
    | ExecutionNodeTreeNodeData
    | ExecutionPlanViewTreeNodeData
    | undefined = undefined;
  viewMode: EXECUTION_PLAN_VIEW_MODE = EXECUTION_PLAN_VIEW_MODE.FORM;
  treeData?:
    | TreeData<ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData>
    | undefined;
  rawPlan?: RawExecutionPlan | undefined;
  plan?: ExecutionPlan | undefined;
  debugText?: string | undefined;
  globalImplementationSupportState: GlobalImplementationSupportState =
    new GlobalImplementationSupportState();

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
  ) {
    makeObservable(this, {
      displayData: observable,
      displayDataJson: observable,
      viewMode: observable,
      rawPlan: observable,
      plan: observable,
      debugText: observable,
      treeData: observable,
      setExecutionPlanDisplayData: action,
      setExecutionPlanDisplayDataJson: action,
      transformMetadataToProtocolJson: action,
      setSelectedNode: action,
      setRawPlan: action,
      setPlan: action,
      setViewMode: action,
      setDebugText: action,
      setTreeNode: action,
      setTreeData: action,
      refreshTreeData: action,
      nonNullableTreeData: computed,
      initialize: action,
      globalImplementationSupportState: observable,
    });
    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
  }

  setViewMode(val: EXECUTION_PLAN_VIEW_MODE): void {
    this.viewMode = val;
  }

  setTreeNode(
    id: string,
    node: ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData,
  ): void {
    this.treeData?.nodes.set(id, node);
  }

  setTreeData(
    val:
      | TreeData<ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData>
      | undefined,
  ): void {
    this.treeData = val;
  }

  refreshTreeData(): void {
    if (this.treeData) {
      this.setTreeData({ ...this.treeData });
    }
  }

  get nonNullableTreeData(): TreeData<
    ExecutionPlanViewTreeNodeData | ExecutionNodeTreeNodeData
  > {
    return guaranteeNonNullable(
      this.treeData,
      'Execution plan viewer tree data has not been initialized',
    );
  }

  setRawPlan = (val: RawExecutionPlan | undefined): void => {
    this.rawPlan = val;
  };

  setPlan = (val: ExecutionPlan | undefined): void => {
    this.plan = val;
  };

  initialize = (val: ExecutionPlan | undefined): void => {
    this.setPlan(val);
    if (val !== undefined) {
      this.setTreeData(getExecutionPlanTreeData(val));
    } else {
      this.setTreeData(undefined);
    }
  };

  setDebugText(val: string | undefined): void {
    this.debugText = val;
  }

  setSelectedNode(
    node: ExecutionNodeTreeNodeData | ExecutionPlanViewTreeNodeData | undefined,
  ): void {
    if (this.selectedNode) {
      this.selectedNode.setIsSelected(false);
    }
    if (node) {
      node.setIsSelected(true);
    }
    this.selectedNode = node;
  }

  setExecutionPlanDisplayData(val: string): void {
    this.displayData = val;
  }

  setExecutionPlanDisplayDataJson(val: object): void {
    this.displayDataJson = val;

    this.setExecutionPlanDisplayData(
      JSON.stringify(this.displayDataJson, undefined, 2),
    );
  }

  transformMetadataToProtocolJson(
    metaModel: ExecutionPlan | ExecutionNode,
  ): void {
    if (metaModel instanceof ExecutionPlan) {
      const protocolJson =
        this.graphManagerState.graphManager.serializeExecutionPlan(metaModel);
      this.setExecutionPlanDisplayDataJson(protocolJson);
    } else if (metaModel instanceof ExecutionNode) {
      const protocolJson =
        this.graphManagerState.graphManager.serializeExecutionNode(metaModel);
      this.setExecutionPlanDisplayDataJson(protocolJson);
    }
  }
}
