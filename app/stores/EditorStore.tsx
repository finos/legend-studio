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

import React, { createContext, useContext } from 'react';
import { useLocalStore } from 'mobx-react-lite';
import { observable, action, computed, flow } from 'mobx';
import { ApplicationStore, useApplicationStore, ActionAlertInfo, BlockingAlertInfo, ActionAlertActionType, ActionAlertType } from './ApplicationStore';
import { ClassEditorState } from 'Stores/editor-state/element-editor-state/ClassEditorState';
import { ExplorerTreeState } from './ExplorerTreeState';
import { ACTIVITY_MODE, DEFAULT_SIDE_BAR_SIZE, AUX_PANEL_MODE, GRAPH_EDITOR_MODE, DEFAULT_AUX_PANEL_SIZE, EDITOR_MODE } from 'Stores/EditorConfig';
import { ElementEditorState } from 'Stores/editor-state/element-editor-state/ElementEditorState';
import { MappingEditorState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { GraphState } from './GraphState';
import { ChangeDetectionState } from './ChangeDetectionState';
import { NewElementState } from './NewElementState';
import { WorkspaceUpdaterState } from 'Stores/sidebar-state/WorkspaceUpdaterState';
import { ProjectOverviewState } from 'Stores/sidebar-state/ProjectOverviewState';
import { WorkspaceReviewState } from 'Stores/sidebar-state/WorkspaceReviewState';
import { LocalChangesState } from 'Stores/sidebar-state/LocalChangesState';
import { ConflictResolutionState } from 'Stores/sidebar-state/ConflictResolutionState';
import { WorkspaceBuildsState } from 'Stores/sidebar-state/WorkspaceBuildsState';
import { GrammarTextEditorState } from 'Stores/editor-state/GrammarTextEditorState';
import { DiagramEditorState } from 'Stores/editor-state/element-editor-state/DiagramEditorState';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { Clazz, guaranteeType, guaranteeNonNullable, UnsupportedOperationError, assertNonNullable, assertTrue } from 'Utilities/GeneralUtil';
import { UMLEditorState } from 'Stores/editor-state/element-editor-state/UMLEditorState';
import { EditorSdlcState } from 'Stores/EditorSdlcState';
import { ModelLoaderState } from 'Stores/editor-state/ModelLoaderState';
import { EditorState } from 'Stores/editor-state/EditorState';
import { EntityDiffViewState } from 'Stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { FunctionEditorState } from './editor-state/element-editor-state/FunctionEditorState';
import { ProjectConfigurationEditorState } from 'Stores/editor-state/ProjectConfigurationEditorState';
import { TextEditorState } from 'Stores/editor-state/element-editor-state/TextEditorState';
import { PackageableRuntimeEditorState } from 'Stores/editor-state/element-editor-state/RuntimeEditorState';
import { PackageableConnectionEditorState } from 'Stores/editor-state/element-editor-state/ConnectionEditorState';
import { FileGenerationEditorState } from 'Stores/editor-state/element-editor-state/FileGenerationEditorState';
import { EntityDiffEditorState } from 'Stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { EntityChangeConflictEditorState } from './editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { sdlcClient } from 'API/SdlcClient';
import { Entity } from 'SDLC/entity/Entity';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { deserialize } from 'serializr';
import { GenerationSpecificationEditorState } from './editor-state/GenerationSpecificationEditorState';
import { UnsupportedElementEditorState } from './editor-state/UnsupportedElementEditorState';
import { FileGenerationViewerState } from './editor-state/FileGenerationViewerState';
import { GenerationFile } from 'Utilities/FileGenerationTreeUtil';
import { ElementFileGenerationState } from './editor-state/element-editor-state/ElementFileGenerationState';
import { DevToolState } from './aux-panel-state/DevToolState';
import { getSetupRoute } from 'Stores/RouterConfig';
import { ActionState } from 'Utilities/ActionState';
import { PackageableElement, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

export class EditorStore {
  applicationStore: ApplicationStore;
  explorerTreeState: ExplorerTreeState;
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
  @observable private _isDisposed = false;
  @observable initState = new ActionState();
  @observable mode = EDITOR_MODE.STANDARD;
  @observable graphEditMode = GRAPH_EDITOR_MODE.FORM;
  // Aux Panel
  @observable isMaxAuxPanelSizeSet = false;
  @observable activeAuxPanelMode: AUX_PANEL_MODE = AUX_PANEL_MODE.MAPPING_EXECUTE;
  @observable maxAuxPanelSize = DEFAULT_AUX_PANEL_SIZE;
  @observable auxPanelSize = 0;
  @observable previousAuxPanelSize = DEFAULT_AUX_PANEL_SIZE;
  // Side Bar
  @observable activeActivity?: ACTIVITY_MODE = ACTIVITY_MODE.EXPLORER;
  @observable sideBarSize = DEFAULT_SIDE_BAR_SIZE;
  @observable sideBarSizeBeforeHidden = DEFAULT_SIDE_BAR_SIZE;
  // Tabs
  @observable currentEditorState?: EditorState;
  @observable openedEditorStates: EditorState[] = [];
  @observable newElementState: NewElementState;
  /**
   * Since we want to share element generation state across all element in the editor, we will create 1 element generate state
   * per file generation configuration type.
   */
  @observable elementGenerationStates: ElementFileGenerationState[] = [];
  @observable openElementSearchModal = false;
  @observable isInExpandedMode = true;
  @observable backdrop = false;
  @observable ignoreNavigationBlocking = false;
  @observable blockGlobalHotkeys = false;
  @observable isDevToolEnabled = false;

  constructor(applicationStore: ApplicationStore) {
    this.applicationStore = applicationStore;
    this.sdlcState = new EditorSdlcState(this);
    this.graphState = new GraphState(this);
    this.changeDetectionState = new ChangeDetectionState(this, this.graphState);
    this.devToolState = new DevToolState(this);
    // side bar panels
    this.explorerTreeState = new ExplorerTreeState(this);
    this.projectOverviewState = new ProjectOverviewState(this, this.sdlcState);
    this.workspaceBuildsState = new WorkspaceBuildsState(this, this.sdlcState);
    this.workspaceUpdaterState = new WorkspaceUpdaterState(this, this.sdlcState);
    this.workspaceReviewState = new WorkspaceReviewState(this, this.sdlcState);
    this.localChangesState = new LocalChangesState(this, this.sdlcState);
    this.conflictResolutionState = new ConflictResolutionState(this, this.sdlcState);
    this.newElementState = new NewElementState(this);
    // special (singleton) editors
    this.grammarTextEditorState = new GrammarTextEditorState(this);
    this.modelLoaderState = new ModelLoaderState(this);
    this.projectConfigurationEditorState = new ProjectConfigurationEditorState(this, this.sdlcState);
  }

  @computed get isInViewerMode(): boolean { return this.mode === EDITOR_MODE.VIEWER }
  @computed get isInConflictResolutionMode(): boolean { return this.mode === EDITOR_MODE.CONFLICT_RESOLUTION }

  @computed get isInitialized(): boolean { return Boolean(this.sdlcState.currentProject && this.sdlcState.currentWorkspace && this.sdlcState.currentRevision) && this.graphState.systemModel.isBuilt }
  @computed get isInGrammarTextMode(): boolean { return this.graphEditMode === GRAPH_EDITOR_MODE.GRAMMAR_TEXT }
  @computed get isInFormMode(): boolean { return this.graphEditMode === GRAPH_EDITOR_MODE.FORM }
  @computed get isAuxPanelMaximized(): boolean { return this.auxPanelSize === this.maxAuxPanelSize }
  @computed get hasUnsyncedChanges(): boolean { return Boolean(this.changeDetectionState.workspaceLatestRevisionState.changes.length) }

  @action setMode(val: EDITOR_MODE): void { this.mode = val }
  @action setDevTool(val: boolean): void { this.isDevToolEnabled = val }
  @action setBlockGlobalHotkeys(val: boolean): void { this.blockGlobalHotkeys = val }
  @action setCurrentEditorState(val: EditorState | undefined): void { this.currentEditorState = val }
  @action setBackdrop(val: boolean): void { this.backdrop = val }
  @action setExpandedMode(val: boolean): void { this.isInExpandedMode = val }
  @action setOpenElementSearchModal(val: boolean): void { this.openElementSearchModal = val }
  @action setAuxPanelSize(val: number): void { this.auxPanelSize = val }
  @action setActiveAuxPanelMode(val: AUX_PANEL_MODE): void { this.activeAuxPanelMode = val }
  @action setSideBarSize(val: number): void { this.sideBarSize = val }
  @action setIgnoreNavigationBlocking(val: boolean): void { this.ignoreNavigationBlocking = val }
  @action refreshCurrentEntityDiffEditorState(): void { if (this.currentEditorState instanceof EntityDiffEditorState) { this.currentEditorState.refresh() } }

  @action setBlockingAlert(alertInfo?: BlockingAlertInfo): void {
    if (this._isDisposed) { return }
    this.setBlockGlobalHotkeys(Boolean(alertInfo)); // block global hotkeys if alert is shown
    this.applicationStore.setBlockingAlert(alertInfo);
  }
  @action setActionAltertInfo(alertInfo?: ActionAlertInfo): void {
    if (this._isDisposed) { return }
    this.applicationStore.setActionAltertInfo(alertInfo);
  }

  @action cleanUp(): void {
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

  @action reset(): void {
    this.setCurrentEditorState(undefined);
    this.openedEditorStates = [];
    this.projectConfigurationEditorState = new ProjectConfigurationEditorState(this, this.sdlcState);
    this.explorerTreeState = new ExplorerTreeState(this);
  }

  /**
   * This is the entry of the app logic where initialization of editor states happens
   * Here, we ensure the order of calls after checking existence of current project and workspace
   * If either of them does not exist, we cannot proceed.
   */
  init = flow(function* (this: EditorStore, projectId: string, workspaceId: string) {
    if (!this.initState.isInInitialState) {
      /**
       * Since React `fast-refresh` will sometimes cause `Editor` to rerender, this method will be called again
       * as all hooks are recalled, as such, ONLY IN DEVELOPMENT mode we allow this to not fail-fast
       * we also have to `undo` some of what the `cleanUp` does to this store as the cleanup part of all hooks will be triggered
       * as well
       */
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        Log.info(LOG_EVENT.DEVELOPMENT_MODE, `Fast-refreshing the app - undoing cleanUp() and preventing init() recall in editor store...`);
        this.changeDetectionState.start();
        this._isDisposed = false;
        return;
      }
      this.applicationStore.notifyIllegalState('Editor store is re-initialized');
      return;
    }
    this.initState.inProgress();
    const onLeave = (hasBuildSucceeded: boolean): void => { this.initState.conclude(hasBuildSucceeded) };

    yield this.sdlcState.fetchCurrentProject(projectId);
    if (!this.sdlcState.currentProject) {
      Log.warn(LOG_EVENT.SDLC_PROBLEM, `Project '${projectId}' does not exist! Redirecting ...`);
      this.applicationStore.historyApiClient.push('/');
      onLeave(false);
      return;
    }
    yield this.sdlcState.fetchCurrentWorkspace(projectId, workspaceId);
    if (!this.sdlcState.currentWorkspace) {
      Log.warn(LOG_EVENT.SETUP_PROBLEM, `Workspace '${workspaceId}' of project '${projectId}' does not exist! Redirecting ...`);
      this.applicationStore.historyApiClient.push(getSetupRoute(projectId, workspaceId));
      onLeave(false);
      return;
    }
    yield Promise.all([
      this.sdlcState.fetchCurrentRevision(projectId, workspaceId),
      this.graphState.initializeSystem(),
    ]);
    yield this.initMode();

    onLeave(true);
  });

  initMode = flow(function* (this: EditorStore) {
    switch (this.mode) {
      case EDITOR_MODE.STANDARD: yield this.initStandardMode(); return;
      case EDITOR_MODE.CONFLICT_RESOLUTION: yield this.initConflictResolutionMode(); return;
      default: throw new UnsupportedOperationError(`Can't initialize editor for unsupported mode '${this.mode}'`);
    }
  })

  initStandardMode = flow(function* (this: EditorStore) {
    yield Promise.all([
      this.buildGraph(),
      this.sdlcState.checkIfWorkspaceIsOutdated(),
      this.workspaceReviewState.fetchCurrentWorkspaceReview(),
      this.workspaceUpdaterState.fetchLatestCommittedReviews(),
      this.projectConfigurationEditorState.fetchLatestProjectStructureVersion(),
      this.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.modelLoaderState.fetchAvailableModelImportDescriptions(),
      this.sdlcState.fetchProjectVersions()
    ]);
  })

  initConflictResolutionMode = flow(function* (this: EditorStore) {
    this.setActionAltertInfo({
      message: 'Failed to update workspace.',
      prompt: 'You can discard all of your changes or review them, resolve all merge conflicts and fix any potential compilation issues as well as test failures',
      type: ActionAlertType.CAUTION,
      onEnter: (): void => this.setBlockGlobalHotkeys(true),
      onClose: (): void => this.setBlockGlobalHotkeys(false),
      actions: [
        {
          label: 'Discard your changes',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: (): void => {
            this.setActiveActivity(ACTIVITY_MODE.CONFLICT_RESOLUTION);
            this.conflictResolutionState.discardConflictResolutionChanges().catch(error => this.applicationStore.alertIllegalUnhandledError(error));
          },
        },
        {
          label: 'Resolve merge conflicts',
          default: true,
          type: ActionAlertActionType.STANDARD,
        }
      ],
    });
    yield Promise.all([
      this.conflictResolutionState.init(),
      this.sdlcState.checkIfWorkspaceIsOutdated(),
      this.projectConfigurationEditorState.fetchLatestProjectStructureVersion(),
      this.graphState.graphGenerationState.fetchAvailableFileGenerationDescriptions(),
      this.modelLoaderState.fetchAvailableModelImportDescriptions(),
      this.sdlcState.fetchProjectVersions()
    ]);
  })

  buildGraph = flow(function* (this: EditorStore) {
    const startTime = Date.now();
    let entities: Entity[];
    let projectConfiguration: ProjectConfiguration;

    this.graphState.isInitializingGraph = true;
    try {
      // fetch workspace entities and config at the same time
      const result = (yield Promise.all([
        sdlcClient.getEntities(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId),
        sdlcClient.getConfiguration(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId)
      ])) as unknown as [Entity[], ProjectConfiguration];
      entities = result[0];
      projectConfiguration = result[1];
      this.projectConfigurationEditorState.setProjectConfiguration(deserialize(ProjectConfiguration, projectConfiguration));
      this.projectConfigurationEditorState.setOriginalProjectConfiguration(deserialize(ProjectConfiguration, projectConfiguration));
      this.changeDetectionState.workspaceLatestRevisionState.setEntities(entities);
      Log.info(LOG_EVENT.GRAPH_ENTITIES_FETCHED, Date.now() - startTime, 'ms');
    } catch (error) {
      return;
    }

    try {
      yield this.graphState.buildGraph(entities);

      // ======= (RE)START CHANGE DETECTION =======
      this.changeDetectionState.stop();
      yield Promise.all([
        this.graphState.graph.precomputeHashes(), // for local changes detection
        this.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(entities, LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT),
        this.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex(),
        this.sdlcState.buildProjectLatestRevisionEntityHashesIndex(),
      ]);
      this.changeDetectionState.start();
      yield Promise.all([
        this.changeDetectionState.computeLocalChanges(true),
        this.changeDetectionState.computeAggregatedWorkspaceChanges(true),
        this.changeDetectionState.computeAggregatedProjectLatestChanges(true),
      ]);
      Log.info(LOG_EVENT.CHANGE_DETECTION_RESTARTED, '[ASNYC]');
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch {
      // since errors have been handled accordingly, we don't need to do anything here
      return;
    }
  });

  getCurrentEditorState<T extends EditorState>(clazz: Clazz<T>): T {
    return guaranteeType(this.currentEditorState, clazz, `Expected current editor state to be of type '${clazz.name}' (this is caused by calling this method at the wrong place)`);
  }

  @action openAuxPanel(auxPanelMode: AUX_PANEL_MODE, resetHeightIfTooSmall: boolean): void {
    this.activeAuxPanelMode = auxPanelMode;
    if (this.auxPanelSize === 0) {
      this.toggleAuxPanel();
    } else if (this.auxPanelSize < DEFAULT_AUX_PANEL_SIZE && resetHeightIfTooSmall) {
      this.auxPanelSize = DEFAULT_AUX_PANEL_SIZE;
    }
  }

  @action toggleAuxPanel(): void {
    if (this.auxPanelSize === 0) {
      this.auxPanelSize = this.previousAuxPanelSize;
    } else {
      this.previousAuxPanelSize = this.auxPanelSize || DEFAULT_AUX_PANEL_SIZE;
      this.auxPanelSize = 0;
    }
  }

  @action toggleExpandAuxPanel(): void {
    if (this.auxPanelSize === this.maxAuxPanelSize) {
      this.auxPanelSize = this.previousAuxPanelSize === this.maxAuxPanelSize ? DEFAULT_AUX_PANEL_SIZE : this.previousAuxPanelSize;
    } else {
      this.previousAuxPanelSize = this.auxPanelSize;
      this.auxPanelSize = this.maxAuxPanelSize;
    }
  }

  @action setMaxAuxPanelSize(val: number): void {
    if (this.isMaxAuxPanelSizeSet) {
      if (this.previousAuxPanelSize === this.maxAuxPanelSize) { this.previousAuxPanelSize = val }
      if (this.auxPanelSize === this.maxAuxPanelSize) { this.auxPanelSize = val }
    }
    this.maxAuxPanelSize = val;
    this.isMaxAuxPanelSizeSet = true;
  }

  @action setGraphEditMode(graphEditor: GRAPH_EDITOR_MODE): void {
    this.graphEditMode = graphEditor;
    this.graphState.clearCompilationError();
  }

  @action setActiveActivity(activity: ACTIVITY_MODE, options?: { keepShowingIfMatchedCurrent?: boolean }): void {
    if (this.sideBarSize === 0) {
      this.sideBarSize = this.sideBarSizeBeforeHidden;
    } else if (activity === this.activeActivity && !options?.keepShowingIfMatchedCurrent) {
      this.sideBarSizeBeforeHidden = this.sideBarSize || DEFAULT_SIDE_BAR_SIZE;
      this.sideBarSize = 0;
    }
    this.activeActivity = activity;
  }

  @action closeState(editorState: EditorState): void {
    const elementIndex = this.openedEditorStates.findIndex(e => e === editorState);
    assertTrue(elementIndex !== -1, `Can't close a tab which is not opened`);
    this.openedEditorStates.splice(elementIndex, 1);
    if (this.currentEditorState === editorState) {
      if (this.openedEditorStates.length) {
        const openIndex = elementIndex - 1;
        this.setCurrentEditorState(openIndex >= 0 ? this.openedEditorStates[openIndex] : this.openedEditorStates[0]);
      } else {
        this.setCurrentEditorState(undefined);
      }
    }
    this.explorerTreeState.reprocess();
  }

  @action closeAllOtherStates(editorState: EditorState): void {
    assertNonNullable(this.openedEditorStates.find(e => e === editorState), 'Editor tab should be currently opened');
    this.currentEditorState = editorState;
    this.openedEditorStates = [editorState];
    this.explorerTreeState.reprocess();
  }

  @action closeAllStates(): void {
    this.currentEditorState = undefined;
    this.openedEditorStates = [];
    this.explorerTreeState.reprocess();
  }

  @action openState(editorState: EditorState): void {
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
      throw new UnsupportedOperationError(`Can't open unsupported editor state '${editorState.constructor.name}'`);
    }
    this.explorerTreeState.reprocess();
  }

  @action openEntityDiff(entityDiffEditorState: EntityDiffViewState): void {
    const existingEditorState = this.openedEditorStates.find(editorState => editorState instanceof EntityDiffViewState
      && editorState.fromEntityPath === entityDiffEditorState.fromEntityPath
      && editorState.toEntityPath === entityDiffEditorState.toEntityPath
      && editorState.fromRevision === entityDiffEditorState.fromRevision
      && editorState.toRevision === entityDiffEditorState.toRevision
    );
    const diffEditorState = existingEditorState ?? entityDiffEditorState;
    if (!existingEditorState) { this.openedEditorStates.push(diffEditorState) }
    this.setCurrentEditorState(diffEditorState);
  }

  @action openEntityChangeConflict(entityChangeConflictEditorState: EntityChangeConflictEditorState): void {
    const existingEditorState = this.openedEditorStates.find(editorState => editorState instanceof EntityChangeConflictEditorState
      && editorState.entityPath === entityChangeConflictEditorState.entityPath
    );
    const conflictEditorState = existingEditorState ?? entityChangeConflictEditorState;
    if (!existingEditorState) { this.openedEditorStates.push(conflictEditorState) }
    this.setCurrentEditorState(conflictEditorState);
  }

  /**
   * This method helps open editor that only exists one instance at at time such as model-loader, project config, settings ...
   */
  @action openSingletonEditorState(singularEditorState: ModelLoaderState | ProjectConfigurationEditorState): void {
    const existingEditorState = this.openedEditorStates.find(e => e === singularEditorState);
    const editorState = existingEditorState ?? singularEditorState;
    if (!existingEditorState) { this.openedEditorStates.push(editorState) }
    this.setCurrentEditorState(editorState);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  createElementState(element: PackageableElement): ElementEditorState | undefined {
    switch (getPackageableElementType(element)) {
      case PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE: throw new UnsupportedOperationError();
      case PACKAGEABLE_ELEMENT_TYPE.CLASS: return new ClassEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
      case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
      case PACKAGEABLE_ELEMENT_TYPE.PROFILE: return new UMLEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: return new FunctionEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.MEASURE: return new UnsupportedElementEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.MAPPING: return new MappingEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM: return new DiagramEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.TEXT: return new TextEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: return new PackageableRuntimeEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: return new PackageableConnectionEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: return new FileGenerationEditorState(this, element);
      case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: return new GenerationSpecificationEditorState(this, element);
      default: throw new UnsupportedOperationError(`Can't create editor element state for unsupported type '${getPackageableElementType(element)}'`);
    }
  }

  @action openElement(element: PackageableElement): void {
    if (this.isInGrammarTextMode) {
      // in text mode, we want to select the block of code that corresponds to the element if possible
      // the cheap way to do this is to search by element label text, e.g. `Mapping some::package::someMapping`
      this.grammarTextEditorState.setCurrentElementLabelRegexString(element);
    } else {
      const existingElementState = this.openedEditorStates.find(elementState => elementState instanceof ElementEditorState && elementState.element === element);
      const elementState = existingElementState ?? this.createElementState(element);
      if (elementState && !existingElementState) { this.openedEditorStates.push(elementState) }
      this.setCurrentEditorState(elementState);
      // expand tree node
      this.explorerTreeState.openNode(element);
    }
  }

  deleteElement = flow(function* (this: EditorStore, element: PackageableElement) {
    if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) { return }
    const generatedChildrenElements = this.graphState.graph.generationModel.allElements.filter(e => e.generationParentElement === element);
    const elementsToDelete = [element, ...generatedChildrenElements];
    if (this.currentEditorState && this.currentEditorState instanceof ElementEditorState && elementsToDelete.includes(this.currentEditorState.element)) {
      this.closeState(this.currentEditorState);
    }
    this.openedEditorStates = this.openedEditorStates.filter(elementState => elementState instanceof ElementEditorState && !generatedChildrenElements.includes(elementState.element));
    // remove/retire the element's generated children before remove the element itself
    generatedChildrenElements.forEach(el => this.graphState.graph.generationModel.removeElement(el));
    this.graphState.graph.removeElement(element);
    this.explorerTreeState.reprocess();
    // re-compile after deletion
    yield this.graphState.globalCompileInFormMode({ message: `Can't compile graph after deletion and error cannot be located in form mode. Redirected to text mode for debugging.` });
  })

  // FIXME: to be removed when we process editor states properly
  @action reprocessElementEditorState = (editorState: EditorState): EditorState | undefined => {
    if (editorState instanceof ElementEditorState) {
      const correspondingElement = this.graphState.graph.getNullableElement(editorState.element.path);
      if (correspondingElement) {
        return editorState.reprocess(correspondingElement, this);
      }
    }
    // No need to reprocess generated file state as it has no reference to any of the graphs
    if (editorState instanceof FileGenerationViewerState) {
      return editorState;
    }
    return undefined;
  }

  // FIXME: to be removed when we process editor states properly
  findCurrentEditorState = (editor: EditorState | undefined): EditorState | undefined => {
    if (editor instanceof ElementEditorState) {
      return this.openedEditorStates.find((es): es is ElementEditorState => es instanceof ElementEditorState && es.element.path === editor.element.path);
    }
    if (editor instanceof FileGenerationViewerState) {
      return this.openedEditorStates.find(e => e === editor);
    }
    return undefined;
  }

  @action openGeneratedFile(file: GenerationFile): void {
    const existingGeneratedFileState = this.openedEditorStates.find(editorState => editorState instanceof FileGenerationViewerState
      && editorState.generatedFile === file
    );
    const generatedFileState = existingGeneratedFileState ?? new FileGenerationViewerState(this, file);
    if (!existingGeneratedFileState) { this.openedEditorStates.push(generatedFileState) }
    this.setCurrentEditorState(generatedFileState);
  }

  createGlobalHotKeyAction = (handler: () => void): (event: KeyboardEvent | undefined) => void =>
    (event: KeyboardEvent | undefined): void => {
      event?.preventDefault();
      // FIXME: maybe we should come up with a better way to block global hot keys, this seems highly restrictive.
      const isResolvingConflicts = this.isInConflictResolutionMode && !this.conflictResolutionState.hasResolvedAllConflicts;
      if (this.isInitialized && !isResolvingConflicts && !this.blockGlobalHotkeys) { handler() }
    }

  @action closeAllEditorTabs(): void {
    this.setCurrentEditorState(undefined);
    this.openedEditorStates = [];
  }

  toggleTextMode = flow(function* (this: EditorStore) {
    if (this.isInFormMode) {
      if (this.graphState.checkIfApplicationUpdateOperationIsRunning()) { return }
      this.setBlockingAlert({ message: 'Switching to text mode...', showLoading: true });
      try {
        yield this.grammarTextEditorState.updateGrammarText(this.graphState.getBasicGraphModelData());
      } catch (error) {
        this.applicationStore.notifyWarning(`Can't enter text mode. Transformation to grammar text failed: ${error.message}`);
        this.setBlockingAlert(undefined);
        return;
      }
      this.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
      this.setBlockingAlert(undefined);
      // navigate to the currently opened element immediately after entering text mode editor
      if (this.currentEditorState instanceof ElementEditorState) {
        this.grammarTextEditorState.setCurrentElementLabelRegexString(this.currentEditorState.element);
      }
    } else if (this.isInGrammarTextMode) {
      yield this.graphState.leaveTextMode();
    } else {
      throw new UnsupportedOperationError('Editor only support form mode and text mode at the moment');
    }
  });

}

const EditorStoreContext = createContext<EditorStore | undefined>(undefined);

export const EditorStoreProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalStore(() => new EditorStore(applicationStore));
  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
};

export const useEditorStore = (): EditorStore =>
  guaranteeNonNullable(useContext(EditorStoreContext), 'useEditorStore() hook must be used inside EditorStore context provider');
