/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { client } from 'API/NetworkClient';
import { ImportProjectReport, Project, ProjectType, ImportProjectCommand, CreateProjectCommand, UpdateProjectCommand } from 'SDLC/project/Project';
import { Workspace } from 'SDLC/workspace/Workspace';
import { Revision, RevisionAlias } from 'SDLC/revision/Revision';
import { Build, BuildStatus } from 'SDLC/build/Build';
import { Entity, UpdateEntitiesCommand } from 'SDLC/entity/Entity';
import { guaranteeNonNullable, IllegalStateError } from 'Utilities/GeneralUtil';
import { PerformEntitiesChangesCommand } from 'SDLC/entity/EntityChange';
import { Review, ReviewState, CreateReviewCommand, CommitReviewCommand } from 'SDLC/review/Review';
import { Version } from 'SDLC/version/Version';
import { WorkspaceUpdateReport } from 'SDLC/workspace/WorkspaceUpdateReport';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { CreateVersionCommand } from 'SDLC/version/CreateVersionCommand';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { TRACER_SPAN } from 'API/TracerClient';
import { UpdateProjectConfigurationCommand } from 'SDLC/configuration/UpdateProjectConfigurationCommand';

class SdlcClient {
  static instance: SdlcClient;
  private initialized = false;
  private baseUrl?: string;

  initialize(url: string): void {
    if (this.initialized) { throw new IllegalStateError('SDLC client initialization should only happen once') }
    this.baseUrl = url;
    this.initialized = true;
  }

  authenticationUrl = (): string => `${this._base()}/auth/authorize`
  authorizeCallbackUrl = (callbackURI: string): string => `${this._base()}/auth/authorize?redirect_uri=${callbackURI}`
  // NOTE: methods prefixed with _ is for building the URL path
  private _base = (): string => guaranteeNonNullable(this.baseUrl, 'SDLC server URL is not configured')
  /**
   * This method makes it possible that we don't have to repeat the set of endpoints twice for:
   *    1. workspaceId === undefined (hence calling the project branch)
   *    2. and normal workspace branch
   */
  private _adaptiveWorkspace = (projectId: string, workspaceId: string | undefined): string => workspaceId ? this._workspace(projectId, workspaceId) : this._project(projectId)

  // Authorization
  private _auth = (): string => `${this._base()}/auth`
  isAuthorized = (): Promise<boolean> => client.get(`${this._auth()}/authorized`)
  hasAcceptedTermsOfService = (): Promise<string[]> => client.get(`${this._auth()}/termsOfServiceAcceptance`)

  // Projects
  private _projects = (): string => `${this._base()}/projects`
  private _project = (projectId: string): string => `${this._projects()}/${projectId}`
  getProject = (projectId: string): Promise<Project> => client.get(this._project(projectId))
  getProjects = (type: ProjectType | undefined, user: boolean | undefined, search: string | undefined, tag: string[] | undefined): Promise<Project[]> => client.get(this._projects(), undefined, undefined, { type, user, search, tag })
  createProject = (command: CreateProjectCommand): Promise<Project> => client.postWithTracing(TRACER_SPAN.CREATE_PROJECT, this._projects(), command)
  importProject = (command: ImportProjectCommand): Promise<ImportProjectReport> => client.postWithTracing(TRACER_SPAN.IMPORT_PROJECT, `${this._projects()}/import`, command)
  updateProject = (projectId: string, command: UpdateProjectCommand): Promise<Project> => client.putWithTracing(TRACER_SPAN.UPDATE_PROJECT, this._project(projectId), command)
  queryProductionProjects = (query: string): Promise<Project[]> => client.get(this._projects(), undefined, undefined, { search: query, user: false, type: ProjectType.PRODUCTION })

