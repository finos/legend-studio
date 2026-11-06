/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
  override,
} from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  exactSearch,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  type ProjectDependency,
  type SDLCServerClient,
  EntityChangeType,
  Project,
  ProjectConfiguration,
  SANDBOX_SDLC_TAG,
  UpdateProjectConfigurationCommand,
  Workspace,
  isProjectSandbox,
} from '@finos/legend-server-sdlc';
import { DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH } from '@finos/legend-application';
import { WorkspaceCopyState } from './WorkspaceCopyState.js';
import {
  type WorkspaceCopyDependencyDiff,
  type WorkspaceElementChange,
  getOtherProjectWorkspaceCopyChanges,
  getWorkspaceCopyDependencyDiff,
} from './WorkspaceCopyUtils.js';
import {
  PROJECT_SEARCH_FETCH_LIMIT,
  cleanProjectIdInput,
} from './WorkspaceSetupStore.js';

/**
 * The project to copy a workspace from, in the create workspace modal, when
 * it isn't the project the new workspace goes into: searching for it, then
 * listing its workspaces.
 *
 * NOTE: this search is the modal's own, apart from the home page's.
 */
export class OtherProjectCopySourceState {
  readonly sdlcServerClient: SDLCServerClient;
  /**
   * The project the new workspace goes into, which is left out of the search
   */
  readonly projectId: string;
  readonly searchProjectsState = ActionState.create();
  readonly loadWorkspacesState = ActionState.create();

  private searchCounter = 0;
  searchText = '';
  projects: Project[] = [];
  searchError?: string | undefined;

  project?: Project | undefined;
  /**
   * The workspaces of the project, on its HEAD
   */
  workspaces: Workspace[] = [];
  loadWorkspacesError?: string | undefined;

  constructor(sdlcServerClient: SDLCServerClient, projectId: string) {
    makeObservable(this, {
      searchText: observable,
      projects: observable.ref,
      searchError: observable,
      project: observable.ref,
      workspaces: observable.ref,
      loadWorkspacesError: observable,
      matchingProjects: computed,
      searchProjects: flow,
      changeProject: flow,
    });

    this.sdlcServerClient = sdlcServerClient;
    this.projectId = projectId;
  }

  /**
   * The projects found for the search text. A text too short to search for
   * narrows down the projects found before, as on the home page.
   */
  get matchingProjects(): Project[] {
    const searchText = this.searchText.toLowerCase();
    return searchText &&
      searchText.length <= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH
      ? this.projects.filter((project) =>
          project.name.toLowerCase().includes(searchText),
        )
      : this.projects;
  }

  *searchProjects(searchText: string): GeneratorFn<void> {
    const searchCounter = ++this.searchCounter;
    this.searchText = searchText;
    if (
      searchText &&
      searchText.length <= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH
    ) {
      return;
    }
    this.searchProjectsState.inProgress();
    this.searchError = undefined;
    try {
      const projectIdToMatch = cleanProjectIdInput(searchText);
      const [found, projectMatchedById] = (yield Promise.all([
        this.sdlcServerClient.getProjects(
          undefined,
          searchText ? exactSearch(searchText) : undefined,
          undefined,
          [SANDBOX_SDLC_TAG],
          PROJECT_SEARCH_FETCH_LIMIT,
        ),
        projectIdToMatch
          ? this.sdlcServerClient
              .getProject(projectIdToMatch)
              .catch(() => undefined)
          : Promise.resolve(undefined),
      ])) as [PlainObject<Project>[], PlainObject<Project> | undefined];
      if (searchCounter !== this.searchCounter) {
        return;
      }
      const projects = (
        projectMatchedById ? [projectMatchedById, ...found] : found
      ).map((project) => Project.serialization.fromJson(project));
      this.projects = projects.filter(
        (project, index) =>
          project.projectId !== this.projectId &&
          projects.findIndex((p) => p.projectId === project.projectId) ===
            index,
      );
      this.searchProjectsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      if (searchCounter !== this.searchCounter) {
        return;
      }
      this.searchError = error.message;
      this.searchProjectsState.fail();
    }
  }

