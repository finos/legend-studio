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

import { action, flowResult, makeAutoObservable } from 'mobx';
import { ClassEditorState } from './editor-state/element-editor-state/ClassEditorState';
import { ExplorerTreeState } from './ExplorerTreeState';
import {
  ACTIVITY_MODE,
  AUX_PANEL_MODE,
  GRAPH_EDITOR_MODE,
  EDITOR_MODE,
  STUDIO_HOTKEY,
  STUDIO_HOTKEY_MAP,
} from './EditorConfig';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState';
import { MappingEditorState } from './editor-state/element-editor-state/mapping/MappingEditorState';
import type { GraphBuilderReport } from './EditorGraphState';
import { EditorGraphState, GraphBuilderStatus } from './EditorGraphState';
import { ChangeDetectionState } from './ChangeDetectionState';
import { NewElementState } from './NewElementState';
import { WorkspaceUpdaterState } from './sidebar-state/WorkspaceUpdaterState';
import { ProjectOverviewState } from './sidebar-state/ProjectOverviewState';
import { WorkspaceReviewState } from './sidebar-state/WorkspaceReviewState';
import { LocalChangesState } from './sidebar-state/LocalChangesState';
import { ConflictResolutionState } from './sidebar-state/ConflictResolutionState';
import { WorkspaceBuildsState } from './sidebar-state/WorkspaceBuildsState';
import { GrammarTextEditorState } from './editor-state/GrammarTextEditorState';
import type { Clazz, GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  LogEvent,
  addUniqueEntry,
  isNonNullable,
  assertErrorThrown,
  guaranteeType,
  guaranteeNonNullable,
  UnsupportedOperationError,
  assertNonNullable,
  assertTrue,
  ActionState,
} from '@finos/legend-shared';
import { UMLEditorState } from './editor-state/element-editor-state/UMLEditorState';
import { ServiceEditorState } from './editor-state/element-editor-state/service/ServiceEditorState';
import { EditorSdlcState } from './EditorSdlcState';
import { ModelLoaderState } from './editor-state/ModelLoaderState';
import type { EditorState } from './editor-state/EditorState';
import { EntityDiffViewState } from './editor-state/entity-diff-editor-state/EntityDiffViewState';
import { FunctionEditorState } from './editor-state/element-editor-state/FunctionEditorState';
import { ProjectConfigurationEditorState } from './editor-state/ProjectConfigurationEditorState';
import { PackageableRuntimeEditorState } from './editor-state/element-editor-state/RuntimeEditorState';
import { PackageableConnectionEditorState } from './editor-state/element-editor-state/connection/ConnectionEditorState';
import { FileGenerationEditorState } from './editor-state/element-editor-state/FileGenerationEditorState';
import { EntityDiffEditorState } from './editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { EntityChangeConflictEditorState } from './editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { CHANGE_DETECTION_LOG_EVENT } from './ChangeDetectionLogEvent';
import { GenerationSpecificationEditorState } from './editor-state/GenerationSpecificationEditorState';
import { UnsupportedElementEditorState } from './editor-state/UnsupportedElementEditorState';
import { FileGenerationViewerState } from './editor-state/FileGenerationViewerState';
import type { GenerationFile } from './shared/FileGenerationTreeUtil';
import type { ElementFileGenerationState } from './editor-state/element-editor-state/ElementFileGenerationState';
import { DevToolState } from './aux-panel-state/DevToolState';
import {
  generateSetupRoute,
  generateViewProjectRoute,
} from './LegendStudioRouter';
import { NonBlockingDialogState, PanelDisplayState } from '@finos/legend-art';
import type { PackageableElementOption } from './shared/PackageableElementOptionUtil';
import { buildElementOption } from './shared/PackageableElementOptionUtil';
import type { DSL_StudioPlugin_Extension } from './StudioPlugin';
import type { Entity } from '@finos/legend-model-storage';
import type { SDLCServerClient } from '@finos/legend-server-sdlc';
import { ProjectConfiguration } from '@finos/legend-server-sdlc';
import type {
  PackageableElement,
  Type,
  Store,
  GraphManagerState,
} from '@finos/legend-graph';
import {
  GRAPH_MANAGER_LOG_EVENT,
  PACKAGEABLE_ELEMENT_TYPE,
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
  PRIMITIVE_TYPE,
  Package,
} from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { StudioPluginManager } from '../application/StudioPluginManager';
import type {
  ActionAlertInfo,
  ApplicationStore,
  BlockingAlertInfo,
} from '@finos/legend-application';
import {
  ActionAlertActionType,
  ActionAlertType,
  APPLICATION_LOG_EVENT,
  TAB_SIZE,
} from '@finos/legend-application';
import { STUDIO_LOG_EVENT } from './StudioLogEvent';
import type { StudioConfig } from '../application/StudioConfig';

