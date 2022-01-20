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
import {
  makeAutoObservable,
  observable,
  action,
  flowResult,
  makeObservable,
  flow,
} from 'mobx';
import { LEGEND_STUDIO_LOG_EVENT_TYPE } from '../LegendStudioLogEvent';
import type { EditorStore } from '../EditorStore';
import type { EditorSDLCState } from '../EditorSDLCState';
import {
  type GeneratorFn,
  type PlainObject,
  uuid,
  assertErrorThrown,
  LogEvent,
  ActionState,
} from '@finos/legend-shared';
import {
  type Workspace,
  type Version,
  WorkflowJob,
  Workflow,
} from '@finos/legend-server-sdlc';

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
  workflowManagerState: WorkflowManagerState;
  job: WorkflowJob | undefined;
  logs: string;
  fetchJobLogState = ActionState.create();

  constructor(
    editorStore: EditorStore,
    workflowManagerState: WorkflowManagerState,
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
      const job = WorkflowJob.serialization.fromJson(
        this.workflowManagerState.versionId
          ? ((yield this.editorStore.sdlcServerClient.getWorkflowJobByVersion(
              this.workflowManagerState.sdlcState.activeProject.projectId,
              this.workflowManagerState.versionId,
              workflowJob,
            )) as PlainObject<WorkflowJob>)
          : ((yield this.editorStore.sdlcServerClient.getWorkflowJob(
              this.workflowManagerState.sdlcState.activeProject.projectId,
              this.workflowManagerState.workspace,
              workflowJob,
            )) as PlainObject<WorkflowJob>),
      );
      this.setJob(job);
      const logs = this.workflowManagerState.versionId
        ? ((yield this.editorStore.sdlcServerClient.getWorkflowJobLogsByVersion(
            this.workflowManagerState.sdlcState.activeProject.projectId,
            this.workflowManagerState.versionId,
            job,
          )) as string)
        : ((yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
            this.workflowManagerState.sdlcState.activeProject.projectId,
            this.workflowManagerState.workspace,
            job,
          )) as string);
      this.setLogs(logs);
      this.fetchJobLogState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
      const logs = this.workflowManagerState.versionId
        ? ((yield this.editorStore.sdlcServerClient.getWorkflowJobLogsByVersion(
            this.workflowManagerState.sdlcState.activeProject.projectId,
            this.workflowManagerState.versionId,
            workflowJob,
          )) as string)
        : ((yield this.editorStore.sdlcServerClient.getWorkflowJobLogs(
            this.workflowManagerState.sdlcState.activeProject.projectId,
            this.workflowManagerState.workspace,
            workflowJob,
          )) as string);
      this.setLogs(logs);
      this.fetchJobLogState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.fetchJobLogState.fail();
    }
  }
}

export class WorkflowState {
  uuid = uuid();
  editorStore: EditorStore;
  workflowManagerState: WorkflowManagerState;
  treeData: TreeData<WorkflowExplorerTreeNodeData>;
  isExecutingWorkflowRequest = false;

  constructor(
    editorStore: EditorStore,
    WorkflowManagerState: WorkflowManagerState,
    workflow: Workflow,
    jobs: WorkflowJob[] | undefined,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      treeData: observable.ref,
      setWorkflowTreeData: action,
    });

    this.editorStore = editorStore;
    this.workflowManagerState = WorkflowManagerState;
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
        this.workflowManagerState.versionId
          ? ((yield this.editorStore.sdlcServerClient.getWorkflowJobsByVersion(
              this.workflowManagerState.sdlcState.activeProject.projectId,
              this.workflowManagerState.versionId,
              workflowId,
              undefined,
              undefined,
              undefined,
            )) as PlainObject<WorkflowJob>[])
          : ((yield this.editorStore.sdlcServerClient.getWorkflowJobs(
              this.workflowManagerState.sdlcState.activeProject.projectId,
              this.workflowManagerState.workspace,
              workflowId,
              undefined,
              undefined,
              undefined,
            )) as PlainObject<WorkflowJob>[])
      )
        .map((job) => WorkflowJob.serialization.fromJson(job))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      updateWorkflowJobData(workflowJobs, workflowId, treeData);
      this.setWorkflowTreeData({ ...treeData });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
        yield flowResult(this.fetchAllWorkspaceWorkJobs(node.workflow.id, treeData));
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
      if (this.workflowManagerState.versionId) {
        (yield this.editorStore.sdlcServerClient.cancelWorkflowJobByVersion(
          this.workflowManagerState.sdlcState.activeProject.projectId,
          this.workflowManagerState.versionId,
          workflowJob,
        )) as PlainObject<WorkflowJob>[];
      } else {
        (yield this.editorStore.sdlcServerClient.cancelWorkflowJob(
          this.workflowManagerState.sdlcState.activeProject.projectId,
          this.workflowManagerState.workspace,
          workflowJob,
        )) as PlainObject<WorkflowJob>[];
      }

      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
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
        this.workflowManagerState.versionId
          ? ((yield this.editorStore.sdlcServerClient.getWorkflowByVersion(
              this.workflowManagerState.sdlcState.activeProject.projectId,
              this.workflowManagerState.versionId,
              workflowId,
            )) as PlainObject<Workflow>)
          : ((yield this.editorStore.sdlcServerClient.getWorkflow(
              this.workflowManagerState.sdlcState.activeProject.projectId,
              this.workflowManagerState.workspace,
              workflowId,
            )) as PlainObject<Workflow>),
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
      if (this.workflowManagerState.versionId) {
        (yield this.editorStore.sdlcServerClient.retryWorkflowJobByVersion(
          this.workflowManagerState.sdlcState.activeProject.projectId,
          this.workflowManagerState.versionId,
          workflowJob,
        )) as PlainObject<WorkflowJob>[];
      } else {
        (yield this.editorStore.sdlcServerClient.retryWorkflowJob(
          this.workflowManagerState.sdlcState.activeProject.projectId,
          this.workflowManagerState.workspace,
          workflowJob,
        )) as PlainObject<WorkflowJob>[];
      }
      yield flowResult(this.refreshWorkflow(workflowJob.workflowId, treeData));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingWorkflowRequest = false;
    }
  }
}

