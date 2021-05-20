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

import { createContext, useContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { action, flow, makeAutoObservable } from 'mobx';
import type {
  ApplicationStore,
  ActionAlertInfo,
  BlockingAlertInfo,
} from './ApplicationStore';
import {
  useApplicationStore,
  ActionAlertActionType,
  ActionAlertType,
} from './ApplicationStore';
import { ClassEditorState } from './editor-state/element-editor-state/ClassEditorState';
import { editor as monacoEditorAPI } from 'monaco-editor';
import { ExplorerTreeState } from './ExplorerTreeState';
import {
  ACTIVITY_MODE,
  DEFAULT_SIDE_BAR_SIZE,
  AUX_PANEL_MODE,
  GRAPH_EDITOR_MODE,
  DEFAULT_AUX_PANEL_SIZE,
  EDITOR_MODE,
  MONOSPACED_FONT_FAMILY,
  TAB_SIZE,
} from './EditorConfig';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState';
import { MappingEditorState } from './editor-state/element-editor-state/mapping/MappingEditorState';
import { GraphState } from './GraphState';
import { ChangeDetectionState } from './ChangeDetectionState';
import { NewElementState } from './NewElementState';
import { WorkspaceUpdaterState } from './sidebar-state/WorkspaceUpdaterState';
import { ProjectOverviewState } from './sidebar-state/ProjectOverviewState';
import { WorkspaceReviewState } from './sidebar-state/WorkspaceReviewState';
import { LocalChangesState } from './sidebar-state/LocalChangesState';
import { ConflictResolutionState } from './sidebar-state/ConflictResolutionState';
import { WorkspaceBuildsState } from './sidebar-state/WorkspaceBuildsState';
import { GrammarTextEditorState } from './editor-state/GrammarTextEditorState';
import { DiagramEditorState } from './editor-state/element-editor-state/DiagramEditorState';
import type { Clazz, PlainObject } from '@finos/legend-studio-shared';
import { SDLCServerClient } from '../models/sdlc/SDLCServerClient';
import {
  isNonNullable,
  getClass,
  assertErrorThrown,
  guaranteeType,
  guaranteeNonNullable,
  UnsupportedOperationError,
  assertNonNullable,
  assertTrue,
  createObservableActionState,
} from '@finos/legend-studio-shared';
import { UMLEditorState } from './editor-state/element-editor-state/UMLEditorState';
import { ServiceEditorState } from './editor-state/element-editor-state/service/ServiceEditorState';
import { EditorSdlcState } from './EditorSdlcState';
import { ModelLoaderState } from './editor-state/ModelLoaderState';
import type { EditorState } from './editor-state/EditorState';
import { EntityDiffViewState } from './editor-state/entity-diff-editor-state/EntityDiffViewState';
import { FunctionEditorState } from './editor-state/element-editor-state/FunctionEditorState';
import { ProjectConfigurationEditorState } from './editor-state/ProjectConfigurationEditorState';
import { PackageableRuntimeEditorState } from './editor-state/element-editor-state/RuntimeEditorState';
import { PackageableConnectionEditorState } from './editor-state/element-editor-state/ConnectionEditorState';
import { FileGenerationEditorState } from './editor-state/element-editor-state/FileGenerationEditorState';
import { EntityDiffEditorState } from './editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { EntityChangeConflictEditorState } from './editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { CORE_LOG_EVENT } from '../utils/Logger';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import { ProjectConfiguration } from '../models/sdlc/models/configuration/ProjectConfiguration';
import { GenerationSpecificationEditorState } from './editor-state/GenerationSpecificationEditorState';
import { UnsupportedElementEditorState } from './editor-state/UnsupportedElementEditorState';
import { FileGenerationViewerState } from './editor-state/FileGenerationViewerState';
import type { GenerationFile } from './shared/FileGenerationTreeUtil';
import type { ElementFileGenerationState } from './editor-state/element-editor-state/ElementFileGenerationState';
import { DevToolState } from './aux-panel-state/DevToolState';
import { generateSetupRoute, generateViewProjectRoute } from './Router';
import { NonBlockingDialogState } from '@finos/legend-studio-components';
import type {
  PackageableElement,
  PackageableElementSelectOption,
} from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PACKAGEABLE_ELEMENT_TYPE } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PrimitiveType } from '../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import { Class } from '../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Profile } from '../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Association } from '../models/metamodels/pure/model/packageableElements/domain/Association';
import { ConcreteFunctionDefinition } from '../models/metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Measure } from '../models/metamodels/pure/model/packageableElements/domain/Measure';
import { Database } from '../models/metamodels/pure/model/packageableElements/store/relational/model/Database';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import { FlatData } from '../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { Mapping } from '../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Diagram } from '../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { Service } from '../models/metamodels/pure/model/packageableElements/service/Service';
import { PackageableRuntime } from '../models/metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from '../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { FileGenerationSpecification } from '../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { GenerationSpecification } from '../models/metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import { PRIMITIVE_TYPE } from '../models/MetaModelConst';
import type { Type } from '../models/metamodels/pure/model/packageableElements/domain/Type';
import type { Store } from '../models/metamodels/pure/model/packageableElements/store/Store';
import type { DSL_EditorPlugin_Extension } from './EditorPlugin';

