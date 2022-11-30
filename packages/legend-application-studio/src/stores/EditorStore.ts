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
import { ClassEditorState } from './editor-state/element-editor-state/ClassEditorState.js';
import { ExplorerTreeState } from './ExplorerTreeState.js';
import {
  ACTIVITY_MODE,
  AUX_PANEL_MODE,
  GRAPH_EDITOR_MODE,
  EDITOR_MODE,
} from './EditorConfig.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { MappingEditorState } from './editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  type GraphBuilderResult,
  EditorGraphState,
  GraphBuilderStatus,
} from './EditorGraphState.js';
import { ChangeDetectionState } from './ChangeDetectionState.js';
import { NewElementState } from './editor/NewElementState.js';
import { WorkspaceUpdaterState } from './sidebar-state/WorkspaceUpdaterState.js';
import { ProjectOverviewState } from './sidebar-state/ProjectOverviewState.js';
import { WorkspaceReviewState } from './sidebar-state/WorkspaceReviewState.js';
import { LocalChangesState } from './sidebar-state/LocalChangesState.js';
import { WorkspaceWorkflowManagerState } from './sidebar-state/WorkflowManagerState.js';
import { GrammarTextEditorState } from './editor-state/GrammarTextEditorState.js';
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
} from '@finos/legend-shared';
import { UMLEditorState } from './editor-state/element-editor-state/UMLEditorState.js';
import { ServiceEditorState } from './editor-state/element-editor-state/service/ServiceEditorState.js';
import { EditorSDLCState } from './EditorSDLCState.js';
import { ModelImporterState } from './editor-state/ModelImporterState.js';
import { FunctionEditorState } from './editor-state/element-editor-state/FunctionEditorState.js';
import { ProjectConfigurationEditorState } from './editor-state/ProjectConfigurationEditorState.js';
import { PackageableRuntimeEditorState } from './editor-state/element-editor-state/RuntimeEditorState.js';
import { PackageableConnectionEditorState } from './editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { PackageableDataEditorState } from './editor-state/element-editor-state/data/DataEditorState.js';
import { FileGenerationEditorState } from './editor-state/element-editor-state/FileGenerationEditorState.js';
import { CHANGE_DETECTION_EVENT } from './ChangeDetectionEvent.js';
import { GenerationSpecificationEditorState } from './editor-state/GenerationSpecificationEditorState.js';
import { UnsupportedElementEditorState } from './editor-state/UnsupportedElementEditorState.js';
import type { ElementFileGenerationState } from './editor-state/element-editor-state/ElementFileGenerationState.js';
import { DevToolState } from './aux-panel-state/DevToolState.js';
import {
  generateEditorRoute,
  generateSetupRoute,
  generateViewProjectRoute,
  type WorkspaceEditorPathParams,
} from './LegendStudioRouter.js';
import { NonBlockingDialogState, PanelDisplayState } from '@finos/legend-art';
import type { DSL_LegendStudioApplicationPlugin_Extension } from './LegendStudioApplicationPlugin.js';
import type { Entity } from '@finos/legend-storage';
import {
  ProjectConfiguration,
  WorkspaceType,
  type SDLCServerClient,
} from '@finos/legend-server-sdlc';
import {
  type PackageableElement,
  type GraphManagerState,
  GRAPH_MANAGER_EVENT,
  PrimitiveType,
  Class,
  Enumeration,
  Profile,
  Association,
  ConcreteFunctionDefinition,
  Measure,
  Database,
  FlatData,
  Mapping,
  Service,
  PackageableRuntime,
  PackageableConnection,
  FileGenerationSpecification,
  GenerationSpecification,
  Package,
  DataElement,
  isElementReadOnly,
} from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import {
  type CommandRegistrar,
  ActionAlertActionType,
  ActionAlertType,
  APPLICATION_EVENT,
  TAB_SIZE,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioAppEvent.js';
import type { EditorMode } from './editor/EditorMode.js';
import { StandardEditorMode } from './editor/StandardEditorMode.js';
import { WorkspaceUpdateConflictResolutionState } from './sidebar-state/WorkspaceUpdateConflictResolutionState.js';
import {
  graph_addElement,
  graph_deleteElement,
  graph_deleteOwnElement,
  graph_renameElement,
} from './shared/modifier/GraphModifierHelper.js';
import { PACKAGEABLE_ELEMENT_TYPE } from './shared/ModelClassifierUtils.js';
import { GlobalTestRunnerState } from './sidebar-state/testable/GlobalTestRunnerState.js';
import type { LegendStudioApplicationStore } from './LegendStudioBaseStore.js';
import { EmbeddedQueryBuilderState } from './EmbeddedQueryBuilderState.js';
import { LEGEND_STUDIO_COMMAND_KEY } from './LegendStudioCommand.js';
import { EditorTabManagerState } from './EditorTabManagerState.js';

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
  graphEditMode = GRAPH_EDITOR_MODE.FORM;
  editorMode: EditorMode;
  // NOTE: once we clear up the editor store to make modes more separated
  // we should remove these sets of functions. They are basically hacks to
  // ensure hiding parts of the UI based on the editing mode.
  // Instead, we will gradually move these `boolean` flags into `EditorMode`
  // See https://github.com/finos/legend-studio/issues/317
  mode = EDITOR_MODE.STANDARD;

  editorExtensionStates: EditorExtensionState[] = [];
  explorerTreeState: ExplorerTreeState;
  sdlcState: EditorSDLCState;
  graphState: EditorGraphState;
  graphManagerState: GraphManagerState;
  changeDetectionState: ChangeDetectionState;
  grammarTextEditorState: GrammarTextEditorState;
  modelImporterState: ModelImporterState;
  projectConfigurationEditorState: ProjectConfigurationEditorState;
  projectOverviewState: ProjectOverviewState;
  workspaceWorkflowManagerState: WorkspaceWorkflowManagerState;
  globalTestRunnerState: GlobalTestRunnerState;
  workspaceUpdaterState: WorkspaceUpdaterState;
  workspaceReviewState: WorkspaceReviewState;
  localChangesState: LocalChangesState;
  conflictResolutionState: WorkspaceUpdateConflictResolutionState;
  devToolState: DevToolState;
  embeddedQueryBuilderState: EmbeddedQueryBuilderState;
  newElementState: NewElementState;
  /**
   * Since we want to share element generation state across all element in the editor, we will create 1 element generate state
   * per file generation configuration type.
   */
  elementGenerationStates: ElementFileGenerationState[] = [];
  searchElementCommandState = new NonBlockingDialogState();

  activeAuxPanelMode: AUX_PANEL_MODE = AUX_PANEL_MODE.CONSOLE;
  readonly auxPanelDisplayState = new PanelDisplayState({
    initial: 0,
    default: 300,
    snap: 100,
  });
  activeActivity?: ACTIVITY_MODE = ACTIVITY_MODE.EXPLORER;
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
    graphManagerState: GraphManagerState,
  ) {
    makeObservable<
      EditorStore,
      'initStandardMode' | 'initConflictResolutionMode'
    >(this, {
      editorMode: observable,
      mode: observable,
      graphEditMode: observable,
      activeAuxPanelMode: observable,
      activeActivity: observable,

      isInViewerMode: computed,
      isInConflictResolutionMode: computed,
      isInitialized: computed,
      isInGrammarTextMode: computed,
      isInFormMode: computed,

      setEditorMode: action,
      setMode: action,

      setActiveAuxPanelMode: action,
      cleanUp: action,
      reset: action,
      setGraphEditMode: action,
      setActiveActivity: action,

      initialize: flow,
      initMode: flow,
      initStandardMode: flow,
      initConflictResolutionMode: flow,
      buildGraph: flow,
      addElement: flow,
      deleteElement: flow,
      renameElement: flow,
      toggleTextMode: flow,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;
    this.pluginManager = applicationStore.pluginManager;

    this.editorMode = new StandardEditorMode(this);

    this.sdlcState = new EditorSDLCState(this);
    this.graphState = new EditorGraphState(this);
    this.graphManagerState = graphManagerState;
    this.changeDetectionState = new ChangeDetectionState(this, this.graphState);
    this.devToolState = new DevToolState(this);
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
    this.localChangesState = new LocalChangesState(this, this.sdlcState);
    this.conflictResolutionState = new WorkspaceUpdateConflictResolutionState(
      this,
      this.sdlcState,
    );
    this.newElementState = new NewElementState(this);
    // special (singleton) editors
    this.grammarTextEditorState = new GrammarTextEditorState(this);
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
        Boolean(
          this.sdlcState.currentProject && this.sdlcState.currentWorkspace,
        ) && this.graphManagerState.systemBuildState.hasSucceeded
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

  get isInGrammarTextMode(): boolean {
    return this.graphEditMode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT;
  }

  get isInFormMode(): boolean {
    return this.graphEditMode === GRAPH_EDITOR_MODE.FORM;
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

  setGraphEditMode(graphEditor: GRAPH_EDITOR_MODE): void {
    this.graphEditMode = graphEditor;
    this.graphState.clearProblems();
  }

  cleanUp(): void {
    // dismiss all the alerts as these are parts of application, if we don't do this, we might
    // end up blocking other parts of the app
    // e.g. trying going to an unknown workspace, we will be redirected to the home page
    // but the blocking alert for not-found workspace will still block the app
    this.applicationStore.setBlockingAlert(undefined);
    this.applicationStore.setActionAlertInfo(undefined);
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
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.COMPILE,
      trigger: this.createEditorCommandTrigger(
        () =>
          this.isInitialized &&
          (!this.isInConflictResolutionMode ||
            this.conflictResolutionState.hasResolvedAllConflicts),
      ),
      action: () => {
        if (this.isInFormMode) {
          flowResult(this.graphState.globalCompileInFormMode()).catch(
            this.applicationStore.alertUnhandledError,
          );
        } else if (this.isInGrammarTextMode) {
          flowResult(this.graphState.globalCompileInTextMode()).catch(
            this.applicationStore.alertUnhandledError,
          );
        }
      },
    });
    this.applicationStore.commandCenter.registerCommand({
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
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.CREATE_ELEMENT,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.newElementState.openModal(),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.SEARCH_ELEMENT,
      trigger: this.createEditorCommandTrigger(),
      action: () => this.searchElementCommandState.open(),
    });
    this.applicationStore.commandCenter.registerCommand({
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
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_MODEL_LOADER,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.tabManagerState.openTab(this.modelImporterState),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.SYNC_WITH_WORKSPACE,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => {
        flowResult(this.localChangesState.pushLocalChanges()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_AUX_PANEL,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.auxPanelDisplayState.toggle(),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_EXPLORER,
      trigger: this.createEditorCommandTrigger(),
      action: () => this.setActiveActivity(ACTIVITY_MODE.EXPLORER),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_LOCAL_CHANGES,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.setActiveActivity(ACTIVITY_MODE.LOCAL_CHANGES),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW,
      trigger: this.createEditorCommandTrigger(() => !this.isInViewerMode),
      action: () => this.setActiveActivity(ACTIVITY_MODE.WORKSPACE_REVIEW),
    });
    this.applicationStore.commandCenter.registerCommand({
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
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_AUX_PANEL,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_MODEL_LOADER,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_EXPLORER,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_LOCAL_CHANGES,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW,
      LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER,
    ].forEach((key) =>
      this.applicationStore.commandCenter.deregisterCommand(key),
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
      this.applicationStore.navigator.updateCurrentLocation(
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
        this.applicationStore.log.info(
          LogEvent.create(APPLICATION_EVENT.DEVELOPMENT_ISSUE),
          `Fast-refreshing the app - undoing cleanUp() and preventing initialize() recall in editor store...`,
        );
        this.changeDetectionState.start();
        return;
      }
      this.applicationStore.notifyIllegalState(
        'Editor store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();
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
      this.applicationStore.setActionAlertInfo({
        message: `Project not found or inaccessible`,
        prompt: 'Please check that the project exists and request access to it',
        type: ActionAlertType.STANDARD,
        actions: [
          {
            label: 'Reload application',
            default: true,
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigator.reload();
            },
          },
          {
            label: 'Back to workspace setup',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigator.goToLocation(
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
          this.applicationStore.setBlockingAlert({
            message: 'Creating workspace...',
            prompt: 'Please do not close the application',
          });
          const workspace = await this.sdlcServerClient.createWorkspace(
            projectId,
            workspaceId,
            workspaceType,
          );
          this.applicationStore.setBlockingAlert(undefined);
          this.applicationStore.notifySuccess(
            `Workspace '${workspace.workspaceId}' is succesfully created. Reloading application...`,
          );
          this.applicationStore.navigator.reload();
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.log.error(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.WORKSPACE_SETUP_FAILURE),
            error,
          );
          this.applicationStore.notifyError(error);
        }
      };
      this.applicationStore.setActionAlertInfo({
        message: 'Workspace not found',
        prompt: `Please note that you can check out the project in viewer mode. Workspace is only required if you need to work on the project.`,
        type: ActionAlertType.STANDARD,
        actions: [
          {
            label: 'View project',
            default: true,
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigator.goToLocation(
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
              this.applicationStore.navigator.goToLocation(
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
      this.graphManagerState.initializeSystem(), // this can be moved inside of `setupEngine`
      this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      ),
    ]);
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
    yield Promise.all([
      this.buildGraph(),
      this.sdlcState.checkIfWorkspaceIsOutdated(),
      this.workspaceReviewState.fetchCurrentWorkspaceReview(),
      this.workspaceUpdaterState.fetchLatestCommittedReviews(),
      this.projectConfigurationEditorState.fetchLatestProjectStructureVersion(),
      this.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.graphState.graphGenerationState.externalFormatState.fetchExternalFormatsDescriptions(),
      this.sdlcState.fetchProjectVersions(),
    ]);
  }

  private *initConflictResolutionMode(): GeneratorFn<void> {
    this.applicationStore.setActionAlertInfo({
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
      this.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.graphState.graphGenerationState.externalFormatState.fetchExternalFormatsDescriptions(),
      this.sdlcState.fetchProjectVersions(),
    ]);
  }

  *buildGraph(graphEntities?: Entity[]): GeneratorFn<void> {
    const startTime = Date.now();
    let entities: Entity[];
    let projectConfiguration: PlainObject<ProjectConfiguration>;

    this.initState.setMessage(`Fetching entities...`);
    try {
      // fetch workspace entities and config at the same time
      const projectId = this.sdlcState.activeProject.projectId;
      const activeWorkspace = this.sdlcState.activeWorkspace;
      const result = (yield Promise.all([
        this.sdlcServerClient.getEntities(projectId, activeWorkspace),
        this.sdlcServerClient.getConfiguration(projectId, activeWorkspace),
      ])) as [Entity[], PlainObject<ProjectConfiguration>];
      entities = result[0];
      projectConfiguration = result[1];
      this.projectConfigurationEditorState.setProjectConfiguration(
        ProjectConfiguration.serialization.fromJson(projectConfiguration),
      );
      // make sure we set the original project configuration to a different object
      this.projectConfigurationEditorState.setOriginalProjectConfiguration(
        ProjectConfiguration.serialization.fromJson(projectConfiguration),
      );
      this.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
        entities,
      );
      this.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED),
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
                CHANGE_DETECTION_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
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
          this.tabManagerState.openElementEditor(
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
            CHANGE_DETECTION_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
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
      this.applicationStore.log.info(
        LogEvent.create(CHANGE_DETECTION_EVENT.CHANGE_DETECTION_RESTARTED),
        '[ASNYC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.log.error(
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
    activity: ACTIVITY_MODE,
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

  setActiveAuxPanelMode(val: AUX_PANEL_MODE): void {
    this.activeAuxPanelMode = val;
  }

  createElementEditorState(
    element: PackageableElement,
  ): ElementEditorState | undefined {
    if (element instanceof PrimitiveType) {
      throw new UnsupportedOperationError(
        `Can't create element state for primitive type`,
      );
    } else if (element instanceof Class) {
      return new ClassEditorState(this, element);
    } else if (
      element instanceof Association ||
      element instanceof Enumeration ||
      element instanceof Profile
    ) {
      return new UMLEditorState(this, element);
    } else if (element instanceof ConcreteFunctionDefinition) {
      return new FunctionEditorState(this, element);
    } else if (
      element instanceof Measure ||
      element instanceof Database ||
      element instanceof FlatData
    ) {
      return new UnsupportedElementEditorState(this, element);
    } else if (element instanceof PackageableRuntime) {
      return new PackageableRuntimeEditorState(this, element);
    } else if (element instanceof PackageableConnection) {
      return new PackageableConnectionEditorState(this, element);
    } else if (element instanceof Mapping) {
      return new MappingEditorState(this, element);
    } else if (element instanceof Service) {
      return new ServiceEditorState(this, element);
    } else if (element instanceof GenerationSpecification) {
      return new GenerationSpecificationEditorState(this, element);
    } else if (element instanceof FileGenerationSpecification) {
      return new FileGenerationEditorState(this, element);
    } else if (element instanceof DataElement) {
      return new PackageableDataEditorState(this, element);
    }
    const extraElementEditorStateCreators = this.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementEditorStateCreators?.() ?? [],
      );
    for (const creator of extraElementEditorStateCreators) {
      const elementEditorState = creator(this, element);
      if (elementEditorState) {
        return elementEditorState;
      }
    }
    throw new UnsupportedOperationError(
      `Can't create editor state for element: no compatible editor state creator available from plugins`,
      element,
    );
  }

  *addElement(
    element: PackageableElement,
    packagePath: string | undefined,
    openAfterCreate: boolean,
  ): GeneratorFn<void> {
    graph_addElement(
      this.graphManagerState.graph,
      element,
      packagePath,
      this.changeDetectionState.observerContext,
    );
    this.explorerTreeState.reprocess();

    if (openAfterCreate) {
      this.tabManagerState.openElementEditor(element);
    }
  }

  *deleteElement(element: PackageableElement): GeneratorFn<void> {
    if (
      this.graphState.checkIfApplicationUpdateOperationIsRunning() ||
      isElementReadOnly(element)
    ) {
      return;
    }
    const generatedChildrenElements = (
      this.graphState.graphGenerationState.generatedEntities.get(
        element.path,
      ) ?? []
    )
      .map((genChildEntity) =>
        this.graphManagerState.graph.generationModel.allOwnElements.find(
          (genElement) => genElement.path === genChildEntity.path,
        ),
      )
      .filter(isNonNullable);
    const elementsToDelete = [element, ...generatedChildrenElements];
    this.tabManagerState.tabs = this.tabManagerState.tabs.filter(
      (elementState) => {
        if (elementState instanceof ElementEditorState) {
          if (elementState === this.tabManagerState.currentTab) {
            // avoid closing the current editor state as this will be taken care of
            // by the `closeState()` call later
            return true;
          }
          return !elementsToDelete.includes(elementState.element);
        }
        return true;
      },
    );
    if (
      this.tabManagerState.currentTab &&
      this.tabManagerState.currentTab instanceof ElementEditorState &&
      elementsToDelete.includes(this.tabManagerState.currentTab.element)
    ) {
      this.tabManagerState.closeTab(this.tabManagerState.currentTab);
    }
    // remove/retire the element's generated children before remove the element itself
    generatedChildrenElements.forEach((el) =>
      graph_deleteOwnElement(this.graphManagerState.graph.generationModel, el),
    );
    graph_deleteElement(this.graphManagerState.graph, element);

    const extraElementEditorPostDeleteActions = this.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementEditorPostDeleteActions?.() ?? [],
      );
    for (const postDeleteAction of extraElementEditorPostDeleteActions) {
      postDeleteAction(this, element);
    }

    // reprocess project explorer tree
    this.explorerTreeState.reprocess();
    // recompile
    yield flowResult(
      this.graphState.globalCompileInFormMode({
        message: `Can't compile graph after deletion and error cannot be located in form mode. Redirected to text mode for debugging`,
      }),
    );
  }

  *renameElement(
    element: PackageableElement,
    newPath: string,
  ): GeneratorFn<void> {
    if (isElementReadOnly(element)) {
      return;
    }
    graph_renameElement(
      this.graphManagerState.graph,
      element,
      newPath,
      this.changeDetectionState.observerContext,
    );

    const extraElementEditorPostRenameActions = this.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementEditorPostRenameActions?.() ?? [],
      );
    for (const postRenameAction of extraElementEditorPostRenameActions) {
      postRenameAction(this, element);
    }

    // reprocess project explorer tree
    this.explorerTreeState.reprocess();
    if (element instanceof Package) {
      this.explorerTreeState.openNode(element);
    } else if (element.package) {
      this.explorerTreeState.openNode(element.package);
    }
    // recompile
    yield flowResult(
      this.graphState.globalCompileInFormMode({
        message: `Can't compile graph after renaming and error cannot be located in form mode. Redirected to text mode for debugging`,
      }),
    );
  }

  *toggleTextMode(): GeneratorFn<void> {
    if (this.isInFormMode) {
      if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) {
        return;
      }
      this.applicationStore.setBlockingAlert({
        message: 'Switching to text mode...',
        showLoading: true,
      });
      try {
        const graphGrammar =
          (yield this.graphManagerState.graphManager.graphToPureCode(
            this.graphManagerState.graph,
          )) as string;
        yield flowResult(
          this.grammarTextEditorState.setGraphGrammarText(graphGrammar),
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notifyWarning(
          `Can't enter text mode: transformation to grammar text failed. Error: ${error.message}`,
        );
        this.applicationStore.setBlockingAlert(undefined);
        return;
      }
      this.applicationStore.setBlockingAlert(undefined);
      this.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
      // navigate to the currently opened element immediately after entering text mode editor
      if (this.tabManagerState.currentTab instanceof ElementEditorState) {
        this.grammarTextEditorState.setCurrentElementLabelRegexString(
          this.tabManagerState.currentTab.element,
        );
      }
    } else if (this.isInGrammarTextMode) {
      yield flowResult(this.graphState.leaveTextMode());
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
        PACKAGEABLE_ELEMENT_TYPE.MAPPING,
        PACKAGEABLE_ELEMENT_TYPE.RUNTIME,
        PACKAGEABLE_ELEMENT_TYPE.CONNECTION,
        PACKAGEABLE_ELEMENT_TYPE.SERVICE,
        PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION,
        PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION,
        PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE,
        PACKAGEABLE_ELEMENT_TYPE.DATABASE,
        PACKAGEABLE_ELEMENT_TYPE.DATA,
      ] as string[]
    ).concat(
      this.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_LegendStudioApplicationPlugin_Extension
            ).getExtraSupportedElementTypes?.() ?? [],
        ),
    );
  }
}
