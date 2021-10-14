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

import type { Project, SdlcMode, ProjectType } from './models/project/Project';
import type { ImportReport } from './models/project/ImportReport';
import type { Workspace } from './models/workspace/Workspace';
import { WorkspaceType } from './models/workspace/Workspace';
import type { Revision, RevisionAlias } from './models/revision/Revision';
import type { Workflow, WorkflowStatus } from './models/workflow/Workflow';
import type { Review, ReviewState } from './models/review/Review';
import type { Version } from './models/version/Version';
import type { WorkspaceUpdateReport } from './models/workspace/WorkspaceUpdateReport';
import type { ProjectConfiguration } from './models/configuration/ProjectConfiguration';
import type { CreateVersionCommand } from './models/version/VersionCommands';
import type { ProjectStructureVersion } from './models/configuration/ProjectStructureVersion';
import type { User } from './models/User';
import type { PlainObject, TraceData } from '@finos/legend-shared';
import { AbstractServerClient } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import type {
  CreateProjectCommand,
  ImportProjectCommand,
  UpdateProjectCommand,
} from './models/project/ProjectCommands';
import type { UpdateProjectConfigurationCommand } from './models/configuration/ProjectConfigurationCommands';
import type {
  PerformEntitiesChangesCommand,
  UpdateEntitiesCommand,
} from './models/entity/EntityCommands';
import type {
  CommitReviewCommand,
  CreateReviewCommand,
} from './models/review/ReviewCommands';

enum SDLC_TRACER_SPAN {
  IMPORT_PROJECT = 'import project',
  CREATE_PROJECT = 'create project',
  UPDATE_PROJECT = 'update project',
  CREATE_WORKSPACE = 'create workspace',
  UPDATE_WORKSPACE = 'update workspace',
  DELETE_WORKSPACE = 'delete workspace',
  CREATE_VERSION = 'create version',
  UPDATE_CONFIGURATION = 'update configuration',
  PERFORM_ENTITY_CHANGES = 'perform entity changes',
  UPDATE_ENTITIES = 'update entities',
  CREATE_REVIEW = 'create review',
  COMMIT_REVIEW = 'update entities',
}

export interface SDLCServerClientConfig {
  env: string;
  serverUrl: string;
}

export class SDLCServerClient extends AbstractServerClient {
  currentUser?: User;
  private env: string;