  /**
   * Picks the project to copy a workspace from, and lists its workspaces.
   *
   * NOTE: as on the home page, a workspace in conflict resolution is left out
   */
  *changeProject(project: Project | undefined): GeneratorFn<void> {
    this.project = project;
    this.workspaces = [];
    this.loadWorkspacesError = undefined;
    if (!project) {
      this.loadWorkspacesState.reset();
      return;
    }
    this.loadWorkspacesState.inProgress();
    try {
      const [workspaces, workspacesInConflictResolution] = (yield Promise.all([
        this.sdlcServerClient.getWorkspaces(project.projectId),
        isProjectSandbox(project)
          ? Promise.resolve([])
          : this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
              project.projectId,
              undefined,
            ),
      ])) as [PlainObject<Workspace>[], PlainObject<Workspace>[]];
      if (this.project !== project) {
        return;
      }
      const workspaceIdsInConflictResolution = new Set(
        workspacesInConflictResolution.map(
          (workspace) => workspace.workspaceId,
        ),
      );
      this.workspaces = workspaces
        .map((workspace) => Workspace.serialization.fromJson(workspace))
        .filter(
          (workspace) =>
            !workspaceIdsInConflictResolution.has(workspace.workspaceId),
        );
      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      if (this.project !== project) {
        return;
      }
      this.loadWorkspacesError = error.message;
      this.loadWorkspacesState.fail();
    }
  }
}

/**
 * A new workspace that copies a workspace of another project: it starts from
 * the HEAD of its own project and gets all the elements of the source, as one
 * commit. An element with the same path is replaced, and nothing is deleted.
 *
 * Dependencies are project configuration, not elements, so they are not part
 * of the copy: the copy can add the dependencies of the source's project that
 * the new workspace's project doesn't have, as a second commit.
 *
 * NOTE: each step is done once for the workspace created: when adding the
 * dependencies fails, trying again only adds the dependencies.
 */
export class OtherProjectWorkspaceCopyState extends WorkspaceCopyState {
  readonly sourceProject: Project;
  readonly addDependenciesState = ActionState.create();

  /**
   * All the elements of the source, which the copy commits
   */
  sourceEntities: Entity[] = [];
  /**
   * How many elements of the source the project's HEAD already has as is
   */
  unchangedElementCount = 0;
  dependencyDiff: WorkspaceCopyDependencyDiff = { missing: [], mismatched: [] };
  addsMissingDependencies = true;

  hasCopiedElements = false;
  hasAddedDependencies = false;
  /**
   * Why the last try of adding the dependencies failed
   */
  dependenciesError?: string | undefined;

  constructor(
    sdlcServerClient: SDLCServerClient,
    projectId: string,
    sourceProject: Project,
    source: Workspace,
  ) {
    super(sdlcServerClient, projectId, source);

    makeObservable(this, {
      sourceEntities: observable.ref,
      unchangedElementCount: observable,
      dependencyDiff: observable.ref,
      addsMissingDependencies: observable,
      hasCopiedElements: observable,
      hasAddedDependencies: observable,
      dependenciesError: observable,
      dependenciesToAdd: computed,
      setAddsMissingDependencies: action,
      setCreatedWorkspace: override,
      load: override,
      copyTo: override,
    });

    this.sourceProject = sourceProject;
  }

  /**
   * The dependencies the copy adds to the new workspace
   */
  get dependenciesToAdd(): ProjectDependency[] {
    return this.addsMissingDependencies ? this.dependencyDiff.missing : [];
  }

  setAddsMissingDependencies(val: boolean): void {
    this.addsMissingDependencies = val;
  }

  override setCreatedWorkspace(workspace: Workspace | undefined): void {
    super.setCreatedWorkspace(workspace);
    if (!workspace) {
      // NOTE: the workspace whose copy failed is deleted, and one created
      // again has none of the copy yet
      this.hasCopiedElements = false;
      this.hasAddedDependencies = false;
      this.dependenciesError = undefined;
    }
  }

