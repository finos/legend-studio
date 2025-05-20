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
  type PackageableElement,
  isElementReadOnly,
  Package,
  GRAPH_MANAGER_EVENT,
  EngineError,
  GraphBuilderError,
  type CompilationResult,
  CompilationError,
  extractSourceInformationCoordinates,
  reportGraphAnalytics,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  isNonNullable,
  assertErrorThrown,
  LogEvent,
  ActionState,
  assertType,
  guaranteeNonNullable,
  StopWatch,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { flowResult } from 'mobx';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import { FormLocalChangesState } from './sidebar-state/LocalChangesState.js';
import { GlobalTestRunnerState } from './sidebar-state/testable/GlobalTestRunnerState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import { GraphCompilationOutcome, type Problem } from './EditorGraphState.js';
import { GRAPH_EDITOR_MODE, PANEL_MODE } from './EditorConfig.js';
import {
  graph_addElement,
  graph_deleteElement,
  graph_deleteOwnElement,
  graph_dispose,
  graph_renameElement,
} from '../graph-modifier/GraphModifierHelper.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { LegendStudioTelemetryHelper } from '../../__lib__/LegendStudioTelemetryHelper.js';
import { GraphEditorMode } from './GraphEditorMode.js';
import { GlobalBulkServiceRegistrationState } from './sidebar-state/BulkServiceRegistrationState.js';
import type { EditorInitialConfiguration } from './editor-state/element-editor-state/ElementEditorInitialConfiguration.js';
import { ArtifactGenerationViewerState } from './editor-state/ArtifactGenerationViewerState.js';
import type { FileSystem_File } from './utils/FileSystemTreeUtils.js';

export class GraphEditFormModeState extends GraphEditorMode {
  *initialize(): GeneratorFn<void> {
    this.editorStore.localChangesState = new FormLocalChangesState(
      this.editorStore,
      this.editorStore.sdlcState,
    );
    this.editorStore.graphState.clearProblems();
    if (
      this.editorStore.graphState.mostRecentCompilationOutcome ===
      GraphCompilationOutcome.SUCCEEDED
    ) {
      yield flowResult(
        this.editorStore.graphEditorMode.updateGraphAndApplication(
          this.editorStore.graphState.compilationResultEntities,
        ),
      );
      this.editorStore.graphState.setMostRecentCompilationGraphHash(
        this.editorStore.graphEditorMode.getCurrentGraphHash(),
      );
      this.editorStore.graphState.compilationResultEntities = [];
      if (this.editorStore.tabManagerState.currentTab) {
        this.editorStore.tabManagerState.openTab(
          this.editorStore.tabManagerState.currentTab,
        );
      }
    }
  }

