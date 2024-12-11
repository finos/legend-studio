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
import { observable, action, flowResult, makeObservable, flow } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import type { EditorStore } from '../EditorStore.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import {
  type GeneratorFn,
  type PlainObject,
  uuid,
  assertErrorThrown,
  LogEvent,
  ActionState,
  filterByType,
} from '@finos/legend-shared';
import { type Version, WorkflowJob, Workflow } from '@finos/legend-server-sdlc';

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
  readonly editorStore: EditorStore;
  readonly workflowManagerState: WorkflowManagerState;
  readonly fetchJobLogState = ActionState.create();

  job: WorkflowJob | undefined;
  logs: string;

  constructor(
    editorStore: EditorStore,
    workflowManagerState: WorkflowManagerState,
    job: WorkflowJob | undefined,
    logs: string | undefined,
  ) {
    makeObservable(this, {
      job: observable,
      logs: observable,
      setLogs: action,
      setJob: action,
      closeModal: action,
      refreshJobLogs: flow,
      viewJobLogs: flow,
    });

    this.editorStore = editorStore;
    this.workflowManagerState = workflowManagerState;
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
      const job = (yield flowResult(
        this.workflowManagerState.getJob(workflowJob),
      )) as WorkflowJob;
      this.setJob(job);
      const logs = (yield flowResult(
        this.workflowManagerState.getJobLogs(workflowJob),
      )) as string;
      this.setLogs(logs);
      this.fetchJobLogState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.fetchJobLogState.fail();
    }
  }

  *viewJobLogs(workflowJob: WorkflowJob): GeneratorFn<void> {
    try {
      this.setJob(workflowJob);
      this.fetchJobLogState.inProgress();
      const logs = (yield flowResult(
        this.workflowManagerState.getJobLogs(workflowJob),
      )) as string;
      this.setLogs(logs);
      this.fetchJobLogState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.fetchJobLogState.fail();
    }
  }
}

export class WorkflowState {
  readonly uuid = uuid();
  readonly editorStore: EditorStore;
  readonly workflowManagerState: WorkflowManagerState;

  treeData: TreeData<WorkflowExplorerTreeNodeData>;
  isExecutingWorkflowRequest = false;

  constructor(
    editorStore: EditorStore,
    workflowManagerState: WorkflowManagerState,
    workflow: Workflow,
    jobs: WorkflowJob[] | undefined,
  ) {
    makeObservable(this, {
      treeData: observable.ref,
      isExecutingWorkflowRequest: observable,
      setWorkflowTreeData: action,
      fetchAllWorkspaceWorkJobs: flow,
      onTreeNodeSelect: flow,
      cancelJob: flow,
      refreshWorkflow: flow,
      retryJob: flow,
      runManualJob: flow,
    });

    this.editorStore = editorStore;
    this.workflowManagerState = workflowManagerState;
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
        (yield flowResult(
          this.workflowManagerState.getJobs(workflowId),
        )) as WorkflowJob[]
      ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      updateWorkflowJobData(workflowJobs, workflowId, treeData);
      this.setWorkflowTreeData({ ...treeData });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
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
      this.workflowManagerState.cancelJob(workflowJob);
      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
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
      const workflow = (yield flowResult(
        this.workflowManagerState.getWorkflow(workflowId),
      )) as Workflow;
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
      yield flowResult(this.workflowManagerState.retryJob(workflowJob));
      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }

  *runManualJob(
    workflowJob: WorkflowJob,
    treeData: TreeData<WorkflowExplorerTreeNodeData>,
  ): GeneratorFn<void> {
    try {
      this.isExecutingWorkflowRequest = true;
      yield flowResult(this.workflowManagerState.runManualJob(workflowJob));
      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }
}

export abstract class WorkflowManagerState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;
  readonly fetchWorkflowsState = ActionState.create();

  logState: WorkflowLogState;
  workflowStates: WorkflowState[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      logState: observable,
      workflowStates: observable,
      fetchAllWorkflows: flow,
      getWorkflows: flow,
      getWorkflow: flow,
      getJobs: flow,
      getJob: flow,
      retryJob: flow,
      cancelJob: flow,
      runManualJob: flow,
      getJobLogs: flow,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;

    this.logState = new WorkflowLogState(
      this.editorStore,
      this,
      undefined,
      undefined,
    );
  }

