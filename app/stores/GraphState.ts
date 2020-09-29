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

import { observable, action, flow, computed } from 'mobx';
import { config } from 'ApplicationConfig';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { LambdaEditorState } from 'Stores/editor-state/element-editor-state/LambdaEditorState';
import { GRAPH_EDITOR_MODE, AUX_PANEL_MODE } from 'Stores/EditorConfig';
import { CLIENT_VERSION, ENTITY_PATH_DELIMITER, PROTOCOL_CLASSIFIER_PATH } from 'MetaModelConst';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { sdlcClient } from 'API/SdlcClient';
import { EntityChange, EntityChangeType } from 'SDLC/entity/EntityChange';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { Entity } from 'SDLC/entity/Entity';
import { JsonToGrammarInput } from 'EXEC/grammar/JsonToGrammarInput';
import { ParserError, getElementCoordinates, CompilationError, ExecutionServerError } from 'EXEC/ExecutionServerError';
import { executionClient } from 'API/ExecutionClient';
import { getGraphManager } from 'PureModelLoader';
import { guaranteeNonNullable, assertTrue, isNonNullable } from 'Utilities/GeneralUtil';
import { deserialize } from 'serializr';
import { ProjectDependencyMetadata, ProjectDependency } from 'SDLC/configuration/ProjectDependency';
import { EditorStore } from './EditorStore';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState';
import { NetworkClientError, HttpStatus } from 'API/NetworkClient';
import { GraphDataParserError, DependencyGraphProcessingError } from 'MetaModelUtility';
import { ActionAlertActionType, ActionAlertType } from './ApplicationStore';
import { GraphGenerationState } from 'Stores/editor-state/GraphGenerationState';
import { MODEL_UPDATER_INPUT_TYPE } from 'Stores/editor-state/ModelLoaderState';
import { PureModel, CoreModel, SystemModel, LegalModel, GenerationModel } from 'MM/PureModel';
import { PureModelContextDataObject, AbstractPureGraphManager, graphModelDataToEntities, PackageableElementObject, elementProtocolToEntity } from 'MM/AbstractPureGraphManager';
import MM_SYSTEM_ELEMENTS from 'MM/system/System.json';
import MM_LEGAL_ELEMENTS from 'MM/system/Legal.json';
import { getClassiferPathFromType } from 'MM/model/packageableElements/PackageableElement';
import { DependencyManager } from 'MM/DependencyManager';

