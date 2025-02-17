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

import type { Project } from './models/project/Project.js';
import type { ImportReport } from './models/project/ImportReport.js';
import { type Workspace, WorkspaceType } from './models/workspace/Workspace.js';
import type { Revision, RevisionAlias } from './models/revision/Revision.js';
import type { Workflow, WorkflowStatus } from './models/workflow/Workflow.js';
import type { Review, ReviewState } from './models/review/Review.js';
import type { Version } from './models/version/Version.js';
import type { WorkspaceUpdateReport } from './models/workspace/WorkspaceUpdateReport.js';
import type { ProjectConfiguration } from './models/configuration/ProjectConfiguration.js';
import type { CreateVersionCommand } from './models/version/VersionCommands.js';
import type { ProjectStructureVersion } from './models/configuration/ProjectStructureVersion.js';
import type { User } from './models/User.js';
import {
  type PlainObject,
  type TraceData,
  type RequestHeaders,
  AbstractServerClient,
  ContentType,
  guaranteeNonNullable,
  HttpHeader,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import type {
  CreateProjectCommand,
  ImportProjectCommand,
  UpdateProjectCommand,
} from './models/project/ProjectCommands.js';
import type { UpdateProjectConfigurationCommand } from './models/configuration/ProjectConfigurationCommands.js';
import type {
  PerformEntitiesChangesCommand,
  UpdateEntitiesCommand,
} from './models/entity/EntityCommands.js';
import type {
  CommitReviewCommand,
  CreateReviewCommand,
} from './models/review/ReviewCommands.js';
import type { WorkflowJob } from './models/workflow/WorkflowJob.js';
import type { SDLCServerFeaturesConfiguration } from './models/server/SDLCServerFeaturesConfiguration.js';
import type { Platform } from './models/configuration/Platform.js';
import type { ProjectConfigurationStatusReport } from './models/project/ProjectConfigurationStatus.js';
import type {
  AuthorizableProjectAction,
  ProjectAccessRole,
} from './models/project/ProjectAccess.js';
import type { Patch } from './models/patch/Patch.js';
import type { Comparison } from './models/comparison/Comparison.js';
import type { ReviewApproval } from './models/review/ReviewApproval.js';

enum SDLC_ACTIVITY_TRACE {
  IMPORT_PROJECT = 'import project',
  CREATE_PROJECT = 'create project',
  UPDATE_PROJECT = 'update project',
  CREATE_PATCH = 'create patch',
  CREATE_WORKSPACE = 'create workspace',
  UPDATE_WORKSPACE = 'update workspace',
  DELETE_WORKSPACE = 'delete workspace',
  CREATE_VERSION = 'create version',
  UPDATE_CONFIGURATION = 'update configuration',
  PERFORM_ENTITY_CHANGES = 'perform entity changes',
  UPDATE_ENTITIES = 'update entities',
  CREATE_REVIEW = 'create review',
  COMMIT_REVIEW = 'commit review',
}

export interface ReviewSeachOptions {
  assignedToMe?: boolean | undefined;
  authoredByMe?: boolean | undefined;
  labels?: string[] | undefined;
  workspaceIdRegex?: string | undefined;
  workspaceTypes?: WorkspaceType[] | undefined;
  state?: ReviewState | undefined;
  since?: Date | undefined;
  until?: Date | undefined;
  limit?: number | undefined;
}

export interface ProjectReviewSeachOptions {
  state?: ReviewState | undefined;
  revisionIds?: string[] | undefined;
  workspaceIdRegex?: string | undefined;
  workspaceTypes?: WorkspaceType[] | undefined;
  since?: Date | undefined;
  until?: Date | undefined;
  limit?: number | undefined;
}

export interface SDLCServerClientConfig {
  env: string;
  serverUrl: string;
  baseHeaders?: RequestHeaders | undefined;
}

export class SDLCServerClient extends AbstractServerClient {
  currentUser?: User;
  private _features: SDLCServerFeaturesConfiguration | undefined;
  private _platformDependencyConfiguration?: Platform[] | undefined;

  private env: string;

  constructor(config: SDLCServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
      baseHeaders: config.baseHeaders,
    });
    this.env = config.env;
  }

  setCurrentUser = (value: User): void => {
    this.currentUser = value;
  };

  /**
   * NOTE: Should only be used for test
   */
  _setFeatures(val: SDLCServerFeaturesConfiguration): void {
    this._features = val;
  }

  get featuresConfigHasBeenFetched(): boolean {
    return Boolean(this._features);
  }

  get features(): SDLCServerFeaturesConfiguration {
    return guaranteeNonNullable(
      this._features,
      `SDLC server client features configuration has not been fetched`,
    );
  }

  get platforms(): Platform[] | undefined {
    return guaranteeNonNullable(
      this._platformDependencyConfiguration,
      `SDLC server client platforms configuration has not been fetched`,
    );
  }

  private getTraceData = (
    name: SDLC_ACTIVITY_TRACE,
    tracingTags?: PlainObject,
  ): TraceData => ({
    name,
    tags: {
      env: this.env,
      userId: this.currentUser?.userId ?? '(unknown)',
      ...tracingTags,
    },
  });

  // ------------------------------------------- Server -------------------------------------------

  private _server = (): string => `${this.baseUrl}/server`;
  fetchServerFeaturesConfiguration = async (): Promise<void> => {
    this._features = await this.get(`${this._server()}/features`);
  };
  fetchServerPlatforms = async (): Promise<void> => {
    this._platformDependencyConfiguration = await this.get(
      `${this._server()}/platforms`,
    );
  };

  // ------------------------------------------- Authorization -------------------------------------------

  static authorizeCallbackUrl = (
    authenticationServerUrl: string,
    callbackURI: string,
  ): string =>
    `${authenticationServerUrl}/auth/authorize?redirect_uri=${callbackURI}`;

  private _auth = (): string => `${this.baseUrl}/auth`;
  isAuthorized = (): Promise<boolean> => this.get(`${this._auth()}/authorized`);
  hasAcceptedTermsOfService = (): Promise<string[]> =>
    this.get(`${this._auth()}/termsOfServiceAcceptance`);

  // ------------------------------------------- User -------------------------------------------

  /**
   * We expose this URL because it is needed for developer to authenticate using SDLC server during development.
   */
  get currentUserUrl(): string {
    return `${this.baseUrl}/currentUser`;
  }

  get usersUrl(): string {
    return `${this.baseUrl}/users`;
  }

  getCurrentUser = (): Promise<PlainObject<User>> =>
    this.get(this.currentUserUrl);
  getUsers = (name: string): Promise<PlainObject<User>[]> =>
    this.get(this.usersUrl, undefined, undefined, { search: name });

  // ------------------------------------------- Project -------------------------------------------

  private _projects = (): string => `${this.baseUrl}/projects`;
  private _project = (projectId: string): string =>
    `${this._projects()}/${encodeURIComponent(projectId)}`;

  getProject = (projectId: string): Promise<PlainObject<Project>> =>
    this.get(this._project(projectId));
  getProjects = (
    user: boolean | undefined,
    search: string | undefined,
    tag: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<Project>[]> =>
    this.get(this._projects(), undefined, undefined, {
      user,
      search,
      tag,
      limit,
    });
  createProject = (
    command: PlainObject<CreateProjectCommand>,
  ): Promise<PlainObject<Project>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.CREATE_PROJECT),
      this._projects(),
      command,
    );
  importProject = (
    command: PlainObject<ImportProjectCommand>,
  ): Promise<PlainObject<ImportReport>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.IMPORT_PROJECT),
      `${this._projects()}/import`,
      command,
    );
  updateProject = (
    projectId: string,
    command: PlainObject<UpdateProjectCommand>,
  ): Promise<void> =>
    this.putWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.UPDATE_PROJECT),
      this._project(projectId),
      command,
    );

  // ------------------------------------------- Project Access -------------------------------------------

  private _authorizedActionProject = (projectId: string): string =>
    `${this._project(projectId)}/authorizedActions`;
  getAutorizedActions = (
    projectId: string,
  ): Promise<AuthorizableProjectAction[]> =>
    this.get(this._authorizedActionProject(projectId));

  private _acessRole = (projectId: string): string =>
    `${this._project(projectId)}/userAccessRole/currentUser`;
  getAccessRole = (
    projectId: string,
  ): Promise<PlainObject<ProjectAccessRole>> =>
    this.get(this._acessRole(projectId));

  // ------------------------------------------- Patch -------------------------------------------

  private _patches = (projectId: string): string =>
    `${this._project(projectId)}/patches`;
  private _patch = (projectId: string, patchReleaseVersionId: string): string =>
    `${this._project(projectId)}/patches/${encodeURIComponent(
      patchReleaseVersionId,
    )}`;
  private _releasePatch = (
    projectId: string,
    patchReleaseVersionId: string,
  ): string => `${this._patch(projectId, patchReleaseVersionId)}/release`;

  getPatches = (projectId: string): Promise<PlainObject<Patch>[]> =>
    this.get(this._patches(projectId));

  createPatch = (
    projectId: string,
    sourceVersion: string,
  ): Promise<PlainObject<Workspace>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.CREATE_PATCH),
      this._patches(projectId),
      sourceVersion,
    );
  getPatch = (
    projectId: string,
    patchReleaseVersionId: string,
  ): Promise<PlainObject<Patch>> =>
    this.get(this._patch(projectId, patchReleaseVersionId));
  releasePatch = (
    projectId: string,
    patchReleaseVersionId: string,
  ): Promise<PlainObject<Version>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.CREATE_VERSION),
      this._releasePatch(projectId, patchReleaseVersionId),
    );

  // ------------------------------------------- Workspace -------------------------------------------

  private _workspaces = (
    projectId: string,
    patchReleaseVersionId?: string | undefined,
  ): string =>
    `${this._project(projectId)}/${
      patchReleaseVersionId
        ? `patches/${encodeURIComponent(patchReleaseVersionId)}/`
        : ''
    }workspaces`;
  private _groupWorkspaces = (
    projectId: string,
    patchReleaseVersionId?: string | undefined,
  ): string =>
    `${this._project(projectId)}/${
      patchReleaseVersionId
        ? `patches/${encodeURIComponent(patchReleaseVersionId)}/`
        : ''
    }groupWorkspaces`;
  private _workspaceByType = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): string =>
    workspaceType === WorkspaceType.GROUP
      ? `${this._groupWorkspaces(
          projectId,
          patchReleaseVersionId,
        )}/${encodeURIComponent(workspaceId)}`
      : `${this._workspaces(
          projectId,
          patchReleaseVersionId,
        )}/${encodeURIComponent(workspaceId)}`;
  private _workspace = (projectId: string, workspace: Workspace): string =>
    this._workspaceByType(
      projectId,
      workspace.source,
      workspace.workspaceId,
      workspace.workspaceType,
    );
  /**
   * This method makes it possible that we don't have to repeat the set of endpoints twice for:
   *    1. workspaceId === undefined (hence calling the project branch)
   *    2. and normal workspace branch
   */
  private _adaptiveWorkspace = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string =>
    workspace
      ? this._workspace(projectId, workspace)
      : this._project(projectId);

  getWorkspaces = (
    projectId: string,
    patchReleaseVersionId?: string | undefined,
  ): Promise<PlainObject<Workspace>[]> =>
    Promise.all([
      this.get(this._workspaces(projectId, patchReleaseVersionId)),
      this.get(this._groupWorkspaces(projectId, patchReleaseVersionId)),
    ]).then((workspaces) => workspaces.flat()) as Promise<
      PlainObject<Workspace>[]
    >;
  getGroupWorkspaces = (
    projectId: string,
    patchReleaseVersionId?: string | undefined,
  ): Promise<PlainObject<Workspace>[]> =>
    this.get(this._groupWorkspaces(projectId, patchReleaseVersionId));
  getWorkspace = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): Promise<PlainObject<Workspace>> =>
    this.get(
      this._workspaceByType(
        projectId,
        patchReleaseVersionId,
        workspaceId,
        workspaceType,
      ),
    );
  isWorkspaceOutdated = (
    projectId: string,
    workspace: Workspace,
  ): Promise<boolean> =>
    this.get(`${this._workspace(projectId, workspace)}/outdated`);
  checkIfWorkspaceIsInConflictResolutionMode = (
    projectId: string,
    workspace: Workspace,
  ): Promise<boolean> =>
    this.get(
      `${this._workspace(projectId, workspace)}/inConflictResolutionMode`,
    );
  createWorkspace = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): Promise<PlainObject<Workspace>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.CREATE_WORKSPACE),
      this._workspaceByType(
        projectId,
        patchReleaseVersionId,
        workspaceId,
        workspaceType,
      ),
    );
  updateWorkspace = (
    projectId: string,
    workspace: Workspace,
  ): Promise<PlainObject<WorkspaceUpdateReport>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.UPDATE_WORKSPACE),
      `${this._workspace(projectId, workspace)}/update`,
    );
  deleteWorkspace = (
    projectId: string,
    workspace: Workspace,
  ): Promise<PlainObject<Workspace>> =>
    this.deleteWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.DELETE_WORKSPACE),
      this._workspace(projectId, workspace),
    );

  // ------------------------------------------- Revision -------------------------------------------

  private _revisions = (
    projectId: string,
    workspaceId: Workspace | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/revisions`;
  private _revision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): string =>
    `${this._adaptiveWorkspace(
      projectId,
      workspace,
    )}/revisions/${encodeURIComponent(revisionId)}`;

  getRevisions = (
    projectId: string,
    workspace: Workspace | undefined,
    since: Date | undefined,
    until: Date | undefined,
  ): Promise<PlainObject<Revision>[]> =>
    this.get(
      this._revisions(projectId, workspace),
      {},
      {},
      { since: since?.toISOString(), until: until?.toISOString() },
    );
  getRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Revision>> =>
    this.get(this._revision(projectId, workspace, revisionId));

  // ------------------------------------------- Version -------------------------------------------

  private _versions = (projectId: string): string =>
    `${this._project(projectId)}/versions`;
  private _version = (projectId: string, versionId: string): string =>
    `${this._versions(projectId)}/${encodeURIComponent(versionId)}`;

  getVersions = (projectId: string): Promise<PlainObject<Version>[]> =>
    this.get(this._versions(projectId));
  getVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<Version>> =>
    this.get(this._version(projectId, versionId));
  createVersion = (
    projectId: string,
    command: PlainObject<CreateVersionCommand>,
  ): Promise<PlainObject<Version>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.CREATE_VERSION),
      this._versions(projectId),
      command,
    );
  getLatestVersion = (
    projectId: string,
  ): Promise<PlainObject<Version> | undefined> =>
    this.get(`${this._versions(projectId)}/latest`);

  // ------------------------------------------- Configuration -------------------------------------------

  private _configuration = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspace)}/configuration`;

  getConfiguration = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.get(this._configuration(projectId, workspace));
  getConfigurationByVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.get(`${this._version(projectId, versionId)}/configuration`);
  getConfigurationByRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.get(
      `${this._revision(projectId, workspace, revisionId)}/configuration`,
    );
  updateConfiguration = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PlainObject<UpdateProjectConfigurationCommand>,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.UPDATE_CONFIGURATION),
      this._configuration(projectId, workspace),
      command,
    );
  getLatestProjectStructureVersion = (): Promise<
    PlainObject<ProjectStructureVersion>
  > => this.get(`${this.baseUrl}/configuration/latestProjectStructureVersion`);
  projectConfigurationStatus = (
    projectId: string,
  ): Promise<PlainObject<ProjectConfigurationStatusReport>> =>
    this.get(
      `${this.baseUrl}/projects/${projectId}/configuration/projectConfigurationStatus`,
    );

  // ------------------------------------------- Workflow -------------------------------------------

  private _workflows = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspace)}/workflows`;
  private _workflow = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowId: string,
  ): string =>
    `${this._adaptiveWorkspace(
      projectId,
      workspace,
    )}/workflows/${encodeURIComponent(workflowId)}`;
  private _workflowJobs = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowId: string,
  ): string => `${this._workflow(projectId, workspace, workflowId)}/jobs`;
  private _workflowJob = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowId: string,
    workflowJobId: string,
  ): string =>
    `${this._workflow(
      projectId,
      workspace,
      workflowId,
    )}/jobs/${encodeURIComponent(workflowJobId)}`;

  getWorkflow = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowId: string,
  ): Promise<PlainObject<Workflow>> =>
    this.get(this._workflow(projectId, workspace, workflowId));
  getWorkflows = (
    projectId: string,
    workspace: Workspace | undefined,
    status: WorkflowStatus | undefined,
    revisionIds: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<Workflow>[]> =>
    this.get(this._workflows(projectId, workspace), undefined, undefined, {
      status,
      revisionIds,
      limit,
    });
  getWorkflowsByRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Workflow>[]> =>
    this.get(this._workflows(projectId, workspace), undefined, undefined, {
      revisionId,
    });
  getWorkflowJobs = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowId: string,
    status: WorkflowStatus | undefined,
    revisionIds: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<WorkflowJob>[]> =>
    this.get(
      this._workflowJobs(projectId, workspace, workflowId),
      undefined,
      undefined,
      { status, revisionIds, limit },
    );
  getWorkflowJob = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.get(
      `${this._workflowJob(
        projectId,
        workspace,
        workflowJob.workflowId,
        workflowJob.id,
      )}`,
    );
  getWorkflowJobLogs = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowJob: WorkflowJob,
  ): Promise<string> =>
    this.get(
      `${this._workflowJob(
        projectId,
        workspace,
        workflowJob.workflowId,
        workflowJob.id,
      )}/logs`,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
    );
  cancelWorkflowJob = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.post(
      `${this._workflowJob(
        projectId,
        workspace,
        workflowJob.workflowId,
        workflowJob.id,
      )}/cancel`,
    );
  retryWorkflowJob = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.post(
      `${this._workflowJob(
        projectId,
        workspace,
        workflowJob.workflowId,
        workflowJob.id,
      )}/retry`,
    );
  runManualWorkflowJob = (
    projectId: string,
    workspace: Workspace | undefined,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.post(
      `${this._workflowJob(
        projectId,
        workspace,
        workflowJob.workflowId,
        workflowJob.id,
      )}/run`,
    );

  private _workflowsByVersion = (
    projectId: string,
    versionId: string,
  ): string => `${this._version(projectId, versionId)}/workflows`;
  private _workflowByVersion = (
    projectId: string,
    versionId: string,
    workflowId: string,
  ): string =>
    `${this._workflowsByVersion(projectId, versionId)}/${encodeURIComponent(
      workflowId,
    )}`;
  private _workflowJobsByVersion = (
    projectId: string,
    versionId: string,
    workflowId: string,
  ): string =>
    `${this._workflowByVersion(projectId, versionId, workflowId)}/jobs`;
  private _workflowJobByVersion = (
    projectId: string,
    versionId: string,
    workflowId: string,
    workflowJobId: string,
  ): string =>
    `${this._workflowJobsByVersion(
      projectId,
      versionId,
      workflowId,
    )}/${encodeURIComponent(workflowJobId)}`;

  getWorkflowByVersion = (
    projectId: string,
    versionId: string,
    workflowId: string,
  ): Promise<PlainObject<Workflow>> =>
    this.get(this._workflowByVersion(projectId, versionId, workflowId));
  getWorkflowsByVersion = (
    projectId: string,
    versionId: string,
    status: WorkflowStatus | undefined,
    revisionIds: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<Workflow>[]> =>
    this.get(
      this._workflowsByVersion(projectId, versionId),
      undefined,
      undefined,
      {
        status,
        revisionIds,
        limit,
      },
    );
  getWorkflowJobsByVersion = (
    projectId: string,
    versionId: string,
    workflowId: string,
    status: WorkflowStatus | undefined,
    revisionIds: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<WorkflowJob>[]> =>
    this.get(
      this._workflowJobsByVersion(projectId, versionId, workflowId),
      undefined,
      undefined,
      { status, revisionIds, limit },
    );
  getWorkflowJobByVersion = (
    projectId: string,
    versionId: string,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.get(
      `${this._workflowJobByVersion(
        projectId,
        versionId,
        workflowJob.workflowId,
        workflowJob.id,
      )}`,
    );
  getWorkflowJobLogsByVersion = (
    projectId: string,
    versionId: string,
    workflowJob: WorkflowJob,
  ): Promise<string> =>
    this.get(
      `${this._workflowJobByVersion(
        projectId,
        versionId,
        workflowJob.workflowId,
        workflowJob.id,
      )}/logs`,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
    );
  cancelWorkflowJobByVersion = (
    projectId: string,
    versionId: string,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.post(
      `${this._workflowJobByVersion(
        projectId,
        versionId,
        workflowJob.workflowId,
        workflowJob.id,
      )}/cancel`,
    );
  retryWorkflowJobByVersion = (
    projectId: string,
    versionId: string,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.post(
      `${this._workflowJobByVersion(
        projectId,
        versionId,
        workflowJob.workflowId,
        workflowJob.id,
      )}/retry`,
    );
  runManualWorkflowJobByVersion = (
    projectId: string,
    versionId: string,
    workflowJob: WorkflowJob,
  ): Promise<PlainObject<WorkflowJob>> =>
    this.post(
      `${this._workflowJobByVersion(
        projectId,
        versionId,
        workflowJob.workflowId,
        workflowJob.id,
      )}/run`,
    );

  // ------------------------------------------- Entity -------------------------------------------

  private _entities = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspace)}/entities`;

  getEntities = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<PlainObject<Entity>[]> =>
    this.get(this._entities(projectId, workspace));
  getEntitiesByRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Entity>[]> =>
    this.get(`${this._revision(projectId, workspace, revisionId)}/entities`);
  getEntitiesByVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.get(`${this._version(projectId, versionId)}/entities`);
  updateEntities = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PlainObject<UpdateEntitiesCommand>,
  ): Promise<PlainObject<Revision> | undefined> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.UPDATE_ENTITIES),
      this._entities(projectId, workspace),
      command,
    );
  performEntityChanges = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PerformEntitiesChangesCommand,
  ): Promise<PlainObject<Revision> | undefined> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.PERFORM_ENTITY_CHANGES),
      `${this._adaptiveWorkspace(projectId, workspace)}/entityChanges`,
      command,
    );
  getWorkspaceEntity = (
    workspace: Workspace,
    entityPath: string,
  ): Promise<PlainObject<Entity>> =>
    this.get(`${this._entities(workspace.projectId, workspace)}/${entityPath}`);

  // ------------------------------------------- Review -------------------------------------------

  private _reviews = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
  ): string =>
    `${this._project(projectId)}/${
      patchReleaseVersionId
        ? `patches/${encodeURIComponent(patchReleaseVersionId)}/`
        : ''
    }reviews`;
  private _allReviews = (): string => `${this.baseUrl}/reviews`;
  private _review = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): string =>
    `${this._reviews(projectId, patchReleaseVersionId)}/${encodeURIComponent(
      reviewId,
    )}`;

  getReviews = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    options?: ProjectReviewSeachOptions | undefined,
  ): Promise<PlainObject<Review>[]> =>
    this.get(
      this._reviews(projectId, patchReleaseVersionId),
      undefined,
      undefined,
      {
        ...options,
        since: options?.since?.toISOString(),
        until: options?.until?.toISOString(),
      },
    );
  getAllReviews = (
    options?: ReviewSeachOptions | undefined,
  ): Promise<PlainObject<Review>[]> =>
    this.get(this._allReviews(), undefined, undefined, {
      ...options,
      since: options?.since?.toISOString(),
      until: options?.until?.toISOString(),
    });
  getReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<ReviewApproval>> =>
    this.get(this._review(projectId, patchReleaseVersionId, reviewId));
  getReviewApprovals = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.get(
      `${this._review(projectId, patchReleaseVersionId, reviewId)}/approval`,
    );
  createReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    command: PlainObject<CreateReviewCommand>,
  ): Promise<PlainObject<Review>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_ACTIVITY_TRACE.CREATE_REVIEW),
      this._reviews(projectId, patchReleaseVersionId),
      command,
    );
  approveReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.post(
      `${this._review(projectId, patchReleaseVersionId, reviewId)}/approve`,
    );
  rejectReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.post(
      `${this._review(projectId, patchReleaseVersionId, reviewId)}/reject`,
    );
  closeReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.post(
      `${this._review(projectId, patchReleaseVersionId, reviewId)}/close`,
    );
  reopenReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.post(
      `${this._review(projectId, patchReleaseVersionId, reviewId)}/reopen`,
    );
  commitReview = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
    command: PlainObject<CommitReviewCommand>,
  ): Promise<PlainObject<Review>> =>
    this.post(
      `${this._review(projectId, patchReleaseVersionId, reviewId)}/commit`,
      command,
    );

  // ------------------------------------------- Comparison -------------------------------------------

  private _reviewComparison = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): string =>
    `${this._review(projectId, patchReleaseVersionId, reviewId)}/comparison`;

  getReviewComparision = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<Comparison>> =>
    this.get(
      `${this._reviewComparison(projectId, patchReleaseVersionId, reviewId)}`,
    );
  getReviewFromConfiguration = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.get(
      `${this._reviewComparison(
        projectId,
        patchReleaseVersionId,
        reviewId,
      )}/from/configuration`,
    );

  getReviewToConfiguration = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.get(
      `${this._reviewComparison(
        projectId,
        patchReleaseVersionId,
        reviewId,
      )}/to/configuration`,
    );
  getReviewFromEntities = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<Entity> =>
    this.get(
      `${this._reviewComparison(
        projectId,
        patchReleaseVersionId,
        reviewId,
      )}/from/entities`,
    );
  getReviewFromEntity = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
    entityPath: string,
  ): Promise<Entity> =>
    this.get(
      `${this._reviewComparison(
        projectId,
        patchReleaseVersionId,
        reviewId,
      )}/from/entities/${entityPath}`,
    );
  getReviewToEntities = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
  ): Promise<Entity[]> =>
    this.get(
      `${this._reviewComparison(
        projectId,
        patchReleaseVersionId,
        reviewId,
      )}/to/entities`,
    );
  getReviewToEntity = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
    reviewId: string,
    entityPath: string,
  ): Promise<Entity> =>
    this.get(
      `${this._reviewComparison(
        projectId,
        patchReleaseVersionId,
        reviewId,
      )}/to/entities/${entityPath}`,
    );

  // ------------------------------------------- Conflict Resolution -------------------------------------------

  private _conflictResolution = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string =>
    `${this._adaptiveWorkspace(projectId, workspace)}/conflictResolution`;

  getWorkspacesInConflictResolutionMode = (
    projectId: string,
    patchReleaseVersionId: string | undefined,
  ): Promise<PlainObject<Workspace>[]> =>
    this.get(this._conflictResolution(projectId, undefined));
  abortConflictResolution = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<void> =>
    this.delete(this._conflictResolution(projectId, workspace));
  discardConflictResolutionChanges = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<void> =>
    this.post(
      `${this._conflictResolution(projectId, workspace)}/discardChanges`,
    );
  acceptConflictResolution = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PlainObject<PerformEntitiesChangesCommand>,
  ): Promise<void> =>
    this.post(
      `${this._conflictResolution(projectId, workspace)}/accept`,
      command,
    );
  isConflictResolutionOutdated = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<boolean> =>
    this.get(`${this._conflictResolution(projectId, workspace)}/outdated`);
  getConflictResolutionRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Revision>> =>
    this.get(
      `${this._conflictResolution(
        projectId,
        workspace,
      )}/revisions/${revisionId}`,
    );
  getEntitiesByRevisionFromWorkspaceInConflictResolutionMode = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Entity>[]> =>
    this.get(
      `${this._conflictResolution(
        projectId,
        workspace,
      )}/revisions/${revisionId}/entities`,
    );
  getConfigurationOfWorkspaceInConflictResolutionMode = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.get(`${this._conflictResolution(projectId, workspace)}/configuration`);
}
