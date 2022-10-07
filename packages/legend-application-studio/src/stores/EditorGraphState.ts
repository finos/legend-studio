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
import { CHANGE_DETECTION_EVENT } from './ChangeDetectionEvent.js';
import { GRAPH_EDITOR_MODE, AUX_PANEL_MODE } from './EditorConfig.js';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertType,
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
import type { DSL_LegendStudioApplicationPlugin_Extension } from './LegendStudioApplicationPlugin.js';
import { type Entity, generateGAVCoordinates } from '@finos/legend-storage';
import {
  type EntityChange,
  type ProjectDependency,
  EntityChangeType,
  ProjectConfiguration,
  applyEntityChanges,
} from '@finos/legend-server-sdlc';
import {
  ProjectVersionEntities,
  ProjectData,
  ProjectDependencyCoordinates,
  ProjectDependencyInfo,
} from '@finos/legend-server-depot';
import {
  type PackageableElement,
  GRAPH_MANAGER_EVENT,
  CompilationError,
  EngineError,
  extractSourceInformationCoordinates,
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
  GraphBuilderError,
  type GraphBuilderReport,
  GraphManagerTelemetry,
  DataElement,
  type EngineWarning,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  CONFIGURATION_EDITOR_TAB,
  getConflictsString,
} from './editor-state/ProjectConfigurationEditorState.js';
import { graph_dispose } from './shared/modifier/GraphModifierHelper.js';
import { PACKAGEABLE_ELEMENT_TYPE } from './shared/ModelClassifierUtils.js';
import { GlobalTestRunnerState } from './sidebar-state/testable/GlobalTestRunnerState.js';
import { LEGEND_STUDIO_APP_EVENT } from './LegendStudioAppEvent.js';
import type { LambdaEditorState } from '@finos/legend-query-builder';

export enum GraphBuilderStatus {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REDIRECTED_TO_TEXT_MODE = 'REDIRECTED_TO_TEXT_MODE',
}

export enum FormModeCompilationOutcome {
  SKIPPED = 'SKIPPED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  FAILED_WITH_ERROR_REVEALED = 'FAILED_WITH_ERROR_REVEALED',
  FAILED_AND_FALLBACK_TO_TEXT_MODE = 'FAILED_AND_FALLBACK_TO_TEXTMODE',
}

export interface GraphBuilderResult {
  status: GraphBuilderStatus;
  error?: Error;
}

export class EditorGraphState {
  readonly editorStore: EditorStore;
  readonly graphGenerationState: GraphGenerationState;

  isInitializingGraph = false;
  isRunningGlobalCompile = false;
  isRunningGlobalGenerate = false;
  isApplicationLeavingTextMode = false;
  isUpdatingGraph = false; // critical synchronous update to refresh the graph
  isUpdatingApplication = false; // including graph update and async operations such as change detection

  constructor(editorStore: EditorStore) {
    makeObservable<EditorGraphState, 'updateGraphAndApplication'>(this, {
      isInitializingGraph: observable,
      isRunningGlobalCompile: observable,
      isRunningGlobalGenerate: observable,
      isApplicationLeavingTextMode: observable,
      isUpdatingGraph: observable,
      isUpdatingApplication: observable,
      hasCompilationError: computed,
      hasEngineWarnings: computed,
      isApplicationUpdateOperationIsRunning: computed,
      clearCompilationError: action,
      buildGraph: flow,
      loadEntityChangesToGraph: flow,
      globalCompileInFormMode: flow,
      globalCompileInTextMode: flow,
      leaveTextMode: flow,
      checkLambdaParsingError: flow,
      updateGraphAndApplication: flow,
      updateGenerationGraphAndApplication: flow,
    });

    this.editorStore = editorStore;
    this.graphGenerationState = new GraphGenerationState(this.editorStore);
  }

  get hasCompilationError(): boolean {
    return (
      Boolean(this.editorStore.grammarTextEditorState.error) ||
      this.editorStore.openedEditorStates
        .filter(filterByType(ElementEditorState))
        .some((editorState) => editorState.hasCompilationError)
    );
  }