  *addElement(
    element: PackageableElement,
    packagePath: string | undefined,
    openAfterCreate: boolean,
  ): GeneratorFn<void> {
    graph_addElement(
      this.editorStore.graphManagerState.graph,
      element,
      packagePath,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.editorStore.explorerTreeState.reprocess();

    if (openAfterCreate) {
      this.openElement(element);
    }
  }

  *deleteElement(element: PackageableElement): GeneratorFn<void> {
    if (
      this.editorStore.graphState.checkIfApplicationUpdateOperationIsRunning() ||
      isElementReadOnly(element)
    ) {
      return;
    }
    const generatedChildrenElements = (
      this.editorStore.graphState.graphGenerationState.generatedEntities.get(
        element.path,
      ) ?? []
    )
      .map((genChildEntity) =>
        this.editorStore.graphManagerState.graph.generationModel.allOwnElements.find(
          (genElement) => genElement.path === genChildEntity.path,
        ),
      )
      .filter(isNonNullable);
    const elementsToDelete = [element, ...generatedChildrenElements];
    this.editorStore.tabManagerState.tabs =
      this.editorStore.tabManagerState.tabs.filter((elementState) => {
        if (elementState instanceof ElementEditorState) {
          if (elementState === this.editorStore.tabManagerState.currentTab) {
            // avoid closing the current editor state as this will be taken care of
            // by the `closeState()` call later
            return true;
          }
          return !elementsToDelete.includes(elementState.element);
        }
        return true;
      });
    if (
      this.editorStore.tabManagerState.currentTab &&
      this.editorStore.tabManagerState.currentTab instanceof
        ElementEditorState &&
      elementsToDelete.includes(
        this.editorStore.tabManagerState.currentTab.element,
      )
    ) {
      this.editorStore.tabManagerState.closeTab(
        this.editorStore.tabManagerState.currentTab,
      );
    }
    // remove/retire the element's generated children before remove the element itself
    generatedChildrenElements.forEach((el) =>
      graph_deleteOwnElement(
        this.editorStore.graphManagerState.graph.generationModel,
        el,
      ),
    );
    graph_deleteElement(this.editorStore.graphManagerState.graph, element);

    const extraElementEditorPostDeleteActions = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementEditorPostDeleteActions?.() ?? [],
      );
    for (const postDeleteAction of extraElementEditorPostDeleteActions) {
      postDeleteAction(this.editorStore, element);
    }

    // reprocess project explorer tree
    this.editorStore.explorerTreeState.reprocess();
    // recompile
    yield flowResult(
      this.globalCompile({
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
      this.editorStore.graphManagerState.graph,
      element,
      newPath,
      this.editorStore.changeDetectionState.observerContext,
    );
    const extraElementEditorPostRenameActions = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_LegendStudioApplicationPlugin_Extension
          ).getExtraElementEditorPostRenameActions?.() ?? [],
      );
    for (const postRenameAction of extraElementEditorPostRenameActions) {
      postRenameAction(this.editorStore, element);
    }

    // reprocess project explorer tree
    this.editorStore.explorerTreeState.reprocess();
    if (element instanceof Package) {
      this.editorStore.explorerTreeState.openNode(element);
    } else if (element.package) {
      this.editorStore.explorerTreeState.openNode(element.package);
    }
    // recompile
    yield flowResult(
      this.globalCompile({
        message: `Can't compile graph after renaming and error cannot be located in form mode. Redirected to text mode for debugging`,
      }),
    );
  }

  getCurrentGraphHash(): string | undefined {
    return this.editorStore.changeDetectionState.currentGraphHash;
  }

