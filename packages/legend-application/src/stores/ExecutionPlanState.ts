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

import { observable, action, makeObservable } from 'mobx';
import {
  type RawExecutionPlan,
  type GraphManagerState,
  ExecutionPlan,
  ExecutionNode,
} from '@finos/legend-graph';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import type { TreeNodeData } from '@finos/legend-art';

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

export enum EXECUTION_PLAN_VIEW_MODE {
  FORM = 'Form',
  JSON = 'JSON',
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
  rawPlan?: RawExecutionPlan | undefined;
  plan?: ExecutionPlan | undefined;
  debugText?: string | undefined;

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
      setExecutionPlanDisplayData: action,
      setExecutionPlanDisplayDataJson: action,
      transformMetadataToProtocolJson: action,
      setSelectedNode: action,
      setRawPlan: action,
      setPlan: action,
      setViewMode: action,
      setDebugText: action,
    });
    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
  }

  setViewMode(val: EXECUTION_PLAN_VIEW_MODE): void {
    this.viewMode = val;
  }

  setRawPlan = (val: RawExecutionPlan | undefined): void => {
    this.rawPlan = val;
  };

  setPlan = (val: ExecutionPlan | undefined): void => {
    this.plan = val;
  };

  setDebugText(val: string | undefined): void {
    this.debugText = val;
  }

  setSelectedNode(
    node: ExecutionNodeTreeNodeData | ExecutionPlanViewTreeNodeData | undefined,
  ): void {
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
    }
    if (node) {
      node.isSelected = true;
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
