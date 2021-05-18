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

import type {
  ImportProjectReport,
  Project,
  ImportProjectCommand,
  CreateProjectCommand,
  UpdateProjectCommand,
  SdlcMode,
  ProjectType,
} from './models/project/Project';
import type { Workspace } from './models/workspace/Workspace';
import type { Revision, RevisionAlias } from './models/revision/Revision';
import type { Build, BuildStatus } from './models/build/Build';
import type { Entity, UpdateEntitiesCommand } from './models/entity/Entity';
import type { PerformEntitiesChangesCommand } from './models/entity/EntityChange';
import type {
  Review,
  ReviewState,
  CreateReviewCommand,
  CommitReviewCommand,
} from './models/review/Review';
import type { Version } from './models/version/Version';
import type { WorkspaceUpdateReport } from './models/workspace/WorkspaceUpdateReport';
import type { ProjectConfiguration } from './models/configuration/ProjectConfiguration';
import type { CreateVersionCommand } from './models/version/CreateVersionCommand';
import type { ProjectStructureVersion } from './models/configuration/ProjectStructureVersion';
import type { UpdateProjectConfigurationCommand } from './models/configuration/UpdateProjectConfigurationCommand';
import type { User } from './models/User';
import type { PlainObject } from '@finos/legend-studio-shared';
import type { TraceData } from '@finos/legend-studio-network';
import { AbstractServerClient } from '@finos/legend-studio-network';

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
  public currentUser?: User;
  private env: string;

  constructor(config: SDLCServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
      authenticationUrl: SDLCServerClient.authenticationUrl(config.serverUrl),
    });
    this.env = config.env;
  }

  public setCurrentUser = (value: User): void => {
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

  static authenticationUrl = (authenticationServerUrl: string): string =>
    `${authenticationServerUrl}/auth/authorize`;
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
  ): Promise<PlainObject<ImportProjectReport>> =>
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
  private _workspace = (projectId: string, workspaceId: string): string =>
    `${this._workspaces(projectId)}/${encodeURIComponent(workspaceId)}`;
  /**
   * This method makes it possible that we don't have to repeat the set of endpoints twice for:
   *    1. workspaceId === undefined (hence calling the project branch)
   *    2. and normal workspace branch
   */
  private _adaptiveWorkspace = (
    projectId: string,
    workspaceId: string | undefined,
  ): string =>
    workspaceId
      ? this._workspace(projectId, workspaceId)
      : this._project(projectId);

  getWorkspaces = (projectId: string): Promise<PlainObject<Workspace>[]> =>
    this.networkClient.get(this._workspaces(projectId));
  getWorkspace = (
    projectId: string,
    workspaceId: string,
  ): Promise<PlainObject<Workspace>> =>
    this.networkClient.get(this._workspace(projectId, workspaceId));
  isWorkspaceOutdated = (
    projectId: string,
    workspaceId: string,
  ): Promise<boolean> =>
    this.networkClient.get(
      `${this._workspace(projectId, workspaceId)}/outdated`,
    );
  checkIfWorkspaceIsInConflictResolutionMode = (
    projectId: string,
    workspaceId: string,
  ): Promise<boolean> =>
    this.networkClient.get(
      `${this._workspace(projectId, workspaceId)}/inConflictResolutionMode`,
    );
  createWorkspace = (
    projectId: string,
    workspaceId: string,
  ): Promise<PlainObject<Workspace>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.CREATE_WORKSPACE),
      this._workspace(projectId, workspaceId),
    );
  updateWorkspace = (
    projectId: string,
    workspaceId: string,
  ): Promise<PlainObject<WorkspaceUpdateReport>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_WORKSPACE),
      `${this._workspace(projectId, workspaceId)}/update`,
    );
  deleteWorkspace = (
    projectId: string,
    workspaceId: string,
  ): Promise<PlainObject<Workspace>> =>
    this.deleteWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.DELETE_WORKSPACE),
      this._workspace(projectId, workspaceId),
    );

  // ------------------------------------------- Revision -------------------------------------------

  private _revisions = (
    projectId: string,
    workspaceId: string | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/revisions`;
  private _revision = (
    projectId: string,
    workspaceId: string | undefined,
    revisionId: string | RevisionAlias,
  ): string =>
    `${this._adaptiveWorkspace(
      projectId,
      workspaceId,
    )}/revisions/${encodeURIComponent(revisionId)}`;

  getRevisions = (
    projectId: string,
    workspaceId: string | undefined,
  ): Promise<PlainObject<Revision>[]> =>
    this.networkClient.get(this._revisions(projectId, workspaceId));
  getRevision = (
    projectId: string,
    workspaceId: string | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Revision>> =>
    this.networkClient.get(this._revision(projectId, workspaceId, revisionId));

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
    workspaceId: string | undefined,
  ): string =>
    `${this._adaptiveWorkspace(projectId, workspaceId)}/configuration`;

  getConfiguration = (
    projectId: string,
    workspaceId: string | undefined,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.networkClient.get(this._configuration(projectId, workspaceId));
  getConfigurationByVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.networkClient.get(
      `${this._version(projectId, versionId)}/configuration`,
    );
  updateConfiguration = (
    projectId: string,
    workspaceId: string | undefined,
    command: PlainObject<UpdateProjectConfigurationCommand>,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_CONFIGURATION),
      this._configuration(projectId, workspaceId),
      command,
    );
  getLatestProjectStructureVersion = (): Promise<
    PlainObject<ProjectStructureVersion>
  > =>
    this.networkClient.get(
      `${this.networkClient.baseUrl}/configuration/latestProjectStructureVersion`,
    );

  // ------------------------------------------- Build -------------------------------------------

  private _builds = (
    projectId: string,
    workspaceId: string | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/builds`;

  getBuilds = (
    projectId: string,
    workspaceId: string | undefined,
    status: BuildStatus | undefined,
    revisionIds: string[] | undefined,
    limit: number | undefined,
  ): Promise<PlainObject<Build>[]> =>
    this.networkClient.get(
      this._builds(projectId, workspaceId),
      undefined,
      undefined,
      { status, revisionIds, limit },
    );
  getBuildsByRevision = (
    projectId: string,
    workspaceId: string | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Build>[]> =>
    this.networkClient.get(
      this._builds(projectId, workspaceId),
      undefined,
      undefined,
      { revisionId },
    );

  // ------------------------------------------- Entity -------------------------------------------

  private _entities = (
    projectId: string,
    workspaceId: string | undefined,
  ): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/entities`;

  getEntities = (
    projectId: string,
    workspaceId: string | undefined,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(this._entities(projectId, workspaceId));
  getEntitiesByRevision = (
    projectId: string,
    workspaceId: string | undefined,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(
      `${this._revision(projectId, workspaceId, revisionId)}/entities`,
    );
  getEntitiesByVersion = (
    projectId: string,
    versionId: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(`${this._version(projectId, versionId)}/entities`);
  updateEntities = (
    projectId: string,
    workspaceId: string | undefined,
    command: PlainObject<UpdateEntitiesCommand>,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.UPDATE_ENTITIES),
      this._entities(projectId, workspaceId),
      command,
    );
  performEntityChanges = (
    projectId: string,
    workspaceId: string | undefined,
    command: PerformEntitiesChangesCommand,
  ): Promise<PlainObject<Revision>> =>
    this.postWithTracing(
      this.getTraceData(SDLC_TRACER_SPAN.PERFORM_ENTITY_CHANGES),
      `${this._adaptiveWorkspace(projectId, workspaceId)}/entityChanges`,
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
    workspaceId: string | undefined,
  ): string =>
    `${this._adaptiveWorkspace(projectId, workspaceId)}/conflictResolution`;

  getWorkspacesInConflictResolutionMode = (
    projectId: string,
  ): Promise<PlainObject<Workspace>[]> =>
    this.networkClient.get(this._conflictResolution(projectId, undefined));
  abortConflictResolution = (
    projectId: string,
    workspaceId: string,
  ): Promise<void> =>
    this.networkClient.delete(this._conflictResolution(projectId, workspaceId));
  discardConflictResolutionChanges = (
    projectId: string,
    workspaceId: string,
  ): Promise<void> =>
    this.networkClient.post(
      `${this._conflictResolution(projectId, workspaceId)}/discardChanges`,
    );
  acceptConflictResolution = (
    projectId: string,
    workspaceId: string,
    command: PlainObject<PerformEntitiesChangesCommand>,
  ): Promise<void> =>
    this.networkClient.post(
      `${this._conflictResolution(projectId, workspaceId)}/accept`,
      command,
    );
  isConflictResolutionOutdated = (
    projectId: string,
    workspaceId: string,
  ): Promise<boolean> =>
    this.networkClient.get(
      `${this._conflictResolution(projectId, workspaceId)}/outdated`,
    );
  getConflictResolutionRevision = (
    projectId: string,
    workspaceId: string,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Revision>> =>
    this.networkClient.get(
      `${this._conflictResolution(
        projectId,
        workspaceId,
      )}/revisions/${revisionId}`,
    );
  getEntitiesByRevisionFromWorkspaceInConflictResolutionMode = (
    projectId: string,
    workspaceId: string,
    revisionId: string | RevisionAlias,
  ): Promise<PlainObject<Entity>[]> =>
    this.networkClient.get(
      `${this._conflictResolution(
        projectId,
        workspaceId,
      )}/revisions/${revisionId}/entities`,
    );
  getConfigurationOfWorkspaceInConflictResolutionMode = (
    projectId: string,
    workspaceId: string,
  ): Promise<PlainObject<ProjectConfiguration>> =>
    this.networkClient.get(
      `${this._conflictResolution(projectId, workspaceId)}/configuration`,
    );
}
