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

import type { EditorStore } from './EditorStore';
import { observable, action, makeObservable, flow } from 'mobx';
import type {
  ExecutionNodeTreeNodeData,
  ExecutionPlanViewTreeNodeData,
} from '../components/editor/edit-panel/mapping-editor/execution-plan-viewer/ExecutionPlanTree';
import type { GeneratorFn } from '@finos/legend-shared';
import { LogEvent } from '@finos/legend-shared';
import type {
  RawExecutionPlan,
  Mapping,
  RawLambda,
  Runtime,
} from '@finos/legend-graph';
import {
  ExecutionPlan,
  ExecutionNode,
  GRAPH_MANAGER_LOG_EVENT,
  PureClientVersion,
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
  rawPlan?: RawExecutionPlan;
  plan?: ExecutionPlan;
  isGenerating = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      displayData: observable,
      displayDataJson: observable,
      sqlSelectedTab: observable,
      viewMode: observable,
      isGenerating: observable,
      rawPlan: observable,
      plan: observable,
      setExecutionPlanDisplayData: action,
      setExecutionPlanDisplayDataJson: action,
      transformMetaDataToProtocolJson: action,
      setSelectedNode: action,
      setSqlSelectedTab: action,
      setRawPlan: action,
      setPlan: action,
      setViewMode: action,
      generatePlan: flow,
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

  transformMetaDataToProtocolJson(
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

  *generatePlan(
    mapping: Mapping,
    lambda: RawLambda,
    runtime: Runtime,
  ): GeneratorFn<void> {
    try {
      this.isGenerating = true;
      const rawPlan =
        (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
          this.editorStore.graphManagerState.graph,
          mapping,
          lambda,
          runtime,
          PureClientVersion.VX_X_X,
        )) as object;
      this.buildExecutionPlan(rawPlan);
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGenerating = false;
    }
  }

  buildExecutionPlan(rawPlan: object): void {
    try {
      this.setRawPlan(rawPlan);
      const plan =
        this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
          rawPlan,
          this.editorStore.graphManagerState.graph,
        );
      this.setPlan(plan);
    } catch {
      // do nothing
    }
  }
}