  protected override get elementsToCopy(): WorkspaceElementChange[] {
    // NOTE: commit all the elements, not only those that differed from HEAD
    // when the copy was previewed, as HEAD may have moved since: elements the
    // new workspace already has as is are left out of the commit
    return this.sourceEntities.map((entity) => ({
      type: EntityChangeType.CREATE,
      entityPath: entity.path,
      classifierPath: entity.classifierPath,
      baseContent: undefined,
      content: entity.content,
    }));
  }

  protected override buildCopyCommitMessage(entityChangeCount: number): string {
    return `copied the elements of workspace ${this.source.workspaceId} of project ${this.sourceProject.name} [potentially affected ${
      entityChangeCount === 1 ? '1 entity' : `${entityChangeCount} entities`
    }]`;
  }

  override *load(): GeneratorFn<void> {
    this.loadState.inProgress();
    this.loadError = undefined;
    try {
      const [entities, lineEntities, sourceConfiguration, configuration] =
        (yield Promise.all([
          this.sdlcServerClient.getEntities(
            this.sourceProject.projectId,
            this.source,
          ),
          this.sdlcServerClient.getEntities(this.projectId, undefined),
          this.sdlcServerClient.getConfiguration(
            this.sourceProject.projectId,
            this.source,
          ),
          this.sdlcServerClient.getConfiguration(this.projectId, undefined),
        ])) as [
          Entity[],
          Entity[],
          PlainObject<ProjectConfiguration>,
          PlainObject<ProjectConfiguration>,
        ];
      const changes = getOtherProjectWorkspaceCopyChanges(
        lineEntities,
        entities,
      );
      this.dependencyDiff = getWorkspaceCopyDependencyDiff(
        ProjectConfiguration.serialization.fromJson(sourceConfiguration),
        ProjectConfiguration.serialization.fromJson(configuration),
      );
      this.sourceEntities = entities;
      this.unchangedElementCount = entities.length - changes.length;
      this.changes = changes;
      this.loadState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadError = error.message;
      this.loadState.fail();
    }
  }

  /**
   * Commits all the elements of the source onto `workspace`, then adds the
   * dependencies chosen, each step once: trying again only does the steps
   * left. Throws when a step fails.
   */
  override *copyTo(workspace: Workspace): GeneratorFn<void> {
    this.dependenciesError = undefined;
    if (!this.hasCopiedElements) {
      yield flowResult(super.copyTo(workspace));
      this.hasCopiedElements = true;
    }
    const dependencies = this.dependenciesToAdd;
    if (this.hasAddedDependencies || !dependencies.length) {
      return;
    }
    this.addDependenciesState.inProgress();
    try {
      // NOTE: read what the new workspace depends on, not what the project
      // depended on when the copy was previewed: an earlier try may have
      // added the dependencies before failing to answer, and a project it now
      // depends on at another version is left as is
      const configuration = ProjectConfiguration.serialization.fromJson(
        (yield this.sdlcServerClient.getConfiguration(
          this.projectId,
          workspace,
        )) as PlainObject<ProjectConfiguration>,
      );
      const dependenciesToAdd = dependencies.filter(
        (dependency) =>
          !configuration.projectDependencies.some(
            (existing) => existing.projectId === dependency.projectId,
          ),
      );
      if (dependenciesToAdd.length) {
        const command = new UpdateProjectConfigurationCommand(
          configuration.groupId,
          configuration.artifactId,
          undefined,
          `added the project dependencies of workspace ${this.source.workspaceId} of project ${this.sourceProject.name}`,
        );
        command.projectDependenciesToAdd = dependenciesToAdd;
        command.projectDependenciesToRemove = [];
        yield this.sdlcServerClient.updateConfiguration(
          this.projectId,
          workspace,
          UpdateProjectConfigurationCommand.serialization.toJson(command),
        );
      }
      this.hasAddedDependencies = true;
      this.addDependenciesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.dependenciesError = error.message;
      this.addDependenciesState.fail();
      throw error;
    }
  }
}
