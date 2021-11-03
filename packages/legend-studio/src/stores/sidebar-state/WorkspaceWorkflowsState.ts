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
import type { EditorSDLCState } from '../EditorSDLCState';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  uuid,
  assertErrorThrown,
  LogEvent,
  ActionState,
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
const getWorkflowNodeId = (workflowId: string): string =>
  `workflow_${workflowId}`;
const getJobId = (jobId: string): string => `job_${jobId}`;
export class WorkflowTreeNodeData extends WorkflowExplorerTreeNodeData {
  workflow: Workflow;
  constructor(workflow: Workflow) {
    super(getWorkflowNodeId(workflow.id), workflow.id);
    this.workflow = workflow;
  }
}
export class WorkflowJobTreeNodeData extends WorkflowExplorerTreeNodeData {
  workflowJob: WorkflowJob;
  constructor(workflowJob: WorkflowJob) {
    super(getJobId(workflowJob.id), workflowJob.name);
    this.workflowJob = workflowJob;
  }
}

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

const updateWorkflowJobData = (
  workflowJobs: WorkflowJob[],
  workflowId: string,
  treeData: TreeData<WorkflowExplorerTreeNodeData>,
): void => {
  const workflowNode = treeData.nodes.get(getWorkflowNodeId(workflowId));
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
  sdlcState: EditorSDLCState;
  job: WorkflowJob | undefined;
  logs: string;
  fetchJobLogState = ActionState.create();

  constructor(
    editorStore: EditorStore,
    sdlcState: EditorSDLCState,
    job: WorkflowJob | undefined,
    logs: string | undefined,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      job: observable,
      logs: observable,
      setLogs: action,
      setJob: action,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.job = job;
    this.logs = logs ?? '';
  }

  setLogs(val: string): void {
    this.logs = val;
  }

  setJob(val: WorkflowJob | undefined): void {
    this.job = val;
  }

  closeModal(): void {
    this.setJob(undefined);
    this.setLogs('');
  }

  *refreshJobLogs(workflowJob: WorkflowJob): GeneratorFn<void> {
    try {
      this.fetchJobLogState.inProgress();
      const job = WorkflowJob.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getWorkflowJob(
          this.editorStore.sdlcState.activeProject.projectId,
          this.editorStore.sdlcState.activeWorkspace,
          workflowJob,
        )) as PlainObject<WorkflowJob>,
      );
      this.setJob(job);
      const logs = (yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
        this.editorStore.sdlcState.activeProject.projectId,
        this.editorStore.sdlcState.activeWorkspace,
        job,
      )) as string;
      this.setLogs(logs);
      this.fetchJobLogState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.fetchJobLogState.fail();
    }
  }

  *viewJobLogs(workflowJob: WorkflowJob): GeneratorFn<void> {
    try {
      this.setJob(workflowJob);
      this.fetchJobLogState.inProgress();
      const logs = (yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        workflowJob,
      )) as string;
      this.setLogs(logs);
      this.fetchJobLogState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.fetchJobLogState.fail();
    }
  }
}

export class WorkspaceWorkflowState {
  uuid = uuid();
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  treeData: TreeData<WorkflowExplorerTreeNodeData>;
  isExecutingWorkflowRequest = false;

  constructor(
    editorStore: EditorStore,
    sdlcState: EditorSDLCState,
    workflow: Workflow,
    jobs: WorkflowJob[] | undefined,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      treeData: observable.ref,
      setWorkflowTreeData: action,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.treeData = this.buildTreeData(workflow, jobs);
  }

  setWorkflowTreeData(val: TreeData<WorkflowExplorerTreeNodeData>): void {
    this.treeData = val;
  }

  buildTreeData(
    workflow: Workflow,
    jobs: WorkflowJob[] | undefined,
  ): TreeData<WorkflowExplorerTreeNodeData> {
    const rootIds: string[] = [];
    const nodes = new Map<string, WorkflowExplorerTreeNodeData>();
    const treeData = { rootIds, nodes };
    const workflowNode = new WorkflowTreeNodeData(workflow);
    treeData.rootIds.push(workflowNode.id);
    treeData.nodes.set(workflowNode.id, workflowNode);
    if (jobs) {
      workflowNode.isOpen = true;
      updateWorkflowJobData(jobs, workflow.id, treeData);
    }
    return treeData;
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

  *refreshWorkflow(
    workflowId: string,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    const node = treeData.nodes.get(getWorkflowNodeId(workflowId));
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
}

export class WorkspaceWorkflowsState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  fetchWorkflowsState = ActionState.create();
  logState: WorkflowLogState;
  workflowStates: WorkspaceWorkflowState[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
      fetchWorkflowsState: observable,
      logState: observable,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.logState = new WorkflowLogState(
      this.editorStore,
      this.sdlcState,
      undefined,
      undefined,
    );
  }

  *fetchAllWorkspaceWorkflows(): GeneratorFn<void> {
    try {
      this.fetchWorkflowsState.inProgress();
      // NOTE: this network call can take a while, so we might consider limiting the number of workflows to 10 or so
      const workflows = (
        (yield this.editorStore.sdlcServerClient.getWorkflows(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Workflow>[]
      ).map((workflow) => Workflow.serialization.fromJson(workflow));
      const openWorkflowIds = this.workflowStates
        .map((workflowState) =>
          Array.from(workflowState.treeData.nodes.values()),
        )
        .flat()
        .filter(
          (node: WorkflowExplorerTreeNodeData): node is WorkflowTreeNodeData =>
            node instanceof WorkflowTreeNodeData,
        )
        .filter((node) => node.isOpen)
        .map((node) => node.workflow.id);
      const workflowToJobsMap = new Map<string, WorkflowJob[]>();
      yield Promise.all(
        workflows
          .filter((workflow) => openWorkflowIds.includes(workflow.id))
          // NOTE: this network call can take a while, so we might consider limiting the number of workflows to 10 or so
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
      this.workflowStates = workflows.map(
        (workflow) =>
          new WorkspaceWorkflowState(
            this.editorStore,
            this.sdlcState,
            workflow,
            workflowToJobsMap.get(workflow.id),
          ),
      );
      this.fetchWorkflowsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.fetchWorkflowsState.fail();
    }
  }
}