  constructor(config: SDLCServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
    });
    this.env = config.env;
  }

  setCurrentUser = (value: User): void => {
    this.currentUser = value;
  };

  private getTraceData = (
    spanName: SDLC_TRACER_SPAN,
    tracingTags?: Record<PropertyKey, unknown>,
  ): TraceData => ({
    spanName,
    tags: {
      env: this.env,
      userId: this.currentUser?.userId ?? '(unknown)',
      ...tracingTags,
    },
  });

  // ------------------------------------------- Authentication -------------------------------------------

  static authorizeCallbackUrl = (
    authenticationServerUrl: string,
    callbackURI: string,
  ): string =>
    `${authenticationServerUrl}/auth/authorize?redirect_uri=${callbackURI}`;

  // ------------------------------------------- User -------------------------------------------

  getCurrentUser = (): Promise<PlainObject<User>> =>
    this.networkClient.get(`${this.networkClient.baseUrl}/currentUser`);

  // ------------------------------------------- Authorization -------------------------------------------

  private _auth = (): string => `${this.networkClient.baseUrl}/auth`;
  isAuthorized = (mode: SdlcMode): Promise<boolean> =>
    this.networkClient.get(`${this._auth()}/authorized?mode=${mode}`);
  hasAcceptedTermsOfService = (): Promise<string[]> =>
    this.networkClient.get(`${this._auth()}/termsOfServiceAcceptance`);

  // ------------------------------------------- Project -------------------------------------------

  private _projects = (): string => `${this.networkClient.baseUrl}/projects`;
  private _project = (projectId: string): string =>
    `${this._projects()}/${encodeURIComponent(projectId)}`;

  getProject = (projectId: string): Promise<PlainObject<Project>> =>
    this.networkClient.get(this._project(projectId));
  getProjects = (
    type: ProjectType | undefined,
    user: boolean | undefined,
    search: string | undefined,
    tag: string[] | undefined,
  ): Promise<PlainObject<Project>[]> =>
    this.networkClient.get(this._projects(), undefined, undefined, {
      type,
      user,
      search,
      tag,
    });
  createProject = (
    command: PlainObject<CreateProjectCommand>,
  ): Promise<PlainObject<Project>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.CREATE_PROJECT),
      this._projects(),
      command,
    );
  importProject = (
    command: PlainObject<ImportProjectCommand>,
  ): Promise<PlainObject<ImportReport>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.IMPORT_PROJECT),
      `${this._projects()}/import`,
      command,
    );
  updateProject = (
    projectId: string,
    command: PlainObject<UpdateProjectCommand>,
  ): Promise<void> =>
    this.putWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_PROJECT),
      this._project(projectId),
      command,
    );

  // ------------------------------------------- Workspace -------------------------------------------

  private _workspaces = (projectId: string): string =>
    `${this._project(projectId)}/workspaces`;
  private _groupWorkspaces = (projectId: string): string =>
    `${this._project(projectId)}/groupWorkspaces`;
  private __workspace = (
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): string =>
    workspaceType === WorkspaceType.GROUP
      ? `${this._groupWorkspaces(projectId)}/${encodeURIComponent(workspaceId)}`
      : `${this._workspaces(projectId)}/${encodeURIComponent(workspaceId)}`;
  private _workspace = (projectId: string, workspace: Workspace): string =>
    this.__workspace(projectId, workspace.workspaceId, workspace.workspaceType);
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

  getWorkspaces = (projectId: string): Promise<PlainObject<Workspace>[]> =>
    Promise.all([
      this.networkClient.get(this._workspaces(projectId)),
      this.networkClient.get(this._groupWorkspaces(projectId)),
    ]).then((workspaces) => workspaces.flat()) as Promise<
      PlainObject<Workspace>[]
    >;
  getWorkspace = (
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): Promise<PlainObject<Workspace>> =>
    this.networkClient.get(
      this.__workspace(projectId, workspaceId, workspaceType),
    );
  isWorkspaceOutdated = (
    projectId: string,
    workspace: Workspace,
  ): Promise<boolean> =>
    this.networkClient.get(`${this._workspace(projectId, workspace)}/outdated`);
  checkIfWorkspaceIsInConflictResolutionMode = (
    projectId: string,
    workspace: Workspace,
  ): Promise<boolean> =>
    this.networkClient.get(
      `${this._workspace(projectId, workspace)}/inConflictResolutionMode`,
    );
  createWorkspace = (
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): Promise<PlainObject<Workspace>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.CREATE_WORKSPACE),
      this.__workspace(projectId, workspaceId, workspaceType),
    );
  updateWorkspace = (
    projectId: string,
    workspace: Workspace,
  ): Promise<PlainObject<WorkspaceUpdateReport>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_WORKSPACE),
      `${this._workspace(projectId, workspace)}/update`,
    );
  deleteWorkspace = (
    projectId: string,
    workspace: Workspace,
  ): Promise<PlainObject<Workspace>> =>
    this.deleteWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.DELETE_WORKSPACE),
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
  ): Promise<PlainObject<Revision>[]> =>
    this.networkClient.get(this._revisions(projectId, workspace));
  getRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Revision>> =>
    this.networkClient.get(this._revision(projectId, workspace, revisionId));

  // ------------------------------------------- Version -------------------------------------------

  private _versions = (projectId: string): string =>
    `${this._project(projectId)}/versions`;
  private _version = (projectId: string, versionId: string): string =>
    `${this._versions(projectId)}/${encodeURIComponent(versionId)}`;

  getVersions = (projectId: string): Promise<PlainObject<Version>[]> =>
    this.networkClient.get(this._versions(projectId));
  getVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<Version>> =>
    this.networkClient.get(this._version(projectId, versionId));
  createVersion = (
    projectId: string,
    command: PlainObject<CreateVersionCommand>,
  ): Promise<PlainObject<Version>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.CREATE_VERSION),
      this._versions(projectId),
      command,
    );
  getLatestVersion = (
    projectId: string,
  ): Promise<PlainObject<Version> | undefined> =>
    this.networkClient.get(`${this._versions(projectId)}/latest`);

  // ------------------------------------------- Configuration -------------------------------------------

  private _configuration = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspace)}/configuration`;

  getConfiguration = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.networkClient.get(this._configuration(projectId, workspace));
  getConfigurationByVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.networkClient.get(
      `${this._version(projectId, versionId)}/configuration`,
    );
  updateConfiguration = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PlainObject<UpdateProjectConfigurationCommand>,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_CONFIGURATION),
      this._configuration(projectId, workspace),
      command,
    );
  getLatestProjectStructureVersion = (): Promise<
    PlainObject<ProjectStructureVersion>
  > =>
    this.networkClient.get(
      `${this.networkClient.baseUrl}/configuration/latestProjectStructureVersion`,
    );

  // ------------------------------------------- Workflow -------------------------------------------

  private _workflows = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspace)}/workflows`;

  getWorkflows = (
    projectId: string,
    workspace: Workspace | undefined,
    status: WorkflowStatus | undefined,
    revisionIds: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<Workflow>[]> =>
    this.networkClient.get(
      this._workflows(projectId, workspace),
      undefined,
      undefined,
      { status, revisionIds, limit },
    );
  getWorkflowsByRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Workflow>[]> =>
    this.networkClient.get(
      this._workflows(projectId, workspace),
      undefined,
      undefined,
      { revisionId },
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
    this.networkClient.get(this._entities(projectId, workspace));
  getEntitiesByRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(
      `${this._revision(projectId, workspace, revisionId)}/entities`,
    );
  getEntitiesByVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(`${this._version(projectId, versionId)}/entities`);
  updateEntities = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PlainObject<UpdateEntitiesCommand>,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_ENTITIES),
      this._entities(projectId, workspace),
      command,
    );
  performEntityChanges = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PerformEntitiesChangesCommand,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.PERFORM_ENTITY_CHANGES),
      `${this._adaptiveWorkspace(projectId, workspace)}/entityChanges`,
      command,
    );

  // ------------------------------------------- Review -------------------------------------------

  private _reviews = (projectId: string): string =>
    `${this._project(projectId)}/reviews`;
  private _review = (projectId: string, reviewId: string): string =>
    `${this._reviews(projectId)}/${encodeURIComponent(reviewId)}`;

  getReviews = (
    projectId: string,
    state: ReviewState | undefined,
    revisionIds: string[] | undefined,
    since: Date | undefined,
    until: Date | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<Review>[]> =>
    this.networkClient.get(this._reviews(projectId), undefined, undefined, {
      state,
      revisionIds,
      since: since?.toISOString(),
      until: until?.toISOString(),
      limit,
    });
  getReview = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.networkClient.get(this._review(projectId, reviewId));
  createReview = (
    projectId: string,
    command: PlainObject<CreateReviewCommand>,
  ): Promise<PlainObject<Review>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.CREATE_REVIEW),
      this._reviews(projectId),
      command,
    );
  approveReview = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.networkClient.post(`${this._review(projectId, reviewId)}/approve`);
  rejectReview = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.networkClient.post(`${this._review(projectId, reviewId)}/reject`);
  closeReview = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.networkClient.post(`${this._review(projectId, reviewId)}/close`);
  reopenReview = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Review>> =>
    this.networkClient.post(`${this._review(projectId, reviewId)}/reopen`);
  commitReview = (
    projectId: string,
    reviewId: string,
    command: PlainObject<CommitReviewCommand>,
  ): Promise<PlainObject<Review>> =>
    this.networkClient.post(
      `${this._review(projectId, reviewId)}/commit`,
      command,
    );

  // ------------------------------------------- Comparison -------------------------------------------

  private _reviewComparison = (projectId: string, reviewId: string): string =>
    `${this._review(projectId, reviewId)}/comparison`;

  getReviewFromEntities = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(
      `${this._reviewComparison(projectId, reviewId)}/from/entities`,
    );
  getReviewToEntities = (
    projectId: string,
    reviewId: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(
      `${this._reviewComparison(projectId, reviewId)}/to/entities`,
    );

  // ------------------------------------------- Conflict Resolution -------------------------------------------

  private _conflictResolution = (
    projectId: string,
    workspace: Workspace | undefined,
  ): string =>
    `${this._adaptiveWorkspace(projectId, workspace)}/conflictResolution`;

  getWorkspacesInConflictResolutionMode = (
    projectId: string,
  ): Promise<PlainObject<Workspace>[]> =>
    this.networkClient.get(this._conflictResolution(projectId, undefined));
  abortConflictResolution = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<void> =>
    this.networkClient.delete(this._conflictResolution(projectId, workspace));
  discardConflictResolutionChanges = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<void> =>
    this.networkClient.post(
      `${this._conflictResolution(projectId, workspace)}/discardChanges`,
    );
  acceptConflictResolution = (
    projectId: string,
    workspace: Workspace | undefined,
    command: PlainObject<PerformEntitiesChangesCommand>,
  ): Promise<void> =>
    this.networkClient.post(
      `${this._conflictResolution(projectId, workspace)}/accept`,
      command,
    );
  isConflictResolutionOutdated = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<boolean> =>
    this.networkClient.get(
      `${this._conflictResolution(projectId, workspace)}/outdated`,
    );
  getConflictResolutionRevision = (
    projectId: string,
    workspace: Workspace | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Revision>> =>
    this.networkClient.get(
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
    this.networkClient.get(
      `${this._conflictResolution(
        projectId,
        workspace,
      )}/revisions/${revisionId}/entities`,
    );
  getConfigurationOfWorkspaceInConflictResolutionMode = (
    projectId: string,
    workspace: Workspace | undefined,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.networkClient.get(
      `${this._conflictResolution(projectId, workspace)}/configuration`,
    );
}