export abstract class EditorExtensionState {
  private readonly _$nominalTypeBrand!: 'EditorExtensionState';
}

export class EditorHotkey {
  name: string;
  keyBinds: string[];
  handler: (event?: KeyboardEvent) => void;

  constructor(
    name: string,
    keyBinds: string[],
    handler: (event?: KeyboardEvent) => void,
  ) {
    this.name = name;
    this.keyBinds = keyBinds;
    this.handler = handler;
  }
}

export class EditorStore {
  applicationStore: ApplicationStore<StudioConfig>;
  sdlcServerClient: SDLCServerClient;
  depotServerClient: DepotServerClient;
  pluginManager: StudioPluginManager;

  editorExtensionStates: EditorExtensionState[] = [];
  explorerTreeState: ExplorerTreeState;
  sdlcState: EditorSdlcState;
  graphState: EditorGraphState;
  graphManagerState: GraphManagerState;
  changeDetectionState: ChangeDetectionState;
  grammarTextEditorState: GrammarTextEditorState;
  modelLoaderState: ModelLoaderState;
  projectConfigurationEditorState: ProjectConfigurationEditorState;
  projectOverviewState: ProjectOverviewState;
  workspaceBuildsState: WorkspaceBuildsState;
  workspaceUpdaterState: WorkspaceUpdaterState;
  workspaceReviewState: WorkspaceReviewState;
  localChangesState: LocalChangesState;
  conflictResolutionState: ConflictResolutionState;
  devToolState: DevToolState;

  private _isDisposed = false;
  initState = ActionState.create();
  mode = EDITOR_MODE.STANDARD;
  graphEditMode = GRAPH_EDITOR_MODE.FORM;