  abstract getWorkflows(): GeneratorFn<Workflow[]>;
  abstract getWorkflow(workflowId: string): GeneratorFn<Workflow>;
  abstract getJobs(workflowId: string): GeneratorFn<WorkflowJob[]>;
  abstract getJob(job: WorkflowJob): GeneratorFn<WorkflowJob[]>;
  abstract retryJob(workflowJob: WorkflowJob): GeneratorFn<void>;
  abstract runManualJob(workflowJob: WorkflowJob): GeneratorFn<void>;
  abstract cancelJob(workflowJob: WorkflowJob): GeneratorFn<void>;
  abstract getJobLogs(workflowJob: WorkflowJob): GeneratorFn<string>;

  *fetchAllWorkflows(): GeneratorFn<void> {
    try {
      this.fetchWorkflowsState.inProgress();
      // NOTE: this network call can take a while, so we might consider limiting the number of workflows to 10 or so
      const workflows = (yield flowResult(this.getWorkflows())) as Workflow[];
      const openWorkflowIds = this.workflowStates
        .map((workflowState) =>
          Array.from(workflowState.treeData.nodes.values()),
        )
        .flat()
        .filter(filterByType(WorkflowTreeNodeData))
        .filter((node) => node.isOpen)
        .map((node) => node.workflow.id);
      const jobsIndex = new Map<string, WorkflowJob[]>();
      yield Promise.all(
        workflows
          .filter((workflow) => openWorkflowIds.includes(workflow.id))
          // NOTE: this network call can take a while, so we might consider limiting the number of workflows to 10 or so
          .map((workflow) =>
            flowResult(this.getJobs(workflow.id)).then((jobs: WorkflowJob[]) =>
              jobsIndex.set(
                workflow.id,
                jobs.toSorted(
                  (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
                ),
              ),
            ),
          ),
      );
      this.workflowStates = workflows.map(
        (workflow) =>
          new WorkflowState(
            this.editorStore,
            this,
            workflow,
            jobsIndex.get(workflow.id),
          ),
      );
      this.fetchWorkflowsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.fetchWorkflowsState.fail();
    }
  }
}

export class WorkspaceWorkflowManagerState extends WorkflowManagerState {
  override *getJobs(workflowId: string): GeneratorFn<WorkflowJob[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowJobs(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        workflowId,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<WorkflowJob>[]
    ).map((v) => WorkflowJob.serialization.fromJson(v));
  }

