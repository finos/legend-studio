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

import type { EditorStore } from './EditorStore.js';
import { observable, action, makeObservable } from 'mobx';
import type {
  ExecutionNodeTreeNodeData,
  ExecutionPlanViewTreeNodeData,
} from '../components/editor/edit-panel/mapping-editor/execution-plan-viewer/ExecutionPlanTree.js';
import {
  type RawExecutionPlan,
  ExecutionPlan,
  ExecutionNode,
} from '@finos/legend-graph';

export enum SQL_DISPLAY_TABS {
  SQL_QUERY = 'SQL_QUERY',
  RESULT_COLUMNS = 'RESULT_COLUMNS',
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
}

export enum EXECUTION_PLAN_VIEW_MODE {
  FORM = 'Form',
  JSON = 'JSON',
}

export class ExecutionPlanState {
  editorStore: EditorStore;
  displayDataJson: object = {};
  displayData = '';
  selectedNode:
    | ExecutionNodeTreeNodeData
    | ExecutionPlanViewTreeNodeData
    | undefined = undefined;
  sqlSelectedTab: SQL_DISPLAY_TABS = SQL_DISPLAY_TABS.SQL_QUERY;
  viewMode: EXECUTION_PLAN_VIEW_MODE = EXECUTION_PLAN_VIEW_MODE.FORM;
  rawPlan?: RawExecutionPlan | undefined;
  plan?: ExecutionPlan | undefined;
  debugText?: string | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      displayData: observable,
      displayDataJson: observable,
      sqlSelectedTab: observable,
      viewMode: observable,
      rawPlan: observable,
      plan: observable,
      debugText: observable,
      setExecutionPlanDisplayData: action,
      setExecutionPlanDisplayDataJson: action,
      transformMetadataToProtocolJson: action,
      setSelectedNode: action,
      setSqlSelectedTab: action,
      setRawPlan: action,
      setPlan: action,
      setViewMode: action,
      setDebugText: action,
    });
    this.editorStore = editorStore;
  }

  setSqlSelectedTab(tab: SQL_DISPLAY_TABS): void {
    this.sqlSelectedTab = tab;
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
    this.setSqlSelectedTab(SQL_DISPLAY_TABS.SQL_QUERY);
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
        this.editorStore.graphManagerState.graphManager.serializeExecutionPlan(
          metaModel,
        );
      this.setExecutionPlanDisplayDataJson(protocolJson);
    } else if (metaModel instanceof ExecutionNode) {
      const protocolJson =
        this.editorStore.graphManagerState.graphManager.serializeExecutionNode(
          metaModel,
        );
      this.setExecutionPlanDisplayDataJson(protocolJson);
    }
  }
}