export abstract class EditorExtensionState {
  private readonly _$nominalTypeBrand!: 'EditorExtensionState';
}

export class EditorStore {
  applicationStore: ApplicationStore;
  explorerTreeState: ExplorerTreeState;
  editorExtensionStates: EditorExtensionState[] = [];
  sdlcState: EditorSdlcState;
  graphState: GraphState;
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
  initState = createObservableActionState();
  mode = EDITOR_MODE.STANDARD;
  graphEditMode = GRAPH_EDITOR_MODE.FORM;
  // Aux Panel
  isMaxAuxPanelSizeSet = false;
  activeAuxPanelMode: AUX_PANEL_MODE = AUX_PANEL_MODE.MAPPING_EXECUTE;
  maxAuxPanelSize = DEFAULT_AUX_PANEL_SIZE;
  auxPanelSize = 0;
  previousAuxPanelSize = DEFAULT_AUX_PANEL_SIZE;
  // Side Bar
  activeActivity?: ACTIVITY_MODE = ACTIVITY_MODE.EXPLORER;
  sideBarSize = DEFAULT_SIDE_BAR_SIZE;
  sideBarSizeBeforeHidden = DEFAULT_SIDE_BAR_SIZE;
  // Tabs
  currentEditorState?: EditorState;
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
  blockGlobalHotkeys = false;
  isDevToolEnabled = false;