  override *getJob(job: WorkflowJob): GeneratorFn<WorkflowJob[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowJob(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        job,
      )) as PlainObject<WorkflowJob>[]
    ).map((v) => WorkflowJob.serialization.fromJson(v));
  }

  override *getWorkflows(): GeneratorFn<Workflow[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflows(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<Workflow>[]
    ).map((v) => Workflow.serialization.fromJson(v));
  }

  override *getWorkflow(workflowId: string): GeneratorFn<Workflow> {
    return Workflow.serialization.fromJson(
      (yield this.editorStore.sdlcServerClient.getWorkflow(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        workflowId,
      )) as PlainObject<Workflow>,
    );
  }

  override *retryJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.retryWorkflowJob(
      this.sdlcState.activeProject.projectId,
      this.sdlcState.activeWorkspace,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *runManualJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.runManualWorkflowJob(
      this.sdlcState.activeProject.projectId,
      this.sdlcState.activeWorkspace,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *cancelJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.cancelWorkflowJob(
      this.sdlcState.activeProject.projectId,
      this.sdlcState.activeWorkspace,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *getJobLogs(workflowJob: WorkflowJob): GeneratorFn<string> {
    return (yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
      this.sdlcState.activeProject.projectId,
      this.sdlcState.activeWorkspace,
      workflowJob,
    )) as string;
  }
}

export class ProjectVersionWorkflowManagerState extends WorkflowManagerState {
  version: Version;
  constructor(
    editorStore: EditorStore,
    sdlcState: EditorSDLCState,
    version: Version,
  ) {
    super(editorStore, sdlcState);
    this.version = version;
  }

  override *getJobs(workflowId: string): GeneratorFn<WorkflowJob[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowJobsByVersion(
        this.sdlcState.activeProject.projectId,
        this.version.id.id,
        workflowId,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<WorkflowJob>[]
    ).map((v) => WorkflowJob.serialization.fromJson(v));
  }

  override *getJob(job: WorkflowJob): GeneratorFn<WorkflowJob[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowJobByVersion(
        this.sdlcState.activeProject.projectId,
        this.version.id.id,
        job,
      )) as PlainObject<WorkflowJob>[]
    ).map((v) => WorkflowJob.serialization.fromJson(v));
  }

  override *getWorkflows(): GeneratorFn<Workflow[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowsByVersion(
        this.sdlcState.activeProject.projectId,
        this.version.id.id,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<Workflow>[]
    ).map((v) => Workflow.serialization.fromJson(v));
  }

  override *getWorkflow(workflowId: string): GeneratorFn<Workflow> {
    return Workflow.serialization.fromJson(
      (yield this.editorStore.sdlcServerClient.getWorkflowByVersion(
        this.sdlcState.activeProject.projectId,
        this.version.id.id,
        workflowId,
      )) as PlainObject<Workflow>,
    );
  }

  override *retryJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.retryWorkflowJobByVersion(
      this.sdlcState.activeProject.projectId,
      this.version.id.id,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *runManualJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.runManualWorkflowJobByVersion(
      this.sdlcState.activeProject.projectId,
      this.version.id.id,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *cancelJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.cancelWorkflowJobByVersion(
      this.sdlcState.activeProject.projectId,
      this.version.id.id,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *getJobLogs(workflowJob: WorkflowJob): GeneratorFn<string> {
    return (yield this.editorStore.sdlcServerClient.getWorkflowJobLogsByVersion(
      this.sdlcState.activeProject.projectId,
      this.version.id.id,
      workflowJob,
    )) as string;
  }
}

export class ProjectWorkflowManagerState extends WorkflowManagerState {
  override *getJobs(workflowId: string): GeneratorFn<WorkflowJob[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowJobs(
        this.sdlcState.activeProject.projectId,
        undefined,
        workflowId,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<WorkflowJob>[]
    ).map((v) => WorkflowJob.serialization.fromJson(v));
  }

  override *getJob(job: WorkflowJob): GeneratorFn<WorkflowJob[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflowJob(
        this.sdlcState.activeProject.projectId,
        undefined,
        job,
      )) as PlainObject<WorkflowJob>[]
    ).map((v) => WorkflowJob.serialization.fromJson(v));
  }

  override *getWorkflows(): GeneratorFn<Workflow[]> {
    return (
      (yield this.editorStore.sdlcServerClient.getWorkflows(
        this.sdlcState.activeProject.projectId,
        undefined,
        undefined,
        undefined,
        undefined,
      )) as PlainObject<Workflow>[]
    ).map((v) => Workflow.serialization.fromJson(v));
  }

  override *getWorkflow(workflowId: string): GeneratorFn<Workflow> {
    return Workflow.serialization.fromJson(
      (yield this.editorStore.sdlcServerClient.getWorkflow(
        this.sdlcState.activeProject.projectId,
        undefined,
        workflowId,
      )) as PlainObject<Workflow>,
    );
  }

  override *retryJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.retryWorkflowJob(
      this.sdlcState.activeProject.projectId,
      undefined,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *runManualJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.runManualWorkflowJob(
      this.sdlcState.activeProject.projectId,
      undefined,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *cancelJob(workflowJob: WorkflowJob): GeneratorFn<void> {
    (yield this.editorStore.sdlcServerClient.cancelWorkflowJob(
      this.sdlcState.activeProject.projectId,
      undefined,
      workflowJob,
    )) as PlainObject<WorkflowJob>[];
  }

  override *getJobLogs(workflowJob: WorkflowJob): GeneratorFn<string> {
    return (yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
      this.sdlcState.activeProject.projectId,
      undefined,
      workflowJob,
    )) as string;
  }
}