export abstract class WorkflowManagerState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  fetchWorkflowsState = ActionState.create();
  logState: WorkflowLogState;
  workflowStates: WorkflowState[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.logState = new WorkflowLogState(
      this.editorStore,
      this,
      undefined,
      undefined,
    );
  }

  get workspace(): Workspace | undefined {
    return undefined;
  }

  get versionId(): string | undefined {
    return undefined;
  }

  *fetchAllWorkflows(): GeneratorFn<void> {
    try {
      this.fetchWorkflowsState.inProgress();
      // NOTE: this network call can take a while, so we might consider limiting the number of workflows to 10 or so
      let workflowsJson: PlainObject<Workflow>[] = [];
      if (this.versionId) {
        workflowsJson =
          (yield this.editorStore.sdlcServerClient.getWorkflowsByVersion(
            this.sdlcState.activeProject.projectId,
            this.versionId,
            undefined,
            undefined,
            undefined,
          )) as PlainObject<Workflow>[];
      } else {
        workflowsJson = (yield this.editorStore.sdlcServerClient.getWorkflows(
          this.sdlcState.activeProject.projectId,
          this.workspace,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Workflow>[];
      }
      const workflows = workflowsJson.map((workflow) =>
        Workflow.serialization.fromJson(workflow),
      );
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
            (this.versionId
              ? this.editorStore.sdlcServerClient.getWorkflowJobsByVersion(
                  this.sdlcState.activeProject.projectId,
                  this.versionId,
                  workflow.id,
                  undefined,
                  undefined,
                  undefined,
                )
              : this.editorStore.sdlcServerClient.getWorkflowJobs(
                  this.sdlcState.activeProject.projectId,
                  this.workspace,
                  workflow.id,
                  undefined,
                  undefined,
                  undefined,
                )
            ).then((jobs: PlainObject<WorkflowJob>[]) =>
              workflowToJobsMap.set(
                workflow.id,
                jobs
                  .map((x) => WorkflowJob.serialization.fromJson(x))
                  .sort(
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
            workflowToJobsMap.get(workflow.id),
          ),
      );
      this.fetchWorkflowsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.fetchWorkflowsState.fail();
    }
  }
}

export class WorkspaceWorkflowManagerState extends WorkflowManagerState {
  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore, sdlcState);
    makeObservable(this, {
      editorStore: false,
      sdlcState: false,
      fetchWorkflowsState: observable,
      logState: observable,
      workflowStates: observable,
      fetchAllWorkflows: flow,
    });
  }

  override get workspace(): Workspace {
    return this.editorStore.sdlcState.activeWorkspace;
  }
}

export class ProjectVersionWorkflowManagerState extends WorkflowManagerState {
  version: Version | undefined;
  constructor(
    editorStore: EditorStore,
    sdlcState: EditorSDLCState,
    version: Version | undefined,
  ) {
    super(editorStore, sdlcState);
    makeObservable(this, {
      editorStore: false,
      sdlcState: false,
      fetchWorkflowsState: observable,
      logState: observable,
      workflowStates: observable,
      fetchAllWorkflows: flow,
    });
    this.version = version;
  }

  override get versionId(): string | undefined {
    return this.version?.id.id;
  }
}