  get hasEngineWarnings(): boolean {
    return (
      Boolean(this.editorStore.grammarTextEditorState.warning) ||
      this.editorStore.openedEditorStates
        .filter(filterByType(ElementEditorState))
        .some((editorState) => editorState.hasCompilationError)
    );
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
   * Get entitiy changes to prepare for syncing
   */
  computeLocalEntityChanges(): EntityChange[] {
    const baseHashesIndex = this.editorStore.isInConflictResolutionMode
      ? this.editorStore.changeDetectionState
          .conflictResolutionHeadRevisionState.entityHashesIndex
      : this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
          .entityHashesIndex;
    const originalPaths = new Set(Array.from(baseHashesIndex.keys()));
    const entityChanges: EntityChange[] = [];
    this.editorStore.graphManagerState.graph.allOwnElements.forEach(
      (element) => {
        const elementPath = element.path;
        if (baseHashesIndex.get(elementPath) !== element.hashCode) {
          const entity =
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              element,
              {
                pruneSourceInformation: true,
              },
            );
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
      },
    );
    Array.from(originalPaths).forEach((path) => {
      entityChanges.push({
        type: EntityChangeType.DELETE,
        entityPath: path,
      });
    });
    return entityChanges;
  }

  clearCompilationError(): void {
    this.editorStore.grammarTextEditorState.setError(undefined);
    this.editorStore.openedEditorStates
      .filter(filterByType(ElementEditorState))
      .forEach((editorState) => editorState.clearCompilationError());
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
        this.editorStore.graphManagerState.createEmptyDependencyManager();
      this.editorStore.graphManagerState.graph.dependencyManager =
        dependencyManager;
      this.editorStore.graphManagerState.dependenciesBuildState.setMessage(
        `Fetching dependencies...`,
      );
      const dependencyEntitiesIndex = (yield flowResult(
        this.getIndexedDependencyEntities(),
      )) as Map<string, Entity[]>;
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

      const dependency_buildReport =
        (yield this.editorStore.graphManagerState.graphManager.buildDependencies(
          this.editorStore.graphManagerState.coreModel,
          this.editorStore.graphManagerState.systemModel,
          dependencyManager,
          dependencyEntitiesIndex,
          this.editorStore.graphManagerState.dependenciesBuildState,
        )) as GraphBuilderReport;
      dependency_buildReport.timings[
        GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED
      ] = stopWatch.getRecord(GRAPH_MANAGER_EVENT.GRAPH_DEPENDENCIES_FETCHED);

      // build graph
      const graph_buildReport =
        (yield this.editorStore.graphManagerState.graphManager.buildGraph(
          this.editorStore.graphManagerState.graph,
          entities,
          this.editorStore.graphManagerState.graphBuildState,
          {
            TEMPORARY__preserveSectionIndex:
              this.editorStore.applicationStore.config.options
                .TEMPORARY__preserveSectionIndex,
          },
        )) as GraphBuilderReport;

      // build generations
      const generation_buildReport =
        (yield this.editorStore.graphManagerState.graphManager.buildGenerations(
          this.editorStore.graphManagerState.graph,
          this.graphGenerationState.generatedEntities,
          this.editorStore.graphManagerState.generationsBuildState,
        )) as GraphBuilderReport;

      // report
      stopWatch.record(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED);
      const graphBuilderReportData = {
        timings: {
          [GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED]: stopWatch.getRecord(
            GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED,
          ),
        },
        dependencies: dependency_buildReport,
        graph: graph_buildReport,
        generations: generation_buildReport,
      };
      this.editorStore.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
        graphBuilderReportData,
      );
      GraphManagerTelemetry.logEvent_GraphInitialized(
        this.editorStore.applicationStore.telemetryService,
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      if (error instanceof DependencyGraphBuilderError) {
        this.editorStore.graphManagerState.graphBuildState.fail();
        // no recovery if dependency models cannot be built, this makes assumption that all dependencies models are compiled successfully
        // TODO: we might want to handle this more gracefully when we can show people the dependency model element in the future
        this.editorStore.applicationStore.notifyError(
          `Can't initialize dependency models. Error: ${error.message}`,
        );
        const projectConfigurationEditorState =
          this.editorStore.projectConfigurationEditorState;
        projectConfigurationEditorState.setSelectedTab(
          CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES,
        );
        this.editorStore.setCurrentEditorState(projectConfigurationEditorState);
      } else if (error instanceof GraphDataDeserializationError) {
        // if something goes wrong with de-serialization, redirect to model importer to fix
        this.redirectToModelImporterForDebugging(error);
      } else if (error instanceof NetworkClientError) {
        this.editorStore.graphManagerState.graphBuildState.fail();
        this.editorStore.applicationStore.notifyWarning(
          `Can't build graph. Error: ${error.message}`,
        );
      } else {
        // TODO: we should split this into 2 notifications when we support multiple notifications
        this.editorStore.applicationStore.notifyError(
          `Can't build graph. Redirected to text mode for debugging. Error: ${error.message}`,
        );
        try {
          const editorGrammar =
            (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
              entities,
            )) as string;
          yield flowResult(
            this.editorStore.grammarTextEditorState.setGraphGrammarText(
              editorGrammar,
            ),
          );
        } catch (error2) {
          assertErrorThrown(error2);
          this.editorStore.applicationStore.log.error(
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
        }
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
        yield flowResult(
          this.globalCompileInTextMode({
            ignoreBlocking: true,
            suppressCompilationFailureMessage: true,
          }),
        );
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

  private redirectToModelImporterForDebugging(error: Error): void {
    if (this.editorStore.isInConflictResolutionMode) {
      this.editorStore.applicationStore.setBlockingAlert({
        message: `Can't de-serialize graph model from entities`,
        prompt: `Please refresh the application and abort conflict resolution`,
      });
      return;
    }
    this.editorStore.applicationStore.notifyWarning(
      `Can't de-serialize graph model from entities. Redirected to model importer for debugging. Error: ${error.message}`,
    );
    const nativeImporterState =
      this.editorStore.modelImporterState.setNativeImportType(
        MODEL_IMPORT_NATIVE_INPUT_TYPE.ENTITIES,
      );
    // Making an async call
    nativeImporterState.loadCurrentProjectEntities();
    this.editorStore.openState(this.editorStore.modelImporterState);
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
        this.editorStore.isInFormMode,
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
      yield flowResult(this.updateGraphAndApplication(modifiedEntities));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(
        `Can't load entity changes: ${error.message}`,
      );
    }
  }

  // TODO: when we support showing multiple notifications, we can take this options out as the only users of this
  // is delete element flow, where we want to say `re-compiling graph after deletion`, but because compilation
  // sometimes is so fast, the message flashes, so we want to combine with the message in this method
  *globalCompileInFormMode(options?: {
    message?: string;
    disableNotificationOnSuccess?: boolean;
    openConsole?: boolean;
  }): GeneratorFn<FormModeCompilationOutcome> {
    assertTrue(
      this.editorStore.isInFormMode,
      'Editor must be in form mode to call this method',
    );
    if (this.checkIfApplicationUpdateOperationIsRunning()) {
      return FormModeCompilationOutcome.SKIPPED;
    }
    this.isRunningGlobalCompile = true;
    try {
      this.clearCompilationError();
      if (options?.openConsole) {
        this.editorStore.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
      }
      // NOTE: here we always keep the source information while compiling in form mode
      // so that the form parts where the user interacted with (i.e. where the lamdbas source
      // information are populated), can reveal compilation error. If compilation errors
      // show up in other parts, the user will get redirected to text-mode
      yield this.editorStore.graphManagerState.graphManager.compileGraph(
        this.editorStore.graphManagerState.graph,
        {
          keepSourceInformation: true,
        },
      );

      const errorWarnings =
        yield this.editorStore.graphManagerState.graphManager.compileGraph(
          this.editorStore.graphManagerState.graph,
          { keepSourceInformation: true, getErrorWarnings: true },
        );

      this.editorStore.grammarTextEditorState.setWarnings(
        errorWarnings as EngineWarning[],
      );

      if (!options?.disableNotificationOnSuccess) {
        this.editorStore.applicationStore.notifySuccess(
          'Compiled successfully',
        );
      }

      if (!options?.disableNotificationOnSuccess) {
        this.editorStore.applicationStore.notifySuccess(
          'Compiled successfully',
        );
      }
      return FormModeCompilationOutcome.SUCCEEDED;
    } catch (error) {
      assertErrorThrown(error);
      // TODO: we probably should make this pattern of error the handling for all other exceptions in the codebase
      // i.e. there should be a catch-all handler (we can use if-else construct to check error types)
      assertType(error, EngineError, `Unhandled exception:\n${error}`);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        error,
      );
      let fallbackToTextModeForDebugging = true;
      // if compilation failed, we try to reveal the error in form mode,
      // if even this fail, we will fall back to show it in text mode
      if (error instanceof CompilationError) {
        const errorCoordinates = extractSourceInformationCoordinates(
          error.sourceInformation,
        );
        if (errorCoordinates) {
          const element =
            this.editorStore.graphManagerState.graph.getNullableElement(
              guaranteeNonNullable(
                errorCoordinates[0],
                `Can't reveal compilation error: element path is missing`,
              ),
              false,
            );
          if (element) {
            this.editorStore.openElement(element);
            if (
              this.editorStore.currentEditorState instanceof ElementEditorState
            ) {
              // check if we can reveal the error in the element editor state
              fallbackToTextModeForDebugging =
                !this.editorStore.currentEditorState.revealCompilationError(
                  error,
                );
            }
          }
        }
      }

      // decide if we need to fall back to text mode for debugging
      if (fallbackToTextModeForDebugging) {
        // TODO: when we support showing multiple notifications, we can split this into 2
        this.editorStore.applicationStore.notifyWarning(
          options?.message ??
            'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
        );
        try {
          const code =
            (yield this.editorStore.graphManagerState.graphManager.graphToPureCode(
              this.editorStore.graphManagerState.graph,
            )) as string;
          this.editorStore.grammarTextEditorState.setGraphGrammarText(code);
        } catch (error2) {
          assertErrorThrown(error2);
          this.editorStore.applicationStore.notifyWarning(
            `Can't enter text mode. Transformation to grammar text failed: ${error2.message}`,
          );
          return FormModeCompilationOutcome.FAILED;
        }
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.GRAMMAR_TEXT);
        yield flowResult(
          this.globalCompileInTextMode({
            ignoreBlocking: true,
            suppressCompilationFailureMessage: true,
            disableNotificationOnSuccess: options?.disableNotificationOnSuccess,
          }),
        );
        return FormModeCompilationOutcome.FAILED_AND_FALLBACK_TO_TEXT_MODE;
      } else {
        this.editorStore.applicationStore.notifyWarning(
          `Compilation failed: ${error.message}`,
        );
        return FormModeCompilationOutcome.FAILED_WITH_ERROR_REVEALED;
      }
    } finally {
      this.isRunningGlobalCompile = false;
    }
  }

