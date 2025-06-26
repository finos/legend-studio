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
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  type PackageableElement,
  type SourceInformation,
  type TextCompilationResult,
  type GraphManagerOperationReport,
  GRAPH_MANAGER_EVENT,
  EngineError,
  GraphBuilderError,
  reportGraphAnalytics,
  INTERNAL__UnknownElement,
  type GraphTextInputOption,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  ActionState,
  StopWatch,
  assertNonNullable,
  filterByType,
  assertTrue,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { makeObservable, flow, flowResult, observable, action } from 'mobx';
import { GrammarTextEditorState } from './editor-state/GrammarTextEditorState.js';
import type { EditorStore } from './EditorStore.js';
import { ExplorerTreeState } from './ExplorerTreeState.js';

import { TextLocalChangesState } from './sidebar-state/LocalChangesState.js';
import { GraphCompilationOutcome, type Problem } from './EditorGraphState.js';
import { GRAPH_EDITOR_MODE, PANEL_MODE } from './EditorConfig.js';
import { graph_dispose } from '../graph-modifier/GraphModifierHelper.js';
import { LegendStudioTelemetryHelper } from '../../__lib__/LegendStudioTelemetryHelper.js';
import { GraphEditorMode } from './GraphEditorMode.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import type { FileSystem_File } from './utils/FileSystemTreeUtils.js';

export enum GRAMMAR_MODE_EDITOR_ACTION {
  GO_TO_ELEMENT_DEFINITION = 'go-to-element-definition',
}

