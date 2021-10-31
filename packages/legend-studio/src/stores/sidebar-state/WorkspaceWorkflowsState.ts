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

import type { TreeNodeData, TreeData } from '@finos/legend-art';
import { makeAutoObservable, observable, action, flowResult } from 'mobx';
import { STUDIO_LOG_EVENT } from '../StudioLogEvent';
import type { EditorStore } from '../EditorStore';
import type { EditorSdlcState } from '../EditorSdlcState';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  assertErrorThrown,
  LogEvent,
  isNonNullable,
} from '@finos/legend-shared';
import { WorkflowJob, Workflow } from '@finos/legend-server-sdlc';

export abstract class WorkflowExplorerTreeNodeData implements TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  childrenIds: string[] | undefined;
  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }
}
export class WorkflowTreeNodeData extends WorkflowExplorerTreeNodeData {
  workflow: Workflow;
  constructor(workflow: Workflow) {
    super(workflow.id, workflow.id);
    this.workflow = workflow;
  }
}
export class WorkflowJobTreeNodeData extends WorkflowExplorerTreeNodeData {
  workflowJob: WorkflowJob;
  constructor(workflowJob: WorkflowJob) {
    super(workflowJob.id, workflowJob.name);
    this.workflowJob = workflowJob;
  }
}

const addWorkflowNodeToTree = (
  workflow: Workflow,
  treeData: TreeData<WorkflowExplorerTreeNodeData>,
): WorkflowTreeNodeData => {
  const node = new WorkflowTreeNodeData(workflow);
  treeData.rootIds.push(node.id);
  treeData.nodes.set(node.id, node);
  return node;
};

const addWorkflowJobNodeToTree = (
  workflowJob: WorkflowJob,
  workflowNode: WorkflowTreeNodeData,
  treeData: TreeData<WorkflowExplorerTreeNodeData>,
): WorkflowJobTreeNodeData => {
  const node = new WorkflowJobTreeNodeData(workflowJob);
  if (workflowNode.childrenIds) {
    workflowNode.childrenIds.push(node.id);
  } else {
    workflowNode.childrenIds = [node.id];
  }

  treeData.nodes.set(node.id, node);
  return node;
};

const getWorkflowExplorerTreeNodeData = (
  workflows: Workflow[],
): TreeData<WorkflowExplorerTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, WorkflowExplorerTreeNodeData>();
  const treeData = { rootIds, nodes };
  workflows.forEach((w) => addWorkflowNodeToTree(w, treeData));
  return treeData;
};

const updateWorkflowJobData = (
  workflowJobs: WorkflowJob[],
  workflowId: string,
  treeData: TreeData<WorkflowExplorerTreeNodeData>,
): void => {
  const workflowNode = treeData.nodes.get(workflowId);
  if (workflowNode instanceof WorkflowTreeNodeData) {
    workflowNode.childrenIds?.forEach((id) => treeData.nodes.delete(id));
    workflowNode.childrenIds = [];
    workflowJobs.forEach((job) =>
      addWorkflowJobNodeToTree(job, workflowNode, treeData),
    );
  }
};

export class WorkflowLogState {
  editorStore: EditorStore;
  job: WorkflowJob;
  logs: string;
  constructor(editorStore: EditorStore, job: WorkflowJob, logs: string) {
    makeAutoObservable(this, {
      editorStore: false,
      job: observable,
      logs: observable,
    });

    this.editorStore = editorStore;
    this.job = job;
    this.logs = logs;
  }

  setLogs(val: string): void {
    this.logs = val;
  }

  setJob(val: WorkflowJob): void {
    this.job = val;
  }

  *refreshJobLogs(): GeneratorFn<void> {
    try {
      const job = WorkflowJob.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getWorkflowJob(
          this.editorStore.sdlcState.activeProject.projectId,
          this.editorStore.sdlcState.activeWorkspace,
          this.job,
        )) as PlainObject<WorkflowJob>,
      );
      const logs = (yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
        this.editorStore.sdlcState.activeProject.projectId,
        this.editorStore.sdlcState.activeWorkspace,
        this.job,
      )) as string;
      this.setJob(job);
      this.setLogs(logs);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }
}

