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

import { action, flow, makeAutoObservable } from 'mobx';
import { CORE_LOG_EVENT } from '../utils/Logger';
import type { LambdaEditorState } from './editor-state/element-editor-state/LambdaEditorState';
import { GRAPH_EDITOR_MODE, AUX_PANEL_MODE } from './EditorConfig';
import type { EntityChange } from '../models/sdlc/models/entity/EntityChange';
import { EntityChangeType } from '../models/sdlc/models/entity/EntityChange';
import { ProjectConfiguration } from '../models/sdlc/models/configuration/ProjectConfiguration';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import { getGraphManager } from '../models/protocols/pure/Pure';
import type {
  Clazz,
  GeneratorFn,
  PlainObject,
} from '@finos/legend-studio-shared';
import {
  uniq,
  getClass,
  UnsupportedOperationError,
  IllegalStateError,
  assertErrorThrown,
  assertTrue,
  isNonNullable,
  NetworkClientError,
} from '@finos/legend-studio-shared';
import type { ProjectDependencyMetadata } from '../models/sdlc/models/configuration/ProjectDependency';
import type { EditorStore } from './EditorStore';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState';
import {
  GraphDataParserError,
  DependencyGraphProcessingError,
} from '../models/MetaModelUtility';
import { ActionAlertActionType, ActionAlertType } from './ApplicationStore';
import { GraphGenerationState } from './editor-state/GraphGenerationState';
import { MODEL_UPDATER_INPUT_TYPE } from './editor-state/ModelLoaderState';
import {
  getElementCoordinates,
  CompilationError,
  EngineError,
} from '../models/metamodels/pure/action/EngineError';
import {
  PureModel,
  CoreModel,
  SystemModel,
  GenerationModel,
} from '../models/metamodels/pure/graph/PureModel';
import type { AbstractPureGraphManager } from '../models/metamodels/pure/graph/AbstractPureGraphManager';
import { Package } from '../models/metamodels/pure/model/packageableElements/domain/Package';
import type { SetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { SET_IMPLEMENTATION_TYPE } from '../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { PureInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { Profile } from '../models/metamodels/pure/model/packageableElements/domain/Profile';
import { OperationSetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { PrimitiveType } from '../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import { Enumeration } from '../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Class } from '../models/metamodels/pure/model/packageableElements/domain/Class';
import { Association } from '../models/metamodels/pure/model/packageableElements/domain/Association';
import type { MappingElement } from '../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Mapping } from '../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Diagram } from '../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { ConcreteFunctionDefinition } from '../models/metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Service } from '../models/metamodels/pure/model/packageableElements/service/Service';
import { FlatData } from '../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { FlatDataInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import { EmbeddedFlatDataPropertyMapping } from '../models/metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import { InstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import { PackageableConnection } from '../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from '../models/metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { FileGenerationSpecification } from '../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { GenerationSpecification } from '../models/metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import {
  Measure,
  Unit,
} from '../models/metamodels/pure/model/packageableElements/domain/Measure';
import { Database } from '../models/metamodels/pure/model/packageableElements/store/relational/model/Database';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import { SectionIndex } from '../models/metamodels/pure/model/packageableElements/section/SectionIndex';
import { RootRelationalInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { EmbeddedRelationalInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { PackageableElement } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PACKAGEABLE_ELEMENT_TYPE } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { DependencyManager } from '../models/metamodels/pure/graph/DependencyManager';
import type { DSL_EditorPlugin_Extension } from './EditorPlugin';
import type { PropertyMapping } from '../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import { AssociationImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/AssociationImplementation';
import { AggregationAwareSetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import type { ProjectVersion } from '../models/metadata/models/ProjectVersionEntities';
import { ProjectVersionEntities } from '../models/metadata/models/ProjectVersionEntities';

export class GraphState {
  editorStore: EditorStore;
  graphGenerationState: GraphGenerationState;
  coreModel: CoreModel;
  systemModel: SystemModel;
  isInitializingGraph = false;
  isRunningGlobalCompile = false;
  isRunningGlobalGenerate = false;
  isApplicationLeavingTextMode = false;
  isUpdatingGraph = false; // critical synchronous update to refresh the graph
  isUpdatingApplication = false; // including graph update and async operations such as change detection
  graph: PureModel;
  graphManager: AbstractPureGraphManager;
  compilationError?: EngineError;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      graphGenerationState: false,
      coreModel: false,
      systemModel: false,
      setCompilationError: action,
      clearCompilationError: action,
      getPackageableElementType: false,
      getSetImplementationType: false,
      isInstanceSetImplementation: false,
    });

    this.editorStore = editorStore;
    this.systemModel = new SystemModel(
      this.getPureGraphExtensionElementClasses(),
    );
    this.coreModel = new CoreModel(this.getPureGraphExtensionElementClasses());
    this.graph = new PureModel(
      this.coreModel,
      this.systemModel,
      this.getPureGraphExtensionElementClasses(),
    );
    this.graphManager = getGraphManager(
      this.editorStore.applicationStore.pluginManager.getPureGraphManagerPlugins(),
      this.editorStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
      this.editorStore.applicationStore.logger,
    );
    this.graphGenerationState = new GraphGenerationState(this.editorStore);
  }

  private getPureGraphExtensionElementClasses(): Clazz<PackageableElement>[] {
    const pureGraphManagerPlugins =
      this.editorStore.applicationStore.pluginManager.getPureGraphManagerPlugins();
    return pureGraphManagerPlugins.flatMap(
      (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
    );
  }

  setCompilationError(error: EngineError): void {
    this.compilationError = error;
  }
  clearCompilationError(): void {
    this.compilationError = undefined;
  }

  get isApplicationUpdateOperationIsRunning(): boolean {
    return (
      this.isRunningGlobalCompile ||
      this.isRunningGlobalGenerate ||
      this.isApplicationLeavingTextMode ||
      this.isUpdatingApplication ||
      this.isInitializingGraph
    );
  }

  checkIfApplicationUpdateOperationIsRunning(): boolean {
    if (this.isRunningGlobalGenerate) {
      this.editorStore.applicationStore.notifyWarning(
        'Please wait for model generation to complete',
      );
      return true;
    }
    if (this.isRunningGlobalCompile) {
      this.editorStore.applicationStore.notifyWarning(
        'Please wait for graph compilation to complete',
      );
      return true;
    }
    if (this.isApplicationLeavingTextMode) {
      this.editorStore.applicationStore.notifyWarning(
        'Please wait for editor to leave text mode completely',
      );
      return true;
    }
    if (this.isUpdatingApplication) {
      this.editorStore.applicationStore.notifyWarning(
        'Please wait for editor state to rebuild',
      );
      return true;
    }
    if (this.isInitializingGraph) {
      this.editorStore.applicationStore.notifyWarning(
        'Please wait for editor initialization to complete',
      );
      return true;
    }
    return false;
  }

  /**
   * NOTE: this is temporary. System entities might eventually be in a seperate SDLC project and compressed for performance.
   * Right now the essential profiles have been extracted from Pure to load the minimum system models.
   * We might add more system entities as needed until the SDLC project is setup.
   */
  initializeSystem = flow(function* (this: GraphState) {
    try {
      yield this.graphManager.buildSystem(this.coreModel, this.systemModel, {
        DEV__enableGraphImmutabilityRuntimeCheck:
          this.editorStore.applicationStore.config.options
            .DEV__enableGraphImmutabilityRuntimeCheck,
      });
      this.systemModel.initializeAutoImports();
    } catch (error: unknown) {
      this.graph.setFailedToBuild(true);
      // no recovery if system models cannot be built
      this.editorStore.setBlockingAlert({
        message: `Can't initialize system models`,
      });
      throw error;
    }
  });

  /**
   * Create a lean/read-only view of the project:
   * - No change detection
   * - No project viewer
   * - No text mode support
   */
  buildGraphForViewerMode = flow(function* (
    this: GraphState,
    entities: Entity[],
  ) {
    try {
      this.isInitializingGraph = true;
      const startTime = Date.now();
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.GRAPH_ENTITIES_FETCHED,
        Date.now() - startTime,
        'ms',
      );
      // reset
      this.editorStore.changeDetectionState.stop();
      this.graph = new PureModel(
        this.coreModel,
        this.systemModel,
        this.getPureGraphExtensionElementClasses(),
      );
      // build compile context
      this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
        ProjectConfiguration.serialization.fromJson(
          yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getConfiguration(
            this.editorStore.sdlcState.currentProjectId,
            undefined,
          ),
        ),
      );
      const dependencyManager = new DependencyManager(
        this.getPureGraphExtensionElementClasses(),
      );
      yield this.graphManager.buildDependencies(
        this.coreModel,
        this.systemModel,
        dependencyManager,
        (yield this.getProjectDependencyEntities()) as unknown as Map<
          string,
          ProjectDependencyMetadata
        >,
        {
          DEV__enableGraphImmutabilityRuntimeCheck:
            this.editorStore.applicationStore.config.options
              .DEV__enableGraphImmutabilityRuntimeCheck,
        },
      );
      this.graph.setDependencyManager(dependencyManager);
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      // build graph
      yield this.graphManager.buildGraph(this.graph, entities, {
        DEV__enableGraphImmutabilityRuntimeCheck:
          this.editorStore.applicationStore.config.options
            .DEV__enableGraphImmutabilityRuntimeCheck,
      });
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.GRAPH_INITIALIZED,
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );
      this.editorStore.explorerTreeState.build();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GRAPH_PROBLEM,
        error,
      );
      this.graph.setFailedToBuild(true);
      this.editorStore.applicationStore.notifyError(
        `Can't build graph. Error: ${error.message}`,
      );
    } finally {
      this.isInitializingGraph = false;
    }
  });

  buildGraph = flow(function* (this: GraphState, entities: Entity[]) {
    try {
      this.isInitializingGraph = true;
      const startTime = Date.now();
      // reset
      this.graph = new PureModel(
        this.coreModel,
        this.systemModel,
        this.getPureGraphExtensionElementClasses(),
      );
      // build compile context
      const dependencyManager = new DependencyManager(
        this.getPureGraphExtensionElementClasses(),
      );
      yield this.graphManager.buildDependencies(
        this.coreModel,
        this.systemModel,
        dependencyManager,
        (yield this.getProjectDependencyEntities()) as unknown as Map<
          string,
          ProjectDependencyMetadata
        >,
        {
          DEV__enableGraphImmutabilityRuntimeCheck:
            this.editorStore.applicationStore.config.options
              .DEV__enableGraphImmutabilityRuntimeCheck,
        },
      );
      this.graph.setDependencyManager(dependencyManager);
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      // build graph
      yield this.graphManager.buildGraph(this.graph, entities, {
        DEV__enableGraphImmutabilityRuntimeCheck:
          this.editorStore.applicationStore.config.options
            .DEV__enableGraphImmutabilityRuntimeCheck,
        TEMPORARY__keepSectionIndex:
          this.editorStore.applicationStore.config.options
            .EXPERIMENTAL__enableFullGrammarImportSupport,
        TEMPORARY__disableRawLambdaResolver:
          this.editorStore.applicationStore.config.options
            .TEMPORARY__disableRawLambdaResolver,
      });
      // build generations
      yield this.graphManager.buildGenerations(
        this.graph,
        this.graphGenerationState.generatedEntities,
        {
          DEV__enableGraphImmutabilityRuntimeCheck:
            this.editorStore.applicationStore.config.options
              .DEV__enableGraphImmutabilityRuntimeCheck,
        },
      );

      // NOTE: we will see that: (time for fetching entities + time for building graph) < time for instantiating graph
      // this could be due to the time it takes for React to render in response to the fact that the model is just built
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.GRAPH_INITIALIZED,
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );
      this.editorStore.explorerTreeState.build();
      // add generation specification if model generation elements exists in graph and no generation specification
      this.graphGenerationState.addMissingGenerationSpecifications();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GRAPH_PROBLEM,
        error,
      );
      if (error instanceof DependencyGraphProcessingError) {
        this.graph.setFailedToBuild(true);
        // no recovery if dependency models cannot be built, this makes assumption that all dependencies models are compiled successfully
        // TODO: we might want to handle this more gracefully when we can show people the dependency model element in the future
        this.editorStore.setBlockingAlert({
          message: `Can't initialize dependency models. Error: ${error.message}`,
        });
      } else if (error instanceof GraphDataParserError) {
        // if something goes wrong with de-serialization, redirect to model loader to fix
        this.redirectToModelLoaderForDebugging(error);
      } else if (error instanceof NetworkClientError) {
        this.graph.setFailedToBuild(true);
        this.editorStore.applicationStore.notifyWarning(
          `Can't build graph. Error: ${error.message}`,
        );
      } else {
        // FIXME: we should split this into 2 notifications when we support multiple notifications
        this.editorStore.applicationStore.notifyError(
          `Can't build graph. Redirected to text mode for debugging. Error: ${error.message}`,
        );
        try {
          const editorGrammar = (yield this.graphManager.entitiesToPureCode(
            entities,
          )) as string;
          yield this.editorStore.grammarTextEditorState.setGraphGrammarText(
            editorGrammar,
          );
        } catch (error2: unknown) {
          assertErrorThrown(error2);
          this.editorStore.applicationStore.logger.error(
            CORE_LOG_EVENT.GRAPH_PROBLEM,
            error2,
          );
          if (error2 instanceof NetworkClientError) {
            // in case the server cannot even transform the JSON due to corrupted protocol, we can redirect to model loader
            this.redirectToModelLoaderForDebugging(error2);
            throw error2;
          }
        }
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
        yield this.globalCompileInTextMode({
          ignoreBlocking: true,
          suppressCompilationFailureMessage: true,
        });
      }
      throw error;
    } finally {
      this.isInitializingGraph = false;
    }
  });

  private redirectToModelLoaderForDebugging(error: Error): void {
    if (this.editorStore.isInConflictResolutionMode) {
      this.editorStore.setBlockingAlert({
        message: `Can't de-serialize graph model from entities`,
        prompt: `Please refresh the application and abort conflict resolution`,
      });
      return;
    }
    this.editorStore.applicationStore.notifyWarning(
      `Can't de-serialize graph model from entities. Redirected to model loader for debugging. Error: ${error.message}`,
    );
    this.editorStore.modelLoaderState.setCurrentInputType(
      MODEL_UPDATER_INPUT_TYPE.ENTITIES,
    );
    this.editorStore.modelLoaderState.loadCurrentProjectEntities();
    this.editorStore.openState(this.editorStore.modelLoaderState);
  }

  /**
   * Get entitiy changes to prepare for syncing
   */
  computeLocalEntityChanges(): EntityChange[] {
    const baseHashesIndex = this.editorStore.isInConflictResolutionMode
      ? this.editorStore.changeDetectionState
          .conflictResolutionHeadRevisionState.entityHashesIndex
      : this.editorStore.changeDetectionState.workspaceLatestRevisionState
          .entityHashesIndex;
    const originalPaths = new Set(Array.from(baseHashesIndex.keys()));
    const entityChanges: EntityChange[] = [];
    this.graph.allElements.forEach((element) => {
      const elementPath = element.path;
      if (baseHashesIndex.get(elementPath) !== element.hashCode) {
        const entity = this.graphManager.elementToEntity(element, true);
        entityChanges.push({
          classifierPath: entity.classifierPath,
          entityPath: element.path,
          content: entity.content,
          type:
            baseHashesIndex.get(elementPath) !== undefined
              ? EntityChangeType.MODIFY
              : EntityChangeType.CREATE,
        });
      }
      originalPaths.delete(elementPath);
    });
    Array.from(originalPaths).forEach((path) => {
      entityChanges.push({
        type: EntityChangeType.DELETE,
        entityPath: path,
      });
    });
    return entityChanges;
  }

  // FIXME: when we support showing multiple notifications, we can take this options out as the only users of this
  // is delete element flow, where we want to say `re-compiling graph after deletion`, but because compilation
  // sometimes is so fast, the message flashes, so we want to combine with the message in this method
  *globalCompileInFormMode(options?: {
    message?: string;
    disableNotificationOnSuccess?: boolean;
    openConsole?: boolean;
  }): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInFormMode,
      'Editor must be in form mode to call this method',
    );
    if (this.checkIfApplicationUpdateOperationIsRunning()) {
      return;
    }
    this.isRunningGlobalCompile = true;
    try {
      this.clearCompilationError();
      if (options?.openConsole) {
        this.editorStore.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
      }
      yield this.graphManager.compileGraph(this.graph);
      if (!options?.disableNotificationOnSuccess) {
        this.editorStore.applicationStore.notifySuccess('Compiled sucessfully');
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        this.setCompilationError(error);
      } else {
        // TODO: we should make this the handling for all other exceptions in the codebase
        throw new IllegalStateError(`Unhandled exception:\n${error}`);
      }
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.COMPILATION_PROBLEM,
        error,
      );
      let fallbackToTextModeForDebugging = true;
      // if compilation failed, we try to reveal the error in form mode,
      // if even this fail, we will fall back to show it in text mode
      if (this.compilationError instanceof CompilationError) {
        const errorElementCoordinates = getElementCoordinates(
          this.compilationError.sourceInformation,
        );
        if (errorElementCoordinates) {
          const element = this.graph.getNullableElement(
            errorElementCoordinates.elementPath,
            false,
          );
          if (element) {
            this.editorStore.openElement(element);
            if (
              this.editorStore.currentEditorState instanceof
                ElementEditorState &&
              this.compilationError instanceof CompilationError
            ) {
              // check if we can reveal the error in the element editor state
              fallbackToTextModeForDebugging =
                !this.editorStore.currentEditorState.revealCompilationError(
                  this.compilationError,
                );
            }
          }
        }
      }
      // decide if we need to fall back to text mode for debugging
      if (fallbackToTextModeForDebugging) {
        // FIXME: when we support showing multiple notifications, we can split this into 2
        this.editorStore.applicationStore.notifyWarning(
          options?.message ??
            'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
        );
        try {
          const code = (yield this.graphManager.graphToPureCode(
            this.graph,
          )) as string;
          this.editorStore.grammarTextEditorState.setGraphGrammarText(code);
        } catch (error2: unknown) {
          assertErrorThrown(error2);
          this.editorStore.applicationStore.notifyWarning(
            `Can't enter text mode. Transformation to grammar text failed: ${error2.message}`,
          );
          return;
        }
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
        yield this.globalCompileInTextMode({
          ignoreBlocking: true,
          suppressCompilationFailureMessage: true,
        });
      } else {
        this.editorStore.applicationStore.notifyWarning(
          `Compilation failed: ${error.message}`,
        );
      }
    } finally {
      this.isRunningGlobalCompile = false;
    }
  }

  // FIXME: when we support showing multiple notifications, we can take this `suppressCompilationFailureMessage` out as
  // we can show the transition between form mode and text mode warning and the compilation failure warning at the same time
  globalCompileInTextMode = flow(function* (
    this: GraphState,
    options?: {
      ignoreBlocking?: boolean;
      suppressCompilationFailureMessage?: boolean;
      openConsole?: boolean;
    },
  ): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInGrammarTextMode,
      'Editor must be in text mode to call this method',
    );
    if (
      !options?.ignoreBlocking &&
      this.checkIfApplicationUpdateOperationIsRunning()
    ) {
      return;
    }
    try {
      this.isRunningGlobalCompile = true;
      this.clearCompilationError();
      if (options?.openConsole) {
        this.editorStore.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
      }
      const entities = (yield this.graphManager.compileText(
        this.editorStore.grammarTextEditorState.graphGrammarText,
        this.graph,
      )) as Entity[];
      this.clearCompilationError();
      this.editorStore.applicationStore.notifySuccess('Compiled sucessfully');
      yield this.updateGraphAndApplication(entities);
    } catch (error: unknown) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        this.setCompilationError(error);
      }
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.COMPILATION_PROBLEM,
        'Compilation failed:',
        error,
      );
      if (
        !this.editorStore.applicationStore.notification ||
        !options?.suppressCompilationFailureMessage
      ) {
        this.editorStore.applicationStore.notifyWarning(
          `Compilation failed: ${error.message}`,
        );
      }
    } finally {
      this.isRunningGlobalCompile = false;
    }
  });

  leaveTextMode = flow(function* (this: GraphState): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInGrammarTextMode,
      'Editor must be in text mode to call this method',
    );
    if (this.checkIfApplicationUpdateOperationIsRunning()) {
      return;
    }
    try {
      this.isApplicationLeavingTextMode = true;
      this.clearCompilationError();
      this.editorStore.setBlockingAlert({
        message: 'Compiling graph before leaving text mode...',
        showLoading: true,
      });
      try {
        const entities = (yield this.graphManager.compileText(
          this.editorStore.grammarTextEditorState.graphGrammarText,
          this.graph,
          // surpress the modal to reveal error properly in the text editor
          // if the blocking modal is not dismissed, the edior will not be able to gain focus as modal has a focus trap
          // therefore, the editor will not be able to get the focus
          { onError: () => this.editorStore.setBlockingAlert(undefined) },
        )) as Entity[];
        this.editorStore.setBlockingAlert({
          message: 'Leaving text mode and rebuilding graph...',
          showLoading: true,
        });
        yield this.updateGraphAndApplication(entities);
        this.editorStore.grammarTextEditorState.setGraphGrammarText('');
        this.editorStore.grammarTextEditorState.resetCurrentElementLabelRegexString();
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.FORM);
        if (this.editorStore.currentEditorState) {
          this.editorStore.openState(this.editorStore.currentEditorState);
        }
      } catch (error: unknown) {
        assertErrorThrown(error);
        if (error instanceof EngineError) {
          this.setCompilationError(error);
        }
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.COMPILATION_PROBLEM,
          'Compilation failed:',
          error,
        );
        if (this.graph.failedToBuild) {
          // FIXME when we support showing multiple notification, we can split this into 2 messages
          this.editorStore.applicationStore.notifyWarning(
            `Can't build graph, please resolve compilation error before leaving text mode. Compilation failed: ${error.message}`,
          );
        } else {
          this.editorStore.applicationStore.notifyWarning(
            `Compilation failed: ${error.message}`,
          );
          this.editorStore.setActionAltertInfo({
            message: 'Project is not in a compiled state',
            prompt:
              'All changes made since the last time the graph was built sucessfully will be lost',
            type: ActionAlertType.CAUTION,
            onEnter: (): void => this.editorStore.setBlockGlobalHotkeys(true),
            onClose: (): void => this.editorStore.setBlockGlobalHotkeys(false),
            actions: [
              {
                label: 'Discard Changes',
                handler: (): void =>
                  this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.FORM),
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              },
              {
                label: 'Stay',
                default: true,
                type: ActionAlertActionType.PROCEED,
              },
            ],
          });
        }
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.COMPILATION_PROBLEM,
        error,
      );
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
  checkLambdaParsingError = flow(function* (
    this: GraphState,
    lambdaHolderElement: LambdaEditorState,
    checkParsingError: boolean,
    onSuccess: () => Promise<void>,
  ) {
    this.clearCompilationError();
    lambdaHolderElement.clearErrors();
    if (checkParsingError) {
      yield lambdaHolderElement.convertLambdaGrammarStringToObject();
      // abort action if parser error occurred
      if (lambdaHolderElement.parserError) {
        return;
      }
    }
    yield onSuccess();
  });

  /**
   * NOTE: IMPORTANT! This method is both a savior and a sinner. It helps reprocessing the graph state to use a new graph
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
   *    e.g. when we have a computed value in a immutable class that get all sub-classes, etc.
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
  private updateGraphAndApplication = flow(function* (
    this: GraphState,
    entities: Entity[],
  ) {
    this.editorStore.applicationStore.logger.info(
      CORE_LOG_EVENT.GRAPH_REBUILDING,
      '...',
    );
    const startTime = Date.now();
    this.isUpdatingApplication = true;
    this.isUpdatingGraph = true;
    try {
      const newGraph = new PureModel(
        this.coreModel,
        this.systemModel,
        this.getPureGraphExtensionElementClasses(),
      );

      /* @MARKER: MEMORY-SENSITIVE */
      // NOTE: this can post memory-leak issue if we start having immutable elements referencing current graph elements:
      // e.g. sub-classes analytics on the immutable class, etc.
      if (this.graph.isDependenciesLoaded) {
        newGraph.setDependencyManager(this.graph.dependencyManager);
      } else {
        this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
          ProjectConfiguration.serialization.fromJson(
            yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getConfiguration(
              this.editorStore.sdlcState.currentProjectId,
              this.editorStore.sdlcState.currentWorkspaceId,
            ),
          ),
        );
        const dependencyManager = new DependencyManager(
          this.getPureGraphExtensionElementClasses(),
        );
        yield this.graphManager.buildDependencies(
          this.coreModel,
          this.systemModel,
          dependencyManager,
          (yield this.getProjectDependencyEntities()) as unknown as Map<
            string,
            ProjectDependencyMetadata
          >,
          {
            DEV__enableGraphImmutabilityRuntimeCheck:
              this.editorStore.applicationStore.config.options
                .DEV__enableGraphImmutabilityRuntimeCheck,
          },
        );
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
       * If this is really bothering, we can handle it by building mocked replica of the current editor state using stub element
       * e.g. if the current editor is a class, we stub the class, create a new class editor state around it and copy over
       * navigation information, etc.
       */
      this.editorStore.setCurrentEditorState(undefined);

      /* @MARKER: MEMORY-SENSITIVE */
      this.editorStore.changeDetectionState.stop(); // stop change detection before disposing hash
      yield this.graph.dispose(this.editorStore.applicationStore.logger);

      yield this.graphManager.buildGraph(newGraph, entities, {
        quiet: true,
        DEV__enableGraphImmutabilityRuntimeCheck:
          this.editorStore.applicationStore.config.options
            .DEV__enableGraphImmutabilityRuntimeCheck,
        TEMPORARY__keepSectionIndex:
          this.editorStore.applicationStore.config.options
            .EXPERIMENTAL__enableFullGrammarImportSupport,
        TEMPORARY__disableRawLambdaResolver:
          this.editorStore.applicationStore.config.options
            .TEMPORARY__disableRawLambdaResolver,
      });

      // NOTE: build model generation entities every-time we rebuild the graph - should we do this?
      yield this.graphManager.buildGenerations(
        newGraph,
        this.graphGenerationState.generatedEntities,
        {
          DEV__enableGraphImmutabilityRuntimeCheck:
            this.editorStore.applicationStore.config.options
              .DEV__enableGraphImmutabilityRuntimeCheck,
        },
      );
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
      this.editorStore.openedEditorStates = openedEditorStates
        .map((editorState) =>
          this.editorStore.reprocessElementEditorState(editorState),
        )
        .filter(isNonNullable);
      this.editorStore.setCurrentEditorState(
        this.editorStore.findCurrentEditorState(currentEditorState),
      );

      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.GRAPH_REBUILT,
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );
      this.isUpdatingGraph = false;

      // ======= (RE)START CHANGE DETECTION =======
      /* @MARKER: MEMORY-SENSITIVE */
      yield this.graph.precomputeHashes(
        this.editorStore.applicationStore.logger,
      );
      this.editorStore.changeDetectionState.start();
      yield this.editorStore.changeDetectionState.computeLocalChanges(true);
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.CHANGE_DETECTION_RESTARTED,
        '[ASYNC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GRAPH_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(
        `Can't build graph: ${error.message}`,
      ); // TODO?: should we say can't rebuild application state
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
    assertTrue(
      this.graph.isBuilt && this.graph.isDependenciesLoaded,
      'Both main model and dependencies must be processed to built generation graph',
    );
    this.isUpdatingApplication = true;
    try {
      /* @MARKER: MEMORY-SENSITIVE */
      // Backup and reset editor states info
      const openedEditorStates = this.editorStore.openedEditorStates;
      const currentEditorState = this.editorStore.currentEditorState;
      this.editorStore.openedEditorStates = [];
      this.editorStore.setCurrentEditorState(undefined);

      /* @MARKER: MEMORY-SENSITIVE */
      yield this.graph.generationModel.dispose(
        this.editorStore.applicationStore.logger,
      );
      // we reset the generation model
      this.graph.generationModel = new GenerationModel(
        this.getPureGraphExtensionElementClasses(),
      );
      yield this.graphManager.buildGenerations(
        this.graph,
        this.graphGenerationState.generatedEntities,
        {
          DEV__enableGraphImmutabilityRuntimeCheck:
            this.editorStore.applicationStore.config.options
              .DEV__enableGraphImmutabilityRuntimeCheck,
        },
      );

      /* @MARKER: MEMORY-SENSITIVE */
      // Reprocess explorer tree
      // FIXME: we allow this so the UX stays the same but this causes memory leak
      // we should change `reprocess` model to do something like having source information on the form to navigate to it properly
      this.editorStore.explorerTreeState.reprocess();

      /* @MARKER: MEMORY-SENSITIVE */
      // so that information is not dependent on the graph, but on the component itself, with IDs and such.
      this.editorStore.openedEditorStates = openedEditorStates
        .map((editorState) =>
          this.editorStore.reprocessElementEditorState(editorState),
        )
        .filter(isNonNullable);
      this.editorStore.setCurrentEditorState(
        this.editorStore.findCurrentEditorState(currentEditorState),
      );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.GRAPH_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(
        `Can't build graph: ${error.message}`,
      );
    } finally {
      this.isUpdatingApplication = false;
    }
  });

  getProjectDependencyEntities = flow(function* (this: GraphState) {
    const projectDependencyMetadataMap = new Map<
      string,
      ProjectDependencyMetadata
    >();
    const currentConfiguration =
      this.editorStore.projectConfigurationEditorState
        .currentProjectConfiguration;
    const directDependencies = currentConfiguration.projectDependencies.map(
      (dependency) => ({
        projectId: dependency.projectId,
        versionId: dependency.versionId.id,
      }),
    );
    try {
      if (directDependencies.length) {
        const metadataClient =
          this.editorStore.applicationStore.networkClientManager.metadataClient;
        // NOTE: if A@v1 is transitive dependencies of 2 or more
        // direct dependencies, metadata server will take care of deduplication
        const dependencyEntitiesJson =
          (yield metadataClient.getDependencyEntities(
            directDependencies as unknown as PlainObject<ProjectVersion>[],
            true,
            true,
          )) as PlainObject<ProjectVersionEntities>[];
        const dependencyEntities = dependencyEntitiesJson.map((e) =>
          ProjectVersionEntities.serialization.fromJson(e),
        );
        const dependencyProjects = new Set<string>();
        dependencyEntities.forEach((dependencyInfo) => {
          const projectId = dependencyInfo.projectId;
          // There are a few validations that must be done:
          // 1. Unlike above, if in the depdendency graph, we have both A@v1 and A@v2
          //    then we need to throw. Both SDLC and metadata server should handle this
          //    validation, but haven't, so for now, we can do that in Studio.
          // 2. Same as the previous case, but for version-to-version transformation
          //    This is a special case that needs handling, right now, SDLC does auto
          //    healing, by scanning all the path and convert them into versioned path
          //    e.g. model::someClass -> project1::v1_0_0::model::someClass
          //    But this is a rare and advanced use-case which we will not attempt to handle now.
          if (dependencyProjects.has(projectId)) {
            const projectVersions = dependencyEntities
              .filter((e) => e.projectId === projectId)
              .map((e) => e.versionId);
            throw new UnsupportedOperationError(
              `Depending on multiple versions of a project is not supported. Found dependency on project '${projectId}' with versions: ${projectVersions.join(
                ', ',
              )}.`,
            );
          }
          const projectDependenciesMetadata = {
            entities: dependencyInfo.entities,
            projectVersion: dependencyInfo.projectVersion,
          };
          projectDependencyMetadataMap.set(
            dependencyInfo.projectId,
            projectDependenciesMetadata,
          );
          dependencyProjects.add(dependencyInfo.projectId);
        });
      }
    } catch (error: unknown) {
      assertErrorThrown(error);
      const message = `Can't fetch dependency entitites. Error: ${error.message}`;
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.PROJECT_DEPENDENCY_PROBLEM,
        message,
      );
      this.editorStore.applicationStore.notifyError(error);
      throw new DependencyGraphProcessingError(error);
    }
    return projectDependencyMetadataMap;
  });

  // -------------------------------------------------- UTILITIES -----------------------------------------------------
  /**
   * NOTE: Notice how this utility draws resources from all of metamodels and uses `instanceof` to classify behavior/response.
   * As such, methods in this utility cannot be placed in place they should belong to.
   *
   * For example: `getSetImplemetnationType` cannot be placed in `SetImplementation` because of circular module dependency
   * So this utility is born for such purpose, to avoid circular module dependency, and it should just be used for only that
   * Other utilities that really should reside in the domain-specific meta model should be placed in the meta model module.
   *
   * NOTE: We expect the need for these methods will eventually go away as we complete modularization. But we need these
   * methods here so that we can load plugins.
   */

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getPackageableElementType(element: PackageableElement): string {
    if (element instanceof PrimitiveType) {
      return PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE;
    } else if (element instanceof Package) {
      return PACKAGEABLE_ELEMENT_TYPE.PACKAGE;
    } else if (element instanceof Class) {
      return PACKAGEABLE_ELEMENT_TYPE.CLASS;
    } else if (element instanceof Association) {
      return PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION;
    } else if (element instanceof Enumeration) {
      return PACKAGEABLE_ELEMENT_TYPE.ENUMERATION;
    } else if (element instanceof Measure) {
      return PACKAGEABLE_ELEMENT_TYPE.MEASURE;
    } else if (element instanceof Unit) {
      return PACKAGEABLE_ELEMENT_TYPE.UNIT;
    } else if (element instanceof Profile) {
      return PACKAGEABLE_ELEMENT_TYPE.PROFILE;
    } else if (element instanceof ConcreteFunctionDefinition) {
      return PACKAGEABLE_ELEMENT_TYPE.FUNCTION;
    } else if (element instanceof FlatData) {
      return PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE;
    } else if (element instanceof Database) {
      return PACKAGEABLE_ELEMENT_TYPE.DATABASE;
    } else if (element instanceof ServiceStore) {
      return PACKAGEABLE_ELEMENT_TYPE.SERVICE_STORE;
    } else if (element instanceof Mapping) {
      return PACKAGEABLE_ELEMENT_TYPE.MAPPING;
    } else if (element instanceof Diagram) {
      return PACKAGEABLE_ELEMENT_TYPE.DIAGRAM;
    } else if (element instanceof Service) {
      return PACKAGEABLE_ELEMENT_TYPE.SERVICE;
    } else if (element instanceof PackageableConnection) {
      return PACKAGEABLE_ELEMENT_TYPE.CONNECTION;
    } else if (element instanceof PackageableRuntime) {
      return PACKAGEABLE_ELEMENT_TYPE.RUNTIME;
    } else if (element instanceof FileGenerationSpecification) {
      return PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION;
    } else if (element instanceof GenerationSpecification) {
      return PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION;
    } else if (element instanceof SectionIndex) {
      return PACKAGEABLE_ELEMENT_TYPE.SECTION_INDEX;
    }
    const extraElementTypeLabelGetters =
      this.editorStore.applicationStore.pluginManager
        .getEditorPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_EditorPlugin_Extension
            ).getExtraElementTypeGetters?.() ?? [],
        );
    for (const labelGetter of extraElementTypeLabelGetters) {
      const label = labelGetter(element);
      if (label) {
        return label;
      }
    }
    throw new UnsupportedOperationError(
      `Can't get type label for element '${element.path}'. No compatible label getter available from plugins.`,
    );
  }

  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  getSetImplementationType(
    setImplementation: SetImplementation,
  ): SET_IMPLEMENTATION_TYPE {
    if (setImplementation instanceof PureInstanceSetImplementation) {
      return SET_IMPLEMENTATION_TYPE.PUREINSTANCE;
    } else if (setImplementation instanceof OperationSetImplementation) {
      return SET_IMPLEMENTATION_TYPE.OPERATION;
    } else if (setImplementation instanceof FlatDataInstanceSetImplementation) {
      return SET_IMPLEMENTATION_TYPE.FLAT_DATA;
    } else if (setImplementation instanceof EmbeddedFlatDataPropertyMapping) {
      return SET_IMPLEMENTATION_TYPE.EMBEDDED_FLAT_DATA;
    } else if (
      setImplementation instanceof RootRelationalInstanceSetImplementation
    ) {
      return SET_IMPLEMENTATION_TYPE.RELATIONAL;
    } else if (
      setImplementation instanceof EmbeddedRelationalInstanceSetImplementation
    ) {
      return SET_IMPLEMENTATION_TYPE.EMBEDDED_RELATIONAL;
    } else if (setImplementation instanceof AggregationAwareSetImplementation) {
      return SET_IMPLEMENTATION_TYPE.AGGREGATION_AWARE;
    }
    throw new UnsupportedOperationError(
      `Can't derive set implementation type of type '${
        getClass(setImplementation).name
      }'`,
    );
  }

  isInstanceSetImplementation(
    setImplementation: MappingElement,
  ): setImplementation is InstanceSetImplementation {
    return (
      setImplementation instanceof InstanceSetImplementation ||
      setImplementation instanceof EmbeddedFlatDataPropertyMapping ||
      setImplementation instanceof EmbeddedRelationalInstanceSetImplementation
    );
  }

  getMappingElementPropertyMappings(
    mappingElement: MappingElement,
  ): PropertyMapping[] {
    let mappedProperties: PropertyMapping[] = [];
    if (
      this.isInstanceSetImplementation(mappingElement) ||
      mappingElement instanceof AssociationImplementation
    ) {
      mappedProperties = mappingElement.propertyMappings;
    } else if (mappingElement instanceof OperationSetImplementation) {
      mappedProperties = mappingElement.leafSetImplementations
        .filter((me): me is InstanceSetImplementation =>
          this.isInstanceSetImplementation(me),
        )
        .map((si) => si.propertyMappings)
        .flat();
    }
    return uniq(mappedProperties);
  }
}