export class GraphEditGrammarModeState extends GraphEditorMode {
  grammarTextEditorState: GrammarTextEditorState;
  generatedFile: FileSystem_File | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);
    makeObservable(this, {
      grammarTextEditorState: observable,
      generatedFile: observable,
      setGeneratedFile: action,
      compileText: flow,
      goToElement: flow,
    });
    this.grammarTextEditorState = new GrammarTextEditorState(this.editorStore);
  }

  get headerLabel(): string {
    return 'Text Mode';
  }

  setGeneratedFile(val: FileSystem_File | undefined): void {
    this.generatedFile = val;
  }

  *initialize(isFallback?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
    useStoredEntities?: boolean;
  }): GeneratorFn<void> {
    this.editorStore.localChangesState = new TextLocalChangesState(
      this.editorStore,
      this.editorStore.sdlcState,
    );
    this.editorStore.graphState.clearProblems();
    this.editorStore.changeDetectionState.stop();
    try {
      const sourceInformationIndex = new Map<string, SourceInformation>();
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
          this.grammarTextEditorState.graphGrammarText,
          {
            sourceInformationIndex,
          },
        )) as Entity[];
      this.grammarTextEditorState.setSourceInformationIndex(
        sourceInformationIndex,
      );

      //Include the UnknownPackageableElements when sending to compute local changes
      //Otherwise, they get deleted because they dont exist in the graphGrammarText
      const unknownEntities = this.getUnknownPackageableElementsAsEntities();
      entities.push(...unknownEntities);

      yield flowResult(
        this.editorStore.changeDetectionState.computeLocalChangesInTextMode(
          entities,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.warn(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        error,
      );
    }
    if (
      isFallback?.isCompilationFailure ||
      isFallback?.isGraphBuildFailure ||
      isFallback?.useStoredEntities
    ) {
      yield flowResult(
        this.globalCompile({
          ignoreBlocking: true,
          suppressCompilationFailureMessage: true,
        }),
      );
    }
    // navigate to the currently opened element immediately after entering text mode editor
    if (
      this.editorStore.tabManagerState.currentTab instanceof ElementEditorState
    ) {
      const sourceInformation =
        this.grammarTextEditorState.sourceInformationIndex.get(
          this.editorStore.tabManagerState.currentTab.element.path,
        );
      if (sourceInformation) {
        this.grammarTextEditorState.setForcedCursorPosition({
          lineNumber: sourceInformation.startLine,
          column: 0,
        });
      }
    }
  }

  *goToElement(elementPath: string): GeneratorFn<void> {
    try {
      const sourceInformationIndex = new Map<string, SourceInformation>();
      (yield this.editorStore.graphManagerState.graphManager.pureCodeToEntities(
        this.grammarTextEditorState.graphGrammarText,
        {
          sourceInformationIndex,
        },
      )) as Entity[];
      this.grammarTextEditorState.setSourceInformationIndex(
        sourceInformationIndex,
      );
      const sourceInformation =
        this.grammarTextEditorState.sourceInformationIndex.get(elementPath);
      assertNonNullable(
        sourceInformation,
        `No definition found for current element in current grammar. Element may not exist of be defined in dependencies`,
      );
      this.grammarTextEditorState.setForcedCursorPosition({
        lineNumber: sourceInformation.startLine,
        column: 0,
      });
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.TEXT_MODE_ACTION_KEYBOARD_SHORTCUT_GO_TO_DEFINITION__SUCCESS,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to go to element ${elementPath}: ${error.message}`,
      );
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.TEXT_MODE_ACTION_KEYBOARD_SHORTCUT_GO_TO_DEFINITION__ERROR,
        ),
        error,
      );
    }
  }

  *compileText(
    options?: {
      onError?: () => void;
    },
    report?: GraphManagerOperationReport,
  ): GeneratorFn<TextCompilationResult> {
    return (yield this.editorStore.graphManagerState.graphManager.compileText(
      this.grammarTextEditorState.graphGrammarText,
      this.editorStore.graphManagerState.graph,
      options,
    )) as TextCompilationResult;
  }

  getCurrentGraphHash(): string {
    return this.grammarTextEditorState.currentTextGraphHash;
  }

  getUnknownPackageableElementsAsEntities(): Entity[] {
    return this.editorStore.graphManagerState.graph.allOwnElements.filter(
      filterByType(INTERNAL__UnknownElement),
    );
  }

  *addElement(
    element: PackageableElement,
    packagePath: string | undefined,
    openAfterCreate: boolean,
  ): GeneratorFn<void> {
    return;
  }

  *deleteElement(element: PackageableElement): GeneratorFn<void> {
    return;
  }

  *renameElement(
    element: PackageableElement,
    newPath: string,
  ): GeneratorFn<void> {
    return;
  }

  override getGraphTextInputOption(): GraphTextInputOption | undefined {
    assertTrue(
      this.editorStore.graphState.mostRecentCompilationOutcome ===
        GraphCompilationOutcome.SUCCEEDED,
      'Please ensure compilation has succeeded before proceeding',
    );
    return {
      graphGrammar: this.grammarTextEditorState.graphGrammarText,
    };
  }

  get mode(): GRAPH_EDITOR_MODE {
    return GRAPH_EDITOR_MODE.GRAMMAR_TEXT;
  }

  /**
   * Creates a new explorer tree state when compiling in text mode. It resets the explorer state properly
   * after the new graph is built. It tries to maintain the explorer state similar to what it was before compilation.
   * To achieve that we store node ids of the opened nodes before creating a new explorer state. After creating a
   * new state we open the nodes which were opened before so that user see the same explorer state as before.
   */
  reprocessExplorerTreeInTextMode(): void {
    const mainTreeOpenedNodeIds = this.editorStore.explorerTreeState.treeData
      ? Array.from(this.editorStore.explorerTreeState.treeData.nodes.values())
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    const generationTreeOpenedNodeIds = this.editorStore.explorerTreeState
      .generationTreeData
      ? Array.from(
          this.editorStore.explorerTreeState.generationTreeData.nodes.values(),
        )
          .filter((node) => node.isOpen)
          .map((node) => node.id)
      : [];
    // Storing dependencyTree, filegenerationTree, systemTree as is as they don't
    // hold any reference to actual graph
    const systemTreeData = this.editorStore.explorerTreeState.systemTreeData;
    const dependencyTreeData =
      this.editorStore.explorerTreeState.dependencyTreeData;
    const selectedNodeId = this.editorStore.explorerTreeState.selectedNode?.id;
    this.editorStore.explorerTreeState = new ExplorerTreeState(
      this.editorStore,
    );
    this.editorStore.explorerTreeState.systemTreeData = systemTreeData;
    this.editorStore.explorerTreeState.dependencyTreeData = dependencyTreeData;
    this.editorStore.explorerTreeState.buildTreeInTextMode();
    this.editorStore.explorerTreeState.openExplorerTreeNodes(
      mainTreeOpenedNodeIds,
      generationTreeOpenedNodeIds,
      selectedNodeId,
    );
  }

  *updateGraphAndApplication(entities: Entity[]): GeneratorFn<void> {
    const startTime = Date.now();
    this.editorStore.graphState.isUpdatingApplication = true;
    this.editorStore.graphState.isUpdatingGraph = true;
    try {
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      yield flowResult(
        this.editorStore.graphState.rebuildDependencies(newGraph),
      );
      yield flowResult(graph_dispose(this.editorStore.graphManagerState.graph));

      const graphBuildState = ActionState.create();
      yield this.editorStore.graphManagerState.graphManager.buildLightGraph(
        newGraph,
        entities,
        graphBuildState,
        {
          TEMPORARY__preserveSectionIndex:
            this.editorStore.applicationStore.config.options
              .TEMPORARY__preserveSectionIndex,
          strict: this.editorStore.graphState.enableStrictMode,
        },
      );

      this.editorStore.graphManagerState.graph = newGraph;
      // NOTE: here we don't want to modify the current graph build state directly
      // instead, we quietly run this in the background and then sync it with the current build state
      this.editorStore.graphManagerState.graphBuildState.sync(graphBuildState);
      this.reprocessExplorerTreeInTextMode();

      this.editorStore.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.UPDATE_AND_REBUILD_GRAPH__SUCCESS),
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );
      this.editorStore.graphState.isUpdatingGraph = false;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      this.editorStore.graphState.isUpdatingGraph = false;
      if (error instanceof GraphBuilderError) {
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't build graph: ${error.message}`,
        );
      }
    } finally {
      this.editorStore.graphState.isUpdatingApplication = false;
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }

  // TODO: when we support showing multiple notifications, we can take this `suppressCompilationFailureMessage` out as
  // we can show the transition between form mode and text mode warning and the compilation failure warning at the same time
  *globalCompile(options?: {
    ignoreBlocking?: boolean | undefined;
    suppressCompilationFailureMessage?: boolean | undefined;
    disableNotificationOnSuccess?: boolean | undefined;
    openConsole?: boolean;
  }): GeneratorFn<void> {
    if (
      !options?.ignoreBlocking &&
      this.editorStore.graphState.checkIfApplicationUpdateOperationIsRunning()
    ) {
      this.editorStore.graphState.setMostRecentCompilationOutcome(
        GraphCompilationOutcome.SKIPPED,
      );
      return;
    }

    const stopWatch = new StopWatch();
    const report = reportGraphAnalytics(
      this.editorStore.graphManagerState.graph,
    );
    LegendStudioTelemetryHelper.logEvent_TextCompilationLaunched(
      this.editorStore.applicationStore.telemetryService,
    );

    const currentGraphHash = this.getCurrentGraphHash();

    try {
      this.editorStore.graphState.isRunningGlobalCompile = true;
      this.editorStore.graphState.clearProblems();
      if (options?.openConsole) {
        this.editorStore.setActivePanelMode(PANEL_MODE.CONSOLE);
      }

      const compilationResult = (yield flowResult(
        this.compileText({}, report),
      )) as TextCompilationResult;

      const entities = compilationResult.entities;

      //Include the UnknownPackageableElements when updating graph and sending to compute local changes
      //Otherwise, they get deleted because they dont exist in the CompilationResult
      const unknownEntities = this.getUnknownPackageableElementsAsEntities();
      entities.push(...unknownEntities);

      this.editorStore.graphState.setMostRecentCompilationGraphHash(
        currentGraphHash,
      );
      this.editorStore.graphState.warnings = compilationResult.warnings
        ? this.editorStore.graphState.TEMPORARY__removeDependencyProblems(
            compilationResult.warnings,
          )
        : [];

      if (!options?.disableNotificationOnSuccess) {
        if (this.editorStore.graphState.warnings.length) {
          this.editorStore.applicationStore.notificationService.notifyWarning(
            `Compilation succeeded with warnings`,
          );
        } else {
          if (!options?.disableNotificationOnSuccess) {
            this.editorStore.applicationStore.notificationService.notifySuccess(
              'Compiled successfully',
            );
          }
        }
      }
      this.grammarTextEditorState.setSourceInformationIndex(
        compilationResult.sourceInformationIndex,
      );

      yield flowResult(this.updateGraphAndApplication(entities));

      // Remove `SectionIndex when computing changes in text mode as engine after
      // transforming grammarToJson would return `SectionIndex` which is not
      // required to do change detection.
      yield flowResult(
        this.editorStore.changeDetectionState.computeLocalChangesInTextMode(
          this.editorStore.graphManagerState.graphManager.getElementEntities(
            entities,
          ),
        ),
      );
      this.editorStore.graphState.setMostRecentCompilationOutcome(
        GraphCompilationOutcome.SUCCEEDED,
      );
      report.timings =
        this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
          stopWatch,
          report.timings,
        );
      LegendStudioTelemetryHelper.logEvent_TextCompilationSucceeded(
        this.editorStore.applicationStore.telemetryService,
        report,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.graphState.setMostRecentCompilationGraphHash(
        currentGraphHash,
      );
      let detail: string | undefined = undefined;
      if (error instanceof EngineError) {
        this.editorStore.graphState.error = error;
        if (error.sourceInformation) {
          this.grammarTextEditorState.setForcedCursorPosition({
            lineNumber: error.sourceInformation.startLine,
            column: error.sourceInformation.startColumn,
          });
        }
        detail = error.trace;
      }
      if (
        !this.editorStore.applicationStore.notificationService.notification ||
        !options?.suppressCompilationFailureMessage
      ) {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          `Compilation failed: ${error.message}`,
          detail,
        );
      }
      this.editorStore.graphState.setMostRecentCompilationOutcome(
        GraphCompilationOutcome.FAILED,
      );
    } finally {
      this.editorStore.graphState.isRunningGlobalCompile = false;
    }
  }

  goToProblem(problem: Problem): void {
    // NOTE: in text mode, we allow click to go to position even when the problems might already be stale
    if (problem.sourceInformation) {
      this.grammarTextEditorState.setForcedCursorPosition({
        lineNumber: problem.sourceInformation.startLine,
        column: problem.sourceInformation.startColumn,
      });
    }
  }

  *onLeave(fallbackOptions?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
  }): GeneratorFn<void> {
    if (!fallbackOptions) {
      this.editorStore.graphState.isApplicationLeavingGraphEditMode = true;
      this.editorStore.graphState.clearProblems();
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Compiling graph before leaving text mode...',
        showLoading: true,
      });
      const compilationResult = (yield flowResult(
        this.compileText(
          // surpress the modal to reveal error properly in the text editor
          // if the blocking modal is not dismissed, the edior will not be able to gain focus as modal has a focus trap
          // therefore, the editor will not be able to get the focus
          {
            onError: () =>
              this.editorStore.applicationStore.alertService.setBlockingAlert(
                undefined,
              ),
          },
        ),
      )) as TextCompilationResult;
      this.editorStore.graphState.setMostRecentCompilationOutcome(
        GraphCompilationOutcome.SUCCEEDED,
      );

      this.editorStore.graphState.warnings = compilationResult.warnings
        ? this.editorStore.graphState.TEMPORARY__removeDependencyProblems(
            compilationResult.warnings,
          )
        : [];

      const entities = compilationResult.entities;

      //Include the UnknownPackageableElements when updating graph
      //Otherwise, they get deleted because they dont exist in the CompilationResult
      const unknownEntities = this.getUnknownPackageableElementsAsEntities();
      entities.push(...unknownEntities);

      this.editorStore.graphState.compilationResultEntities = entities;
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Leaving text mode and rebuilding graph...',
        showLoading: true,
      });
    }
  }

  *handleCleanupFailure(error: unknown): GeneratorFn<void> {
    assertErrorThrown(error);
    this.editorStore.graphState.setMostRecentCompilationOutcome(
      GraphCompilationOutcome.FAILED,
    );
    this.editorStore.graphState.setMostRecentCompilationGraphHash(
      this.getCurrentGraphHash(),
    );
    if (error instanceof EngineError && error.sourceInformation) {
      this.grammarTextEditorState.setForcedCursorPosition({
        lineNumber: error.sourceInformation.startLine,
        column: error.sourceInformation.startColumn,
      });
    }
    this.editorStore.applicationStore.logService.error(
      LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
      'Compilation failed:',
      error,
    );
    if (this.editorStore.graphManagerState.graphBuildState.hasFailed) {
      // TODO: when we support showing multiple notification, we can split this into 2 messages
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `Can't build graph, please resolve compilation error before leaving text mode. Compilation failed with error: ${error.message}`,
      );
    } else {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `Compilation failed: ${error.message}`,
      );
      this.editorStore.applicationStore.alertService.setActionAlertInfo({
        message: 'Project is not in a compiled state',
        prompt:
          'All changes made since the last time the graph was built successfully will be lost',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Discard Changes',
            default: true,
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              flowResult(
                this.editorStore.switchModes(GRAPH_EDITOR_MODE.FORM, {
                  isCompilationFailure: true,
                }),
              ).catch(this.editorStore.applicationStore.alertUnhandledError);
            },
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

  *cleanupBeforeEntering(fallbackOptions?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
  }): GeneratorFn<void> {
    if (fallbackOptions?.isGraphBuildFailure) {
      const editorGrammar =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          this.editorStore.changeDetectionState
            .workspaceLocalLatestRevisionState.entities,
          { pretty: true },
        )) as string;
      yield flowResult(
        this.grammarTextEditorState.setGraphGrammarText(editorGrammar),
      );
    } else {
      //Exclude UnknownPackageableElements from GrammarText editor mode since they cant be tranformed to PureCode
      const graphGrammar =
        (yield this.editorStore.graphManagerState.graphManager.graphToPureCode(
          this.editorStore.graphManagerState.graph,
          { pretty: true, excludeUnknown: true },
        )) as string;
      yield flowResult(
        this.grammarTextEditorState.setGraphGrammarText(graphGrammar),
      );
    }
    this.editorStore.applicationStore.alertService.setBlockingAlert(undefined);
  }

  override openFileSystem_File(file: FileSystem_File): void {
    this.setGeneratedFile(file);
  }

  openElement(element: PackageableElement): void {
    const sourceInformation =
      this.grammarTextEditorState.sourceInformationIndex.get(element.path);
    if (sourceInformation) {
      this.grammarTextEditorState.setForcedCursorPosition({
        lineNumber: sourceInformation.startLine,
        column: 0,
      });
    }
  }
}