  // TODO: when we support showing multiple notifications, we can take this `suppressCompilationFailureMessage` out as
  // we can show the transition between form mode and text mode warning and the compilation failure warning at the same time
  *globalCompileInTextMode(options?: {
    ignoreBlocking?: boolean | undefined;
    suppressCompilationFailureMessage?: boolean | undefined;
    suppressEngineDiscrepancyFailureMessage?: boolean | undefined;
    disableNotificationOnSuccess?: boolean | undefined;
    openConsole?: boolean;
  }): GeneratorFn<void> {
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
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.compileText(
          this.editorStore.grammarTextEditorState.graphGrammarText,
          this.editorStore.graphManagerState.graph,
        )) as Entity[];

      //TODO: -change
      const errorWarnings =
        (yield this.editorStore.graphManagerState.graphManager.compileText(
          this.editorStore.grammarTextEditorState.graphGrammarText,
          this.editorStore.graphManagerState.graph,
          { getErrorWarnings: true },
        )) as EngineWarning[];

      const errorWarning = errorWarnings[0];

      if (errorWarning) {
        this.editorStore.grammarTextEditorState.setWarning(errorWarning),
          this.editorStore.applicationStore.log.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
            'Compilation failed:',
            errorWarning,
          );
        if (!options?.suppressEngineDiscrepancyFailureMessage) {
          this.editorStore.applicationStore.notifyWarning(
            `Compilation failed: ${errorWarning.message}`,
          );
        }
      } else {
        if (!options?.disableNotificationOnSuccess) {
          this.editorStore.applicationStore.notifySuccess(
            'Compiled successfully',
          );
        }
      }

      this.editorStore.grammarTextEditorState.setWarnings(errorWarnings);

      yield flowResult(this.updateGraphAndApplication(entities));
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        this.editorStore.grammarTextEditorState.setError(error);
      }
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
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
  }

  *leaveTextMode(): GeneratorFn<void> {
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
      this.editorStore.applicationStore.setBlockingAlert({
        message: 'Compiling graph before leaving text mode...',
        showLoading: true,
      });
      try {
        const entities =
          (yield this.editorStore.graphManagerState.graphManager.compileText(
            this.editorStore.grammarTextEditorState.graphGrammarText,
            this.editorStore.graphManagerState.graph,
            // surpress the modal to reveal error properly in the text editor
            // if the blocking modal is not dismissed, the edior will not be able to gain focus as modal has a focus trap
            // therefore, the editor will not be able to get the focus
            {
              onError: () =>
                this.editorStore.applicationStore.setBlockingAlert(undefined),
            },
          )) as Entity[];
        this.editorStore.applicationStore.setBlockingAlert({
          message: 'Leaving text mode and rebuilding graph...',
          showLoading: true,
        });
        yield flowResult(this.updateGraphAndApplication(entities));
        this.editorStore.grammarTextEditorState.setGraphGrammarText('');
        this.editorStore.grammarTextEditorState.resetCurrentElementLabelRegexString();
        this.editorStore.setGraphEditMode(GRAPH_EDITOR_MODE.FORM);
        if (this.editorStore.currentEditorState) {
          this.editorStore.openState(this.editorStore.currentEditorState);
        }
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof EngineError) {
          this.editorStore.grammarTextEditorState.setError(error);
        }
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
          'Compilation failed:',
          error,
        );
        if (this.editorStore.graphManagerState.graphBuildState.hasFailed) {
          // TODO: when we support showing multiple notification, we can split this into 2 messages
          this.editorStore.applicationStore.notifyWarning(
            `Can't build graph, please resolve compilation error before leaving text mode. Compilation failed with error: ${error.message}`,
          );
        } else {
          this.editorStore.applicationStore.notifyWarning(
            `Compilation failed: ${error.message}`,
          );
          this.editorStore.applicationStore.setActionAlertInfo({
            message: 'Project is not in a compiled state',
            prompt:
              'All changes made since the last time the graph was built successfully will be lost',
            type: ActionAlertType.CAUTION,
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
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        error,
      );
    } finally {
      this.isApplicationLeavingTextMode = false;
      this.editorStore.applicationStore.setBlockingAlert(undefined);
    }
  }

  /**
   * This function is used in lambda editor in form mode when user try to do an action that involves the lambda being edited, it takes an action
   * and proceeds with a parsing check for the current lambda before executing the action. This prevents case where user quickly type something
   * that does not parse and hit compile or generate right away.
   */
  *checkLambdaParsingError(
    lambdaHolderElement: LambdaEditorState,
    checkParsingError: boolean,
    onSuccess: () => Promise<void>,
  ): GeneratorFn<void> {
    this.clearCompilationError();
    lambdaHolderElement.clearErrors();
    if (checkParsingError) {
      yield flowResult(
        lambdaHolderElement.convertLambdaGrammarStringToObject(),
      );
      // abort action if parser error occurred
      if (lambdaHolderElement.parserError) {
        return;
      }
    }
    yield onSuccess();
  }

  /**
   * NOTE: IMPORTANT! This method is both a savior and a sinner. It helps reprocessing the graph state to use a new graph
   * built from the new model context data, it resets the graph properly. The bane here is that resetting the graph properly is
   * not trivial, for example, in the cleanup phase, there are things we want to re-use, such as the one-time processed system
   * metamodels or the `reusable` metamodels from project dependencies. There are also explorer states like the package tree,
   * opened tabs, change detection, etc. to take care of. There are a lot of potential pitfalls. For these, we will add the
   * marker:
   *
   * @risk memory-leak
   *
   * to indicate we should check carefully these pieces when we detect memory issue as it might still
   * be referring to the old graph
   *
   * In the past, we have found that there are a few potential root causes for memory leak:
   * 1. State management Mobx allows references, as such, it is sometimes hard to trace down which references can cause problem
   *    We have to understand that the behind this updater is very simple (replace), yet to do it cleanly is not easy, since
   *    so far it is tempting to refer to elements in the graph from various editor state. On top of that, change detection
   *    sometimes obfuscate the investigation but we have cleared it out with explicit disposing of reaction
   * 2. Reusable models, at this point in time, we haven't completed stabilize the logic for handling generated models, as well
   *    as depdendencies, we intended to save computation time by reusing these while updating the graph. This can pose potential
   *    danger as well. Beware the way when we start to make system/project dependencies references elements of current graph
   *    e.g. when we have a computed value in a immutable class that get all subclasses, etc.
   * 3. We reprocess editor states to ensure good UX, e.g. find tabs to keep open, find tree nodes to expand, etc.
   *    after updating the graph. These in our experience is the **MOST COMMON** source of memory leak. It is actually
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
  private *updateGraphAndApplication(entities: Entity[]): GeneratorFn<void> {
    const startTime = Date.now();
    this.isUpdatingApplication = true;
    this.isUpdatingGraph = true;
    try {
      const newGraph = this.editorStore.graphManagerState.createEmptyGraph();
      /**
       * NOTE: this can post memory-leak issue if we start having immutable elements referencing current graph elements:
       * e.g. subclass analytics on the immutable class, etc.
       *
       * @risk memory-leak
       */
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
          this.editorStore.graphManagerState.createEmptyDependencyManager();
        newGraph.dependencyManager = dependencyManager;
        const dependenciesBuildState = ActionState.create();
        yield this.editorStore.graphManagerState.graphManager.buildDependencies(
          this.editorStore.graphManagerState.coreModel,
          this.editorStore.graphManagerState.systemModel,
          dependencyManager,
          (yield flowResult(this.getIndexedDependencyEntities())) as Map<
            string,
            Entity[]
          >,
          dependenciesBuildState,
        );
        this.editorStore.graphManagerState.dependenciesBuildState =
          dependenciesBuildState;
      }

      /**
       * Backup and editor states info before resetting
       *
       * @risk memory-leak
       */
      const openedEditorStates = this.editorStore.openedEditorStates;
      const currentEditorState = this.editorStore.currentEditorState;
      /**
       * We remove the current editor state so that we no longer let React displays the element that belongs to the old graph
       * NOTE: this causes an UI flash, but this is in many way, acceptable since the user probably should know that we are
       * refreshing the memory graph anyway.
       *
       * If this is really bothering, we can handle it by building mocked replica of the current editor state using stub element
       * e.g. if the current editor is a class, we stub the class, create a new class editor state around it and copy over
       * navigation information, etc.
       */
      this.editorStore.closeAllEditorTabs();

      this.editorStore.changeDetectionState.stop(); // stop change detection before disposing hash
      yield flowResult(graph_dispose(this.editorStore.graphManagerState.graph));

      const graphBuildState = ActionState.create();
      yield this.editorStore.graphManagerState.graphManager.buildGraph(
        newGraph,
        entities,
        graphBuildState,
        {
          TEMPORARY__preserveSectionIndex:
            this.editorStore.applicationStore.config.options
              .TEMPORARY__preserveSectionIndex,
        },
      );

      // Activity States
      this.editorStore.globalTestRunnerState = new GlobalTestRunnerState(
        this.editorStore,
        this.editorStore.sdlcState,
      );

      // NOTE: build model generation entities every-time we rebuild the graph - should we do this?
      const generationsBuildState = ActionState.create();
      yield this.editorStore.graphManagerState.graphManager.buildGenerations(
        newGraph,
        this.graphGenerationState.generatedEntities,
        generationsBuildState,
      );

      this.editorStore.graphManagerState.graph = newGraph;
      this.editorStore.graphManagerState.graphBuildState = graphBuildState;
      this.editorStore.graphManagerState.generationsBuildState =
        generationsBuildState;

      /**
       * Reprocess explorer tree which might still hold references to old graph
       *
       * FIXME: we allow this so the UX stays the same but this can cause memory leak
       * we could consider doing this properly using node IDs
       *
       * @risk memory-leak
       */
      this.editorStore.explorerTreeState.reprocess();
      // this.editorStore.explorerTreeState = new ExplorerTreeState(this.applicationStore, this.editorStore);
      // this.editorStore.explorerTreeState.buildImmutableModelTrees();
      // this.editorStore.explorerTreeState.build();

      /**
       * Reprocess editor states which might still hold references to old graph
       *
       * FIXME: we allow this so the UX stays the same but this can cause memory leak
       * we should change `reprocess` model to do something like having source information
       * on the form to navigate to it properly so that information is not dependent on the
       * graph, but on the component itself, with IDs and such.
       *
       * @risk memory-leak
       */
      this.editorStore.openedEditorStates = openedEditorStates
        .map((editorState) =>
          this.editorStore.reprocessElementEditorState(editorState),
        )
        .filter(isNonNullable);
      this.editorStore.setCurrentEditorState(
        this.editorStore.findCurrentEditorState(currentEditorState),
      );

      this.editorStore.applicationStore.log.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_UPDATED_AND_REBUILT),
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );
      this.isUpdatingGraph = false;

      // ======= (RE)START CHANGE DETECTION =======
      yield flowResult(this.editorStore.changeDetectionState.observeGraph());
      yield this.editorStore.changeDetectionState.preComputeGraphElementHashes();
      this.editorStore.changeDetectionState.start();
      this.editorStore.applicationStore.log.info(
        LogEvent.create(CHANGE_DETECTION_EVENT.CHANGE_DETECTION_RESTARTED),
        '[ASYNC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      this.editorStore.changeDetectionState.stop(true); // force stop change detection
      this.isUpdatingGraph = false;
      // Note: in the future this function will probably be ideal to refactor when we have different classes for each mode
      // as we would handle this error differently in `text` mode and `form` mode.
      if (error instanceof GraphBuilderError && this.editorStore.isInFormMode) {
        this.editorStore.applicationStore.setBlockingAlert({
          message: `Can't build graph: ${error.message}`,
          prompt: 'Refreshing full application...',
          showLoading: true,
        });
        this.editorStore.closeAllEditorTabs();
        this.editorStore.cleanUp();
        yield flowResult(this.editorStore.buildGraph(entities));
      } else {
        this.editorStore.applicationStore.notifyError(
          `Can't build graph: ${error.message}`,
        );
      }
    } finally {
      this.isUpdatingApplication = false;
      this.editorStore.applicationStore.setBlockingAlert(undefined);
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
      /**
       * Backup and editor states info before resetting
       *
       * @risk memory-leak
       */
      const openedEditorStates = this.editorStore.openedEditorStates;
      const currentEditorState = this.editorStore.currentEditorState;
      this.editorStore.closeAllEditorTabs();

      yield flowResult(
        this.editorStore.graphManagerState.graph.generationModel.dispose(),
      );
      // we reset the generation model
      this.editorStore.graphManagerState.graph.generationModel =
        this.editorStore.graphManagerState.createEmptyGenerationModel();
      yield this.editorStore.graphManagerState.graphManager.buildGenerations(
        this.editorStore.graphManagerState.graph,
        this.graphGenerationState.generatedEntities,
        this.editorStore.graphManagerState.generationsBuildState,
      );

      /**
       * Reprocess explorer tree which might still hold references to old graph
       *
       * FIXME: we allow this so the UX stays the same but this can cause memory leak
       * we could consider doing this properly using node IDs
       *
       * @risk memory-leak
       */
      this.editorStore.explorerTreeState.reprocess();

      // so that information is not dependent on the graph, but on the component itself, with IDs and such.
      this.editorStore.openedEditorStates = openedEditorStates
        .map((editorState) =>
          this.editorStore.reprocessElementEditorState(editorState),
        )
        .filter(isNonNullable);
      this.editorStore.setCurrentEditorState(
        this.editorStore.findCurrentEditorState(currentEditorState),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(
        `Can't build graph: ${error.message}`,
      );
    } finally {
      this.isUpdatingApplication = false;
    }
  }

  async getIndexedDependencyEntities(): Promise<Map<string, Entity[]>> {
    const dependencyEntitiesIndex = new Map<string, Entity[]>();
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
            dependencyInfo.entities,
          );
        });
        const hasConflicts = Array.from(dependencyProjects.entries()).find(
          ([k, v]) => v.size > 1,
        );
        if (hasConflicts) {
          let dependencyInfo: ProjectDependencyInfo | undefined;
          try {
            const dependencyTree =
              await this.editorStore.depotServerClient.analyzeDependencyTree(
                dependencyCoordinates.map((e) =>
                  ProjectDependencyCoordinates.serialization.toJson(e),
                ),
              );
            dependencyInfo =
              ProjectDependencyInfo.serialization.fromJson(dependencyTree);
          } catch (error) {
            assertErrorThrown(error);
            this.editorStore.applicationStore.log.error(
              LogEvent.create(LEGEND_STUDIO_APP_EVENT.DEPOT_MANAGER_FAILURE),
              error,
            );
          }
          const startErrorMessage =
            'Depending on multiple versions of a project is not supported. Found conflicts:\n';
          if (dependencyInfo?.conflicts) {
            throw new UnsupportedOperationError(
              startErrorMessage + getConflictsString(dependencyInfo),
            );
          } else {
            throw new UnsupportedOperationError(
              startErrorMessage +
                Array.from(dependencyProjects.entries())
                  .map(([k, v]) => {
                    if (v.size > 1) {
                      `project: ${k}\n versions: \n${Array.from(
                        v.values(),
                      ).join('\n')}`;
                    }
                    return '';
                  })
                  .join('\n'),
            );
          }
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      const message = `Can't acquire dependency entitites. Error: ${error.message}`;
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        message,
      );
      this.editorStore.applicationStore.notifyError(error);
      throw new DependencyGraphBuilderError(error);
    }
    return dependencyEntitiesIndex;
  }

  async buildProjectDependencyCoordinates(
    projectDependencies: ProjectDependency[],
  ): Promise<ProjectDependencyCoordinates[]> {
    return Promise.all(
      projectDependencies.map((dep) => {
        // legacyDependencies
        // We do this for backward compatible reasons as we expect current dependency ids to be in the format of {groupId}:{artifactId}.
        // For the legacy dependency we must fetch the corresponding coordinates (group, artifact ids) from the depot server
        if (dep.isLegacyDependency) {
          return this.editorStore.depotServerClient
            .getProjectById(dep.projectId)
            .then((projects) => {
              const projectsData = projects.map((p) =>
                ProjectData.serialization.fromJson(p),
              );
              if (projectsData.length !== 1) {
                throw new Error(
                  `Expected 1 project for project ID '${dep.projectId}'. Got ${
                    projectsData.length
                  } projects with coordinates ${projectsData
                    .map(
                      (i) =>
                        `'${generateGAVCoordinates(
                          i.groupId,
                          i.artifactId,
                          undefined,
                        )}'`,
                    )
                    .join(', ')}.`,
                );
              }
              const project = projectsData[0] as ProjectData;
              return new ProjectDependencyCoordinates(
                project.groupId,
                project.artifactId,
                dep.versionId,
              );
            });
        } else {
          return Promise.resolve(
            new ProjectDependencyCoordinates(
              guaranteeNonNullable(dep.groupId),
              guaranteeNonNullable(dep.artifactId),
              dep.versionId,
            ),
          );
        }
      }),
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
    throw new UnsupportedOperationError(
      `Can't get type label for element '${element.path}': no compatible label getter available from plugins`,
    );
  }
}