  // Aux Panel
  activeAuxPanelMode: AUX_PANEL_MODE = AUX_PANEL_MODE.CONSOLE;
  auxPanelDisplayState = new PanelDisplayState({
    initial: 0,
    default: 300,
    snap: 100,
  });
  // Side Bar
  activeActivity?: ACTIVITY_MODE = ACTIVITY_MODE.EXPLORER;
  sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });

  // Hot keys
  blockGlobalHotkeys = false;
  defaultHotkeys: EditorHotkey[] = [];
  hotkeys: EditorHotkey[] = [];

  // Tabs
  currentEditorState?: EditorState | undefined;
  openedEditorStates: EditorState[] = [];
  newElementState: NewElementState;
  /**
   * Since we want to share element generation state across all element in the editor, we will create 1 element generate state
   * per file generation configuration type.
   */
  elementGenerationStates: ElementFileGenerationState[] = [];
  searchElementCommandState = new NonBlockingDialogState();
  isInExpandedMode = true;
  backdrop = false;
  ignoreNavigationBlocking = false;
  isDevToolEnabled = true;

  constructor(
    applicationStore: ApplicationStore<StudioConfig>,
    sdlcServerClient: SDLCServerClient,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: StudioPluginManager,
  ) {
    makeAutoObservable(this, {
      applicationStore: false,
      sdlcServerClient: false,
      depotServerClient: false,
      graphState: false,
      graphManagerState: false,
      setMode: action,
      setDevTool: action,
      setHotkeys: action,
      addHotKey: action,
      resetHotkeys: action,
      setBlockGlobalHotkeys: action,
      setCurrentEditorState: action,
      setBackdrop: action,
      setExpandedMode: action,
      setActiveAuxPanelMode: action,
      setIgnoreNavigationBlocking: action,
      refreshCurrentEntityDiffEditorState: action,
      setBlockingAlert: action,
      setActionAltertInfo: action,
      cleanUp: action,
      reset: action,
      setGraphEditMode: action,
      setActiveActivity: action,
      closeState: action,
      closeAllOtherStates: action,
      closeAllStates: action,
      openState: action,
      openEntityDiff: action,
      openEntityChangeConflict: action,
      openSingletonEditorState: action,
      openElement: action,
      reprocessElementEditorState: action,
      openGeneratedFile: action,
      closeAllEditorTabs: action,
    });

    this.applicationStore = applicationStore;
    this.sdlcServerClient = sdlcServerClient;
    this.depotServerClient = depotServerClient;
    this.pluginManager = pluginManager;

    this.sdlcState = new EditorSdlcState(this);
    this.graphState = new EditorGraphState(this);
    this.graphManagerState = graphManagerState;
    this.changeDetectionState = new ChangeDetectionState(this, this.graphState);
    this.devToolState = new DevToolState(this);
    // side bar panels
    this.explorerTreeState = new ExplorerTreeState(this);
    this.projectOverviewState = new ProjectOverviewState(this, this.sdlcState);
    this.workspaceBuildsState = new WorkspaceBuildsState(this, this.sdlcState);
    this.workspaceUpdaterState = new WorkspaceUpdaterState(
      this,
      this.sdlcState,
    );
    this.workspaceReviewState = new WorkspaceReviewState(this, this.sdlcState);
    this.localChangesState = new LocalChangesState(this, this.sdlcState);
    this.conflictResolutionState = new ConflictResolutionState(
      this,
      this.sdlcState,
    );
    this.newElementState = new NewElementState(this);
    // special (singleton) editors
    this.grammarTextEditorState = new GrammarTextEditorState(this);
    this.modelLoaderState = new ModelLoaderState(this);
    this.projectConfigurationEditorState = new ProjectConfigurationEditorState(
      this,
      this.sdlcState,
    );
    // extensions
    this.editorExtensionStates = this.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) => plugin.getExtraEditorExtensionStateCreators?.() ?? [],
      )
      .map((creator) => creator(this))
      .filter(isNonNullable);

    // hotkeys
    this.defaultHotkeys = [
      // actions that need blocking
      new EditorHotkey(
        STUDIO_HOTKEY.COMPILE,
        [STUDIO_HOTKEY_MAP.COMPILE],
        this.createGlobalHotKeyAction(() => {
          flowResult(this.graphState.globalCompileInFormMode()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.GENERATE,
        [STUDIO_HOTKEY_MAP.GENERATE],
        this.createGlobalHotKeyAction(() => {
          flowResult(
            this.graphState.graphGenerationState.globalGenerate(),
          ).catch(applicationStore.alertIllegalUnhandledError);
        }),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.CREATE_ELEMENT,
        [STUDIO_HOTKEY_MAP.CREATE_ELEMENT],
        this.createGlobalHotKeyAction(() => this.newElementState.openModal()),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.OPEN_ELEMENT,
        [STUDIO_HOTKEY_MAP.OPEN_ELEMENT],
        this.createGlobalHotKeyAction(() =>
          this.searchElementCommandState.open(),
        ),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_TEXT_MODE,
        [STUDIO_HOTKEY_MAP.TOGGLE_TEXT_MODE],
        this.createGlobalHotKeyAction(() => {
          flowResult(this.toggleTextMode()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_MODEL_LOADER,
        [STUDIO_HOTKEY_MAP.TOGGLE_MODEL_LOADER],
        this.createGlobalHotKeyAction(() =>
          this.openState(this.modelLoaderState),
        ),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.SYNC_WITH_WORKSPACE,
        [STUDIO_HOTKEY_MAP.SYNC_WITH_WORKSPACE],
        this.createGlobalHotKeyAction(() => {
          flowResult(this.localChangesState.syncWithWorkspace()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }),
      ),
      // simple actions (no blocking is needed)
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_AUX_PANEL,
        [STUDIO_HOTKEY_MAP.TOGGLE_AUX_PANEL],
        this.createGlobalHotKeyAction(() => this.auxPanelDisplayState.toggle()),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_SIDEBAR_EXPLORER,
        [STUDIO_HOTKEY_MAP.TOGGLE_SIDEBAR_EXPLORER],
        this.createGlobalHotKeyAction(() =>
          this.setActiveActivity(ACTIVITY_MODE.EXPLORER),
        ),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_SIDEBAR_CHANGES,
        [STUDIO_HOTKEY_MAP.TOGGLE_SIDEBAR_CHANGES],
        this.createGlobalHotKeyAction(() =>
          this.setActiveActivity(ACTIVITY_MODE.CHANGES),
        ),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW,
        [STUDIO_HOTKEY_MAP.TOGGLE_SIDEBAR_WORKSPACE_REVIEW],
        this.createGlobalHotKeyAction(() =>
          this.setActiveActivity(ACTIVITY_MODE.WORKSPACE_REVIEW),
        ),
      ),
      new EditorHotkey(
        STUDIO_HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER,
        [STUDIO_HOTKEY_MAP.TOGGLE_SIDEBAR_WORKSPACE_UPDATER],
        this.createGlobalHotKeyAction(() =>
          this.setActiveActivity(ACTIVITY_MODE.WORKSPACE_UPDATER),
        ),
      ),
    ];
    this.hotkeys = this.defaultHotkeys;
  }

  // NOTE: once we clear up the editor store to make modes more separated
  // we should remove these sets of functions. They are basically hacks to
  // ensure hiding parts of the UI based on the editing mode.
  // Instead, perhaps, we should think of separating the modes out and if
  // it is needed that they share `EditorStore`, we should make them pass in
  // a set of config for the feature of the store instead of using
  // flags like this
  // See https://github.com/finos/legend-studio/issues/317
  get isInViewerMode(): boolean {
    return this.mode === EDITOR_MODE.VIEWER;
  }
  get isInConflictResolutionMode(): boolean {
    return this.mode === EDITOR_MODE.CONFLICT_RESOLUTION;
  }
  get isInitialized(): boolean {
    return (
      Boolean(
        this.sdlcState.currentProject &&
          this.sdlcState.currentWorkspace &&
          this.sdlcState.currentRevision,
      ) && this.graphManagerState.systemModel.buildState.hasSucceeded
    );
  }
  get isInGrammarTextMode(): boolean {
    return this.graphEditMode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT;
  }
  get isInFormMode(): boolean {
    return this.graphEditMode === GRAPH_EDITOR_MODE.FORM;
  }
  get hasUnsyncedChanges(): boolean {
    return Boolean(
      this.changeDetectionState.workspaceLatestRevisionState.changes.length,
    );
  }

  setMode(val: EDITOR_MODE): void {
    this.mode = val;
  }

  setDevTool(val: boolean): void {
    this.isDevToolEnabled = val;
  }

  setHotkeys(val: EditorHotkey[]): void {
    this.hotkeys = val;
  }

  addHotKey(val: EditorHotkey): void {
    addUniqueEntry(this.hotkeys, val);
  }

  resetHotkeys(): void {
    this.hotkeys = this.defaultHotkeys;
  }

  setBlockGlobalHotkeys(val: boolean): void {
    this.blockGlobalHotkeys = val;
  }

  setCurrentEditorState(val: EditorState | undefined): void {
    this.currentEditorState = val;
  }

  setBackdrop(val: boolean): void {
    this.backdrop = val;
  }

  setExpandedMode(val: boolean): void {
    this.isInExpandedMode = val;
  }

  setActiveAuxPanelMode(val: AUX_PANEL_MODE): void {
    this.activeAuxPanelMode = val;
  }

  setIgnoreNavigationBlocking(val: boolean): void {
    this.ignoreNavigationBlocking = val;
  }

  refreshCurrentEntityDiffEditorState(): void {
    if (this.currentEditorState instanceof EntityDiffEditorState) {
      this.currentEditorState.refresh();
    }
  }

  setBlockingAlert(alertInfo: BlockingAlertInfo | undefined): void {
    if (this._isDisposed) {
      return;
    }
    this.setBlockGlobalHotkeys(Boolean(alertInfo)); // block global hotkeys if alert is shown
    this.applicationStore.setBlockingAlert(alertInfo);
  }

  setActionAltertInfo(alertInfo: ActionAlertInfo | undefined): void {
    if (this._isDisposed) {
      return;
    }
    this.applicationStore.setActionAltertInfo(alertInfo);
  }

  cleanUp(): void {
    // dismiss all the alerts as these are parts of application, if we don't do this, we might
    // end up blocking other parts of the app
    // e.g. trying going to an unknown workspace, we will be redirected to the home page
    // but the blocking alert for not-found workspace will still block the app
    this.setBlockingAlert(undefined);
    this.setActionAltertInfo(undefined);
    // stop change detection to avoid memory-leak
    this.changeDetectionState.stop();
    this._isDisposed = true;
  }

  reset(): void {
    this.setCurrentEditorState(undefined);
    this.openedEditorStates = [];
    this.projectConfigurationEditorState = new ProjectConfigurationEditorState(
      this,
      this.sdlcState,
    );
    this.explorerTreeState = new ExplorerTreeState(this);
  }

  /**
   * This is the entry of the app logic where initialization of editor states happens
   * Here, we ensure the order of calls after checking existence of current project and workspace
   * If either of them does not exist, we cannot proceed.
   */
  *initialize(projectId: string, workspaceId: string): GeneratorFn<void> {
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
          LogEvent.create(APPLICATION_LOG_EVENT.DEVELOPMENT_ISSUE),
          `Fast-refreshing the app - undoing cleanUp() and preventing initialize() recall in editor store...`,
        );
        this.changeDetectionState.start();
        this._isDisposed = false;
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
    };

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
      this.setActionAltertInfo({
        message: `Project not found or inaccessible`,
        prompt: 'Please check that the project exists and request access to it',
        type: ActionAlertType.STANDARD,
        onEnter: (): void => this.setBlockGlobalHotkeys(true),
        onClose: (): void => this.setBlockGlobalHotkeys(false),
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
            label: 'Back to setup page',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigator.goTo(
                generateSetupRoute(
                  this.applicationStore.config.sdlcServerKey,
                  undefined,
                ),
              );
            },
          },
        ],
      });
      onLeave(false);
      return;
    }
    yield flowResult(
      this.sdlcState.fetchCurrentWorkspace(projectId, workspaceId, {
        suppressNotification: true,
      }),
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
          );
          this.applicationStore.setBlockingAlert(undefined);
          this.applicationStore.notifySuccess(
            `Workspace '${workspace.workspaceId}' is succesfully created. Reloading application...`,
          );
          this.applicationStore.navigator.reload();
        } catch (error) {
          assertErrorThrown(error);
          this.applicationStore.log.error(
            LogEvent.create(STUDIO_LOG_EVENT.WORKSPACE_SETUP_FAILURE),
            error,
          );
          this.applicationStore.notifyError(error);
        }
      };
      this.setActionAltertInfo({
        message: 'Workspace not found',
        prompt: `Please note that you can check out the project in viewer mode. Workspace is only required if you need to work on the project.`,
        type: ActionAlertType.STANDARD,
        onEnter: (): void => this.setBlockGlobalHotkeys(true),
        onClose: (): void => this.setBlockGlobalHotkeys(false),
        actions: [
          {
            label: 'View project',
            default: true,
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigator.goTo(
                generateViewProjectRoute(
                  this.applicationStore.config.sdlcServerKey,
                  projectId,
                ),
              );
            },
          },
          {
            label: 'Create workspace',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              createWorkspaceAndRelaunch().catch(
                this.applicationStore.alertIllegalUnhandledError,
              );
            },
          },
          {
            label: 'Back to setup page',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.navigator.goTo(
                generateSetupRoute(
                  this.applicationStore.config.sdlcServerKey,
                  projectId,
                  workspaceId,
                ),
              );
            },
          },
        ],
      });
      onLeave(false);
      return;
    }
    yield Promise.all([
      this.sdlcState.fetchCurrentRevision(projectId, workspaceId),
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
          tracerServicePlugins: this.pluginManager.getTracerServicePlugins(),
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
      this.modelLoaderState.fetchAvailableModelImportDescriptions(),
      this.sdlcState.fetchProjectVersions(),
    ]);
  }

  private *initConflictResolutionMode(): GeneratorFn<void> {
    this.setActionAltertInfo({
      message: 'Failed to update workspace.',
      prompt:
        'You can discard all of your changes or review them, resolve all merge conflicts and fix any potential compilation issues as well as test failures',
      type: ActionAlertType.CAUTION,
      onEnter: (): void => this.setBlockGlobalHotkeys(true),
      onClose: (): void => this.setBlockGlobalHotkeys(false),
      actions: [
        {
          label: 'Discard your changes',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: (): void => {
            this.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
            flowResult(
              this.conflictResolutionState.discardConflictResolutionChanges(),
            ).catch((error) =>
              this.applicationStore.alertIllegalUnhandledError(error),
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
      this.modelLoaderState.fetchAvailableModelImportDescriptions(),
      this.sdlcState.fetchProjectVersions(),
    ]);
  }

  *buildGraph(): GeneratorFn<void> {
    const startTime = Date.now();
    let entities: Entity[];
    let projectConfiguration: PlainObject<ProjectConfiguration>;
    this.graphState.isInitializingGraph = true;
    try {
      // fetch workspace entities and config at the same time
      const result = (yield Promise.all([
        this.sdlcServerClient.getEntities(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
        ),
        this.sdlcServerClient.getConfiguration(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
        ),
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
      this.changeDetectionState.workspaceLatestRevisionState.setEntities(
        entities,
      );
      this.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_ENTITIES_FETCHED),
        Date.now() - startTime,
        'ms',
      );
    } catch {
      return;
    }

    try {
      const graphBuilderReport = (yield flowResult(
        this.graphState.buildGraph(entities),
      )) as GraphBuilderReport;

      if (graphBuilderReport.error) {
        if (
          graphBuilderReport.status ===
          GraphBuilderStatus.REDIRECTED_TO_TEXT_MODE
        ) {
          yield flowResult(
            this.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
              entities,
              LogEvent.create(
                CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
              ),
            ),
          );
        }
        return;
      }

      // ======= (RE)START CHANGE DETECTION =======
      this.changeDetectionState.stop();
      yield Promise.all([
        this.graphManagerState.precomputeHashes(), // for local changes detection
        this.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          entities,
          LogEvent.create(
            CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
          ),
        ),
        this.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex(),
        this.sdlcState.buildProjectLatestRevisionEntityHashesIndex(),
      ]);
      this.changeDetectionState.start();
      yield Promise.all([
        this.changeDetectionState.computeLocalChanges(true),
        this.changeDetectionState.computeAggregatedWorkspaceChanges(true),
        this.changeDetectionState.computeAggregatedProjectLatestChanges(true),
      ]);
      this.applicationStore.log.info(
        LogEvent.create(CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_RESTARTED),
        '[ASNYC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch {
      // since errors have been handled accordingly, we don't need to do anything here
      return;
    }
  }

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentEditorState,
      clazz,
      `Current editor state is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  getEditorExtensionState<T extends EditorExtensionState>(clazz: Clazz<T>): T {
    return guaranteeNonNullable(
      this.editorExtensionStates.find(
        (extenionState): extenionState is T => extenionState instanceof clazz,
      ),
      `Can't find extension editor state of the specified type: no built extension editor state available from plugins`,
    );
  }

  setGraphEditMode(graphEditor: GRAPH_EDITOR_MODE): void {
    this.graphEditMode = graphEditor;
    this.graphState.clearCompilationError();
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

  closeState(editorState: EditorState): void {
    const elementIndex = this.openedEditorStates.findIndex(
      (e) => e === editorState,
    );
    assertTrue(elementIndex !== -1, `Can't close a tab which is not opened`);
    this.openedEditorStates.splice(elementIndex, 1);
    if (this.currentEditorState === editorState) {
      if (this.openedEditorStates.length) {
        const openIndex = elementIndex - 1;
        this.setCurrentEditorState(
          openIndex >= 0
            ? this.openedEditorStates[openIndex]
            : this.openedEditorStates[0],
        );
      } else {
        this.setCurrentEditorState(undefined);
      }
    }
    this.explorerTreeState.reprocess();
  }

  closeAllOtherStates(editorState: EditorState): void {
    assertNonNullable(
      this.openedEditorStates.find((e) => e === editorState),
      'Editor tab should be currently opened',
    );
    this.currentEditorState = editorState;
    this.openedEditorStates = [editorState];
    this.explorerTreeState.reprocess();
  }

  closeAllStates(): void {
    this.currentEditorState = undefined;
    this.openedEditorStates = [];
    this.explorerTreeState.reprocess();
  }

  openState(editorState: EditorState): void {
    if (editorState instanceof ElementEditorState) {
      this.openElement(editorState.element);
    } else if (editorState instanceof EntityDiffViewState) {
      this.openEntityDiff(editorState);
    } else if (editorState instanceof EntityChangeConflictEditorState) {
      this.openEntityChangeConflict(editorState);
    } else if (editorState instanceof FileGenerationViewerState) {
      this.openGeneratedFile(editorState.generatedFile);
    } else if (editorState === this.modelLoaderState) {
      this.openSingletonEditorState(this.modelLoaderState);
    } else if (editorState === this.projectConfigurationEditorState) {
      this.openSingletonEditorState(this.projectConfigurationEditorState);
    } else {
      throw new UnsupportedOperationError(
        `Can't open editor state`,
        editorState,
      );
    }
    this.explorerTreeState.reprocess();
  }

  openEntityDiff(entityDiffEditorState: EntityDiffViewState): void {
    const existingEditorState = this.openedEditorStates.find(
      (editorState) =>
        editorState instanceof EntityDiffViewState &&
        editorState.fromEntityPath === entityDiffEditorState.fromEntityPath &&
        editorState.toEntityPath === entityDiffEditorState.toEntityPath &&
        editorState.fromRevision === entityDiffEditorState.fromRevision &&
        editorState.toRevision === entityDiffEditorState.toRevision,
    );
    const diffEditorState = existingEditorState ?? entityDiffEditorState;
    if (!existingEditorState) {
      this.openedEditorStates.push(diffEditorState);
    }
    this.setCurrentEditorState(diffEditorState);
  }

  openEntityChangeConflict(
    entityChangeConflictEditorState: EntityChangeConflictEditorState,
  ): void {
    const existingEditorState = this.openedEditorStates.find(
      (editorState) =>
        editorState instanceof EntityChangeConflictEditorState &&
        editorState.entityPath === entityChangeConflictEditorState.entityPath,
    );
    const conflictEditorState =
      existingEditorState ?? entityChangeConflictEditorState;
    if (!existingEditorState) {
      this.openedEditorStates.push(conflictEditorState);
    }
    this.setCurrentEditorState(conflictEditorState);
  }

  /**
   * This method helps open editor that only exists one instance at at time such as model-loader, project config, settings ...
   */
  openSingletonEditorState(
    singularEditorState: ModelLoaderState | ProjectConfigurationEditorState,
  ): void {
    const existingEditorState = this.openedEditorStates.find(
      (e) => e === singularEditorState,
    );
    const editorState = existingEditorState ?? singularEditorState;
    if (!existingEditorState) {
      this.openedEditorStates.push(editorState);
    }
    this.setCurrentEditorState(editorState);
  }

  createElementState(
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
    }
    const extraElementEditorStateCreators = this.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_StudioPlugin_Extension
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

  openElement(element: PackageableElement): void {
    if (this.isInGrammarTextMode) {
      // in text mode, we want to select the block of code that corresponds to the element if possible
      // the cheap way to do this is to search by element label text, e.g. `Mapping some::package::someMapping`
      this.grammarTextEditorState.setCurrentElementLabelRegexString(element);
    } else {
      const existingElementState = this.openedEditorStates.find(
        (state) =>
          state instanceof ElementEditorState && state.element === element,
      );
      const elementState =
        existingElementState ?? this.createElementState(element);
      if (elementState && !existingElementState) {
        this.openedEditorStates.push(elementState);
      }
      this.setCurrentEditorState(elementState);
      // expand tree node
      this.explorerTreeState.openNode(element);
    }
  }

  *deleteElement(element: PackageableElement): GeneratorFn<void> {
    if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) {
      return;
    }
    const generatedChildrenElements =
      this.graphManagerState.graph.generationModel.allOwnElements.filter(
        (e) => e.generationParentElement === element,
      );
    const elementsToDelete = [element, ...generatedChildrenElements];
    if (
      this.currentEditorState &&
      this.currentEditorState instanceof ElementEditorState &&
      elementsToDelete.includes(this.currentEditorState.element)
    ) {
      this.closeState(this.currentEditorState);
    }
    this.openedEditorStates = this.openedEditorStates.filter(
      (elementState) =>
        elementState instanceof ElementEditorState &&
        !generatedChildrenElements.includes(elementState.element),
    );
    // remove/retire the element's generated children before remove the element itself
    generatedChildrenElements.forEach((el) =>
      this.graphManagerState.graph.generationModel.deleteOwnElement(el),
    );
    this.graphManagerState.graph.deleteElement(element);

    const extraElementEditorPostDeleteActions = this.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_StudioPlugin_Extension
          ).getExtraElementEditorPostDeleteActions?.() ?? [],
      );
    for (const action of extraElementEditorPostDeleteActions) {
      action(this, element);
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
    if (element.isReadOnly) {
      return;
    }
    this.graphManagerState.graph.renameOwnElement(element, newPath);

    const extraElementEditorPostRenameActions = this.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_StudioPlugin_Extension
          ).getExtraElementEditorPostRenameActions?.() ?? [],
      );
    for (const action of extraElementEditorPostRenameActions) {
      action(this, element);
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

  // FIXME: to be removed when we process editor states properly
  reprocessElementEditorState = (
    editorState: EditorState,
  ): EditorState | undefined => {
    if (editorState instanceof ElementEditorState) {
      const correspondingElement =
        this.graphManagerState.graph.getNullableElement(
          editorState.element.path,
        );
      if (correspondingElement) {
        return editorState.reprocess(correspondingElement, this);
      }
    }
    // No need to reprocess generated file state as it has no reference to any of the graphs
    if (editorState instanceof FileGenerationViewerState) {
      return editorState;
    }
    return undefined;
  };

  // FIXME: to be removed when we process editor states properly
  findCurrentEditorState = (
    editor: EditorState | undefined,
  ): EditorState | undefined => {
    if (editor instanceof ElementEditorState) {
      return this.openedEditorStates.find(
        (es): es is ElementEditorState =>
          es instanceof ElementEditorState &&
          es.element.path === editor.element.path,
      );
    }
    if (editor instanceof FileGenerationViewerState) {
      return this.openedEditorStates.find((e) => e === editor);
    }
    return undefined;
  };

  openGeneratedFile(file: GenerationFile): void {
    const existingGeneratedFileState = this.openedEditorStates.find(
      (editorState) =>
        editorState instanceof FileGenerationViewerState &&
        editorState.generatedFile === file,
    );
    const generatedFileState =
      existingGeneratedFileState ?? new FileGenerationViewerState(this, file);
    if (!existingGeneratedFileState) {
      this.openedEditorStates.push(generatedFileState);
    }
    this.setCurrentEditorState(generatedFileState);
  }

  createGlobalHotKeyAction =
    (
      handler: (event?: KeyboardEvent) => void,
      preventDefault = true,
    ): ((event?: KeyboardEvent) => void) =>
    (event?: KeyboardEvent): void => {
      if (preventDefault) {
        event?.preventDefault();
      }
      // FIXME: maybe we should come up with a better way to block global hot keys, this seems highly restrictive.
      const isResolvingConflicts =
        this.isInConflictResolutionMode &&
        !this.conflictResolutionState.hasResolvedAllConflicts;
      if (
        (this.isInitialized &&
          !isResolvingConflicts &&
          !this.blockGlobalHotkeys) ||
        this.isInViewerMode
      ) {
        handler(event);
      }
    };

  closeAllEditorTabs(): void {
    this.setCurrentEditorState(undefined);
    this.openedEditorStates = [];
  }

  *toggleTextMode(): GeneratorFn<void> {
    if (this.isInFormMode) {
      if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) {
        return;
      }
      this.setBlockingAlert({
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
        this.setBlockingAlert(undefined);
        return;
      }
      this.setBlockingAlert(undefined);
      this.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
      // navigate to the currently opened element immediately after entering text mode editor
      if (this.currentEditorState instanceof ElementEditorState) {
        this.grammarTextEditorState.setCurrentElementLabelRegexString(
          this.currentEditorState.element,
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

  get enumerationOptions(): PackageableElementOption<Enumeration>[] {
    return this.graphManagerState.graph.ownEnumerations
      .concat(this.graphManagerState.graph.dependencyManager.enumerations)
      .map(
        (e) => buildElementOption(e) as PackageableElementOption<Enumeration>,
      );
  }

  get classOptions(): PackageableElementOption<Class>[] {
    return this.graphManagerState.graph.ownClasses
      .concat(
        this.graphManagerState.filterSystemElementOptions(
          this.graphManagerState.graph.systemModel.ownClasses,
        ),
      )
      .concat(this.graphManagerState.graph.dependencyManager.classes)
      .map((e) => buildElementOption(e) as PackageableElementOption<Class>);
  }

  get associationOptions(): PackageableElementOption<Association>[] {
    return this.graphManagerState.graph.ownAssociations
      .concat(
        this.graphManagerState.filterSystemElementOptions(
          this.graphManagerState.graph.systemModel.ownAssociations,
        ),
      )
      .concat(this.graphManagerState.graph.dependencyManager.associations)
      .map(
        (e) => buildElementOption(e) as PackageableElementOption<Association>,
      );
  }

  get profileOptions(): PackageableElementOption<Profile>[] {
    return this.graphManagerState.graph.ownProfiles
      .concat(
        this.graphManagerState.filterSystemElementOptions(
          this.graphManagerState.graph.systemModel.ownProfiles,
        ),
      )
      .concat(this.graphManagerState.graph.dependencyManager.profiles)
      .map((e) => buildElementOption(e) as PackageableElementOption<Profile>);
  }

  get classPropertyGenericTypeOptions(): PackageableElementOption<Type>[] {
    return this.graphManagerState.graph.primitiveTypes
      .filter((p) => p.path !== PRIMITIVE_TYPE.LATESTDATE)
      .map((e) => buildElementOption(e) as PackageableElementOption<Type>)
      .concat(
        this.graphManagerState.graph.ownTypes
          .concat(
            this.graphManagerState.filterSystemElementOptions(
              this.graphManagerState.graph.systemModel.ownTypes,
            ),
          )
          .concat(this.graphManagerState.graph.dependencyManager.types)
          .map((e) => buildElementOption(e) as PackageableElementOption<Type>),
      );
  }

  get mappingOptions(): PackageableElementOption<Mapping>[] {
    return this.graphManagerState.graph.ownMappings
      .concat(this.graphManagerState.graph.dependencyManager.mappings)
      .map((e) => buildElementOption(e) as PackageableElementOption<Mapping>);
  }

  get runtimeOptions(): PackageableElementOption<PackageableRuntime>[] {
    return this.graphManagerState.graph.ownRuntimes
      .concat(this.graphManagerState.graph.dependencyManager.runtimes)
      .map(
        (e) =>
          buildElementOption(e) as PackageableElementOption<PackageableRuntime>,
      );
  }

  get serviceOptions(): PackageableElementOption<Service>[] {
    return this.graphManagerState.graph.ownServices
      .concat(this.graphManagerState.graph.dependencyManager.services)
      .map((e) => buildElementOption(e) as PackageableElementOption<Service>);
  }

  get storeOptions(): PackageableElementOption<Store>[] {
    return this.graphManagerState.graph.ownStores
      .concat(this.graphManagerState.graph.dependencyManager.stores)
      .map((e) => buildElementOption(e) as PackageableElementOption<Store>);
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
      ] as string[]
    ).concat(
      this.pluginManager
        .getStudioPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_StudioPlugin_Extension
            ).getExtraSupportedElementTypes?.() ?? [],
        ),
    );
  }
}
