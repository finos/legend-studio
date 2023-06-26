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

import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { ExplorerTreeState } from './ExplorerTreeState.js';
import {
  ACTIVITY_MODE,
  PANEL_MODE,
  GRAPH_EDITOR_MODE,
  EDITOR_MODE,
} from './EditorConfig.js';
import {
  type GraphBuilderResult,
  EditorGraphState,
  GraphBuilderStatus,
} from './EditorGraphState.js';
import { ChangeDetectionState } from './ChangeDetectionState.js';
import { NewElementState } from './NewElementState.js';
import { WorkspaceUpdaterState } from './sidebar-state/WorkspaceUpdaterState.js';
import { ProjectOverviewState } from './sidebar-state/ProjectOverviewState.js';
import { WorkspaceReviewState } from './sidebar-state/WorkspaceReviewState.js';
import {
  FormLocalChangesState,
  type LocalChangesState,
} from './sidebar-state/LocalChangesState.js';
import { WorkspaceWorkflowManagerState } from './sidebar-state/WorkflowManagerState.js';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  isNonNullable,
  assertErrorThrown,
  guaranteeNonNullable,
  UnsupportedOperationError,
  ActionState,
  AssertionError,
  guaranteeType,
  type Clazz,
} from '@finos/legend-shared';
import { EditorSDLCState } from './EditorSDLCState.js';
import { ModelImporterState } from './editor-state/ModelImporterState.js';
import { ProjectConfigurationEditorState } from './editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import type { ElementFileGenerationState } from './editor-state/element-editor-state/ElementFileGenerationState.js';
import {
  DevToolPanelState,
  payloadDebugger,
} from './panel-group/DevToolPanelState.js';
import {
  generateEditorRoute,
  generateSetupRoute,
  generateViewProjectRoute,
  type WorkspaceEditorPathParams,
} from '../../__lib__/LegendStudioNavigation.js';
import { PanelDisplayState } from '@finos/legend-art';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import type { Entity } from '@finos/legend-storage';
import {
  ProjectConfiguration,
  WorkspaceType,
  type SDLCServerClient,
} from '@finos/legend-server-sdlc';
import { GraphManagerState, GRAPH_MANAGER_EVENT } from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';
import {
  type CommandRegistrar,
  ActionAlertActionType,
  ActionAlertType,
  APPLICATION_EVENT,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import type { EditorMode } from './EditorMode.js';
import { StandardEditorMode } from './StandardEditorMode.js';
import { WorkspaceUpdateConflictResolutionState } from './sidebar-state/WorkspaceUpdateConflictResolutionState.js';
import { PACKAGEABLE_ELEMENT_TYPE } from './utils/ModelClassifierUtils.js';
import { GlobalTestRunnerState } from './sidebar-state/testable/GlobalTestRunnerState.js';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';
import { EmbeddedQueryBuilderState } from './EmbeddedQueryBuilderState.js';
import { LEGEND_STUDIO_COMMAND_KEY } from '../../__lib__/LegendStudioCommand.js';
import { EditorTabManagerState } from './EditorTabManagerState.js';
import type { ProjectViewerEditorMode } from '../project-view/ProjectViewerEditorMode.js';
import { GraphEditFormModeState } from './GraphEditFormModeState.js';
import type { GraphEditorMode } from './GraphEditorMode.js';
import { GraphEditGrammarModeState } from './GraphEditGrammarModeState.js';
import { GlobalBulkServiceRegistrationState } from './sidebar-state/BulkServiceRegistrationState.js';
import { SQLPlaygroundPanelState } from './panel-group/SQLPlaygroundPanelState.js';
import type { QuickInputState } from './QuickInputState.js';

export abstract class EditorExtensionState {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'EditorExtensionState';
}

export class EditorStore implements CommandRegistrar {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly sdlcServerClient: SDLCServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendStudioPluginManager;

  readonly initState = ActionState.create();

  initialEntityPath?: string | undefined;
  editorMode: EditorMode;
  // NOTE: once we clear up the editor store to make modes more separated
  // we should remove these sets of functions. They are basically hacks to
  // ensure hiding parts of the UI based on the editing mode.
  // Instead, we will gradually move these `boolean` flags into `EditorMode`
  // See https://github.com/finos/legend-studio/issues/317
  mode = EDITOR_MODE.STANDARD;

  editorExtensionStates: EditorExtensionState[] = [];

  // SDLC
  sdlcState: EditorSDLCState;
  changeDetectionState: ChangeDetectionState;

  // TODO: make EditorGraphState extend GraphMangerState and merge the state together for Studio
  graphState: EditorGraphState;
  graphManagerState: GraphManagerState;
  graphEditorMode: GraphEditorMode;

  // sidebar and panel
  explorerTreeState: ExplorerTreeState;
  projectOverviewState: ProjectOverviewState;
  workspaceWorkflowManagerState: WorkspaceWorkflowManagerState;
  globalTestRunnerState: GlobalTestRunnerState;
  workspaceUpdaterState: WorkspaceUpdaterState;
  workspaceReviewState: WorkspaceReviewState;
  localChangesState: LocalChangesState;
  conflictResolutionState: WorkspaceUpdateConflictResolutionState;
  globalBulkServiceRegistrationState: GlobalBulkServiceRegistrationState;
  devToolState: DevToolPanelState;
  sqlPlaygroundState: SQLPlaygroundPanelState;

  modelImporterState: ModelImporterState;
  projectConfigurationEditorState: ProjectConfigurationEditorState;
  embeddedQueryBuilderState: EmbeddedQueryBuilderState;
  newElementState: NewElementState;
  /**
   * Since we want to share element generation state across all element in the editor, we will create 1 element generate state
   * per file generation configuration type.
   */
  elementGenerationStates: ElementFileGenerationState[] = [];
  showSearchElementCommand = false;
  quickInputState?: QuickInputState<unknown> | undefined;

  activePanelMode: PANEL_MODE = PANEL_MODE.CONSOLE;
  readonly panelGroupDisplayState = new PanelDisplayState({
    initial: 0,
    default: 300,
    snap: 100,
  });
  activeActivity?: string = ACTIVITY_MODE.EXPLORER;
  readonly sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });
  readonly tabManagerState = new EditorTabManagerState(this);

  constructor(
    applicationStore: LegendStudioApplicationStore,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable<
      EditorStore,
      'initStandardMode' | 'initConflictResolutionMode'
    >(this, {
      editorMode: observable,
      mode: observable,
      activePanelMode: observable,
      activeActivity: observable,
      graphEditorMode: observable,
      showSearchElementCommand: observable,
      quickInputState: observable,

      isInViewerMode: computed,
      isInConflictResolutionMode: computed,
      isInitialized: computed,

      setEditorMode: action,
      setMode: action,

      setActivePanelMode: action,
      cleanUp: action,
      reset: action,
      setActiveActivity: action,
      setShowSearchElementCommand: action,
      setQuickInputState: action,

      initialize: flow,
      initMode: flow,
      initStandardMode: flow,
      initConflictResolutionMode: flow,
      buildGraph: flow,
      toggleTextMode: flow,
      switchModes: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;

    this.editorMode = new StandardEditorMode(this);

    this.sdlcState = new EditorSDLCState(this);
    this.graphState = new EditorGraphState(this);
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.graphEditorMode = new GraphEditFormModeState(this);
    this.changeDetectionState = new ChangeDetectionState(this, this.graphState);
    this.devToolState = new DevToolPanelState(this);
    this.sqlPlaygroundState = new SQLPlaygroundPanelState(this);
    this.embeddedQueryBuilderState = new EmbeddedQueryBuilderState(this);
    // side bar panels
    this.explorerTreeState = new ExplorerTreeState(this);
    this.projectOverviewState = new ProjectOverviewState(this, this.sdlcState);
    this.globalTestRunnerState = new GlobalTestRunnerState(
      this,
      this.sdlcState,
    );
    this.workspaceWorkflowManagerState = new WorkspaceWorkflowManagerState(
      this,
      this.sdlcState,
    );
    this.workspaceUpdaterState = new WorkspaceUpdaterState(
      this,
      this.sdlcState,
    );
    this.workspaceReviewState = new WorkspaceReviewState(this, this.sdlcState);
    this.localChangesState = new FormLocalChangesState(this, this.sdlcState);
    this.conflictResolutionState = new WorkspaceUpdateConflictResolutionState(
      this,
      this.sdlcState,
    );
    this.newElementState = new NewElementState(this);
    this.globalBulkServiceRegistrationState =
      new GlobalBulkServiceRegistrationState(this, this.sdlcState);
    // special (singleton) editors
    this.modelImporterState = new ModelImporterState(this);
    this.projectConfigurationEditorState = new ProjectConfigurationEditorState(
      this,
      this.sdlcState,
    );
    // extensions
    this.editorExtensionStates = this.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) => plugin.getExtraEditorExtensionStateCreators?.() ?? [],
      )
      .map((creator) => creator(this))
      .filter(isNonNullable);
  }

  get isInitialized(): boolean {
    if (this.isInViewerMode) {
      return (
        (Boolean(
          this.sdlcState.currentProject && this.sdlcState.currentWorkspace,
        ) ||
          Boolean(
            (this.sdlcState.editorStore.editorMode as ProjectViewerEditorMode)
              .viewerStore.projectGAVCoordinates,
          )) &&
        this.graphManagerState.systemBuildState.hasSucceeded
      );
    } else {
      return (
        Boolean(
          this.sdlcState.currentProject &&
            this.sdlcState.currentWorkspace &&
            this.sdlcState.currentRevision &&
            this.sdlcState.remoteWorkspaceRevision,
        ) && this.graphManagerState.systemBuildState.hasSucceeded
      );
    }
  }

  get isInViewerMode(): boolean {
    return this.mode === EDITOR_MODE.VIEWER;
  }

  get isInConflictResolutionMode(): boolean {
    return this.mode === EDITOR_MODE.CONFLICT_RESOLUTION;
  }

  setEditorMode(val: EditorMode): void {
    this.editorMode = val;
  }

  setMode(val: EDITOR_MODE): void {
    this.mode = val;
  }

  setShowSearchElementCommand(val: boolean): void {
    this.showSearchElementCommand = val;
  }

  setQuickInputState<T>(val: QuickInputState<T> | undefined): void {
    this.quickInputState = val as QuickInputState<unknown> | undefined;
  }

  cleanUp(): void {
    // dismiss all the alerts as these are parts of application, if we don't do this, we might
    // end up blocking other parts of the app
    // e.g. trying going to an unknown workspace, we will be redirected to the home page
    // but the blocking alert for not-found workspace will still block the app
    this.applicationStore.alertService.setBlockingAlert(undefined);
    this.applicationStore.alertService.setActionAlertInfo(undefined);
    // stop change detection to avoid memory-leak
    this.changeDetectionState.stop();
  }

  /**
   * TODO?: we should really think of how we could simplify the trigger condition below
   * after we refactor editor modes
   *
   * See https://github.com/finos/legend-studio/issues/317
   */
  createEditorCommandTrigger(additionalChecker?: () => boolean): () => boolean {
    return (): boolean =>
      // we don't want to leak any hotkeys when we have embedded query builder open
      // TODO?: we probably should come up with a more generic mechanism for this
      !this.embeddedQueryBuilderState.queryBuilderState &&
      (!additionalChecker || additionalChecker());
  }

  registerCommands(): void {
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.COMPILE,
      trigger: this.createEditorCommandTrigger(
        () =>
          this.isInitialized &&
          (!this.isInConflictResolutionMode ||
            this.conflictResolutionState.hasResolvedAllConflicts),
      ),
      action: () => {
        flowResult(this.graphEditorMode.globalCompile()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.GENERATE,
      trigger: this.createEditorCommandTrigger(
        () =>
          this.isInitialized &&
          (!this.isInConflictResolutionMode ||
            this.conflictResolutionState.hasResolvedAllConflicts),
      ),
      action: () => {
        flowResult(this.graphState.graphGenerationState.globalGenerate()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.CREATE_ELEMENT,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.newElementState.openModal(),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.SEARCH_ELEMENT,
      trigger: this.createEditorCommandTrigger(),
      action: () =>
        this.setShowSearchElementCommand(!this.showSearchElementCommand),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_TEXT_MODE,
      trigger: this.createEditorCommandTrigger(
        () =>
          this.isInitialized &&
          (!this.isInConflictResolutionMode ||
            this.conflictResolutionState.hasResolvedAllConflicts),
      ),
      action: () => {
        flowResult(this.toggleTextMode()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_MODEL_LOADER,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.tabManagerState.openTab(this.modelImporterState),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.SYNC_WITH_WORKSPACE,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => {
        flowResult(this.localChangesState.pushLocalChanges()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_PANEL_GROUP,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.panelGroupDisplayState.toggle(),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_EXPLORER,
      trigger: this.createEditorCommandTrigger(),
      action: () => this.setActiveActivity(ACTIVITY_MODE.EXPLORER),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_LOCAL_CHANGES,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.setActiveActivity(ACTIVITY_MODE.LOCAL_CHANGES),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.setActiveActivity(ACTIVITY_MODE.WORKSPACE_REVIEW),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.setActiveActivity(ACTIVITY_MODE.WORKSPACE_UPDATER),
    });
  }

  deregisterCommands(): void {
    [
      LEGEND_STUDIO_COMMAND_KEY.SYNC_WITH_WORKSPACE,
      LEGEND_STUDIO_COMMAND_KEY.CREATE_ELEMENT,
      LEGEND_STUDIO_COMMAND_KEY.SEARCH_ELEMENT,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_TEXT_MODE,
      LEGEND_STUDIO_COMMAND_KEY.GENERATE,
      LEGEND_STUDIO_COMMAND_KEY.COMPILE,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_PANEL_GROUP,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_MODEL_LOADER,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_EXPLORER,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_LOCAL_CHANGES,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER,
    ].forEach((key) =>
      this.applicationStore.commandService.deregisterCommand(key),
    );
  }

  reset(): void {
    this.tabManagerState.closeAllTabs();
    this.projectConfigurationEditorState = new ProjectConfigurationEditorState(
      this,
      this.sdlcState,
    );
    this.explorerTreeState = new ExplorerTreeState(this);
  }

  internalizeEntityPath(params: WorkspaceEditorPathParams): void {
    const { projectId, entityPath } = params;
    const workspaceType = params.groupWorkspaceId
      ? WorkspaceType.GROUP
      : WorkspaceType.USER;
    const workspaceId = guaranteeNonNullable(
      params.groupWorkspaceId ?? params.workspaceId,
      `Workspace/group workspace ID is not provided`,
    );
    if (entityPath) {
      this.initialEntityPath = entityPath;
      this.applicationStore.navigationService.navigator.updateCurrentLocation(
        generateEditorRoute(projectId, workspaceId, workspaceType),
      );
    }
  }

  /**
   * This is the entry of the app logic where the initialization of editor states happens
   * Here, we ensure the order of calls after checking existence of current project and workspace
   * If either of them does not exist, we cannot proceed.
   */
  *initialize(
    projectId: string,
    workspaceId: string,
    workspaceType: WorkspaceType,
  ): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      /**
       * Since React `fast-refresh` will sometimes cause `Editor` to rerender, this method will be called again
       * as all hooks are recalled, as such, ONLY IN DEVELOPMENT mode we allow this to not fail-fast
       * we also have to `undo` some of what the `cleanUp` does to this store as the cleanup part of all hooks will be triggered
       * as well
       */
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        this.applicationStore.logService.info(
          LogEvent.create(APPLICATION_EVENT.DEVELOPMENT_ISSUE),
          `Fast-refreshing the app - undoing cleanUp() and preventing initialize() recall in editor store...`,
        );
        this.changeDetectionState.start();
        return;
      }
      this.applicationStore.notificationService.notifyIllegalState(
        'Editor store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    // TODO: when we genericize the way to initialize an application page
    this.applicationStore.assistantService.setIsHidden(false);

    const onLeave = (hasBuildSucceeded: boolean): void => {
      this.initState.complete(hasBuildSucceeded);
      this.initState.setMessage(undefined);
    };

    this.initState.setMessage(`Setting up workspace...`);
    yield flowResult(
      this.sdlcState.fetchCurrentProject(projectId, {
        suppressNotification: true,
      }),
    );
    if (!this.sdlcState.currentProject) {
      // If the project is not found or the user does not have access to it,
      // we will not automatically redirect them to the setup page as they will lose the URL
      // instead, we give them the option to:
      // - reload the page (in case they later gain access)
      // - back to the setup page
      this.applicationStore.alertService.setActionAlertInfo({
        message: `Project not found or inaccessible`,
        prompt: 'Please check that the project exists and request access to it',
        type: ActionAlertType.STANDARD,
        actions: [
          {
            label: 'Reload application',
            default: true,
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigationService.navigator.reload();
            },
          },
          {
            label: 'Back to workspace setup',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigationService.navigator.goToLocation(
                generateSetupRoute(undefined),
              );
            },
          },
        ],
      });
      onLeave(false);
      return;
    }
    yield flowResult(
      this.sdlcState.fetchCurrentWorkspace(
        projectId,
        workspaceId,
        workspaceType,
        {
          suppressNotification: true,
        },
      ),
    );
    if (!this.sdlcState.currentWorkspace) {
      // If the workspace is not found,
      // we will not automatically redirect the user to the setup page as they will lose the URL
      // instead, we give them the option to:
      // - create the workspace
      // - view project
      // - back to the setup page
      const createWorkspaceAndRelaunch = async (): Promise<void> => {
        try {
          this.applicationStore.alertService.setBlockingAlert({
            message: 'Creating workspace...',
            prompt: 'Please do not close the application',
          });
          const workspace = await this.sdlcServerClient.createWorkspace(
            projectId,
            workspaceId,
            workspaceType,
          );
          this.applicationStore.alertService.setBlockingAlert(undefined);
          this.applicationStore.notificationService.notifySuccess(
            `Workspace '${workspace.workspaceId}' is succesfully created. Reloading application...`,
          );
          this.applicationStore.navigationService.navigator.reload();
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.logService.error(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
            error,
          );
          this.applicationStore.notificationService.notifyError(error);
        }
      };
      this.applicationStore.alertService.setActionAlertInfo({
        message: 'Workspace not found',
        prompt: `Please note that you can check out the project in viewer mode. Workspace is only required if you need to work on the project.`,
        type: ActionAlertType.STANDARD,
        actions: [
          {
            label: 'View project',
            default: true,
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigationService.navigator.goToLocation(
                generateViewProjectRoute(projectId),
              );
            },
          },
          {
            label: 'Create workspace',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              createWorkspaceAndRelaunch().catch(
                this.applicationStore.alertUnhandledError,
              );
            },
          },
          {
            label: 'Back to workspace setup',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigationService.navigator.goToLocation(
                generateSetupRoute(projectId, workspaceId, workspaceType),
              );
            },
          },
        ],
      });
      onLeave(false);
      return;
    }
    yield Promise.all([
      this.sdlcState.fetchCurrentRevision(
        projectId,
        this.sdlcState.activeWorkspace,
      ),
      this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
            payloadDebugger,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
          TEMPORARY__enableNewServiceRegistrationInputCollectorMechanism:
            this.applicationStore.config.options
              .TEMPORARY__enableNewServiceRegistrationInputCollectorMechanism,
        },
      ),
    ]);
    yield this.graphManagerState.initializeSystem();
    yield flowResult(this.initMode());

    onLeave(true);
  }

  *initMode(): GeneratorFn<void> {
    switch (this.mode) {
      case EDITOR_MODE.STANDARD:
        yield flowResult(this.initStandardMode());
        return;
      case EDITOR_MODE.CONFLICT_RESOLUTION:
        yield flowResult(this.initConflictResolutionMode());
        return;
      default:
        throw new UnsupportedOperationError(
          `Can't initialize editor for unsupported mode '${this.mode}'`,
        );
    }
  }

  private *initStandardMode(): GeneratorFn<void> {
    const projectId = this.sdlcState.activeProject.projectId;
    const activeWorkspace = this.sdlcState.activeWorkspace;
    const projectConfiguration = (yield this.sdlcServerClient.getConfiguration(
      projectId,
      activeWorkspace,
    )) as PlainObject<ProjectConfiguration>;
    this.projectConfigurationEditorState.setProjectConfiguration(
      ProjectConfiguration.serialization.fromJson(projectConfiguration),
    );
    // make sure we set the original project configuration to a different object
    this.projectConfigurationEditorState.setOriginalProjectConfiguration(
      ProjectConfiguration.serialization.fromJson(projectConfiguration),
    );

    yield Promise.all([
      this.buildGraph(),
      this.sdlcState.checkIfWorkspaceIsOutdated(),
      this.workspaceReviewState.fetchCurrentWorkspaceReview(),
      this.workspaceUpdaterState.fetchLatestCommittedReviews(),
      this.projectConfigurationEditorState.fetchLatestProjectStructureVersion(),
      this.graphState.graphGenerationState.globalFileGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.graphState.graphGenerationState.externalFormatState.fetchExternalFormatDescriptions(),
      this.graphState.fetchAvailableFunctionActivatorConfigurations(),
      this.sdlcState.fetchProjectVersions(),
      this.sdlcState.fetchPublishedProjectVersions(),
    ]);
  }

  private *initConflictResolutionMode(): GeneratorFn<void> {
    yield flowResult(
      this.conflictResolutionState.initProjectConfigurationInConflictResolutionMode(),
    );
    this.applicationStore.alertService.setActionAlertInfo({
      message: 'Failed to update workspace.',
      prompt:
        'You can discard all of your changes or review them, resolve all merge conflicts and fix any potential compilation issues as well as test failures',
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Discard your changes',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: (): void => {
            this.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
            flowResult(
              this.conflictResolutionState.discardConflictResolutionChanges(),
            ).catch((error) =>
              this.applicationStore.alertUnhandledError(error),
            );
          },
        },
        {
          label: 'Resolve merge conflicts',
          default: true,
          type: ActionAlertActionType.STANDARD,
        },
      ],
    });
    yield Promise.all([
      this.conflictResolutionState.initialize(),
      this.sdlcState.checkIfWorkspaceIsOutdated(),
      this.projectConfigurationEditorState.fetchLatestProjectStructureVersion(),
      this.graphState.graphGenerationState.globalFileGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.graphState.graphGenerationState.externalFormatState.fetchExternalFormatDescriptions(),
      this.graphState.fetchAvailableFunctionActivatorConfigurations(),
      this.sdlcState.fetchProjectVersions(),
      this.sdlcState.fetchPublishedProjectVersions(),
    ]);
  }

  *buildGraph(graphEntities?: Entity[]): GeneratorFn<void> {
    const startTime = Date.now();
    let entities: Entity[];

    this.initState.setMessage(`Fetching entities...`);
    try {
      // fetch workspace entities and config at the same time
      const projectId = this.sdlcState.activeProject.projectId;
      const activeWorkspace = this.sdlcState.activeWorkspace;
      entities = (yield this.sdlcServerClient.getEntities(
        projectId,
        activeWorkspace,
      )) as Entity[];
      this.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
        entities,
      );
      this.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS),
        Date.now() - startTime,
        'ms',
      );
    } catch {
      return;
    } finally {
      this.initState.setMessage(undefined);
    }

    try {
      const result = (yield flowResult(
        // NOTE: if graph entities are provided, we will use that to build the graph.
        // We use this method as a way to fully reset the application with the entities, but we still use
        // the workspace entities for hashing as those are the base entities.
        this.graphState.buildGraph(graphEntities ?? entities),
      )) as GraphBuilderResult;

      if (result.error) {
        if (result.status === GraphBuilderStatus.REDIRECTED_TO_TEXT_MODE) {
          yield flowResult(
            this.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex(
              entities,
              LogEvent.create(
                LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
              ),
            ),
          );
        }
        return;
      }

      this.initState.setMessage(`Starting change detection engine...`);

      // build explorer tree
      this.explorerTreeState.buildImmutableModelTrees();
      this.explorerTreeState.build();

      // open element if provided an element path
      if (
        this.graphManagerState.graphBuildState.hasSucceeded &&
        this.explorerTreeState.buildState.hasCompleted &&
        this.initialEntityPath
      ) {
        try {
          this.graphEditorMode.openElement(
            this.graphManagerState.graph.getElement(this.initialEntityPath),
          );
        } catch {
          const elementPath = this.initialEntityPath;
          this.initialEntityPath = undefined;
          throw new AssertionError(
            `Can't find element with path '${elementPath}'`,
          );
        }
      }

      // ======= (RE)START CHANGE DETECTION =======
      this.changeDetectionState.stop();
      yield flowResult(this.changeDetectionState.observeGraph());
      yield Promise.all([
        this.changeDetectionState.preComputeGraphElementHashes(), // for local changes detection
        this.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex(
          entities,
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
          ),
        ),

        this.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex(),
        this.sdlcState.buildProjectLatestRevisionEntityHashesIndex(),
      ]);
      this.changeDetectionState.start();
      yield Promise.all([
        this.changeDetectionState.computeAggregatedWorkspaceChanges(true),
        this.changeDetectionState.computeAggregatedProjectLatestChanges(true),
      ]);
      this.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_RESTART__SUCCESS,
        ),
        '[ASNYC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      // since errors have been handled accordingly, we don't need to do anything here
      return;
    } finally {
      this.initState.setMessage(undefined);
    }
  }

  setActiveActivity(
    activity: string,
    options?: { keepShowingIfMatchedCurrent?: boolean },
  ): void {
    if (!this.sideBarDisplayState.isOpen) {
      this.sideBarDisplayState.open();
    } else if (
      activity === this.activeActivity &&
      !options?.keepShowingIfMatchedCurrent
    ) {
      this.sideBarDisplayState.close();
    }
    this.activeActivity = activity;
  }

  setActivePanelMode(val: PANEL_MODE): void {
    this.activePanelMode = val;
  }

  *toggleTextMode(): GeneratorFn<void> {
    if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) {
      return;
    }
    this.applicationStore.alertService.setBlockingAlert({
      message: 'Switching to text mode...',
      showLoading: true,
    });
    if (this.graphEditorMode instanceof GraphEditFormModeState) {
      yield flowResult(this.switchModes(GRAPH_EDITOR_MODE.GRAMMAR_TEXT));
    } else if (this.graphEditorMode instanceof GraphEditGrammarModeState) {
      yield flowResult(this.switchModes(GRAPH_EDITOR_MODE.FORM));
    } else {
      throw new UnsupportedOperationError(
        'Editor only support form mode and text mode at the moment',
      );
    }
  }

  getSupportedElementTypes(): string[] {
    return (
      [
        PACKAGEABLE_ELEMENT_TYPE.CLASS,
        PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
        PACKAGEABLE_ELEMENT_TYPE.PROFILE,
        PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION,
        PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
        PACKAGEABLE_ELEMENT_TYPE.MEASURE,
      ] as string[]
    ).concat(
      (
        [
          PACKAGEABLE_ELEMENT_TYPE.MAPPING,
          PACKAGEABLE_ELEMENT_TYPE.RUNTIME,
          PACKAGEABLE_ELEMENT_TYPE.CONNECTION,
          PACKAGEABLE_ELEMENT_TYPE.SERVICE,
          PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION,
          PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION,
          PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE,
          PACKAGEABLE_ELEMENT_TYPE.DATABASE,
          PACKAGEABLE_ELEMENT_TYPE.DATA,
          this.applicationStore.config.options
            .TEMPORARY__enableLocalConnectionBuilder
            ? PACKAGEABLE_ELEMENT_TYPE.TEMPORARY__LOCAL_CONNECTION
            : undefined,
        ] as (string | undefined)[]
      )
        .filter(isNonNullable)
        .concat(
          this.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_LegendStudioApplicationPlugin_Extension
                ).getExtraSupportedElementTypes?.() ?? [],
            ),
        )
        .sort((a, b) => a.localeCompare(b)),
    );
  }

  *switchModes(
    to: GRAPH_EDITOR_MODE,
    fallbackOptions?: {
      isCompilationFailure?: boolean;
      isGraphBuildFailure?: boolean;
    },
  ): GeneratorFn<void> {
    switch (to) {
      case GRAPH_EDITOR_MODE.GRAMMAR_TEXT: {
        const graphEditorMode = new GraphEditGrammarModeState(this);
        try {
          yield flowResult(this.graphEditorMode.onLeave(fallbackOptions));
          yield flowResult(
            graphEditorMode.cleanupBeforeEntering(fallbackOptions),
          );
          this.graphEditorMode = graphEditorMode;
          yield flowResult(
            this.graphEditorMode.initialize(Boolean(fallbackOptions)),
          );
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.notificationService.notifyWarning(
            `Can't enter text mode: transformation to grammar text failed. Error: ${error.message}`,
          );
          this.applicationStore.alertService.setBlockingAlert(undefined);
          return;
        }
        break;
      }
      case GRAPH_EDITOR_MODE.FORM: {
        if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) {
          return;
        }
        try {
          try {
            yield flowResult(this.graphEditorMode.onLeave(fallbackOptions));
            this.graphEditorMode = new GraphEditFormModeState(this);
            yield flowResult(this.graphEditorMode.initialize());
          } catch (error) {
            yield flowResult(this.graphEditorMode.handleCleanupFailure(error));
          }
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.logService.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
            error,
          );
        } finally {
          this.graphState.isApplicationLeavingGraphEditMode = false;
          this.applicationStore.alertService.setBlockingAlert(undefined);
          this.changeDetectionState.workspaceLocalLatestRevisionState.currentEntityHashesIndex =
            new Map<string, string>();
        }

        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Editor does not support ${to} mode at the moment `,
        );
    }
  }

  getGraphEditorMode<T extends GraphEditorMode>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.graphEditorMode,
      clazz,
      `Graph editor mode is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }
}