  get mode(): GRAPH_EDITOR_MODE {
    return GRAPH_EDITOR_MODE.FORM;
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
   *    as dependencies, we intended to save computation time by reusing these while updating the graph. This can pose potential
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
  *updateGraphAndApplication(entities: Entity[]): GeneratorFn<void> {
    const startTime = Date.now();
    this.editorStore.graphState.isUpdatingApplication = true;
    this.editorStore.graphState.isUpdatingGraph = true;
    try {
      const newGraph = this.editorStore.graphManagerState.createNewGraph();
      yield flowResult(
        this.editorStore.graphState.rebuildDependencies(newGraph),
      );

      /**
       * We remove the current editor state so that we no longer let React displays the element that belongs to the old graph
       * NOTE: this causes an UI flash, but this is in many way, acceptable since the user probably should know that we are
       * refreshing the memory graph anyway.
       *
       * If this is really bothering, we can handle it by building mocked replica of the current editor state using stub element
       * e.g. if the current editor is a class, we stub the class, create a new class editor state around it and copy over
       * navigation information, etc.
       */
      if (this.editorStore.tabManagerState.tabs.length) {
        this.editorStore.tabManagerState.cacheAndClose();
      }

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
          strict: this.editorStore.graphState.enableStrictMode,
        },
      );

      // Activity States
      this.editorStore.globalTestRunnerState = new GlobalTestRunnerState(
        this.editorStore,
        this.editorStore.sdlcState,
      );

      this.editorStore.globalBulkServiceRegistrationState =
        new GlobalBulkServiceRegistrationState(
          this.editorStore,
          this.editorStore.sdlcState,
        );

      // NOTE: build model generation entities every-time we rebuild the graph - should we do this?
      const generationsBuildState = ActionState.create();
      yield this.editorStore.graphManagerState.graphManager.buildGenerations(
        newGraph,
        this.editorStore.graphState.graphGenerationState.generatedEntities,
        generationsBuildState,
      );

      this.editorStore.graphManagerState.graph = newGraph;
      // NOTE: here we don't want to modify the current graph build state directly
      // instead, we quietly run this in the background and then sync it with the current build state
      this.editorStore.graphManagerState.graphBuildState.sync(graphBuildState);
      this.editorStore.graphManagerState.generationsBuildState.sync(
        generationsBuildState,
      );

      this.editorStore.explorerTreeState.reprocess();

      this.editorStore.applicationStore.logService.info(
        LogEvent.create(GRAPH_MANAGER_EVENT.UPDATE_AND_REBUILD_GRAPH__SUCCESS),
        '[TOTAL]',
        Date.now() - startTime,
        'ms',
      );
      this.editorStore.graphState.isUpdatingGraph = false;

      // ======= (RE)START CHANGE DETECTION =======

      yield flowResult(this.editorStore.changeDetectionState.observeGraph());
      yield this.editorStore.changeDetectionState.preComputeGraphElementHashes();
      this.editorStore.changeDetectionState.start();
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_RESTART__SUCCESS,
        ),
        '[ASYNC]',
      );

      // ======= FINISHED (RE)START CHANGE DETECTION =======

      /**
       * Re-build the editor states which were opened before from the information we have stored before
       * creating the new graph.
       * NOTE: We must recover the tabs after we have called observeGraph above. Otherwise, the tab states
       * will be recreated using the graph elements before they get observed, and this will cause the editor
       * components to not update when users make changes, since mobx will not be able to detect the changes.
       */
      this.editorStore.tabManagerState.recoverTabs();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
        error,
      );
      this.editorStore.changeDetectionState.stop(true); // force stop change detection
      this.editorStore.graphState.isUpdatingGraph = false;
      // Note: in the future this function will probably be ideal to refactor when we have different classes for each mode
      // as we would handle this error differently in `text` mode and `form` mode.
      if (error instanceof GraphBuilderError) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: `Can't build graph: ${error.message}`,
          prompt: 'Refreshing full application...',
          showLoading: true,
        });
        this.editorStore.tabManagerState.closeAllTabs();
        this.editorStore.cleanUp();
        yield flowResult(this.editorStore.buildGraph(entities));
      }
    } finally {
      this.editorStore.graphState.isUpdatingApplication = false;
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }

  // TODO: when we support showing multiple notifications, we can take this options out as the only users of this
  // is delete element flow, where we want to say `re-compiling graph after deletion`, but because sometimes, compilation
  // is so fast, the message flashes, so we want to combine with the message in this method
  *globalCompile(options?: {
    message?: string;
    disableNotificationOnSuccess?: boolean;
    openConsole?: boolean;
  }): GeneratorFn<void> {
    if (
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
    LegendStudioTelemetryHelper.logEvent_GraphCompilationLaunched(
      this.editorStore.applicationStore.telemetryService,
    );

    const currentGraphHash = this.getCurrentGraphHash();

    try {
      this.editorStore.graphState.isRunningGlobalCompile = true;
      this.editorStore.graphState.clearProblems();
      if (options?.openConsole) {
        this.editorStore.setActivePanelMode(PANEL_MODE.CONSOLE);
      }

      // NOTE: here we always keep the source information while compiling in form mode
      // so that the form parts where the user interacted with (i.e. where the lamdbas source
      // information are populated), can reveal compilation error. If compilation errors
      // show up in other parts, the user will get redirected to text-mode
      const compilationResult =
        (yield this.editorStore.graphManagerState.graphManager.compileGraph(
          this.editorStore.graphManagerState.graph,
          {
            keepSourceInformation: true,
          },
          report,
        )) as CompilationResult;

      this.editorStore.graphState.warnings = compilationResult.warnings
        ? this.editorStore.graphState.TEMPORARY__removeDependencyProblems(
            compilationResult.warnings,
          )
        : [];

      this.editorStore.graphState.setMostRecentCompilationGraphHash(
        currentGraphHash,
      );

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

      report.timings =
        this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
          stopWatch,
          report.timings,
        );
      LegendStudioTelemetryHelper.logEvent_GraphCompilationSucceeded(
        this.editorStore.applicationStore.telemetryService,
        report,
      );

      this.editorStore.graphState.setMostRecentCompilationOutcome(
        GraphCompilationOutcome.SUCCEEDED,
      );
    } catch (error) {
      assertErrorThrown(error);
      // TODO: we probably should make this pattern of error the handling for all other exceptions in the codebase
      // i.e. there should be a catch-all handler (we can use if-else construct to check error types)
      assertType(error, EngineError, `Unhandled exception:\n${error}`);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        error,
      );
      this.editorStore.graphState.setMostRecentCompilationGraphHash(
        currentGraphHash,
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
            this.openElement(element);
            if (
              this.editorStore.tabManagerState.currentTab instanceof
              ElementEditorState
            ) {
              // check if we can reveal the error in the element editor state
              fallbackToTextModeForDebugging =
                !this.editorStore.tabManagerState.currentTab.revealCompilationError(
                  error,
                );
            }
          }
        }
      }

      // decide if we need to fall back to text mode for debugging
      if (fallbackToTextModeForDebugging) {
        // TODO: when we support showing multiple notifications, we can split this into 2
        this.editorStore.applicationStore.notificationService.notifyWarning(
          options?.message ??
            'Compilation failed and error cannot be located in form mode. Redirected to text mode for debugging.',
        );
        this.editorStore.graphState.setMostRecentCompilationOutcome(
          GraphCompilationOutcome.FAILED,
        );
        yield flowResult(
          this.editorStore.switchModes(GRAPH_EDITOR_MODE.GRAMMAR_TEXT, {
            isCompilationFailure: true,
          }),
        );
      } else {
        this.editorStore.graphState.error = error;
        this.editorStore.applicationStore.notificationService.notifyWarning(
          `Compilation failed: ${error.message}`,
        );
        this.editorStore.graphState.setMostRecentCompilationOutcome(
          GraphCompilationOutcome.FAILED,
        );
      }
    } finally {
      this.editorStore.graphState.isRunningGlobalCompile = false;
    }
  }

  goToProblem(problem: Problem): void {
    return;
  }

  *onLeave(): GeneratorFn<void> {
    this.editorStore.sqlPlaygroundState.setConnection(undefined);
    this.editorStore.tabManagerState.cacheAndClose();
  }

  *cleanupBeforeEntering(fallbackOptions?: {
    isCompilationFailure?: boolean;
    isGraphBuildFailure?: boolean;
  }): GeneratorFn<void> {
    return;
  }

  *handleCleanupFailure(error: unknown): GeneratorFn<void> {
    return;
  }

  override openFileSystem_File(fileNode: FileSystem_File): void {
    this.editorStore.tabManagerState.openTab(
      new ArtifactGenerationViewerState(this.editorStore, fileNode),
    );
  }

  openElement(
    element: PackageableElement,
    config?: EditorInitialConfiguration | undefined,
  ): void {
    if (!(element instanceof Package)) {
      const existingElementState = this.editorStore.tabManagerState.tabs.find(
        (state) =>
          state instanceof ElementEditorState && state.element === element,
      );
      const newTab =
        existingElementState ??
        this.editorStore.tabManagerState.createElementEditorState(
          element,
          config,
        );
      if (newTab) {
        this.editorStore.tabManagerState.openTab(newTab);
      } else {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          `Can't open editor for element '${element.path}'`,
        );
      }
    }
  }
}