export class WorkspaceWorkflowsState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  isExecutingWorkflowRequest = false;
  workflows: Workflow[] = [];
  workflowTreeData: TreeData<WorkflowExplorerTreeNodeData> | undefined;
  workflowJobLogState: WorkflowLogState | undefined;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
      workflowTreeData: observable,
      setWorkflowTreeData: action,
      setWorkflowJobLogState: action,
      workflowJobLogState: observable,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  setWorkflowTreeData(
    val: TreeData<WorkflowExplorerTreeNodeData> | undefined,
  ): void {
    this.workflowTreeData = val;
  }

  setWorkflowJobLogState(val: WorkflowLogState | undefined): void {
    this.workflowJobLogState = val;
  }

  *fetchAllWorkspaceWorkflows(): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      const workflows = (
        (yield this.editorStore.sdlcServerClient.getWorkflows(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Workflow>[]
      ).map((workflow) => Workflow.serialization.fromJson(workflow));
      this.setWorkflowTreeData(getWorkflowExplorerTreeNodeData(workflows));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }

  *refreshWorkflows(): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      const workflows = (
        (yield this.editorStore.sdlcServerClient.getWorkflows(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Workflow>[]
      ).map((workflow) => Workflow.serialization.fromJson(workflow));
      const treeData = getWorkflowExplorerTreeNodeData(workflows);
      // refetch open nodes
      const currentTreeData = this.workflowTreeData;
      if (currentTreeData) {
        const openNodeIds = Array.from(currentTreeData.nodes.values())
          .filter((n) => n.isOpen)
          .map((n) => n.id);
        const workflowToJobsMap = new Map<string, WorkflowJob[]>();
        yield Promise.all(
          workflows
            .filter((workflow) => openNodeIds.includes(workflow.id))
            .map((workflow) =>
              this.editorStore.sdlcServerClient
                .getWorkflowJobs(
                  this.sdlcState.activeProject.projectId,
                  this.sdlcState.activeWorkspace,
                  workflow.id,
                  undefined,
                  undefined,
                  undefined,
                )
                .then((jobs: PlainObject<WorkflowJob>[]) =>
                  workflowToJobsMap.set(
                    workflow.id,
                    jobs.map((x) => WorkflowJob.serialization.fromJson(x)),
                  ),
                ),
            ),
        );
        workflowToJobsMap.forEach((jobs, workflowId) =>
          updateWorkflowJobData(jobs, workflowId, treeData),
        );
        treeData.nodes.forEach((node) => {
          if (openNodeIds.includes(node.id)) {
            node.isOpen = true;
          }
        });
      }
      this.setWorkflowTreeData({ ...treeData });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }

  *refreshWorkflow(
    workflowId: string,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    const node = treeData.nodes.get(workflowId);
    if (node instanceof WorkflowTreeNodeData) {
      const workflow = Workflow.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getWorkflow(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          workflowId,
        )) as PlainObject<Workflow>,
      );
      node.workflow = workflow;
    }
    yield flowResult(this.fetchAllWorkspaceWorkJobs(workflowId, treeData));
  }

  *fetchAllWorkspaceWorkJobs(
    workflowId: string,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      const workflowJobs = (
        (yield this.editorStore.sdlcServerClient.getWorkflowJobs(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          workflowId,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<WorkflowJob>[]
      ).map((job) => WorkflowJob.serialization.fromJson(job));
      updateWorkflowJobData(workflowJobs, workflowId, treeData);
      this.setWorkflowTreeData({ ...treeData });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }

  *cancelJob(
    workflowJob: WorkflowJob,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      (yield this.editorStore.sdlcServerClient.cancelWorkflowJob(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        workflowJob,
      )) as PlainObject<WorkflowJob>[];
      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }

  *retryJob(
    workflowJob: WorkflowJob,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      (yield this.editorStore.sdlcServerClient.retryWorkflowJob(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        workflowJob,
      )) as PlainObject<WorkflowJob>[];
      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }

  *onTreeNodeSelect(
    node: WorkflowExplorerTreeNodeData,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    if (node instanceof WorkflowTreeNodeData) {
      if (!node.childrenIds) {
        yield flowResult(
          this.fetchAllWorkspaceWorkJobs(node.workflow.id, treeData),
        );
      }
      node.isOpen = !node.isOpen;
    }
    this.setWorkflowTreeData({ ...treeData });
  }

  getChildNodes(
    node: WorkflowExplorerTreeNodeData,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): WorkflowExplorerTreeNodeData[] {
    if (node.childrenIds && node instanceof WorkflowTreeNodeData) {
      return node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable);
    }
    return [];
  }

  *viewJobLogs(workflowJob: WorkflowJob): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      const logs = (yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        workflowJob,
      )) as string;
      this.setWorkflowJobLogState(
        new WorkflowLogState(this.editorStore, workflowJob, logs),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }
}