  // Workspaces
  private _workspaces = (projectId: string): string => `${this._project(projectId)}/workspaces`
  private _workspace = (projectId: string, workspaceId: string): string => `${this._workspaces(projectId)}/${workspaceId}`
  getWorkspaces = (projectId: string): Promise<Workspace[]> => client.get(this._workspaces(projectId))
  getWorkspace = (projectId: string, workspaceId: string): Promise<Workspace> => client.get(this._workspace(projectId, workspaceId))
  isWorkspaceOutdated = (projectId: string, workspaceId: string): Promise<boolean> => client.get(`${this._workspace(projectId, workspaceId)}/outdated`)
  checkIfWorkspaceIsInConflictResolutionMode = (projectId: string, workspaceId: string): Promise<boolean> => client.get(`${this._workspace(projectId, workspaceId)}/inConflictResolutionMode`)
  createWorkspace = (projectId: string, workspaceId: string): Promise<Workspace> => client.postWithTracing(TRACER_SPAN.CREATE_WORKSPACE, this._workspace(projectId, workspaceId))
  updateWorkspace = (projectId: string, workspaceId: string): Promise<WorkspaceUpdateReport> => client.postWithTracing(TRACER_SPAN.UPDATE_WORKSPACE, `${this._workspace(projectId, workspaceId)}/update`)
  deleteWorkspace = (projectId: string, workspaceId: string): Promise<Workspace> => client.deleteWithTracing(TRACER_SPAN.DELETE_WORKSPACE, this._workspace(projectId, workspaceId))

  // Revisions
  private _revisions = (projectId: string, workspaceId: string | undefined): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/revisions`
  private _revision = (projectId: string, workspaceId: string | undefined, revisionId: string | RevisionAlias): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/revisions/${revisionId}`
  getRevisions = (projectId: string, workspaceId: string | undefined): Promise<Revision[]> => client.get(this._revisions(projectId, workspaceId))
  getRevision = (projectId: string, workspaceId: string | undefined, revisionId: string | RevisionAlias): Promise<Revision> => client.get(this._revision(projectId, workspaceId, revisionId))

  // Versions
  private _versions = (projectId: string): string => `${this._project(projectId)}/versions`
  private _version = (projectId: string, versionId: string): string => `${this._versions(projectId)}/${versionId}`
  getVersions = (projectId: string): Promise<Version[]> => client.get(this._versions(projectId))
  getVersion = (projectId: string, versionId: string): Promise<Version> => client.get(this._version(projectId, versionId))
  createVersion = (projectId: string, command: CreateVersionCommand): Promise<Version> => client.postWithTracing(TRACER_SPAN.CREATE_VERSION, this._versions(projectId), command)
  getLatestVersion = (projectId: string): Promise<Version | undefined> => client.get(`${this._versions(projectId)}/latest`)

  // Configurations
  private _configuration = (projectId: string, workspaceId: string | undefined): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/configuration`
  getConfiguration = (projectId: string, workspaceId: string | undefined): Promise<ProjectConfiguration> => client.get(this._configuration(projectId, workspaceId))
  getConfigurationByVersion = (projectId: string, versionId: string): Promise<ProjectConfiguration> => client.get(`${this._version(projectId, versionId)}/configuration`)
  updateConfiguration = (projectId: string, workspaceId: string | undefined, command: UpdateProjectConfigurationCommand): Promise<ProjectConfiguration> =>
    client.postWithTracing(TRACER_SPAN.UPDATE_CONFIGURATION, this._configuration(projectId, workspaceId), command)
  getLatestProjectStructureVersion = (): Promise<ProjectStructureVersion> => client.get(`${this._base()}/configuration/latestProjectStructureVersion`)

  // Builds
  private _builds = (projectId: string, workspaceId: string | undefined): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/builds`
  getBuilds = (projectId: string, workspaceId: string | undefined, status: BuildStatus | undefined, revisionIds: string[] | undefined, limit: number | undefined): Promise<Build[]> =>
    client.get(this._builds(projectId, workspaceId), undefined, undefined, { status, revisionIds, limit })
  getBuildsByRevision = (projectId: string, workspaceId: string | undefined, revisionId: string | RevisionAlias): Promise<Build[]> =>
    client.get(this._builds(projectId, workspaceId), undefined, undefined, { revisionId })

  // Reviews
  private _reviews = (projectId: string): string => `${this._project(projectId)}/reviews`
  private _review = (projectId: string, reviewId: string): string => `${this._reviews(projectId)}/${reviewId}`
  getReviews = (projectId: string, state: ReviewState | undefined, revisionIds: string[] | undefined, since: Date | undefined, until: Date | undefined, limit: number | undefined): Promise<Review[]> =>
    client.get(this._reviews(projectId), undefined, undefined, { state, revisionIds, since: since?.toISOString(), until: until?.toISOString(), limit })
  getReview = (projectId: string, reviewId: string): Promise<Review> => client.get(this._review(projectId, reviewId))
  createReview = (projectId: string, command: CreateReviewCommand): Promise<Review> => client.postWithTracing(TRACER_SPAN.CREATE_REVIEW, this._reviews(projectId), command)
  approveReview = (projectId: string, reviewId: string): Promise<Review> => client.post(`${this._review(projectId, reviewId)}/approve`)
  rejectReview = (projectId: string, reviewId: string): Promise<Review> => client.post(`${this._review(projectId, reviewId)}/reject`)
  closeReview = (projectId: string, reviewId: string): Promise<Review> => client.post(`${this._review(projectId, reviewId)}/close`)
  reopenReview = (projectId: string, reviewId: string): Promise<Review> => client.post(`${this._review(projectId, reviewId)}/reopen`)
  commitReview = (projectId: string, reviewId: string, command: CommitReviewCommand): Promise<Review> => client.post(`${this._review(projectId, reviewId)}/commit`, command)

