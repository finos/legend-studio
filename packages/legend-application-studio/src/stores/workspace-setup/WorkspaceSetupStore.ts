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

import { observable, action, flowResult, makeObservable, flow } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import {
  LegendStudioTelemetryHelper,
  SETUP_ACTION,
} from '../../__lib__/LegendStudioTelemetryHelper.js';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  ActionState,
  IllegalStateError,
  UnsupportedOperationError,
  guaranteeNonNullable,
  guaranteeType,
  exactSearch,
  returnUndefOnError,
} from '@finos/legend-shared';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { generateSetupRoute } from '../../__lib__/LegendStudioNavigation.js';
import {
  type SDLCServerClient,
  SANDBOX_SDLC_TAG,
  WorkspaceType,
  ImportReport,
  Project,
  Review,
  Workspace,
  Patch,
  isProjectSandbox,
} from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';
import {
  DEFAULT_TAB_SIZE,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import {
  fetchProjectConfigurationStatus,
  ProjectConfigurationStatus,
} from './ProjectConfigurationStatus.js';
import { GraphManagerState } from '@finos/legend-graph';
import {
  LegendStudioUserDataHelper,
  type RecentProjectEntry,
  type RecentWorkspaceEntry,
} from '../../__lib__/LegendStudioUserDataHelper.js';
import { WorkspaceCopyState } from './WorkspaceCopyState.js';
import {
  OtherProjectCopySourceState,
  OtherProjectWorkspaceCopyState,
} from './OtherProjectWorkspaceCopyState.js';

interface ImportProjectSuccessReport {
  projectId: string;
  projectName: string;
  reviewUrl: string;
}

export interface ProjectSearchResult {
  projects: Project[];
  projectMatchedById?: Project | undefined;
}

const PROD_PROJECT_ID_PREFIX = 'PROD';
export const cleanProjectIdInput = (searchText: string): string | undefined => {
  const parsed = returnUndefOnError(() =>
    parseProjectIdentifier(searchText.trim()),
  );
  if (parsed === undefined) {
    return undefined;
  }
  return `${parsed.prefix ?? PROD_PROJECT_ID_PREFIX}-${parsed.id}`;
};

export const PROJECT_SEARCH_FETCH_LIMIT = 30;

export class WorkspaceSetupStore {
  readonly applicationStore: LegendStudioApplicationStore;

  readonly sdlcServerClient: SDLCServerClient;
  readonly initState = ActionState.create();

  projectSearchResult: ProjectSearchResult = { projects: [] };
  private projectSearchSyncCounter = 0;
  private searchCache = new Map<string, ProjectSearchResult>();
  currentProject?: Project | undefined;
  currentProjectConfigurationStatus?: ProjectConfigurationStatus | undefined;
  loadProjectsState = ActionState.create();
  createOrImportProjectState = ActionState.create();
  importProjectSuccessReport?: ImportProjectSuccessReport | undefined;
  showCreateProjectModal = false;

  engineInitializeState = ActionState.create();
  enginePromise: Promise<void> | undefined;
  createSandboxProjectState = ActionState.create();
  sandboxProject: Project | boolean = false;
  hasSandboxAccess: boolean | undefined;
  sandboxModal = false;
  loadSandboxState = ActionState.create();

  patches: Patch[] = [];
  loadPatchesState = ActionState.create();

  workspaces: Workspace[] = [];
  currentWorkspace?: Workspace | undefined;
  loadWorkspacesState = ActionState.create();
  createWorkspaceState = ActionState.create();
  showCreateWorkspaceModal = false;
  workspaceCopyState?: WorkspaceCopyState | undefined;
  otherProjectCopySource?: OtherProjectCopySourceState | undefined;

  graphManagerState: GraphManagerState;

  // Cached recents to make re-opening a project/workspace instantaneous.
  // NOTE: patch-based workspaces are intentionally excluded from this cache.
  recentProjects: RecentProjectEntry[] = [];
  recentWorkspaces: RecentWorkspaceEntry[] = [];
  selectRecentProjectState = ActionState.create();

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
  ) {
    makeObservable(this, {
      projectSearchResult: observable,
      currentProject: observable,
      currentProjectConfigurationStatus: observable,
      importProjectSuccessReport: observable,
      showCreateProjectModal: observable,
      workspaces: observable,
      currentWorkspace: observable,
      loadSandboxState: observable,
      showCreateWorkspaceModal: observable,
      workspaceCopyState: observable,
      otherProjectCopySource: observable,
      sandboxProject: observable,
      createSandboxProjectState: observable,
      engineInitializeState: observable,
      enginePromise: observable,
      sandboxModal: observable,
      hasSandboxAccess: observable,
      recentProjects: observable,
      recentWorkspaces: observable,
      setShowCreateProjectModal: action,
      setShowCreateWorkspaceModal: action,
      setWorkspaceCopySource: action,
      setOtherProjectCopySource: action,
      setImportProjectSuccessReport: action,
      setSandboxModal: action,
      changeWorkspace: action,
      resetProject: action,
      resetWorkspace: action,
      removeRecentProject: action,
      removeRecentWorkspace: action,
      clearRecents: action,
      filterListOnInput: action,
      initialize: flow,
      loadProjects: flow,
      loadSandboxProject: flow,
      changeProject: flow,
      createProject: flow,
      importProject: flow,
      createSandboxProject: flow,
      createWorkspace: flow,
      retryWorkspaceCopy: flow,
      deleteCopiedWorkspace: flow,
      initializeEngine: flow,
      selectRecentProject: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.recentProjects =
      LegendStudioUserDataHelper.workspaceSetup_getRecentProjects(
        applicationStore.userDataService,
      );
    this.recentWorkspaces =
      LegendStudioUserDataHelper.workspaceSetup_getRecentWorkspaces(
        applicationStore.userDataService,
      );
    if (this.supportsCreatingSandboxProject) {
      flowResult(this.initializeEngine()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  }

  get supportsCreatingSandboxProject(): boolean {
    return this.applicationStore.config.options
      .TEMPORARY__enableCreationOfSandboxProjects;
  }

  setShowCreateProjectModal(val: boolean): void {
    this.showCreateProjectModal = val;
  }

  setShowCreateWorkspaceModal(val: boolean): void {
    this.showCreateWorkspaceModal = val;
    this.workspaceCopyState = undefined;
    this.otherProjectCopySource = undefined;
  }

  /**
   * Picks the workspace the new workspace copies, in the create workspace
   * modal, and reads what it changed; `undefined` starts from HEAD or a patch.
   * A workspace of another project, `sourceProject`, is copied whole.
   */
  setWorkspaceCopySource(
    workspace: Workspace | undefined,
    sourceProject?: Project | undefined,
  ): void {
    const projectId = guaranteeNonNullable(
      this.currentProject,
      `Can't copy a workspace: project is not specified`,
    ).projectId;
    this.workspaceCopyState = !workspace
      ? undefined
      : sourceProject && sourceProject.projectId !== projectId
        ? new OtherProjectWorkspaceCopyState(
            this.sdlcServerClient,
            projectId,
            sourceProject,
            workspace,
          )
        : new WorkspaceCopyState(this.sdlcServerClient, projectId, workspace);
    if (this.workspaceCopyState) {
      flowResult(this.workspaceCopyState.load()).catch(
        this.applicationStore.alertUnhandledError,
      );
    }
  }

  /**
   * Starts, or stops, looking for a workspace of another project to copy, in
   * the create workspace modal, with a project search of its own.
   */
  setOtherProjectCopySource(val: boolean): void {
    this.otherProjectCopySource = val
      ? new OtherProjectCopySourceState(
          this.sdlcServerClient,
          guaranteeNonNullable(
            this.currentProject,
            `Can't copy a workspace: project is not specified`,
          ).projectId,
        )
      : undefined;
    if (this.otherProjectCopySource) {
      flowResult(this.otherProjectCopySource.searchProjects('')).catch(
        this.applicationStore.alertUnhandledError,
      );
    }
  }

  setImportProjectSuccessReport(
    importProjectSuccessReport: ImportProjectSuccessReport | undefined,
  ): void {
    this.importProjectSuccessReport = importProjectSuccessReport;
  }

  resetProject(): void {
    this.currentProject = undefined;
    this.patches = [];
    this.workspaces = [];
    this.currentWorkspace = undefined;
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateSetupRoute(undefined, undefined, undefined, undefined),
    );
    this.currentProjectConfigurationStatus = undefined;
  }

  resetWorkspace(): void {
    this.currentWorkspace = undefined;
    if (this.currentProject) {
      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateSetupRoute(
          this.currentProject.projectId,
          undefined,
          undefined,
          undefined,
        ),
      );
    }
  }

  setSandboxModal(val: boolean): void {
    this.sandboxModal = val;
  }

  // --- Recents -------------------------------------------------------------
  // NOTE: writes to the recents cache happen from the editor (see
  // `EditorStore.initialize`) at the moment a workspace is actually opened.
  // This store only reads the cache (to seed dropdowns) and prunes entries
  // that are discovered to be stale.

  removeRecentProject(projectId: string): void {
    const updated =
      LegendStudioUserDataHelper.workspaceSetup_removeRecentProject(
        this.applicationStore.userDataService,
        projectId,
      );
    this.recentProjects = updated.projects;
    this.recentWorkspaces = updated.workspaces;
  }

  removeRecentWorkspace(entry: {
    projectId: string;
    workspaceId: string;
    workspaceType: WorkspaceType;
  }): void {
    this.recentWorkspaces =
      LegendStudioUserDataHelper.workspaceSetup_removeRecentWorkspace(
        this.applicationStore.userDataService,
        entry,
      );
  }

  clearRecents(): void {
    LegendStudioUserDataHelper.workspaceSetup_clearRecents(
      this.applicationStore.userDataService,
    );
    this.recentProjects = [];
    this.recentWorkspaces = [];
  }

  /**
   * Fetches a project by id (used when the user picks a cached "recent"
   * project that may not be in the current search results) and switches to
   * it. If the project no longer exists, the entry is pruned from recents.
   *
   * NOTE: we deliberately don't short-circuit using the cached recent entry
   * here. Going through `getProject` keeps the prune-on-404 path intact, and
   * the cached metadata is already used elsewhere to make the UI feel fast
   * (dropdown stubs in `WorkspaceSetup.tsx` and tile labels in
   * `RecentWorkspacesPanel.tsx`).
   */
  *selectRecentProject(projectId: string): GeneratorFn<void> {
    this.selectRecentProjectState.inProgress();
    try {
      const project = Project.serialization.fromJson(
        (yield this.sdlcServerClient.getProject(
          projectId,
        )) as PlainObject<Project>,
      );
      yield flowResult(this.changeProject(project));
      this.selectRecentProjectState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.removeRecentProject(projectId);
      this.applicationStore.notificationService.notifyWarning(
        `Recent project could not be opened and was removed from recents`,
      );
      this.selectRecentProjectState.fail();
    }
  }

  *createSandboxProject(): GeneratorFn<void> {
    if (!this.hasSandboxAccess) {
      this.setSandboxModal(true);
      return;
    }
    const startTime = Date.now();
    LegendStudioTelemetryHelper.logEvent_SetupActionLaunched(
      this.applicationStore.telemetryService,
      { action: SETUP_ACTION.CREATE_SANDBOX_PROJECT },
    );
    try {
      // create sandbox project and pilot workspace
      this.applicationStore.alertService.setBlockingAlert({
        message: 'Creating sandbox project...',
        showLoading: true,
      });
      const sandboxProject =
        (yield this.graphManagerState.graphManager.createSandboxProject()) as {
          projectId: string;
          webUrl: string | undefined;
          owner: string;
        };
      this.applicationStore.alertService.setBlockingAlert({
        message: `Sandbox project ${sandboxProject.projectId} created. Creating default workspace...`,
        showLoading: true,
      });
      // Invalidate the cached sandbox info so loadSandboxProject re-fetches
      // and persists the newly-created project id instead of reusing the
      // stale "no sandbox yet" cache entry.
      LegendStudioUserDataHelper.workspaceSetup_clearSandboxInfo(
        this.applicationStore.userDataService,
      );
      yield flowResult(this.loadSandboxProject());
      const sandbox = guaranteeType(
        this.sandboxProject,
        Project,
        'Error retrieving sandbox project',
      );
      const initialWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          sandbox.projectId,
          undefined,
          'myWorkspace',
          WorkspaceType.GROUP,
        )) as PlainObject<Workspace>,
      );
      yield flowResult(
        this.changeProject(sandbox, {
          workspaceId: initialWorkspace.workspaceId,
          workspaceType: WorkspaceType.GROUP,
        }),
      );
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.applicationStore.notificationService.notifySuccess(
        `Sandbox project with workspace created`,
      );
      LegendStudioTelemetryHelper.logEvent_SetupActionSucceeded(
        this.applicationStore.telemetryService,
        {
          action: SETUP_ACTION.CREATE_SANDBOX_PROJECT,
          projectId: sandbox.projectId,
          durationMs: Date.now() - startTime,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.ENGINE_MANAGER_FAILURE),
        error,
      );
      LegendStudioTelemetryHelper.logEvent_SetupActionFailure(
        this.applicationStore.telemetryService,
        {
          action: SETUP_ACTION.CREATE_SANDBOX_PROJECT,
          errorMessage: error.message,
        },
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
    }
  }

  *initialize(
    projectId: string | undefined,
    workspaceId: string | undefined,
    groupWorkspaceId: string | undefined,
  ): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();

    // TODO: when we genericize the way to initialize an application page
    this.applicationStore.assistantService.setIsHidden(false);

    try {
      if (projectId) {
        let project: Project;
        try {
          project = Project.serialization.fromJson(
            (yield this.sdlcServerClient.getProject(
              projectId,
            )) as PlainObject<Project>,
          );
        } catch {
          this.removeRecentProject(projectId);
          this.applicationStore.navigationService.navigator.updateCurrentLocation(
            generateSetupRoute(undefined, undefined),
          );
          this.initState.pass();
          return;
        }
        yield flowResult(
          this.changeProject(
            project,
            workspaceId
              ? { workspaceId: workspaceId, workspaceType: WorkspaceType.USER }
              : groupWorkspaceId
                ? {
                    workspaceId: groupWorkspaceId,
                    workspaceType: WorkspaceType.GROUP,
                  }
                : undefined,
          ),
        );
      }

      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.initState.fail();
    }
  }

  *initializeEngine(): GeneratorFn<void> {
    this.engineInitializeState.inProgress();
    try {
      const initPromise = this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            useCookieAuthOnly:
              this.applicationStore.config.engineUseCookieAuthOnly,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
          disableGraphConfiguration: true,
        },
      );
      this.enginePromise = initPromise;
      yield initPromise;
      this.enginePromise = undefined;
      this.engineInitializeState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.ENGINE_MANAGER_FAILURE),
        error,
      );
      this.engineInitializeState.complete();
    }
  }

  private findPrefixCache(searchText: string): ProjectSearchResult | undefined {
    let bestKey: string | undefined;
    let bestEntry: ProjectSearchResult | undefined;
    for (const [key, entry] of this.searchCache) {
      const isStrictPrefix =
        key.length < searchText.length && searchText.startsWith(key);
      if (!isStrictPrefix) {
        continue;
      }
      if (bestKey === undefined || key.length > bestKey.length) {
        bestKey = key;
        bestEntry = entry;
      }
    }
    if (!bestEntry) {
      return undefined;
    }

    const normalizedSearch = searchText.toLowerCase();
    const projectMatchesSearch = (project: Project): boolean =>
      project.name.toLowerCase().includes(normalizedSearch);
    return {
      projects: bestEntry.projects.filter(projectMatchesSearch),
      projectMatchedById:
        bestEntry.projectMatchedById &&
        projectMatchesSearch(bestEntry.projectMatchedById)
          ? bestEntry.projectMatchedById
          : undefined,
    };
  }

  filterListOnInput(searchText: string): void {
    if (searchText.length === 0) {
      return;
    }
    const exact = this.searchCache.get(searchText);
    if (exact) {
      this.projectSearchResult = exact;
      return;
    }
    const narrowed = this.findPrefixCache(searchText);
    if (narrowed) {
      this.projectSearchResult = narrowed;
    }
  }

  *loadProjects(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    const searchSyncCounter = ++this.projectSearchSyncCounter;

    const cached = this.searchCache.get(searchText);
    if (cached) {
      this.projectSearchResult = cached;
      this.loadProjectsState.pass();
      return;
    }

    this.projectSearchResult = { projects: this.projectSearchResult.projects };
    this.loadProjectsState.inProgress();

    if (searchText.length > 0) {
      const narrowed = this.findPrefixCache(searchText);
      if (narrowed) {
        this.projectSearchResult = narrowed;
      }
      if (searchText.length <= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH) {
        this.loadProjectsState.pass();
        return;
      }
    }

    try {
      const cleanedProjectId = cleanProjectIdInput(searchText);
      const [searchResults, projectByIdResult] = (yield Promise.all([
        this.sdlcServerClient.getProjects(
          undefined,
          // We apply an exact search on the input text because we show exact searches with
          // custom selector. This avoids losing some results with the additional filtering.
          isValidSearchString ? exactSearch(searchText) : undefined,
          undefined,
          // Sandbox projects are loaded via a separate, dedicated call (see
          // `loadSandboxProject`); exclude them here so they do not appear
          // in the main workspace setup project picker.
          [SANDBOX_SDLC_TAG],
          PROJECT_SEARCH_FETCH_LIMIT,
        ),
        cleanedProjectId
          ? this.sdlcServerClient
              .getProject(cleanedProjectId)
              .catch(() => undefined)
          : Promise.resolve(undefined),
      ])) as [PlainObject<Project>[], PlainObject<Project> | undefined];

      if (searchSyncCounter !== this.projectSearchSyncCounter) {
        return;
      }

      const projects = searchResults.map((v) =>
        Project.serialization.fromJson(v),
      );
      const projectMatchedById = projectByIdResult
        ? Project.serialization.fromJson(projectByIdResult)
        : undefined;

      this.projectSearchResult = { projects, projectMatchedById };
      this.searchCache.set(searchText, this.projectSearchResult);
      this.loadProjectsState.pass();
    } catch (error) {
      if (searchSyncCounter !== this.projectSearchSyncCounter) {
        return;
      }
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadProjectsState.fail();
    }
  }

  *loadSandboxProject(): GeneratorFn<void> {
    if (!this.supportsCreatingSandboxProject) {
      return;
    }
    this.sandboxProject = false;
    try {
      this.loadSandboxState.inProgress();
      if (this.enginePromise) {
        yield this.enginePromise;
      }

      const userId = this.sdlcServerClient.currentUser?.userId;

      // Fast path — if we have a recent, user-matching cache entry, use it to
      // avoid the `userHasPrototypeProjectAccess` graph manager call and the
      // sandbox-tag project search. We still hit SDLC once to confirm the
      // cached projectId is alive, but `getProject(id)` is cheaper than the
      // tagged search and self-invalidates on 404.
      if (userId) {
        const cached =
          LegendStudioUserDataHelper.workspaceSetup_getCachedSandboxInfo(
            this.applicationStore.userDataService,
            userId,
          );
        if (cached) {
          this.hasSandboxAccess = cached.hasAccess;
          if (!cached.hasAccess) {
            // No access, no project — nothing else to do.
            this.sandboxProject = true;
            this.loadSandboxState.pass();
            return;
          }
          if (cached.projectId) {
            try {
              this.sandboxProject = Project.serialization.fromJson(
                (yield this.sdlcServerClient.getProject(
                  cached.projectId,
                )) as PlainObject<Project>,
              );
              this.loadSandboxState.pass();
              return;
            } catch {
              // Cached sandbox project no longer exists on the server; drop
              // the cache and fall through to the full refresh.
              LegendStudioUserDataHelper.workspaceSetup_clearSandboxInfo(
                this.applicationStore.userDataService,
              );
            }
          } else {
            // User has access but hasn't created a sandbox yet.
            this.sandboxProject = true;
            this.loadSandboxState.pass();
            return;
          }
        }
      }

      // Slow path — original flow.
      const sandboxProject = (
        (yield this.sdlcServerClient.getProjects(
          undefined,
          userId,
          [SANDBOX_SDLC_TAG],
          undefined,
          1,
        )) as PlainObject<Project>[]
      ).map((v) => Project.serialization.fromJson(v));
      if (this.hasSandboxAccess === undefined) {
        this.hasSandboxAccess =
          (yield this.graphManagerState.graphManager.userHasPrototypeProjectAccess(
            userId ?? '',
          )) as boolean;
      }
      this.sandboxProject = true;
      if (sandboxProject.length > 1) {
        throw new UnsupportedOperationError(
          'Only one sandbox project is supported per user.',
        );
      } else if (sandboxProject.length === 1) {
        this.sandboxProject = guaranteeNonNullable(sandboxProject[0]);
      }

      // Persist the fresh result for next time. We only cache when we have
      // a userId (cache is scoped per user); anonymous sessions skip this.
      if (userId) {
        LegendStudioUserDataHelper.workspaceSetup_recordSandboxInfo(
          this.applicationStore.userDataService,
          {
            userId,
            hasAccess: this.hasSandboxAccess,
            projectId:
              this.sandboxProject instanceof Project
                ? this.sandboxProject.projectId
                : undefined,
          },
        );
      }

      this.loadSandboxState.pass();
    } catch (error) {
      this.sandboxProject = true;
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.loadSandboxState.fail();
    } finally {
      this.loadSandboxState.complete();
    }
  }

  *changeProject(
    project: Project,
    workspaceInfo?:
      | {
          workspaceId: string;
          workspaceType: WorkspaceType;
        }
      | undefined,
  ): GeneratorFn<void> {
    this.currentProject = project;
    this.currentProjectConfigurationStatus = undefined;
    this.loadPatchesState.inProgress();
    try {
      if (isProjectSandbox(project)) {
        this.patches = [];
      } else {
        this.patches = (
          (yield this.sdlcServerClient.getPatches(
            project.projectId,
          )) as PlainObject<Patch>[]
        ).map((v) => Patch.serialization.fromJson(v));
      }
      this.loadPatchesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.loadPatchesState.fail();
    }

    this.loadWorkspacesState.inProgress();
    try {
      if (isProjectSandbox(project)) {
        const result = new ProjectConfigurationStatus();
        result.projectId = project.projectId;
        result.isConfigured = true;
        this.currentProjectConfigurationStatus = result;
      } else {
        this.currentProjectConfigurationStatus =
          (yield fetchProjectConfigurationStatus(
            project.projectId,
            undefined,
            this.applicationStore,
            this.sdlcServerClient,
          )) as ProjectConfigurationStatus;
      }
      const workspacesInConflictResolutionIds = isProjectSandbox(project)
        ? []
        : (
            (yield this.sdlcServerClient.getWorkspacesInConflictResolutionMode(
              project.projectId,
              undefined,
            )) as Workspace[]
          ).map((workspace) => workspace.workspaceId);

      this.workspaces = (
        (yield this.sdlcServerClient.getWorkspaces(
          project.projectId,
        )) as PlainObject<Workspace>[]
      )
        .map((v) => Workspace.serialization.fromJson(v))
        .filter(
          // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
          // since that indicates bad state of the SDLC server
          (workspace) =>
            !workspacesInConflictResolutionIds.includes(workspace.workspaceId),
        );

      for (const patch of this.patches) {
        this.workspaces = this.workspaces.concat(
          (
            (yield this.sdlcServerClient.getWorkspaces(
              project.projectId,
              patch.patchReleaseVersionId.id,
            )) as PlainObject<Workspace>[]
          )
            .map((v) => {
              const w = Workspace.serialization.fromJson(v);
              w.source = patch.patchReleaseVersionId.id;
              return w;
            })
            .filter(
              // NOTE we don't handle workspaces that only have conflict resolution but no standard workspace
              // since that indicates bad state of the SDLC server
              (workspace) =>
                !workspacesInConflictResolutionIds.includes(
                  workspace.workspaceId,
                ),
            ),
        );
      }

      if (workspaceInfo) {
        const matchingWorkspace = this.workspaces.find(
          (workspace) =>
            workspace.workspaceType === workspaceInfo.workspaceType &&
            workspace.workspaceId === workspaceInfo.workspaceId,
        );
        if (matchingWorkspace) {
          this.changeWorkspace(matchingWorkspace);
        } else {
          // Workspace no longer exists — prune from recents.
          this.removeRecentWorkspace({
            projectId: project.projectId,
            workspaceId: workspaceInfo.workspaceId,
            workspaceType: workspaceInfo.workspaceType,
          });
          this.applicationStore.navigationService.navigator.updateCurrentLocation(
            generateSetupRoute(project.projectId, undefined),
          );
        }
      } else {
        this.currentWorkspace = undefined;
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateSetupRoute(project.projectId, undefined),
        );
      }
      this.loadWorkspacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
      this.loadWorkspacesState.fail();
    }
  }

  changeWorkspace(workspace: Workspace): void {
    if (!this.currentProject) {
      throw new IllegalStateError(
        `Can't change workspace: project is not specified`,
      );
    }
    this.currentWorkspace = workspace;
    this.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateSetupRoute(
        this.currentProject.projectId,
        workspace.source,
        workspace.workspaceId,
        workspace.workspaceType,
      ),
    );
  }

  *createProject(
    name: string,
    description: string,
    groupId: string,
    artifactId: string,
    tags: string[] = [],
  ): GeneratorFn<void> {
    this.createOrImportProjectState.inProgress();
    const startTime = Date.now();
    LegendStudioTelemetryHelper.logEvent_SetupActionLaunched(
      this.applicationStore.telemetryService,
      { action: SETUP_ACTION.CREATE_PROJECT },
    );
    try {
      const createdProject = Project.serialization.fromJson(
        (yield this.sdlcServerClient.createProject({
          name,
          description,
          groupId,
          artifactId,
          tags,
        })) as PlainObject<Project>,
      );
      this.applicationStore.notificationService.notifySuccess(
        `Project '${name}' is succesfully created`,
      );

      this.searchCache.clear();

      yield flowResult(this.changeProject(createdProject));

      this.setShowCreateProjectModal(false);
      LegendStudioTelemetryHelper.logEvent_SetupActionSucceeded(
        this.applicationStore.telemetryService,
        {
          action: SETUP_ACTION.CREATE_PROJECT,
          projectId: createdProject.projectId,
          durationMs: Date.now() - startTime,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      LegendStudioTelemetryHelper.logEvent_SetupActionFailure(
        this.applicationStore.telemetryService,
        {
          action: SETUP_ACTION.CREATE_PROJECT,
          errorMessage: error.message,
        },
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createOrImportProjectState.reset();
    }
  }

  *importProject(
    id: string,
    groupId: string,
    artifactId: string,
  ): GeneratorFn<void> {
    this.createOrImportProjectState.inProgress();
    const startTime = Date.now();
    LegendStudioTelemetryHelper.logEvent_SetupActionLaunched(
      this.applicationStore.telemetryService,
      { action: SETUP_ACTION.IMPORT_PROJECT },
    );
    try {
      const report = ImportReport.serialization.fromJson(
        (yield this.sdlcServerClient.importProject({
          id,
          groupId,
          artifactId,
        })) as PlainObject<ImportReport>,
      );
      const importReview = Review.serialization.fromJson(
        (yield this.sdlcServerClient.getReview(
          report.project.projectId,
          undefined,
          report.reviewId,
        )) as PlainObject<Review>,
      );
      this.setImportProjectSuccessReport({
        projectName: report.project.name,
        projectId: report.project.projectId,
        reviewUrl: importReview.webURL,
      });

      this.searchCache.clear();

      yield flowResult(this.changeProject(report.project));
      LegendStudioTelemetryHelper.logEvent_SetupActionSucceeded(
        this.applicationStore.telemetryService,
        {
          action: SETUP_ACTION.IMPORT_PROJECT,
          projectId: report.project.projectId,
          durationMs: Date.now() - startTime,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      LegendStudioTelemetryHelper.logEvent_SetupActionFailure(
        this.applicationStore.telemetryService,
        {
          action: SETUP_ACTION.IMPORT_PROJECT,
          errorMessage: error.message,
        },
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createOrImportProjectState.reset();
    }
  }

  *createWorkspace(
    projectId: string,
    patchReleaseVersionId: string | undefined,
    workspaceId: string,
    workspaceType: WorkspaceType,
    copy?: WorkspaceCopyState | undefined,
  ): GeneratorFn<void> {
    this.createWorkspaceState.inProgress();
    const startTime = Date.now();
    const identity = {
      action: SETUP_ACTION.CREATE_WORKSPACE,
      projectId,
      workspaceType,
      hasPatchReleaseVersion: patchReleaseVersionId !== undefined,
      copiesWorkspace: copy !== undefined,
      copiedElementCount: copy?.changes.length,
      copiesFromOtherProject: copy
        ? copy instanceof OtherProjectWorkspaceCopyState
        : undefined,
      addedDependencyCount:
        copy instanceof OtherProjectWorkspaceCopyState
          ? copy.dependenciesToAdd.length
          : undefined,
    };
    LegendStudioTelemetryHelper.logEvent_SetupActionLaunched(
      this.applicationStore.telemetryService,
      identity,
    );
    try {
      const newWorkspace = Workspace.serialization.fromJson(
        (yield this.sdlcServerClient.createWorkspace(
          projectId,
          patchReleaseVersionId,
          workspaceId,
          workspaceType,
        )) as PlainObject<Workspace>,
      );
      // NOTE: the copy below is committed through this, which routes the
      // workspace of a patch to the patch's endpoints
      newWorkspace.source = patchReleaseVersionId;

      if (copy) {
        try {
          yield flowResult(copy.copyTo(newWorkspace));
        } catch (error) {
          assertErrorThrown(error);
          // NOTE: the workspace exists without the copy: list it, and keep the
          // modal open to try the copy again or to delete the workspace
          copy.setCreatedWorkspace(newWorkspace);
          this.workspaces.push(newWorkspace);
          if (this.workspaceCopyState !== copy) {
            // the modal was closed while copying
            this.applicationStore.notificationService.notifyWarning(
              copy instanceof OtherProjectWorkspaceCopyState
                ? copy.hasCopiedElements
                  ? `Workspace '${newWorkspace.workspaceId}' is created with the elements of ${copy.source.workspaceId} of ${copy.sourceProject.name}, but adding the dependencies failed: ${error.message}`
                  : `Workspace '${newWorkspace.workspaceId}' is created, but copying the elements of ${copy.source.workspaceId} of ${copy.sourceProject.name} failed: ${error.message}`
                : `Workspace '${newWorkspace.workspaceId}' is created, but copying the changes of ${copy.source.workspaceId} failed: ${error.message}`,
            );
          }
          this.applicationStore.logService.error(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
            error,
          );
          LegendStudioTelemetryHelper.logEvent_SetupActionFailure(
            this.applicationStore.telemetryService,
            { ...identity, errorMessage: error.message },
          );
          return;
        }
      }

      this.completeWorkspaceCreation(newWorkspace, copy);
      LegendStudioTelemetryHelper.logEvent_SetupActionSucceeded(
        this.applicationStore.telemetryService,
        { ...identity, durationMs: Date.now() - startTime },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      LegendStudioTelemetryHelper.logEvent_SetupActionFailure(
        this.applicationStore.telemetryService,
        { ...identity, errorMessage: error.message },
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createWorkspaceState.reset();
    }
  }

  /**
   * Tries the copy again, into the workspace created by the modal, whose copy
   * failed.
   */
  *retryWorkspaceCopy(): GeneratorFn<void> {
    const copy = this.workspaceCopyState;
    const workspace = copy?.createdWorkspace;
    if (!copy || !workspace) {
      return;
    }
    this.createWorkspaceState.inProgress();
    try {
      yield flowResult(copy.copyTo(workspace));
      this.completeWorkspaceCreation(workspace, copy);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
    } finally {
      this.createWorkspaceState.reset();
    }
  }

  /**
   * Deletes the workspace created by the modal, whose copy failed, and goes
   * back to the modal's form.
   */
  *deleteCopiedWorkspace(): GeneratorFn<void> {
    const copy = this.workspaceCopyState;
    const workspace = copy?.createdWorkspace;
    if (!copy || !workspace) {
      return;
    }
    this.createWorkspaceState.inProgress();
    try {
      yield this.sdlcServerClient.deleteWorkspace(copy.projectId, workspace);
      this.workspaces = this.workspaces.filter((w) => w !== workspace);
      copy.setCreatedWorkspace(undefined);
      copy.setCopyError(undefined);
      this.applicationStore.notificationService.notifySuccess(
        `Workspace '${workspace.workspaceId}' is deleted`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
        error,
      );
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.createWorkspaceState.reset();
    }
  }

  private describeOtherProjectCopy(
    workspace: Workspace,
    copy: OtherProjectWorkspaceCopyState,
  ): string {
    const elementCount = copy.changes.length;
    const dependencyCount = copy.dependenciesToAdd.length;
    const copied = [
      ...(elementCount
        ? [elementCount === 1 ? '1 element' : `${elementCount} elements`]
        : []),
      ...(dependencyCount
        ? [
            dependencyCount === 1
              ? '1 dependency'
              : `${dependencyCount} dependencies`,
          ]
        : []),
    ];
    return copied.length
      ? `Workspace '${workspace.workspaceId}' is created from ${
          copy.source.workspaceId
        } of ${copy.sourceProject.name}, with ${copied.join(' and ')}`
      : `Workspace '${workspace.workspaceId}' is succesfully created`;
  }

  private completeWorkspaceCreation(
    workspace: Workspace,
    copy: WorkspaceCopyState | undefined,
  ): void {
    const copiedChangeCount = copy?.changes.length ?? 0;
    this.applicationStore.notificationService.notifySuccess(
      copy instanceof OtherProjectWorkspaceCopyState
        ? this.describeOtherProjectCopy(workspace, copy)
        : copy && copiedChangeCount
          ? `Workspace '${workspace.workspaceId}' is created from ${
              copy.source.workspaceId
            }, with its ${
              copiedChangeCount === 1
                ? '1 change'
                : `${copiedChangeCount} changes`
            }`
          : `Workspace '${workspace.workspaceId}' is succesfully created`,
    );

    const matchingWorkspace = this.workspaces.find(
      (w) =>
        w.workspaceId === workspace.workspaceId &&
        w.workspaceType === workspace.workspaceType &&
        w.source === workspace.source,
    );
    const newWorkspaceToSelect = matchingWorkspace ?? workspace;
    this.changeWorkspace(newWorkspaceToSelect);
    this.setShowCreateWorkspaceModal(false);

    // NOTE: do this after closing the modal to not interfere
    // with validation of existing workspaces in create workspace modal
    if (!matchingWorkspace) {
      this.workspaces.push(workspace);
    }
  }
}