  constructor(applicationStore: ApplicationStore) {
    makeAutoObservable(this, {
      applicationStore: false,
      setMode: action,
      setDevTool: action,
      setBlockGlobalHotkeys: action,
      setCurrentEditorState: action,
      setBackdrop: action,
      setExpandedMode: action,
      setAuxPanelSize: action,
      setActiveAuxPanelMode: action,
      setSideBarSize: action,
      setIgnoreNavigationBlocking: action,
      refreshCurrentEntityDiffEditorState: action,
      setBlockingAlert: action,
      setActionAltertInfo: action,
      cleanUp: action,
      reset: action,
      openAuxPanel: action,
      toggleAuxPanel: action,
      toggleExpandAuxPanel: action,
      setMaxAuxPanelSize: action,
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
    this.sdlcState = new EditorSdlcState(this);
    this.graphState = new GraphState(this);
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
    this.editorExtensionStates = this.applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) => plugin.getExtraEditorExtensionStateCreators?.() ?? [],
      )
      .map((creator) => creator(this))
      .filter(isNonNullable);
  }

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
      ) && this.graphState.systemModel.isBuilt
    );
  }
  get isInGrammarTextMode(): boolean {
    return this.graphEditMode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT;
  }
  get isInFormMode(): boolean {
    return this.graphEditMode === GRAPH_EDITOR_MODE.FORM;
  }
  get isAuxPanelMaximized(): boolean {
    return this.auxPanelSize === this.maxAuxPanelSize;
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
  setAuxPanelSize(val: number): void {
    this.auxPanelSize = val;
  }
  setActiveAuxPanelMode(val: AUX_PANEL_MODE): void {
    this.activeAuxPanelMode = val;
  }
  setSideBarSize(val: number): void {
    this.sideBarSize = val;
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
  init = flow(function* (
    this: EditorStore,
    projectId: string,
    workspaceId: string,
  ) {
    if (!this.initState.isInInitialState) {
      /**
       * Since React `fast-refresh` will sometimes cause `Editor` to rerender, this method will be called again
       * as all hooks are recalled, as such, ONLY IN DEVELOPMENT mode we allow this to not fail-fast
       * we also have to `undo` some of what the `cleanUp` does to this store as the cleanup part of all hooks will be triggered
       * as well
       */
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        this.applicationStore.logger.info(
          CORE_LOG_EVENT.DEVELOPMENT_MODE,
          `Fast-refreshing the app - undoing cleanUp() and preventing init() recall in editor store...`,
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
      this.initState.conclude(hasBuildSucceeded);
    };

    yield this.sdlcState.fetchCurrentProject(projectId, {
      suppressNotification: true,
    });
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
              window.location.reload();
            },
          },
          {
            label: 'Back to setup page',
            type: ActionAlertActionType.STANDARD,
            handler: (): void => {
              this.applicationStore.historyApiClient.push(
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
    yield this.sdlcState.fetchCurrentWorkspace(projectId, workspaceId, {
      suppressNotification: true,
    });
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
          const workspace =
            await this.applicationStore.networkClientManager.sdlcClient.createWorkspace(
              projectId,
              workspaceId,
            );
          this.applicationStore.setBlockingAlert(undefined);
          this.applicationStore.notifySuccess(
            `Workspace '${workspace.workspaceId}' is succesfully created. Reloading application...`,
          );
          window.location.reload();
        } catch (error: unknown) {
          this.applicationStore.logger.error(
            CORE_LOG_EVENT.SETUP_PROBLEM,
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
              this.applicationStore.historyApiClient.push(
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
              this.applicationStore.historyApiClient.push(
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
      this.preloadTextEditorFont(),
      this.graphState.initializeSystem(), // this can be moved inside of `setupEngine`
      this.graphState.graphManager.setupEngine(
        this.applicationStore.pluginManager,
        {
          env: this.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            enableCompression: true,
            authenticationUrl: SDLCServerClient.authenticationUrl(
              this.applicationStore.config.sdlcServerUrl,
            ),
          },
        },
      ),
    ]);
    yield this.initMode();

    onLeave(true);
  });

  initMode = flow(function* (this: EditorStore) {
    switch (this.mode) {
      case EDITOR_MODE.STANDARD:
        yield this.initStandardMode();
        return;
      case EDITOR_MODE.CONFLICT_RESOLUTION:
        yield this.initConflictResolutionMode();
        return;
      default:
        throw new UnsupportedOperationError(
          `Can't initialize editor for unsupported mode '${this.mode}'`,
        );
    }
  });

  initStandardMode = flow(function* (this: EditorStore) {
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
  });

  initConflictResolutionMode = flow(function* (this: EditorStore) {
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
            this.conflictResolutionState
              .discardConflictResolutionChanges()
              .catch((error) =>
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
      this.conflictResolutionState.init(),
      this.sdlcState.checkIfWorkspaceIsOutdated(),
      this.projectConfigurationEditorState.fetchLatestProjectStructureVersion(),
      this.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.modelLoaderState.fetchAvailableModelImportDescriptions(),
      this.sdlcState.fetchProjectVersions(),
    ]);
  });

  buildGraph = flow(function* (this: EditorStore) {
    const startTime = Date.now();
    let entities: Entity[];
    let projectConfiguration: PlainObject<ProjectConfiguration>;
    this.graphState.isInitializingGraph = true;
    try {
      // fetch workspace entities and config at the same time
      const result = (yield Promise.all([
        this.applicationStore.networkClientManager.sdlcClient.getEntities(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
        ),
        this.applicationStore.networkClientManager.sdlcClient.getConfiguration(
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
      this.applicationStore.logger.info(
        CORE_LOG_EVENT.GRAPH_ENTITIES_FETCHED,
        Date.now() - startTime,
        'ms',
      );
    } catch (error: unknown) {
      return;
    }

    try {
      yield this.graphState.buildGraph(entities);

      // ======= (RE)START CHANGE DETECTION =======
      this.changeDetectionState.stop();
      yield Promise.all([
        this.graphState.graph.precomputeHashes(this.applicationStore.logger), // for local changes detection
        this.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          entities,
          CORE_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
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
      this.applicationStore.logger.info(
        CORE_LOG_EVENT.CHANGE_DETECTION_RESTARTED,
        '[ASNYC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch {
      // since errors have been handled accordingly, we don't need to do anything here
      return;
    }
  });

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(
      this.currentEditorState,
      clazz,
      `Expected current editor state to be of type '${clazz.name}' (this is caused by calling this method at the wrong place)`,
    );
  }

  getEditorExtensionState<T extends EditorExtensionState>(clazz: Clazz<T>): T {
    return guaranteeNonNullable(
      this.editorExtensionStates.find(
        (extenionState): extenionState is T => extenionState instanceof clazz,
      ),
      `Can't find extension editor state of type '${clazz.name}'. No built extension editor state available from plugins.`,
    );
  }

  openAuxPanel(
    auxPanelMode: AUX_PANEL_MODE,
    resetHeightIfTooSmall: boolean,
  ): void {
    this.activeAuxPanelMode = auxPanelMode;
    if (this.auxPanelSize === 0) {
      this.toggleAuxPanel();
    } else if (
      this.auxPanelSize < DEFAULT_AUX_PANEL_SIZE &&
      resetHeightIfTooSmall
    ) {
      this.auxPanelSize = DEFAULT_AUX_PANEL_SIZE;
    }
  }

  toggleAuxPanel(): void {
    if (this.auxPanelSize === 0) {
      this.auxPanelSize = this.previousAuxPanelSize;
    } else {
      this.previousAuxPanelSize = this.auxPanelSize || DEFAULT_AUX_PANEL_SIZE;
      this.auxPanelSize = 0;
    }
  }

  toggleExpandAuxPanel(): void {
    if (this.auxPanelSize === this.maxAuxPanelSize) {
      this.auxPanelSize =
        this.previousAuxPanelSize === this.maxAuxPanelSize
          ? DEFAULT_AUX_PANEL_SIZE
          : this.previousAuxPanelSize;
    } else {
      this.previousAuxPanelSize = this.auxPanelSize;
      this.auxPanelSize = this.maxAuxPanelSize;
    }
  }

  setMaxAuxPanelSize(val: number): void {
    if (this.isMaxAuxPanelSizeSet) {
      if (this.previousAuxPanelSize === this.maxAuxPanelSize) {
        this.previousAuxPanelSize = val;
      }
      if (this.auxPanelSize === this.maxAuxPanelSize) {
        this.auxPanelSize = val;
      }
    }
    this.maxAuxPanelSize = val;
    this.isMaxAuxPanelSizeSet = true;
  }

  setGraphEditMode(graphEditor: GRAPH_EDITOR_MODE): void {
    this.graphEditMode = graphEditor;
    this.graphState.clearCompilationError();
  }

  setActiveActivity(
    activity: ACTIVITY_MODE,
    options?: { keepShowingIfMatchedCurrent?: boolean },
  ): void {
    if (this.sideBarSize === 0) {
      this.sideBarSize = this.sideBarSizeBeforeHidden;
    } else if (
      activity === this.activeActivity &&
      !options?.keepShowingIfMatchedCurrent
    ) {
      this.sideBarSizeBeforeHidden = this.sideBarSize || DEFAULT_SIDE_BAR_SIZE;
      this.sideBarSize = 0;
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
        `Can't open unsupported editor state '${getClass(editorState).name}'`,
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

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
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
      element instanceof ServiceStore ||
      element instanceof FlatData
    ) {
      return new UnsupportedElementEditorState(this, element);
    } else if (element instanceof PackageableRuntime) {
      return new PackageableRuntimeEditorState(this, element);
    } else if (element instanceof PackageableConnection) {
      return new PackageableConnectionEditorState(this, element);
    } else if (element instanceof Mapping) {
      return new MappingEditorState(this, element);
    } else if (element instanceof Diagram) {
      return new DiagramEditorState(this, element);
    } else if (element instanceof Service) {
      return new ServiceEditorState(this, element);
    } else if (element instanceof GenerationSpecification) {
      return new GenerationSpecificationEditorState(this, element);
    } else if (element instanceof FileGenerationSpecification) {
      return new FileGenerationEditorState(this, element);
    }
    const extraElementEditorStateCreators = this.applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_EditorPlugin_Extension
          ).getExtraElementEditorStateCreators?.() ?? [],
      );
    for (const creator of extraElementEditorStateCreators) {
      const elementEditorState = creator(this, element);
      if (elementEditorState) {
        return elementEditorState;
      }
    }
    throw new UnsupportedOperationError(
      `Can't create editor state for element of type '${getClass(
        element,
      )}'. No compatible editor state creator available from plugins.`,
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

  deleteElement = flow(function* (
    this: EditorStore,
    element: PackageableElement,
  ) {
    if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) {
      return;
    }
    const generatedChildrenElements =
      this.graphState.graph.generationModel.allElements.filter(
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
      this.graphState.graph.generationModel.removeElement(el),
    );
    this.graphState.graph.removeElement(element);
    this.explorerTreeState.reprocess();
    // re-compile after deletion
    yield this.graphState.globalCompileInFormMode({
      message: `Can't compile graph after deletion and error cannot be located in form mode. Redirected to text mode for debugging.`,
    });
  });

  // FIXME: to be removed when we process editor states properly
  reprocessElementEditorState = (
    editorState: EditorState,
  ): EditorState | undefined => {
    if (editorState instanceof ElementEditorState) {
      const correspondingElement = this.graphState.graph.getNullableElement(
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
    (handler: () => void): ((event: KeyboardEvent | undefined) => void) =>
    (event: KeyboardEvent | undefined): void => {
      event?.preventDefault();
      // FIXME: maybe we should come up with a better way to block global hot keys, this seems highly restrictive.
      const isResolvingConflicts =
        this.isInConflictResolutionMode &&
        !this.conflictResolutionState.hasResolvedAllConflicts;
      if (
        this.isInitialized &&
        !isResolvingConflicts &&
        !this.blockGlobalHotkeys
      ) {
        handler();
      }
    };

  closeAllEditorTabs(): void {
    this.setCurrentEditorState(undefined);
    this.openedEditorStates = [];
  }

  toggleTextMode = flow(function* (this: EditorStore) {
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
          (yield this.graphState.graphManager.graphToPureCode(
            this.graphState.graph,
          )) as string;
        yield this.grammarTextEditorState.setGraphGrammarText(graphGrammar);
      } catch (error: unknown) {
        assertErrorThrown(error);
        this.applicationStore.notifyWarning(
          `Can't enter text mode. Transformation to grammar text failed: ${error.message}`,
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
      yield this.graphState.leaveTextMode();
    } else {
      throw new UnsupportedOperationError(
        'Editor only support form mode and text mode at the moment',
      );
    }
  });

  /**
   * Since we use a custom fonts for text-editor, we want to make sure the font is loaded before any text-editor is opened
   * this is to ensure
   */
  async preloadTextEditorFont(): Promise<void> {
    const fontLoadFailureErrorMessage = `Monospaced font '${MONOSPACED_FONT_FAMILY}' has not been loaded properly, text editor display problems might occur`;
    await document.fonts
      .load(`1em ${MONOSPACED_FONT_FAMILY}`)
      .then(() => {
        if (document.fonts.check(`1em ${MONOSPACED_FONT_FAMILY}`)) {
          monacoEditorAPI.remeasureFonts();
          this.applicationStore.logger.info(
            CORE_LOG_EVENT.EDITOR_FONT_LOADED,
            `Monospaced font '${MONOSPACED_FONT_FAMILY}' has been loaded`,
          );
        } else {
          this.applicationStore.notifyError(fontLoadFailureErrorMessage);
        }
      })
      .catch(() =>
        this.applicationStore.notifyError(fontLoadFailureErrorMessage),
      );
  }

  get enumerationOptions(): PackageableElementSelectOption<Enumeration>[] {
    return this.graphState.graph.enumerations
      .concat(this.graphState.graph.dependencyManager.enumerations)
      .map(
        (e) => e.selectOption as PackageableElementSelectOption<Enumeration>,
      );
  }

  get classOptions(): PackageableElementSelectOption<Class>[] {
    return this.graphState.graph.classes
      .concat(this.graphState.graph.systemModel.classes)
      .concat(this.graphState.graph.dependencyManager.classes)
      .map((c) => c.selectOption as PackageableElementSelectOption<Class>);
  }

  get associationOptions(): PackageableElementSelectOption<Association>[] {
    return this.graphState.graph.associations
      .concat(this.graphState.graph.systemModel.associations)
      .concat(this.graphState.graph.dependencyManager.associations)
      .map(
        (p) => p.selectOption as PackageableElementSelectOption<Association>,
      );
  }

  get profileOptions(): PackageableElementSelectOption<Profile>[] {
    return this.graphState.graph.profiles
      .concat(this.graphState.graph.systemModel.profiles)
      .concat(this.graphState.graph.dependencyManager.profiles)
      .map((p) => p.selectOption as PackageableElementSelectOption<Profile>);
  }

  get classPropertyGenericTypeOptions(): PackageableElementSelectOption<Type>[] {
    return this.graphState.graph.primitiveTypes
      .filter((p) => p.path !== PRIMITIVE_TYPE.LATESTDATE)
      .map(
        (e) => e.selectOption as PackageableElementSelectOption<PrimitiveType>,
      )
      .concat(
        this.graphState.graph.types
          .concat(this.graphState.graph.systemModel.types)
          .concat(this.graphState.graph.dependencyManager.types)
          .map((a) => a.selectOption as PackageableElementSelectOption<Type>),
      );
  }

  get mappingOptions(): PackageableElementSelectOption<Mapping>[] {
    return this.graphState.graph.mappings
      .concat(this.graphState.graph.dependencyManager.mappings)
      .map((a) => a.selectOption as PackageableElementSelectOption<Mapping>);
  }

  get storeOptions(): PackageableElementSelectOption<Store>[] {
    return this.graphState.graph.stores
      .concat(this.graphState.graph.dependencyManager.stores)
      .map((a) => a.selectOption as PackageableElementSelectOption<Store>);
  }

  getSupportedElementTypes(): string[] {
    return (
      [
        /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
        PACKAGEABLE_ELEMENT_TYPE.CLASS,
        PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
        PACKAGEABLE_ELEMENT_TYPE.PROFILE,
        PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION,
        PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
        PACKAGEABLE_ELEMENT_TYPE.DIAGRAM,
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
    )
      .concat(
        this.applicationStore.pluginManager
          .getEditorPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_EditorPlugin_Extension
              ).getExtraSupportedElementTypes?.() ?? [],
          ),
      )
      .filter(
        (type) =>
          !this.applicationStore.config.options
            .TEMPORARY__disableNonModelStoreSupports ||
          !(
            [
              PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE,
              PACKAGEABLE_ELEMENT_TYPE.DATABASE,
            ] as string[]
          ).includes(type),
      );
  }
}

const EditorStoreContext = createContext<EditorStore | undefined>(undefined);

export const EditorStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalObservable(() => new EditorStore(applicationStore));
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  );
};

export const useEditorStore = (): EditorStore =>
  guaranteeNonNullable(
    useContext(EditorStoreContext),
    'useEditorStore() hook must be used inside EditorStore context provider',
  );