  // Comparison
  private _reviewComparison = (projectId: string, reviewId: string): string => `${this._review(projectId, reviewId)}/comparison`
  getReviewFromEntities = (projectId: string, reviewId: string): Promise<Entity[]> => client.get(`${this._reviewComparison(projectId, reviewId)}/from/entities`)
  getReviewToEntities = (projectId: string, reviewId: string): Promise<Entity[]> => client.get(`${this._reviewComparison(projectId, reviewId)}/to/entities`)

  // Entities
  private _entities = (projectId: string, workspaceId: string | undefined): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/entities`
  getEntities = (projectId: string, workspaceId: string | undefined): Promise<Entity[]> => client.get(this._entities(projectId, workspaceId))
  getEntitiesByRevision = (projectId: string, workspaceId: string | undefined, revisionId: string | RevisionAlias): Promise<Entity[]> =>
    client.get(`${this._revision(projectId, workspaceId, revisionId)}/entities`)
  getEntitiesByVersion = (projectId: string, versionId: string): Promise<Entity[]> => client.get(`${this._version(projectId, versionId)}/entities`)
  updateEntities = (projectId: string, workspaceId: string | undefined, command: UpdateEntitiesCommand): Promise<Revision> =>
    client.postWithTracing(TRACER_SPAN.UPDATE_ENTITIES, this._entities(projectId, workspaceId), command)
  performEntityChanges = (projectId: string, workspaceId: string | undefined, command: PerformEntitiesChangesCommand): Promise<Revision> =>
    client.postWithTracing(TRACER_SPAN.PERFORM_ENTITY_CHANGES, `${this._adaptiveWorkspace(projectId, workspaceId)}/entityChanges`, command)

  // Conflict Resolution
  private _conflictResolution = (projectId: string, workspaceId: string | undefined): string => `${this._adaptiveWorkspace(projectId, workspaceId)}/conflictResolution`
  getWorkspacesInConflictResolutionMode = (projectId: string): Promise<Workspace[]> => client.get(this._conflictResolution(projectId, undefined))
  abortConflictResolution = (projectId: string, workspaceId: string): Promise<void> => client.delete(this._conflictResolution(projectId, workspaceId))
  discardConflictResolutionChanges = (projectId: string, workspaceId: string): Promise<void> => client.post(`${this._conflictResolution(projectId, workspaceId)}/discardChanges`)
  acceptConflictResolution = (projectId: string, workspaceId: string, command: PerformEntitiesChangesCommand): Promise<void> => client.post(`${this._conflictResolution(projectId, workspaceId)}/accept`, command)
  isConflictResolutionOutdated = (projectId: string, workspaceId: string): Promise<boolean> => client.get(`${this._conflictResolution(projectId, workspaceId)}/outdated`)
  getConflictResolutionEntities = (projectId: string, workspaceId: string): Promise<Entity[]> => client.get(`${this._conflictResolution(projectId, workspaceId)}/entities`)
  getConflictResolutionRevision = (projectId: string, workspaceId: string, revisionId: string | RevisionAlias): Promise<Revision> =>
    client.get(`${this._conflictResolution(projectId, workspaceId)}/revisions/${revisionId}`)
  getEntitiesByRevisionFromWorkspaceInConflictResolutionMode = (projectId: string, workspaceId: string, revisionId: string | RevisionAlias): Promise<Entity[]> =>
    client.get(`${this._conflictResolution(projectId, workspaceId)}/revisions/${revisionId}/entities`)
  getConfigurationOfWorkspaceInConflictResolutionMode = (projectId: string, workspaceId: string): Promise<ProjectConfiguration> =>
    client.get(`${this._conflictResolution(projectId, workspaceId)}/configuration`)
}

SdlcClient.instance = new SdlcClient();
export const sdlcClient = SdlcClient.instance;