export class GraphState {
  editorStore: EditorStore;
  graphGenerationState: GraphGenerationState;
  coreModel: CoreModel;
  systemModel = new SystemModel();
  legalModel = new LegalModel(); // TODO: remove this when we are out of demo phase
  @observable isInitializingGraph = false;
  @observable isRunningGlobalCompile = false;
  @observable isRunningGlobalGenerate = false;
  @observable isApplicationLeavingTextMode = false;
  @observable isUpdatingGraph = false; // critical synchronous update to refresh the graph
  @observable isUpdatingApplication = false; // including graph update and async operations such as change detection
  @observable graph: PureModel;
  @observable graphManager: AbstractPureGraphManager;
  @observable compilationError?: ExecutionServerError;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    this.coreModel = new CoreModel();
    this.graph = new PureModel(this.coreModel, this.systemModel, this.legalModel);
    this.graphManager = getGraphManager(CLIENT_VERSION.V1_0_0);
    this.graphGenerationState = new GraphGenerationState(this.editorStore);
  }

  @action setCompilationError(error: ExecutionServerError): void { this.compilationError = error }
  @action clearCompilationError(): void { this.compilationError = undefined }

  @computed get isApplicationUpdateOperationIsRunning(): boolean {
    return this.isRunningGlobalCompile || this.isRunningGlobalGenerate
      || this.isApplicationLeavingTextMode || this.isUpdatingApplication || this.isInitializingGraph;
  }

  get systemElements(): PackageableElementObject[] { return graphModelDataToEntities(this.graphManager, MM_SYSTEM_ELEMENTS as unknown as PureModelContextDataObject).map(entity => entity.content) }

  checkIfApplicationUpdateOperationIsRunning(): boolean {
    if (this.isRunningGlobalGenerate) {
      this.editorStore.applicationStore.notifyWarning('Please wait for model generation to complete');
      return true;
    }
    if (this.isRunningGlobalCompile) {
      this.editorStore.applicationStore.notifyWarning('Please wait for graph compilation to complete');
      return true;
    }
    if (this.isApplicationLeavingTextMode) {
      this.editorStore.applicationStore.notifyWarning('Please wait for editor to leave text mode completely');
      return true;
    }
    if (this.isUpdatingApplication) {
      this.editorStore.applicationStore.notifyWarning('Please wait for editor state to rebuild');
      return true;
    }
    if (this.isInitializingGraph) {
      this.editorStore.applicationStore.notifyWarning('Please wait for editor initialization to complete');
      return true;
    }
    return false;
  }

  /**
   * NOTE: this is temporary. System entities will eventually be in a seperate SDLC project and compressed for performance.
   * Right now the essential profiles have been extracted from Pure.
   * We might add more system entities as needed until they the SDLC project is setup.
   */
  initializeSystem = flow(function* (this: GraphState) {
    const systemEntities = this.systemElements
      .filter(element => !config.features.BETA__demoMode
        || (element.package === 'meta::pure::profiles' && (element.name === 'doc' || element.name === 'typemodifiers'))
        || (element.package === 'meta::pure::metamodel::type' && (element.name === 'Any'))
      )
      .map(profile => elementProtocolToEntity(this.graphManager, profile));
    // TODO: to be removed - only for Demo Mode
    const legalEntitites = config.features.BETA__demoMode ? (MM_LEGAL_ELEMENTS as PackageableElementObject[]).map(entity => elementProtocolToEntity(this.graphManager, entity)) : [];
    try {
      yield this.graphManager.buildSystem(this.coreModel, this.systemModel, systemEntities, this.legalModel, legalEntitites);
      this.systemModel.initializeAutoImports();
    } catch (error) {
      this.graph.setFailedToBuild(true);
      // no recovery if system models cannot be built
      this.editorStore.setBlockingAlert({
        message: `Can't initialize system models`
      });
      throw error;
    }
  });

  /**
   * Get the graph model data for elements immediately belongs to the project,
   * i.e. without generated elements or elements from depenencies.
   */
  getBasicGraphModelData(): PureModelContextDataObject {
    return this.graphManager.getGraphModelData(this.graph);
  }

  /**
   * When the editor is in text mode, we need to convert model context data to grammar so that we have
   * source information to be able to pinpoint compilation/parsing error
   */
  private getBasicGraphModelDataInTextMode = flow(function* (this: GraphState, options?: { onParsingError?: () => void }): Generator<Promise<unknown>, PureModelContextDataObject, unknown> {
    assertTrue(this.editorStore.isInGrammarTextMode, 'Editor must be in text mode to call this method');
    const startTime = Date.now();
    const parsingResult = (yield executionClient.transformGrammarToJSON({ code: this.editorStore.grammarTextEditorState.graphGrammarText })) as JsonToGrammarInput;
    if (parsingResult.codeError) {
      const parserError = deserialize(ParserError, parsingResult.codeError);
      options?.onParsingError?.();
      this.setCompilationError(parserError);
      throw parserError;
    }
    Log.info(LOG_EVENT.GRAPH_GRAMMAR_TO_MODEL_TRANSFORMED, Date.now() - startTime, 'ms');
    return guaranteeNonNullable(parsingResult.modelDataContext);
  });

  private supplyGraphModelDataWithCompileContext(graphModelData: PureModelContextDataObject): PureModelContextDataObject {
    return this.graphManager.combineGraphModelData(graphModelData, this.graphManager.getCompileContextModelData(this.graph));
  }

  /**
   * Get the full graph model data with compile context (i.e. generated elements and elements from depenencies)
   */
  getFullGraphModelData(): PureModelContextDataObject {
    return this.supplyGraphModelDataWithCompileContext(this.graphManager.getGraphModelData(this.graph));
  }

  /**
   * Create a lean/read-only view of the project:
   * - No change detection
   * - No project viewer
   * - No text mode support
   */
  buildGraphForViewerMode = flow(function* (this: GraphState, entities: Entity[]) {
    try {
      this.isInitializingGraph = true;
      const startTime = Date.now();
      Log.info(LOG_EVENT.GRAPH_ENTITIES_FETCHED, Date.now() - startTime, 'ms');
      // reset
      this.editorStore.changeDetectionState.stop();
      this.graph = new PureModel(this.coreModel, this.systemModel, this.legalModel);
      // build compile context
      this.editorStore.projectConfigurationEditorState.setProjectConfiguration(deserialize(ProjectConfiguration, (yield sdlcClient.getConfiguration(this.editorStore.sdlcState.currentProjectId, undefined)) as unknown as ProjectConfiguration));
      const dependencyManager = new DependencyManager();
      yield this.graphManager.buildDependencies(this.coreModel, this.systemModel, this.legalModel, dependencyManager, (yield this.resolveProjectDependency()) as unknown as Map<string, ProjectDependencyMetadata>);
      this.graph.setDependencyManager(dependencyManager);
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      // build graph
      this.checkEntityClassifierPath(entities);
      yield this.graphManager.build(this.graph, entities);
      Log.info(LOG_EVENT.GRAPH_INITIALIZED, '[TOTAL]', Date.now() - startTime, 'ms');
      this.editorStore.explorerTreeState.build();
    } catch (error) {
      Log.error(LOG_EVENT.GRAPH_PROBLEM, error);
      this.graph.setFailedToBuild(true);
      this.editorStore.applicationStore.notifyError(`Can't build graph. Problem: ${error.message}`);
    } finally {
      this.isInitializingGraph = false;
    }
  });

  buildGraph = flow(function* (this: GraphState, entities: Entity[]) {
    try {
      this.isInitializingGraph = true;
      const startTime = Date.now();
      // reset
      this.graph = new PureModel(this.coreModel, this.systemModel, this.legalModel);
      // build compile context
      const dependencyManager = new DependencyManager();
      yield this.graphManager.buildDependencies(this.coreModel, this.systemModel, this.legalModel, dependencyManager, (yield this.resolveProjectDependency()) as unknown as Map<string, ProjectDependencyMetadata>);
      this.graph.setDependencyManager(dependencyManager);
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      // build graph
      this.checkEntityClassifierPath(entities);
      yield this.graphManager.build(this.graph, entities, { TEMP_retainSection: config.features.BETA__grammarImport });
      // build generations
      yield this.graphManager.buildGenerations(this.graph, this.graphGenerationState.generatedEntities, { TEMP_retainSection: config.features.BETA__grammarImport });

      // NOTE: we will see that: (time for fetching entities + time for building graph) < time for instantiating graph
      // this could be due to the time it takes for React to render in response to the fact that the model is just built
      Log.info(LOG_EVENT.GRAPH_INITIALIZED, '[TOTAL]', Date.now() - startTime, 'ms');
      this.editorStore.explorerTreeState.build();
      // add generation specification if model generation elements exists in graph and no generation specification
      this.graphGenerationState.addMissingGenerationSpecifications();
    } catch (error) {
      Log.error(LOG_EVENT.GRAPH_PROBLEM, error);
      if (error instanceof DependencyGraphProcessingError) {
        this.graph.setFailedToBuild(true);
        // no recovery if dependency models cannot be built, this makes assumption that all dep models are good
        // TODO: we might want to handle this more gracefully when we can show people the dependency model element in the future
        this.editorStore.setBlockingAlert({
          message: `Can't initialize dependency models`
        });
      } else if (error instanceof GraphDataParserError) {
        // if something goes wrong with de-serialization, redirect to model loader to fix
        this.redirectToModelLoaderForDebugging(error);
      } else if (error instanceof NetworkClientError) {
        this.graph.setFailedToBuild(true);
        this.editorStore.applicationStore.notifyWarning(`Can't build graph. Problem: ${error.message}`);
      } else {
        // FIXME: we should split this into 2 notifications when we support multiple notifications
        this.editorStore.applicationStore.notifyError(`Can't build graph. Redirected to text mode for debugging. Problem: ${error.message}`);
        try {
          const graphModelData = this.graphManager.buildModelDataFromEntities(entities);
          yield this.editorStore.grammarTextEditorState.updateGrammarText(graphModelData);
        } catch (error) {
          Log.error(LOG_EVENT.GRAPH_PROBLEM, error);
          if (error instanceof NetworkClientError) {
            // in case the server cannot even transform the JSON due to corrupted protocol, we can redirect to model loader
            this.redirectToModelLoaderForDebugging(error);
            throw error;
          }
        }
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
        yield this.globalCompileInTextMode({ ignoreBlocking: true, suppressCompilationFailureMessage: true });
      }
      throw error;
    } finally {
      this.isInitializingGraph = false;
    }
  });

  private redirectToModelLoaderForDebugging(error: Error): void {
    if (this.editorStore.isInConflictResolutionMode) {
      this.editorStore.setBlockingAlert({ message: `Can't de-serialize graph model from entities`, prompt: `Please refresh the application and abort conflict resolution` });
      return;
    }
    this.editorStore.applicationStore.notifyWarning(`Can't de-serialize graph model from entities. Redirected to model loader for debugging. Problem: ${error.message}`);
    this.editorStore.modelLoaderState.setCurrentInputType(MODEL_UPDATER_INPUT_TYPE.ENTITIES);
    this.editorStore.modelLoaderState.loadCurrentProjectEntities();
    this.editorStore.openState(this.editorStore.modelLoaderState);
  }

  /**
   * Get entitiy changes to prepare for syncing
   */
  computeLocalEntityChanges(): EntityChange[] {
    const baseHashesIndex = this.editorStore.isInConflictResolutionMode
      ? this.editorStore.changeDetectionState.conflictResolutionHeadRevisionState.entityHashesIndex
      : this.editorStore.changeDetectionState.workspaceLatestRevisionState.entityHashesIndex;
    const originalPaths = new Set(Array.from(baseHashesIndex.keys()));
    const entityChanges: EntityChange[] = [];
    this.graph.allElements.forEach(element => {
      const elementPath = element.path;
      if (baseHashesIndex.get(elementPath) !== element.hashCode) {
        entityChanges.push({
          type: baseHashesIndex.get(elementPath) !== undefined ? EntityChangeType.MODIFY : EntityChangeType.CREATE,
          classifierPath: getClassiferPathFromType(getPackageableElementType(element)),
          entityPath: element.path,
          // NOTE: remove source information from protocols, as it can come from lambda objects attached to the element
          content: this.graphManager.pruneSourceInformation(this.graphManager.getPackageableElementProtocol(element))
        });
      }
      originalPaths.delete(elementPath);
    });
    Array.from(originalPaths).forEach(path => {
      entityChanges.push({
        type: EntityChangeType.DELETE,
        entityPath: path,
      });
    });
    return entityChanges;
  }

  /**
   * This method will call compile from execution server with the the given graph model data.
   * Most of the time, we would want this to have compile context (project dependency, generated elements, etc.) supplied
   * as currently backend does not run generate or handle project dependencies
   */
  private compileUsingGraphModelData = flow(function* (this: GraphState, graphModelData: PureModelContextDataObject, options?: { onError?: () => void }) {
    this.editorStore.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
    const startTime = Date.now();
    try {
      yield executionClient.compile(graphModelData);
      this.clearCompilationError();
    } catch (error) {
      options?.onError?.();
      if (error instanceof NetworkClientError && error.response.status === HttpStatus.BAD_REQUEST) {
        this.setCompilationError(deserialize(CompilationError, error.payload));
      }
      throw (error);
    } finally {
      Log.info(LOG_EVENT.GRAPH_COMPILED, Date.now() - startTime, 'ms');
    }
  });

  // FIXME: when we support showing multiple notifications, we can take this options out as the only users of this
  // is delete element flow, where we want to say `re-compiling graph after deletion`, but because compilation
  // sometimes is so fast, the message flashes, so we want to combine with the message in this method
  globalCompileInFormMode = flow(function* (this: GraphState, options?: { message?: string }): Generator<Promise<unknown>, void, unknown> {
    assertTrue(this.editorStore.isInFormMode, 'Editor must be in form mode to call this method');
    if (this.checkIfApplicationUpdateOperationIsRunning()) { return }
    this.isRunningGlobalCompile = true;
    const basicGraphModelData = this.getBasicGraphModelData();
    try {
      yield this.compileUsingGraphModelData(this.supplyGraphModelDataWithCompileContext(basicGraphModelData));
      this.editorStore.applicationStore.notifySuccess('Compiled sucessfully');
    } catch (error) {
      Log.error(LOG_EVENT.COMPILATION_PROBLEM, error);
      let fallbackToTextModeForDebugging = true;
      // if compilation failed, we try to reveal the error in form mode,
      // if even this fail, we will fall back to show it in text mode
      if (this.compilationError instanceof CompilationError) {
        const errorElementCoordinates = getElementCoordinates(this.compilationError.sourceInformation);
        if (errorElementCoordinates) {
          const element = this.graph.getNullableElement(errorElementCoordinates.elementPath, false);
          if (element) {
            this.editorStore.openElement(element);
            if (this.editorStore.currentEditorState instanceof ElementEditorState && this.compilationError instanceof CompilationError) {
              // check if we can reveal the error in the element editor state
              fallbackToTextModeForDebugging = !this.editorStore.currentEditorState.revealCompilationError(this.compilationError);
            }
          }
        }
      }
      // decide if we need to fall back to text mode for debugging
      if (fallbackToTextModeForDebugging) {
        // FIXME: when we support showing multiple notifications, we can split this into 2
        this.editorStore.applicationStore.notifyWarning(options?.message ?? 'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.');
        try {
          yield this.editorStore.grammarTextEditorState.updateGrammarText(basicGraphModelData);
        } catch (err) {
          this.editorStore.applicationStore.notifyWarning(`Can't enter text mode. Transformation to grammar text failed: ${err.message}`);
          return;
        }
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
        yield this.globalCompileInTextMode({ ignoreBlocking: true, suppressCompilationFailureMessage: true });
      } else {
        this.editorStore.applicationStore.notifyWarning(`Compilation failed: ${error.message}`);
      }
    } finally {
      this.isRunningGlobalCompile = false;
    }
  });

  // FIXME: when we support showing multiple notifications, we can take this `suppressCompilationFailureMessage` out as
  // we can show the transition between form mode and text mode warning and the compilation failure warning at the same time
  globalCompileInTextMode = flow(function* (this: GraphState, options?: { ignoreBlocking?: boolean, suppressCompilationFailureMessage?: boolean }): Generator<Promise<unknown>, void, unknown> {
    assertTrue(this.editorStore.isInGrammarTextMode, 'Editor must be in text mode to call this method');
    if (!options?.ignoreBlocking && this.checkIfApplicationUpdateOperationIsRunning()) { return }
    try {
      this.isRunningGlobalCompile = true;
      this.clearCompilationError();
      const data = (yield this.getBasicGraphModelDataInTextMode()) as PureModelContextDataObject;
      // We add the compile context when we compile on the server
      yield this.compileUsingGraphModelData(this.supplyGraphModelDataWithCompileContext(data));
      this.editorStore.applicationStore.notifySuccess('Compiled sucessfully');
      yield this.updateGraphAndApplication(graphModelDataToEntities(this.graphManager, data));
    } catch (error) {
      Log.error(LOG_EVENT.COMPILATION_PROBLEM, 'Compilation failed:', error);
      if (!this.editorStore.applicationStore.notification || !options?.suppressCompilationFailureMessage) {
        this.editorStore.applicationStore.notifyWarning(`Compilation failed: ${error.message}`);
      }
    } finally {
      this.isRunningGlobalCompile = false;
    }
  });

  leaveTextMode = flow(function* (this: GraphState): Generator<Promise<unknown>, void, unknown> {
    assertTrue(this.editorStore.isInGrammarTextMode, 'Editor must be in text mode to call this method');
    if (this.checkIfApplicationUpdateOperationIsRunning()) { return }
    try {
      this.isApplicationLeavingTextMode = true;
      this.clearCompilationError();
      this.editorStore.setBlockingAlert({ message: 'Compiling graph before leaving text mode...', showLoading: true });
      try {
        const graphModelData = (yield this.getBasicGraphModelDataInTextMode(
          // surpress the modal to reveal error properly in the text editor
          // if the blocking modal is not dismissed, the edior will not be able to gain focus as modal has a focus trap
          // therefore, the editor will not be able to get the focus
          { onParsingError: () => this.editorStore.setBlockingAlert(undefined) }
        )) as PureModelContextDataObject;
        yield this.compileUsingGraphModelData(this.supplyGraphModelDataWithCompileContext(graphModelData),
          // surpress the modal to reveal error properly in the text editor
          // if the blocking modal is not dismissed, the edior will not be able to gain focus as modal has a focus trap
          // therefore, the editor will not be able to get the focus
          { onError: () => this.editorStore.setBlockingAlert(undefined) }
        );
        this.editorStore.setBlockingAlert({ message: 'Leaving text mode and rebuilding graph...', showLoading: true });
        const entities = graphModelDataToEntities(this.graphManager, graphModelData);
        yield this.updateGraphAndApplication(entities);
        this.editorStore.grammarTextEditorState.setGraphGrammarText('');
        this.editorStore.grammarTextEditorState.resetCurrentElementLabelRegexString();
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.FORM);
        if (this.editorStore.currentEditorState) { this.editorStore.openState(this.editorStore.currentEditorState) }
      } catch (error) {
        Log.error(LOG_EVENT.COMPILATION_PROBLEM, 'Compilation failed:', error);
        if (this.graph.failedToBuild) {
          // FIXME when we support showing multiple notification, we can split this into 2 messages
          this.editorStore.applicationStore.notifyWarning(`Can't build graph, please resolve compilation error before leaving text mode. Compilation failed: ${error.message}`);
        } else {
          this.editorStore.applicationStore.notifyWarning(`Compilation failed: ${error.message}`);
          this.editorStore.setActionAltertInfo({
            message: 'Project is not in a compiled state',
            prompt: 'All changes made since the last time the graph was built sucessfully will be lost',
            type: ActionAlertType.CAUTION,
            onEnter: (): void => this.editorStore.setBlockGlobalHotkeys(true),
            onClose: (): void => this.editorStore.setBlockGlobalHotkeys(false),
            actions: [
              {
                label: 'Discard Changes',
                handler: (): void => this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.FORM),
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              },
              {
                label: 'Stay',
                default: true,
                type: ActionAlertActionType.PROCEED,
              }
            ],
          });
        }
      }
    } catch (error) {
      Log.error(LOG_EVENT.COMPILATION_PROBLEM, error);
    } finally {
      this.isApplicationLeavingTextMode = false;
      this.editorStore.setBlockingAlert(undefined);
    }
  });

  /**
   * This function is used in lambda editor in form mode when user try to do an action that involves the lambda being edited, it takes an action
   * and proceeds with a parsing check for the current lambda before executing the action. This prevents case where user quickly type something
   * that does not parse and hit compile or generate right away.
   */
  checkLambdaParsingError = flow(function* (this: GraphState, lambdaHolderElement: LambdaEditorState, checkParsingError: boolean, onSuccess: () => Promise<void>) {
    this.clearCompilationError();
    lambdaHolderElement.clearErrors();
    if (checkParsingError) {
      yield lambdaHolderElement.convertLambdaGrammarStringToObject();
      // abort action if parser error occurred
      if (lambdaHolderElement.parserError) { return }
    }
    yield onSuccess();
  });

  /**
   * NOTE: This method helps reprocessing the graph state to use a new graph
   * built from the new model context data, it resets the graph properly. The bane here is that resetting the graph properly is
   * not trivial, for example, in the cleanup phase, there are things we want to re-use, such as the one-time processed system
   * metamodels or the `reusable` metamodels from project dependencies. There are also explorer states like the package tree,
   * opened tabs, change detection, etc. to take care of. There are a lot of potential pitfalls. For these, we will add a marker
   *    @MARKER: MEMORY-SENSITIVE
   * to indicate we should check carefully these pieces when we detect memory issue as it might still be referring to the old graph
   *
   * In the past, we have found that there are a few potential root causes for memory leak:
   * 1. State management Mobx allows references, as such, it is sometimes hard to trace down which references can cause problem
   *    We have to understand that the behind this updater is very simple (replace), yet to do it cleanly is not easy, since
   *    so far it is tempting to refer to elements in the graph from various editor state. On top of that, change detection
   *    sometimes obfuscate the investigation but we have cleared it out with explicit disposing of reaction and `keepAlive`
   *    computations (e.g. hash)
   * 2. Reusable models, at this point in time, we haven't completed stabilize the logic for handling generated models, as well
   *    as depdendencies, we intended to save computation time by reusing these while updating the graph. This can pose potential
   *    danger as well. Beware the way when we start to make system/project dependencies references elements of current graph
   *    e.g. when we have a `@computed` in a immutable class that get all sub-classes, etc.
   * 3. We reprocess editor states to ensure good UX, e.g. find tabs to keep open, find tree nodes to expand, etc.
   *    after updating the graph. These in our experience is the MOST COMMON source of memory leak. It is actually
   *    quite predictable since structures like tabs and tree node embeds graph data, which are references to the old graph
   *
   * NOTE: One big obfuscating factor is overlapping graph refresh. Sometimes, we observed that calling this update graph
   * method multiple times can throws Mobx off and causes reusing change detection state to cause memory-leak. As such,
   * we have blocked the possibility of calling compilation/graph-update/generation simultaneously
   *
   * A note on how to debug memory-leak issue:
   * 1. Open browser Memory monitor
   * 2. Go to text mode and compile multiple times (triggering graph update)
   * 3. Try to force garbage collection, if we see memory goes up after while, it's pretty clear that this is memory-leak
   * (note that since we disallow stacking multiple compilation and graph update, we have simplify the detection a lot)
   * See https://auth0.com/blog/four-types-of-leaks-in-your-javascript-code-and-how-to-get-rid-of-them/
   */
  private updateGraphAndApplication = flow(function* (this: GraphState, entities: Entity[]) {
    Log.info(LOG_EVENT.GRAPH_REBUILDING, '...');
    const startTime = Date.now();
    this.isUpdatingApplication = true;
    this.isUpdatingGraph = true;
    try {
      const newGraph = new PureModel(this.coreModel, this.systemModel, this.legalModel);

      /* @MARKER: MEMORY-SENSITIVE */
      // NOTE: this can post memory-leak issue if we start having immutable elements referencing current graph elements:
      // e.g. sub-classes analytics on the immutable class, etc.
      if (this.graph.isDependenciesLoaded) {
        newGraph.setDependencyManager(this.graph.dependencyManager);
      } else {
        this.editorStore.projectConfigurationEditorState.setProjectConfiguration(deserialize(ProjectConfiguration, (yield sdlcClient.getConfiguration(this.editorStore.sdlcState.currentProjectId, this.editorStore.sdlcState.currentWorkspaceId)) as unknown as ProjectConfiguration));
        const dependencyManager = new DependencyManager();
        yield this.graphManager.buildDependencies(this.coreModel, this.systemModel, this.legalModel, dependencyManager, (yield this.resolveProjectDependency()) as unknown as Map<string, ProjectDependencyMetadata>);
        newGraph.setDependencyManager(dependencyManager);
      }

      /* @MARKER: MEMORY-SENSITIVE */
      // Backup and reset editor states info
      const openedEditorStates = this.editorStore.openedEditorStates;
      const currentEditorState = this.editorStore.currentEditorState;
      this.editorStore.openedEditorStates = [];
      /**
       * We remove the current editor state so that we no longer let React displays the element that belongs to the old graph
       * NOTE: this causes an UI flash, but this is in many way, acceptable since the user probably should know that we are
       * refreshing the memory graph anyway.
       *
       * If this is undesirable, we can handle it by building mocked replica of the current editor state using stub element
       * e.g. if the current editor is a class, we stub the class, create a new class editor state around it and copy over
       * navigation information, etc.
       */
      this.editorStore.setCurrentEditorState(undefined);

      /* @MARKER: MEMORY-SENSITIVE */
      this.editorStore.changeDetectionState.stop(); // stop change detection before disposing hash
      yield this.graph.dispose();

      this.checkEntityClassifierPath(entities);
      yield this.graphManager.build(newGraph, entities, { quiet: true, TEMP_retainSection: config.features.BETA__grammarImport });

      // NOTE: build model generation entities every-time we rebuild the graph - should we do this?
      yield this.graphManager.buildGenerations(newGraph, this.graphGenerationState.generatedEntities, { quiet: true, TEMP_retainSection: config.features.BETA__grammarImport });
      this.graph = newGraph;
      /* @MARKER: MEMORY-SENSITIVE */
      // Reprocess explorer tree
      // this.editorStore.explorerTreeState = new ExplorerTreeState(this.applicationStore, this.editorStore);
      // this.editorStore.explorerTreeState.buildImmutableModelTrees();
      // this.editorStore.explorerTreeState.build();

      // FIXME: we allow this so the UX stays the same but this causes memory leak
      // do this properly using node IDs -> this causes mem-leak right now
      this.editorStore.explorerTreeState.reprocess();

      // Reprocess editor states
      // FIXME: we allow this so the UX stays the same but this causes memory leak
      // we should change `reprocess` model to do something like having source information on the form to navigate to it properly

      /* @MARKER: MEMORY-SENSITIVE */
      // so that information is not dependent on the graph, but on the component itself, with IDs and such.
      this.editorStore.openedEditorStates = openedEditorStates.map(editorState => this.editorStore.reprocessElementEditorState(editorState)).filter(isNonNullable);
      this.editorStore.setCurrentEditorState(this.editorStore.findCurrentEditorState(currentEditorState));

      Log.info(LOG_EVENT.GRAPH_REBUILT, '[TOTAL]', Date.now() - startTime, 'ms');
      this.isUpdatingGraph = false;

      // ======= (RE)START CHANGE DETECTION =======
      /* @MARKER: MEMORY-SENSITIVE */
      yield this.graph.precomputeHashes();
      this.editorStore.changeDetectionState.start();
      yield this.editorStore.changeDetectionState.computeLocalChanges(true);
      Log.info(LOG_EVENT.CHANGE_DETECTION_RESTARTED, '[ASYNC]');
      // ======= FINISHED (RE)START CHANGE DETECTION =======

    } catch (error) {
      Log.error(LOG_EVENT.GRAPH_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(`Can't build graph: ${error.message}`); // TODO?: should we say can't rebuild application state
      this.editorStore.changeDetectionState.stop(true); // force stop change detection
      this.isUpdatingGraph = false;
    } finally {
      this.isUpdatingApplication = false;
    }
  });

  /**
   * Used to update generation model and generation graph using the generated entities
   * does not alter the main or dependency model
   */
  updateGenerationGraphAndApplication = flow(function* (this: GraphState) {
    assertTrue(this.graph.isBuilt && this.graph.isDependenciesLoaded, 'Both main model and dependencies must be processed to built generation graph');
    this.isUpdatingApplication = true;
    try {

      /* @MARKER: MEMORY-SENSITIVE */
      // Backup and reset editor states info
      const openedEditorStates = this.editorStore.openedEditorStates;
      const currentEditorState = this.editorStore.currentEditorState;
      this.editorStore.openedEditorStates = [];
      this.editorStore.setCurrentEditorState(undefined);

      /* @MARKER: MEMORY-SENSITIVE */
      yield this.graph.generationModel.dispose();
      // we reset the generation model
      this.graph.generationModel = new GenerationModel();
      yield this.graphManager.buildGenerations(this.graph, this.graphGenerationState.generatedEntities, { TEMP_retainSection: config.features.BETA__grammarImport });

      /* @MARKER: MEMORY-SENSITIVE */
      // Reprocess explorer tree
      // FIXME: we allow this so the UX stays the same but this causes memory leak
      // we should change `reprocess` model to do something like having source information on the form to navigate to it properly
      this.editorStore.explorerTreeState.reprocess();

      /* @MARKER: MEMORY-SENSITIVE */
      // so that information is not dependent on the graph, but on the component itself, with IDs and such.
      this.editorStore.openedEditorStates = openedEditorStates.map(editorState => this.editorStore.reprocessElementEditorState(editorState)).filter(isNonNullable);
      this.editorStore.setCurrentEditorState(this.editorStore.findCurrentEditorState(currentEditorState));
    } catch (error) {
      Log.error(LOG_EVENT.GRAPH_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(`Can't build graph: ${error.message}`);
    } finally {
      this.isUpdatingApplication = false;
    }
  })

  /**
   * Check if any entities to be used to build the graph has an unrecognizable classifier path.
   * We will warn user that these entities are ignored
   */
  private checkEntityClassifierPath(entities: Entity[]): void {
    const unsupportedEntities = entities.filter(entity => !Object.values(PROTOCOL_CLASSIFIER_PATH).includes(entity.classifierPath));
    if (unsupportedEntities.length) {
      unsupportedEntities.forEach(entity => Log.warn(LOG_EVENT.UNSUPPORTED_ENTITY_DETECTED, `Element '${entity.path}' with classifier path '${entity.classifierPath}' will be ignored while building the graph`));
      // NOTE: since outputing a warning without giving the user a clear path to remove or fix these entities is not good UX, we will just silently logging these
    }
  }

  private resolveProjectDependency = flow(function* (this: GraphState) {
    const projectDependencyMetadataMap = new Map<string, ProjectDependencyMetadata>();
    const currentConfiguration = this.editorStore.projectConfigurationEditorState.currentProjectConfiguration;
    // recursively get all project dependency
    yield Promise.all(currentConfiguration.projectDependencies.map(projDep => this.getProjectDependencyEntities(projDep, projectDependencyMetadataMap, currentConfiguration)));
    return projectDependencyMetadataMap;
  });

  /**
   * This function gets project entities for each dependent project and updates the `entitiesByDependency` map.
   *
   * The parent config is used to determine whether a multiple different versions of any project show up in the dependency list.
   * NOTE: this use case shows up when people want to create mapping between versions to check transform.
   *
   * If this is the case, we need to version qualify (i.e. process the entity paths of entities in the dependency) to disambiguate
   * For example, our current project depends on B (v1), B (v2) and C. Only B (v1) and B (v2) are processed, C is left intact.
   * We don't go ahead and version qualify C not just for time-saving purpose, but also for understandability, think about
   * what happen when we update dependency. We will end up having to change all kinds of files just to update dependency.
   * Every reference would have to change to, which is not ideal.
   */
  private getProjectDependencyEntities = flow(function* (this: GraphState, dependency: ProjectDependency, dependencyMetadataMap: Map<string, ProjectDependencyMetadata>, parentConfig: ProjectConfiguration): Generator<Promise<unknown>, void, unknown> {
    try {
      const config = deserialize(ProjectConfiguration, (yield sdlcClient.getConfigurationByVersion(dependency.projectId, dependency.version)) as ProjectConfiguration);
      // key will be the same as the prefix path for any dependent element, hence: <groupId>::<artifactId>::<versionId>
      const dependencyKey = `${config.dependencyKey}${ENTITY_PATH_DELIMITER}${dependency.pathVersion}`;
      if (!dependencyMetadataMap.has(dependencyKey)) {
        (yield Promise.all(config.projectDependencies.map(projDep => this.getProjectDependencyEntities(projDep, dependencyMetadataMap, config))));
        const entities = (yield sdlcClient.getEntitiesByVersion(dependency.projectId, dependency.version)) as Entity[];
        const processVersionPackage = parentConfig.projectDependencies.filter(dep => dep.projectId === dependency.projectId).length > 1;
        // This holds metedata for a dependency project. We process version package only if a project depends on multiple versions of a project
        const projectDependenciesMetaData = { entities, config, processVersionPackage };
        dependencyMetadataMap.set(dependencyKey, projectDependenciesMetaData);
      }
    } catch (error) {
      const message = `Can't get dependency entitites for project ${dependency.projectId}, version ${dependency.version}: ${error.message}`;
      Log.error(LOG_EVENT.PROJECT_DEPENDENCY_PROBLEM, message);
      this.editorStore.applicationStore.notifyError(error);
    }
  });
}
