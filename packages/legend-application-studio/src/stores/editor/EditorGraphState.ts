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
import { GRAPH_EDITOR_MODE } from './EditorConfig.js';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  UnsupportedOperationError,
  assertErrorThrown,
  assertTrue,
  isNonNullable,
  NetworkClientError,
  guaranteeNonNullable,
  StopWatch,
  filterByType,
  ActionState,
} from '@finos/legend-shared';
import type { EditorStore } from './EditorStore.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { GraphGenerationState } from './editor-state/GraphGenerationState.js';
import { MODEL_IMPORT_NATIVE_INPUT_TYPE } from './editor-state/ModelImporterState.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import { type Entity, EntitiesWithOrigin } from '@finos/legend-storage';
import {
  type EntityChange,
  type ProjectDependency,
  ProjectConfiguration,
  applyEntityChanges,
} from '@finos/legend-server-sdlc';
import {
  type ProjectDependencyGraphReport,
  ProjectVersionEntities,
  ProjectDependencyCoordinates,
  RawProjectDependencyReport,
  buildDependencyReport,
} from '@finos/legend-server-depot';
import {
  type EngineError,
  type PackageableElement,
  type CompilationWarning,
  type PureModel,
  type FunctionActivatorConfiguration,
  type RelationalDatabaseTypeConfiguration,
  GRAPH_MANAGER_EVENT,
  Package,
  Profile,
  PrimitiveType,
  Enumeration,
  Class,
  Association,
  Mapping,
  ConcreteFunctionDefinition,
  Service,
  FlatData,
  PackageableConnection,
  PackageableRuntime,
  FileGenerationSpecification,
  GenerationSpecification,
  Measure,
  Unit,
  Database,
  SectionIndex,
  DependencyGraphBuilderError,
  GraphDataDeserializationError,
  DataElement,
  createGraphBuilderReport,
  ExecutionEnvironmentInstance,
  SnowflakeApp,
  GraphEntities,
  HostedService,
} from '@finos/legend-graph';
import { CONFIGURATION_EDITOR_TAB } from './editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import { PACKAGEABLE_ELEMENT_TYPE } from './utils/ModelClassifierUtils.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../__lib__/LegendStudioSetting.js';
import { LegendStudioTelemetryHelper } from '../../__lib__/LegendStudioTelemetryHelper.js';

export enum GraphBuilderStatus {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REDIRECTED_TO_TEXT_MODE = 'REDIRECTED_TO_TEXT_MODE',
}

export enum GraphCompilationOutcome {
  SKIPPED = 'SKIPPED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export interface GraphBuilderResult {
  status: GraphBuilderStatus;
  error?: Error;
}

export type Problem = CompilationWarning | EngineError;

export class EditorGraphState {
  readonly editorStore: EditorStore;
  readonly graphGenerationState: GraphGenerationState;

  isInitializingGraph = false;
  isRunningGlobalCompile = false;
  isRunningGlobalGenerate = false;
  isApplicationLeavingGraphEditMode = false;
  isUpdatingGraph = false; // critical synchronous update to refresh the graph
  isUpdatingApplication = false; // including graph update and async operations such as change detection

  functionActivatorConfigurations: FunctionActivatorConfiguration[] = [];
  relationalDatabseTypeConfigurations:
    | RelationalDatabaseTypeConfiguration[]
    | undefined;

  warnings: CompilationWarning[] = [];
  error: EngineError | undefined;
  compilationResultEntities: Entity[] = [];

  enableStrictMode: boolean;
  mostRecentCompilationGraphHash: string | undefined = undefined;
  mostRecentCompilationOutcome: GraphCompilationOutcome | undefined = undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      isInitializingGraph: observable,
      isRunningGlobalCompile: observable,
      isRunningGlobalGenerate: observable,
      isApplicationLeavingGraphEditMode: observable,
      isUpdatingGraph: observable,
      isUpdatingApplication: observable,

      functionActivatorConfigurations: observable,

      mostRecentCompilationGraphHash: observable,
      mostRecentCompilationOutcome: observable,
      warnings: observable,
      error: observable,
      enableStrictMode: observable,
      relationalDatabseTypeConfigurations: observable,
      problems: computed,
      areProblemsStale: computed,
      isApplicationUpdateOperationIsRunning: computed,
      clearProblems: action,
      setEnableStrictMode: action,
      setMostRecentCompilationGraphHash: action,
      fetchAvailableRelationalDatabseTypeConfigurations: flow,
      fetchAvailableFunctionActivatorConfigurations: flow,
      buildGraph: flow,
      loadEntityChangesToGraph: flow,
      updateGenerationGraphAndApplication: flow,
      rebuildDependencies: flow,
      buildGraphForLazyText: flow,
    });

    this.editorStore = editorStore;
    this.graphGenerationState = new GraphGenerationState(this.editorStore);
    this.enableStrictMode =
      this.editorStore.applicationStore.settingService.getBooleanValue(
        LEGEND_STUDIO_SETTING_KEY.EDITOR_STRICT_MODE,
      ) ?? false;
  }

  get problems(): Problem[] {
    return [this.error, ...this.warnings].filter(isNonNullable);
  }

  /**
   * This function is temporary. There is no good way to detect if a problem not coming from
   * the main graph at the moment. In text mode, we can rely on the fact that the source information
   * has line 0 column 0. But this is not the case for form mode, so this is just temporary
   * to help with text-mode.
   */
  TEMPORARY__removeDependencyProblems(
    problems: Problem[] | CompilationWarning[],
  ): Problem[] | CompilationWarning[] {
    return problems.filter((problem) => {
      if (problem.sourceInformation) {
        return !(
          problem.sourceInformation.startLine === 0 &&
          problem.sourceInformation.startColumn === 0 &&
          problem.sourceInformation.endLine === 0 &&
          problem.sourceInformation.endColumn === 0
        );
      }
      return true;
    });
  }

  setMostRecentCompilationGraphHash(val: string | undefined): void {
    this.mostRecentCompilationGraphHash = val;
  }

  setMostRecentCompilationOutcome(
    val: GraphCompilationOutcome | undefined,
  ): void {
    this.mostRecentCompilationOutcome = val;
  }

  get areProblemsStale(): boolean {
    return (
      this.mostRecentCompilationGraphHash !==
      this.editorStore.graphEditorMode.getCurrentGraphHash()
    );
  }

  get isApplicationUpdateOperationIsRunning(): boolean {
    return (
      this.isRunningGlobalCompile ||
      this.isRunningGlobalGenerate ||
      this.isApplicationLeavingGraphEditMode ||
      this.isUpdatingApplication ||
      this.isInitializingGraph
    );
  }

  checkIfApplicationUpdateOperationIsRunning(): boolean {
    if (this.isRunningGlobalGenerate) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Please wait for model generation to complete',
      );
      return true;
    }
    if (this.isRunningGlobalCompile) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Please wait for graph compilation to complete',
      );
      return true;
    }
    if (this.isApplicationLeavingGraphEditMode) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Please wait for editor to leave edit mode completely',
      );
      return true;
    }
    if (this.isUpdatingApplication) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Please wait for editor state to rebuild',
      );
      return true;
    }
    if (this.isInitializingGraph) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Please wait for editor initialization to complete',
      );
      return true;
    }
    return false;
  }

  clearProblems(): void {
    this.error = undefined;
    this.editorStore.tabManagerState.tabs
      .filter(filterByType(ElementEditorState))
      .forEach((editorState) => editorState.clearCompilationError());
    this.mostRecentCompilationGraphHash = undefined;
    this.warnings = [];
  }

  setEnableStrictMode(val: boolean): void {
    this.enableStrictMode = val;
  }

  *fetchAvailableFunctionActivatorConfigurations(): GeneratorFn<void> {
    try {
      this.functionActivatorConfigurations =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableFunctionActivatorConfigurations(
          this.editorStore.graphManagerState.coreModel,
          this.editorStore.graphManagerState.systemModel,
        )) as FunctionActivatorConfiguration[];
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *fetchAvailableRelationalDatabseTypeConfigurations(): GeneratorFn<void> {
    try {
      this.relationalDatabseTypeConfigurations =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableRelationalDatabaseTypeConfigurations()) as
          | RelationalDatabaseTypeConfiguration[]
          | undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  findRelationalDatabaseTypeConfiguration(
    type: string,
  ): RelationalDatabaseTypeConfiguration | undefined {
    return this.relationalDatabseTypeConfigurations?.find(
      (aFlow) => aFlow.type === type,
    );
  }

  *buildGraph(entities: Entity[]): GeneratorFn<GraphBuilderResult> {
    try {
      this.isInitializingGraph = true;
      const stopWatch = new StopWatch();

      // reset
      this.editorStore.graphManagerState.resetGraph();

      // fetch and build dependencies
      stopWatch.record();
      const dependencyManager =
        this.editorStore.graphManagerState.graphManager.createDependencyManager();
      this.editorStore.graphManagerState.graph.dependencyManager =
        dependencyManager;
      this.editorStore.graphManagerState.dependenciesBuildState.setMessage(
        `Fetching dependencies...`,
      );
      const dependencyEntitiesIndex = (yield flowResult(
        this.getIndexedDependencyEntities(),
      )) as Map<string, EntitiesWithOrigin>;
      stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS);

      const dependency_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        dependencyEntitiesIndex,
        this.editorStore.graphManagerState.dependenciesBuildState,
        {},
        dependency_buildReport,
      );
      dependency_buildReport.timings[
        GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS
      ] = stopWatch.getRecord(
        GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS,
      );

      // build graph
      const graph_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildGraph(
        this.editorStore.graphManagerState.graph,
        entities,
        this.editorStore.graphManagerState.graphBuildState,
        {
          TEMPORARY__preserveSectionIndex:
            this.editorStore.applicationStore.config.options
              .TEMPORARY__preserveSectionIndex,
          strict: this.enableStrictMode,
        },
        graph_buildReport,
      );

      // build generations
      const generation_buildReport = createGraphBuilderReport();
      yield this.editorStore.graphManagerState.graphManager.buildGenerations(
        this.editorStore.graphManagerState.graph,
        this.graphGenerationState.generatedEntities,
        this.editorStore.graphManagerState.generationsBuildState,
        {},
        generation_buildReport,
      );

      // report
      stopWatch.record(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS);
      const graphBuilderReportData = {
        timings:
          this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
          ),
        dependencies: dependency_buildReport,
        dependenciesCount:
          this.editorStore.graphManagerState.graph.dependencyManager
            .numberOfDependencies,
        graph: graph_buildReport,
        generations: generation_buildReport,
        generationsCount: this.graphGenerationState.generatedEntities.size,
      };
      LegendStudioTelemetryHelper.logEvent_GraphInitializationSucceeded(
        this.editorStore.applicationStore.telemetryService,
        graphBuilderReportData,
      );

      this.editorStore.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
        graphBuilderReportData,
      );

      // add generation specification if model generation elements exists in graph and no generation specification
      yield flowResult(
        this.graphGenerationState.possiblyAddMissingGenerationSpecifications(),
      );

      return {
        status: GraphBuilderStatus.SUCCEEDED,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      if (error instanceof DependencyGraphBuilderError) {
        this.editorStore.graphManagerState.graphBuildState.fail();
        // no recovery if dependency models cannot be built, this makes assumption that all dependencies models are compiled successfully
        // TODO: we might want to handle this more gracefully when we can show people the dependency model element in the future
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't initialize dependency models. Error: ${error.message}`,
        );
        const projectConfigurationEditorState =
          this.editorStore.projectConfigurationEditorState;
        projectConfigurationEditorState.setSelectedTab(
          CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES,
        );
        this.editorStore.tabManagerState.openTab(
          projectConfigurationEditorState,
        );
      } else if (error instanceof GraphDataDeserializationError) {
        // if something goes wrong with de-serialization, redirect to model importer to fix
        this.redirectToModelImporterForDebugging(error);
      } else if (error instanceof NetworkClientError) {
        this.editorStore.graphManagerState.graphBuildState.fail();
        this.editorStore.applicationStore.notificationService.notifyWarning(
          `Can't build graph. Error: ${error.message}`,
        );
      } else {
        // TODO: we should split this into 2 notifications when we support multiple notifications
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't build graph. Redirected to text mode for debugging. Error: ${error.message}`,
        );
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
          error,
        );
        try {
          yield flowResult(
            this.editorStore.switchModes(GRAPH_EDITOR_MODE.GRAMMAR_TEXT, {
              isGraphBuildFailure: true,
            }),
          );
        } catch (error2) {
          assertErrorThrown(error2);
          this.editorStore.applicationStore.logService.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
            error2,
          );
          if (error2 instanceof NetworkClientError) {
            // in case the server cannot even transform the JSON due to corrupted protocol, we can redirect to model importer
            this.redirectToModelImporterForDebugging(error2);
            return {
              status: GraphBuilderStatus.FAILED,
              error: error2,
            };
          }
          if (error2 instanceof Error) {
            return {
              status: GraphBuilderStatus.FAILED,
              error: error2,
            };
          }
        }
        return {
          status: GraphBuilderStatus.REDIRECTED_TO_TEXT_MODE,
          error,
        };
      }
      return {
        status: GraphBuilderStatus.FAILED,
        error,
      };
    } finally {
      this.isInitializingGraph = false;
    }
  }

  *buildGraphForLazyText(): GeneratorFn<void> {
    this.isInitializingGraph = true;
    const stopWatch = new StopWatch();
    // reset
    this.editorStore.graphManagerState.resetGraph();
    // fetch and build dependencies
    stopWatch.record();
    const dependencyManager =
      this.editorStore.graphManagerState.graphManager.createDependencyManager();
    this.editorStore.graphManagerState.graph.dependencyManager =
      dependencyManager;
    this.editorStore.graphManagerState.dependenciesBuildState.setMessage(
      `Fetching dependencies...`,
    );
    const dependencyEntitiesIndex = (yield flowResult(
      this.getIndexedDependencyEntities(),
    )) as Map<string, EntitiesWithOrigin>;
    stopWatch.record(GRAPH_MANAGER_EVENT.FETCH_GRAPH_DEPENDENCIES__SUCCESS);
    dependencyManager.initialize(dependencyEntitiesIndex);
    // set dependency manager graph origin to entities
    if (dependencyManager.origin === undefined) {
      dependencyManager.setOrigin(
        new GraphEntities(
          Array.from(dependencyEntitiesIndex.values())
            .map((e) => e.entities)
            .flat(),
        ),
      );
    }
    this.isInitializingGraph = false;
    this.editorStore.graphManagerState.dependenciesBuildState.sync(
      ActionState.create().pass(),
    );
  }

  private redirectToModelImporterForDebugging(error: Error): void {
    if (this.editorStore.isInConflictResolutionMode) {
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: `Can't de-serialize graph model from entities`,
        prompt: `Please refresh the application and abort conflict resolution`,
      });
      return;
    }
    this.editorStore.applicationStore.notificationService.notifyWarning(
      `Can't de-serialize graph model from entities. Redirected to model importer for debugging. Error: ${error.message}`,
    );
    const nativeImporterState =
      this.editorStore.modelImporterState.setNativeImportType(
        MODEL_IMPORT_NATIVE_INPUT_TYPE.ENTITIES,
      );
    // Making an async call
    nativeImporterState.loadCurrentProjectEntities();
    this.editorStore.tabManagerState.openTab(
      this.editorStore.modelImporterState,
    );
  }

  /**
   * Loads entity changes to graph and updates application.
   */
  *loadEntityChangesToGraph(
    changes: EntityChange[],
    baseEntities: Entity[] | undefined,
  ): GeneratorFn<void> {
    try {
      assertTrue(
        this.editorStore.graphEditorMode.mode === GRAPH_EDITOR_MODE.FORM,
        `Can't apply entity changes: operation only supported in form mode`,
      );
      const entities =
        baseEntities ??
        this.editorStore.graphManagerState.graph.allOwnElements.map((element) =>
          this.editorStore.graphManagerState.graphManager.elementToEntity(
            element,
          ),
        );
      const modifiedEntities = applyEntityChanges(entities, changes);
      yield flowResult(
        this.editorStore.graphEditorMode.updateGraphAndApplication(
          modifiedEntities,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't load entity changes: ${error.message}`,
      );
    }
  }

  /**
   * NOTE: this can post memory-leak issue if we start having immutable elements referencing current graph elements:
   * e.g. subclass analytics on the immutable class, etc.
   *
   * @risk memory-leak
   */
  *rebuildDependencies(newGraph: PureModel): GeneratorFn<void> {
    if (
      this.editorStore.graphManagerState.dependenciesBuildState.hasSucceeded
    ) {
      newGraph.dependencyManager =
        this.editorStore.graphManagerState.graph.dependencyManager;
    } else {
      this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
        ProjectConfiguration.serialization.fromJson(
          (yield this.editorStore.sdlcServerClient.getConfiguration(
            this.editorStore.sdlcState.activeProject.projectId,
            this.editorStore.sdlcState.activeWorkspace,
          )) as PlainObject<ProjectConfiguration>,
        ),
      );
      const dependencyManager =
        this.editorStore.graphManagerState.graphManager.createDependencyManager();
      newGraph.dependencyManager = dependencyManager;
      const dependenciesBuildState = ActionState.create();
      yield this.editorStore.graphManagerState.graphManager.buildDependencies(
        this.editorStore.graphManagerState.coreModel,
        this.editorStore.graphManagerState.systemModel,
        dependencyManager,
        (yield flowResult(this.getIndexedDependencyEntities())) as Map<
          string,
          EntitiesWithOrigin
        >,
        dependenciesBuildState,
      );
      // NOTE: here we don't want to modify the current graph build state directly
      // instead, we quietly run this in the background and then sync it with the current build state
      this.editorStore.graphManagerState.dependenciesBuildState.sync(
        dependenciesBuildState,
      );
    }
  }

  /**
   * Used to update generation model and generation graph using the generated entities
   * does not alter the main or dependency model
   */
  *updateGenerationGraphAndApplication(): GeneratorFn<void> {
    assertTrue(
      this.editorStore.graphManagerState.graphBuildState.hasSucceeded &&
        this.editorStore.graphManagerState.dependenciesBuildState.hasSucceeded,
      'Both main model and dependencies must be processed to built generation graph',
    );
    this.isUpdatingApplication = true;
    try {
      this.editorStore.tabManagerState.cacheAndClose({ cacheGeneration: true });

      yield flowResult(
        this.editorStore.graphManagerState.graph.generationModel.dispose(),
      );
      // we reset the generation model
      this.editorStore.graphManagerState.graph.generationModel =
        this.editorStore.graphManagerState.graphManager.createGenerationModel();
      yield this.editorStore.graphManagerState.graphManager.buildGenerations(
        this.editorStore.graphManagerState.graph,
        this.graphGenerationState.generatedEntities,
        this.editorStore.graphManagerState.generationsBuildState,
      );
      this.editorStore.explorerTreeState.reprocess();
      this.editorStore.tabManagerState.recoverTabs();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't build graph: ${error.message}`,
      );
    } finally {
      this.isUpdatingApplication = false;
    }
  }

  async getIndexedDependencyEntities(): Promise<
    Map<string, EntitiesWithOrigin>
  > {
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();
    const currentConfiguration =
      this.editorStore.projectConfigurationEditorState
        .currentProjectConfiguration;
    try {
      if (currentConfiguration.projectDependencies.length) {
        const dependencyCoordinates =
          await this.buildProjectDependencyCoordinates(
            currentConfiguration.projectDependencies,
          );
        // NOTE: if A@v1 is transitive dependencies of 2 or more
        // direct dependencies, metadata server will take care of deduplication
        const dependencyEntitiesJson =
          await this.editorStore.depotServerClient.collectDependencyEntities(
            dependencyCoordinates.map((e) =>
              ProjectDependencyCoordinates.serialization.toJson(e),
            ),
            true,
            true,
          );
        const dependencyEntities = dependencyEntitiesJson.map((e) =>
          ProjectVersionEntities.serialization.fromJson(e),
        );
        const dependencyProjects = new Map<string, Set<string>>();
        dependencyEntities.forEach((dependencyInfo) => {
          const projectId = dependencyInfo.id;
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
            dependencyProjects.get(projectId)?.add(dependencyInfo.versionId);
          } else {
            dependencyProjects.set(
              dependencyInfo.id,
              new Set<string>([dependencyInfo.versionId]),
            );
          }
          dependencyEntitiesIndex.set(
            dependencyInfo.id,
            new EntitiesWithOrigin(
              dependencyInfo.groupId,
              dependencyInfo.artifactId,
              dependencyInfo.versionId,
              dependencyInfo.entities,
            ),
          );
        });
        const hasConflicts = Array.from(dependencyProjects.entries()).find(
          ([k, v]) => v.size > 1,
        );
        if (hasConflicts) {
          let dependencyInfo: ProjectDependencyGraphReport | undefined;
          try {
            const dependencyTree =
              await this.editorStore.depotServerClient.analyzeDependencyTree(
                dependencyCoordinates.map((e) =>
                  ProjectDependencyCoordinates.serialization.toJson(e),
                ),
              );
            const rawReport =
              RawProjectDependencyReport.serialization.fromJson(dependencyTree);
            dependencyInfo = buildDependencyReport(rawReport);
          } catch (error) {
            assertErrorThrown(error);
            this.editorStore.applicationStore.logService.error(
              LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
              error,
            );
          }
          const startErrorMessage =
            'Depending on multiple versions of a project is not supported. Found conflicts:\n';
          if (dependencyInfo?.conflicts.length) {
            const conflictingProjects = dependencyInfo.conflicts
              .map(
                (c) =>
                  `project: ${c.groupId}:${c.artifactId}\nversions:[${c.versions
                    .map((v) => v.versionId)
                    .join(',')}]`,
              )
              .join('\n');
            throw new UnsupportedOperationError(
              startErrorMessage + conflictingProjects,
            );
          } else {
            const conflictMessages = Array.from(dependencyProjects.entries())
              .filter(([, v]) => v.size > 1)
              .map(
                ([k, v]) =>
                  `project: ${k}\n versions: ${Array.from(v.values()).join(
                    ',',
                  )}`,
              )
              .join('\n\n');
            throw new UnsupportedOperationError(
              startErrorMessage + conflictMessages,
            );
          }
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      const message = `Can't acquire dependency entitites. Error: ${error.message}`;
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        message,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      throw new DependencyGraphBuilderError(error);
    }
    return dependencyEntitiesIndex;
  }

  async buildProjectDependencyCoordinates(
    projectDependencies: ProjectDependency[],
  ): Promise<ProjectDependencyCoordinates[]> {
    return Promise.all(
      projectDependencies.map(async (dep) =>
        Promise.resolve(
          new ProjectDependencyCoordinates(
            guaranteeNonNullable(dep.groupId),
            guaranteeNonNullable(dep.artifactId),
            dep.versionId,
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------- UTILITIES -----------------------------------------------------

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
    } else if (element instanceof Mapping) {
      return PACKAGEABLE_ELEMENT_TYPE.MAPPING;
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
    } else if (element instanceof DataElement) {
      return PACKAGEABLE_ELEMENT_TYPE.DATA;
    } else if (element instanceof ExecutionEnvironmentInstance) {
      return PACKAGEABLE_ELEMENT_TYPE.EXECUTION_ENVIRONMENT;
    } else if (element instanceof SnowflakeApp) {
      return PACKAGEABLE_ELEMENT_TYPE.SNOWFLAKE_APP;
    } else if (element instanceof HostedService) {
      return PACKAGEABLE_ELEMENT_TYPE.HOSTED_SERVICE;
    }
    const extraElementTypeLabelGetters = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementClassifiers?.() ?? [],
      );
    for (const labelGetter of extraElementTypeLabelGetters) {
      const label = labelGetter(element);
      if (label) {
        return label;
      }
    }
    return PACKAGEABLE_ELEMENT_TYPE.INTERNAL__UnknownElement;
  }
}
