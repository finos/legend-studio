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

import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { ACTIVITY_MODE, AUX_PANEL_MODE } from './EditorConfig.js';
import { FileEditorState } from './FileEditorState.js';
import { deserialize } from 'serializr';
import {
  FileCoordinate,
  FileErrorCoordinate,
  PureFile,
  trimPathLeadingSlash,
} from '../server/models/PureFile.js';
import { DirectoryTreeState } from './DirectoryTreeState.js';
import { ConceptTreeState } from './ConceptTreeState.js';
import {
  type InitializationActivity,
  type InitializationResult,
  InitializationFailureWithSourceResult,
  InitializationFailureResult,
  deserializeInitializationnResult,
} from '../server/models/Initialization.js';
import {
  type CandidateWithPackageNotImported,
  type ExecutionActivity,
  type ExecutionResult,
  TestExecutionResult,
  UnmatchedFunctionResult,
  UnmatchedResult,
  GetConceptResult,
  deserializeExecutionResult,
  ExecutionFailureResult,
  ExecutionSuccessResult,
} from '../server/models/Execution.js';
import {
  type SearchResultEntry,
  getSearchResultEntry,
} from '../server/models/SearchEntry.js';
import {
  type SearchState,
  UsageResultState,
  UnmatchedFunctionExecutionResultState,
  UnmatchExecutionResultState,
  SearchResultState,
  TextSearchResultState,
} from './SearchResultState.js';
import { TestRunnerState } from './TestRunnerState.js';
import {
  type UsageConcept,
  getUsageConceptLabel,
  Usage,
} from '../server/models/Usage.js';
import {
  type CommandResult,
  CommandFailureResult,
  deserializeCommandResult,
} from '../server/models/Command.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  type CommandRegistrar,
} from '@finos/legend-application';
import {
  type GeneratorFn,
  type PlainObject,
  isNonNullable,
  NetworkClient,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { PureClient as PureServerClient } from '../server/PureServerClient.js';
import { PanelDisplayState } from '@finos/legend-art';
import { DiagramEditorState } from './DiagramEditorState.js';
import { DiagramInfo, serializeDiagram } from '../server/models/DiagramInfo.js';
import type { LegendPureIDEApplicationStore } from './LegendPureIDEBaseStore.js';
import { SearchCommandState } from './SearchCommandState.js';
import { EditorTabManagerState } from './EditorTabManagerState.js';
import { LEGEND_PURE_IDE_COMMAND_KEY } from './LegendPureIDECommand.js';
import { ExecutionError } from '../server/models/ExecutionError.js';

export class EditorStore implements CommandRegistrar {
  readonly applicationStore: LegendPureIDEApplicationStore;

  readonly initState = ActionState.create();
  readonly directoryTreeState: DirectoryTreeState;
  readonly conceptTreeState: ConceptTreeState;
  readonly client: PureServerClient;

  // Layout
  isMaxAuxPanelSizeSet = false;
  activeAuxPanelMode = AUX_PANEL_MODE.CONSOLE;
  readonly auxPanelDisplayState = new PanelDisplayState({
    initial: 0,
    default: 300,
    snap: 100,
  });
  activeActivity?: ACTIVITY_MODE = ACTIVITY_MODE.CONCEPT;
  readonly sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });
  readonly tabManagerState = new EditorTabManagerState(this);

  readonly executionState = ActionState.create();
  navigationStack: FileCoordinate[] = []; // TODO?: we might want to limit the number of items in this stack

  // Console
  consoleText?: string | undefined;

  // Search Command
  readonly fileSearchCommandLoadingState = ActionState.create();
  readonly fileSearchCommandState = new SearchCommandState();
  openFileSearchCommand = false;
  fileSearchCommandResults: string[] = [];
  readonly textSearchCommandLoadingState = ActionState.create();
  readonly textSearchCommandState = new SearchCommandState();
  openTextSearchCommand = false;

  // Search Panel
  searchState?: SearchState | undefined;

  // Test
  readonly testRunState = ActionState.create();
  testRunnerState?: TestRunnerState | undefined;

  constructor(applicationStore: LegendPureIDEApplicationStore) {
    makeObservable(this, {
      isMaxAuxPanelSizeSet: observable,
      activeAuxPanelMode: observable,
      activeActivity: observable,
      consoleText: observable,
      navigationStack: observable,
      openFileSearchCommand: observable,
      fileSearchCommandResults: observable,
      fileSearchCommandState: observable,
      openTextSearchCommand: observable,
      textSearchCommandState: observable,
      searchState: observable,
      testRunnerState: observable,

      setOpenFileSearchCommand: action,
      setOpenTextSearchCommand: action,
      setActiveAuxPanelMode: action,
      setActiveActivity: action,
      setConsoleText: action,
      setSearchState: action,
      setTestRunnerState: action,
      pullInitializationActivity: action,
      pullExecutionStatus: action,

      initialize: flow,
      checkIfSessionWakingUp: flow,
      loadDiagram: flow,
      loadFile: flow,
      reloadFile: flow,
      execute: flow,
      executeGo: flow,
      manageExecuteGoResult: flow,
      executeTests: flow,
      executeFullTestSuite: flow,
      executeNavigation: flow,
      navigateBack: flow,
      executeSaveAndReset: flow,
      fullReCompile: flow,
      refreshTrees: flow,
      updateFileUsingSuggestionCandidate: flow,
      updateFile: flow,
      searchFile: flow,
      searchText: flow,
      findUsages: flow,
      command: flow,
      createNewDirectory: flow,
      createNewFile: flow,
      deleteDirectoryOrFile: flow,
    });

    this.applicationStore = applicationStore;
    this.directoryTreeState = new DirectoryTreeState(this);
    this.conceptTreeState = new ConceptTreeState(this);
    this.client = new PureServerClient(
      new NetworkClient({
        baseUrl: this.applicationStore.config.useDynamicPureServer
          ? window.location.origin
          : this.applicationStore.config.pureUrl,
      }),
    );
  }

  setOpenFileSearchCommand(val: boolean): void {
    this.openFileSearchCommand = val;
  }

  setOpenTextSearchCommand(val: boolean): void {
    this.openTextSearchCommand = val;
  }

  setActiveAuxPanelMode(val: AUX_PANEL_MODE): void {
    this.activeAuxPanelMode = val;
  }

  setConsoleText(value: string | undefined): void {
    this.consoleText = value;
  }

  setSearchState(val: SearchState | undefined): void {
    this.searchState = val;
  }

  setTestRunnerState(val: TestRunnerState | undefined): void {
    this.testRunnerState = val;
  }

  cleanUp(): void {
    // dismiss all the alerts as these are parts of application, if we don't do this, we might
    // end up blocking other parts of the app
    // e.g. trying going to an unknown workspace, we will be redirected to the home page
    // but the blocking alert for not-found workspace will still block the app
    this.applicationStore.setBlockingAlert(undefined);
    this.applicationStore.setActionAlertInfo(undefined);
  }

  /**
   * This is the entry of the app logic where initialization of editor states happens
   * Here, we ensure the order of calls after checking existence of current project and workspace
   * If either of them does not exist, we cannot proceed.
   */
  *initialize(
    fullInit: boolean,
    func: (() => Promise<void>) | undefined,
    mode: string | undefined,
    fastCompile: string | undefined,
  ): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notifyIllegalState(
        'Editor store is re-initialized',
      );
      return;
    }
    // set PURE IDE mode
    this.client.mode = mode;
    this.client.compilerMode = fastCompile;
    // initialize editor
    this.initState.inProgress();
    try {
      const initializationPromise = this.client.initialize(!fullInit);
      this.applicationStore.setBlockingAlert({
        message: 'Loading Pure IDE...',
        prompt:
          'Please be patient as we are building the initial application state',
        showLoading: true,
      });
      yield this.pullInitializationActivity();
      this.applicationStore.setBlockingAlert(undefined);
      const openWelcomeFilePromise = flowResult(this.loadFile('/welcome.pure'));
      const directoryTreeInitPromise = this.directoryTreeState.initialize();
      const conceptTreeInitPromise = this.conceptTreeState.initialize();
      const result = deserializeInitializationnResult(
        (yield initializationPromise) as PlainObject<InitializationResult>,
      );
      if (result.text) {
        this.setConsoleText(result.text);
        this.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
        this.auxPanelDisplayState.open();
      }
      if (result instanceof InitializationFailureResult) {
        if (result.sessionError) {
          this.applicationStore.setBlockingAlert({
            message: 'Session corrupted',
            prompt: result.sessionError,
          });
        } else if (result instanceof InitializationFailureWithSourceResult) {
          yield flowResult(
            this.loadFile(
              result.source,
              new FileErrorCoordinate(
                result.source,
                result.line,
                result.column,
                new ExecutionError(
                  (result.text ?? '').split('\n').filter(Boolean)[0],
                ),
              ),
            ),
          );
        }
      } else {
        if (func) {
          yield func();
        }
        yield Promise.all([
          openWelcomeFilePromise,
          directoryTreeInitPromise,
          conceptTreeInitPromise,
        ]);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
      this.initState.fail();
      this.applicationStore.setBlockingAlert({
        message: 'Failed to initialize IDE',
        prompt:
          'Make sure the IDE server is working, otherwise try to restart it',
      });
      return;
    }
    this.initState.pass();
  }

  *checkIfSessionWakingUp(message?: string): GeneratorFn<void> {
    this.applicationStore.setBlockingAlert({
      message: message ?? 'Checking IDE session...',
      showLoading: true,
    });
    yield this.pullInitializationActivity(
      (activity: InitializationActivity) => {
        if (activity.text) {
          this.applicationStore.setBlockingAlert({
            message: message ?? 'Checking IDE session...',
            prompt: activity.text,
            showLoading: true,
          });
        }
      },
    );
    this.applicationStore.setBlockingAlert(undefined);
  }

  async pullInitializationActivity(
    fn?: (activity: InitializationActivity) => void,
  ): Promise<void> {
    const result =
      (await this.client.getInitializationActivity()) as unknown as InitializationActivity;
    if (result.initializing) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            resolve(this.pullInitializationActivity());
          } catch (error) {
            reject(error);
          }
        }, 1000),
      );
    }
    return Promise.resolve();
  }

  registerCommands(): void {
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_FILE,
      trigger: () => this.initState.hasSucceeded,
      action: () => this.setOpenFileSearchCommand(true),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_TEXT,
      trigger: () => this.initState.hasSucceeded,
      action: () => this.setOpenTextSearchCommand(true),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_FILE,
      action: () => {
        if (this.tabManagerState.currentTab instanceof FileEditorState) {
          this.directoryTreeState.revealPath(
            this.tabManagerState.currentTab.filePath,
            true,
          );
        }
      },
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.TOGGLE_AUX_PANEL,
      trigger: () => this.initState.hasSucceeded,
      action: () => this.auxPanelDisplayState.toggle(),
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.EXECUTE,
      action: () => {
        flowResult(this.executeGo()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE,
      action: () => {
        flowResult(this.fullReCompile(false)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE_WITH_FULL_INIT,
      action: () => {
        flowResult(this.fullReCompile(true)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.RUN_ALL_TESTS,
      action: () => {
        flowResult(this.executeFullTestSuite(false)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandCenter.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.RUN_RELAVANT_TESTS,
      action: () => {
        flowResult(this.executeFullTestSuite(true)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
  }

  deregisterCommands(): void {
    [
      LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_FILE,
      LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_TEXT,
      LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_FILE,
      LEGEND_PURE_IDE_COMMAND_KEY.TOGGLE_AUX_PANEL,
      LEGEND_PURE_IDE_COMMAND_KEY.EXECUTE,
      LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE,
      LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE_WITH_FULL_INIT,
      LEGEND_PURE_IDE_COMMAND_KEY.RUN_ALL_TESTS,
      LEGEND_PURE_IDE_COMMAND_KEY.RUN_RELAVANT_TESTS,
    ].forEach((key) =>
      this.applicationStore.commandCenter.deregisterCommand(key),
    );
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

  *loadDiagram(filePath: string, diagramPath: string): GeneratorFn<void> {
    let editorState = this.tabManagerState.tabs.find(
      (tab): tab is DiagramEditorState =>
        tab instanceof DiagramEditorState && tab.filePath === filePath,
    );
    if (!editorState) {
      yield flowResult(this.checkIfSessionWakingUp());
      editorState = new DiagramEditorState(
        this,
        deserialize(DiagramInfo, yield this.client.getDiagramInfo(diagramPath)),
        diagramPath,
        filePath,
      );
    }
    this.tabManagerState.openTab(editorState);
  }

  *loadFile(path: string, coordinate?: FileCoordinate): GeneratorFn<void> {
    let editorState = this.tabManagerState.tabs.find(
      (tab): tab is FileEditorState =>
        tab instanceof FileEditorState && tab.filePath === path,
    );
    if (!editorState) {
      yield flowResult(this.checkIfSessionWakingUp());
      editorState = new FileEditorState(
        this,
        deserialize(PureFile, yield this.client.getFile(path)),
        path,
      );
    }
    this.tabManagerState.openTab(editorState);
    if (coordinate) {
      editorState.textEditorState.setForcedPosition({
        lineNumber: coordinate.line,
        column: coordinate.column,
      });
      if (coordinate instanceof FileErrorCoordinate) {
        editorState.showError(coordinate);
      }
    }
  }

  *reloadFile(filePath: string): GeneratorFn<void> {
    yield Promise.all(
      this.tabManagerState.tabs.map(async (tab) => {
        if (tab instanceof FileEditorState && tab.filePath === filePath) {
          tab.setFile(
            deserialize(PureFile, await this.client.getFile(filePath)),
          );
        } else if (
          tab instanceof DiagramEditorState &&
          tab.filePath === filePath
        ) {
          tab.rebuild(
            deserialize(
              DiagramInfo,
              await this.client.getDiagramInfo(tab.diagramPath),
            ),
          );
        }
      }),
    );
  }

  *execute(
    url: string,
    extraParams: Record<PropertyKey, unknown>,
    checkExecutionStatus: boolean,
    manageResult: (result: ExecutionResult) => Promise<void>,
  ): GeneratorFn<void> {
    if (!this.initState.hasSucceeded) {
      this.applicationStore.notifyWarning(
        `Can't execute while initializing application`,
      );
      return;
    }
    if (this.executionState.isInProgress) {
      this.applicationStore.notifyWarning(
        'Another execution is already in progress!',
      );
      return;
    }
    // reset search state before execution
    if (!(this.searchState instanceof SearchResultState)) {
      this.setSearchState(undefined);
    }
    this.executionState.inProgress();
    try {
      const openedFiles = this.tabManagerState.tabs
        .map((tab) => {
          if (tab instanceof FileEditorState) {
            return {
              path: tab.filePath,
              code: tab.file.content,
            };
          } else if (tab instanceof DiagramEditorState) {
            return {
              diagram: tab.diagramPath,
              code: serializeDiagram(tab.diagram),
            };
          }
          return undefined;
        })
        .filter(isNonNullable);
      const executionPromise = this.client.execute(
        openedFiles,
        url,
        extraParams,
      );
      // NOTE: when we execute, it could take a while, and by default, we run a status check which potentially
      // blocks the screen, as such, to be less disruptive to the UX and to avoid creating the illusion of slowness
      // we will have a wait time, if execution is below this threshold, we will not conduct the check.
      // The current threshold we choose is 1000ms, i.e. the execution should be sub-second
      const WAIT_TIME_TO_TRIGGER_STATUS_CHECK = 1000;
      let executionPromiseFinished = false;
      let executionPromiseResult: PlainObject<ExecutionResult> | undefined;
      yield Promise.all<void>([
        executionPromise.then((value) => {
          executionPromiseFinished = true;
          executionPromiseResult = value;
        }),
        new Promise((resolve) =>
          setTimeout(
            () => {
              if (!executionPromiseFinished && checkExecutionStatus) {
                this.applicationStore.setBlockingAlert({
                  message: 'Executing...',
                  prompt: 'Please do not refresh the application',
                  showLoading: true,
                });
                resolve(this.pullExecutionStatus());
              }
              resolve();
            },
            WAIT_TIME_TO_TRIGGER_STATUS_CHECK,
            true,
          ),
        ),
      ]);
      const result = deserializeExecutionResult(
        guaranteeNonNullable(executionPromiseResult),
      );
      this.applicationStore.setBlockingAlert(undefined);
      this.setConsoleText(result.text);
      if (result instanceof ExecutionFailureResult) {
        this.applicationStore.notifyWarning('Execution failed!');
        if (result.sessionError) {
          this.applicationStore.setBlockingAlert({
            message: 'Session corrupted',
            prompt: result.sessionError,
          });
        } else {
          yield flowResult(manageResult(result));
        }
      } else if (result instanceof ExecutionSuccessResult) {
        this.applicationStore.notifySuccess('Execution succeeded!');
        if (result.reinit) {
          this.applicationStore.setBlockingAlert({
            message: 'Reinitializing...',
            prompt: 'Please do not refresh the application',
            showLoading: true,
          });
          this.initState.reset();
          yield flowResult(
            this.initialize(
              false,
              () =>
                flowResult(
                  this.execute(
                    url,
                    extraParams,
                    checkExecutionStatus,
                    manageResult,
                  ),
                ),
              this.client.mode,
              this.client.compilerMode,
            ),
          );
        } else {
          yield flowResult(manageResult(result));
        }
      } else {
        yield flowResult(manageResult(result));
      }
    } finally {
      this.applicationStore.setBlockingAlert(undefined);
      this.executionState.reset();
    }
  }

  // NOTE: currently backend do not suppor this operation, so we temporarily disable it, but
  // in theory, this will pull up a blocking modal to show the execution status to user
  async pullExecutionStatus(): Promise<void> {
    const result =
      (await this.client.getExecutionActivity()) as unknown as ExecutionActivity;
    this.applicationStore.setBlockingAlert({
      message: 'Executing...',
      prompt: result.text
        ? result.text
        : 'Please do not refresh the application',
      showLoading: true,
    });
    if (result.executing) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            resolve(this.pullExecutionStatus());
          } catch (error) {
            reject(error);
          }
          // NOTE: tune this slightly lower for better experience, also for sub-second execution, setting a high number
          // might create the illusion that the system is slow
        }, 500),
      );
    }
    this.applicationStore.setBlockingAlert({
      message: 'Executing...',
      prompt: 'Please do not refresh the application',
      showLoading: true,
    });
    return Promise.resolve();
  }

  *executeGo(): GeneratorFn<void> {
    yield flowResult(
      this.execute('executeGo', {}, true, (result: ExecutionResult) =>
        flowResult(this.manageExecuteGoResult(result)),
      ),
    );
  }

  *manageExecuteGoResult(result: ExecutionResult): GeneratorFn<void> {
    const refreshTreesPromise = flowResult(this.refreshTrees());
    if (result instanceof ExecutionFailureResult) {
      yield flowResult(
        this.loadFile(
          result.source,
          new FileErrorCoordinate(
            result.source,
            result.line,
            result.column,
            new ExecutionError(result.text.split('\n').filter(Boolean)[0]),
          ),
        ),
      );
      if (result instanceof UnmatchedFunctionResult) {
        this.setSearchState(
          new UnmatchedFunctionExecutionResultState(this, result),
        );
        this.setActiveAuxPanelMode(AUX_PANEL_MODE.SEARCH_RESULT);
        this.auxPanelDisplayState.open();
      } else if (result instanceof UnmatchedResult) {
        this.setSearchState(new UnmatchExecutionResultState(this, result));
        this.setActiveAuxPanelMode(AUX_PANEL_MODE.SEARCH_RESULT);
        this.auxPanelDisplayState.open();
      }
    } else if (result instanceof ExecutionSuccessResult) {
      if (result.modifiedFiles.length) {
        for (const path of result.modifiedFiles) {
          yield flowResult(this.reloadFile(path));
        }
      }
    }
    yield refreshTreesPromise;
  }

  *executeTests(path: string, relevantTestsOnly?: boolean): GeneratorFn<void> {
    if (this.testRunState.isInProgress) {
      this.applicationStore.notifyWarning(
        'Test runner is working. Please try again later',
      );
      return;
    }
    this.testRunState.inProgress();
    yield flowResult(
      this.execute(
        'executeTests',
        {
          path,
          relevantTestsOnly,
        },
        false,
        async (result: ExecutionResult) => {
          const refreshTreesPromise = flowResult(this.refreshTrees());
          if (result instanceof ExecutionFailureResult) {
            await flowResult(
              this.loadFile(
                result.source,
                new FileErrorCoordinate(
                  result.source,
                  result.line,
                  result.column,
                  new ExecutionError(
                    result.text.split('\n').filter(Boolean)[0],
                  ),
                ),
              ),
            );
            this.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
            this.auxPanelDisplayState.open();
            this.testRunState.fail();
          } else if (result instanceof TestExecutionResult) {
            this.setActiveAuxPanelMode(AUX_PANEL_MODE.TEST_RUNNER);
            this.auxPanelDisplayState.open();
            const testRunnerState = new TestRunnerState(this, result);
            this.setTestRunnerState(testRunnerState);
            await flowResult(testRunnerState.buildTestTreeData());
            // make sure we refresh tree so it is shown in the explorer panel
            // NOTE: we could potentially expand the tree here, but this operation is expensive since we have all nodes observable
            // so it will lag the UI if we have too many nodes open
            testRunnerState.refreshTree();
            await flowResult(testRunnerState.pollTestRunnerResult());
            this.testRunState.pass();
          }
          // do nothing?
          await refreshTreesPromise;
        },
      ),
    );
  }

  *executeFullTestSuite(relevantTestsOnly?: boolean): GeneratorFn<void> {
    yield flowResult(this.executeTests('::', relevantTestsOnly));
  }

  *executeNavigation(coordinate: FileCoordinate): GeneratorFn<void> {
    this.navigationStack.push(coordinate);
    yield flowResult(
      this.execute(
        'getConcept',
        {
          file: coordinate.file,
          line: coordinate.line,
          column: coordinate.column,
        },
        false,
        async (result: ExecutionResult) => {
          if (result instanceof GetConceptResult) {
            await flowResult(
              this.loadFile(
                result.jumpTo.source,
                new FileCoordinate(
                  result.jumpTo.source,
                  result.jumpTo.line,
                  result.jumpTo.column,
                ),
              ),
            );
          }
        },
      ),
    );
  }

  *navigateBack(): GeneratorFn<void> {
    if (this.navigationStack.length === 0) {
      this.applicationStore.notifyWarning(
        `Can't navigate back any further - navigation stack is empty`,
      );
      return;
    }
    if (this.navigationStack.length > 0) {
      const coordinate = this.navigationStack.pop();
      if (coordinate) {
        yield flowResult(this.loadFile(coordinate.file, coordinate));
      }
    }
  }

  *executeSaveAndReset(fullInit: boolean): GeneratorFn<void> {
    yield flowResult(
      this.execute(
        'executeSaveAndReset',
        {},
        true,
        async (result: ExecutionResult) => {
          this.initState.reset();
          await flowResult(
            this.initialize(
              fullInit,
              undefined,
              this.client.mode,
              this.client.compilerMode,
            ),
          );
          this.setActiveActivity(ACTIVITY_MODE.CONCEPT, {
            keepShowingIfMatchedCurrent: true,
          });
        },
      ),
    );
  }

  *fullReCompile(fullInit: boolean): GeneratorFn<void> {
    this.applicationStore.setActionAlertInfo({
      message: 'Are you sure you want to perform a full re-compile?',
      prompt: 'This may take a long time to complete',
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Perform full re-compile',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: () => {
            flowResult(this.executeSaveAndReset(fullInit)).catch(
              this.applicationStore.alertUnhandledError,
            );
          },
        },
        {
          label: 'Abort',
          type: ActionAlertActionType.PROCEED,
          default: true,
        },
      ],
    });
  }

  *refreshTrees(): GeneratorFn<void> {
    yield Promise.all([
      this.directoryTreeState.refreshTreeData(),
      this.conceptTreeState.refreshTreeData(),
    ]);
  }

  *updateFileUsingSuggestionCandidate(
    candidate: CandidateWithPackageNotImported,
  ): GeneratorFn<void> {
    this.setSearchState(undefined);
    yield flowResult(
      this.updateFile(
        candidate.fileToBeModified,
        candidate.lineToBeModified,
        candidate.columnToBeModified,
        candidate.add,
        candidate.messageToBeModified,
      ),
    );
    this.setActiveAuxPanelMode(AUX_PANEL_MODE.CONSOLE);
    this.auxPanelDisplayState.open();
  }

  *updateFile(
    path: string,
    line: number,
    column: number,
    add: boolean,
    message: string,
  ): GeneratorFn<void> {
    yield flowResult(
      this.execute(
        'updateSource',
        {
          updatePath: path,
          updateSources: [
            {
              path,
              line,
              column,
              add,
              message,
            },
          ],
        },
        false,
        (result: ExecutionResult) =>
          flowResult(this.manageExecuteGoResult(result)),
      ),
    );
  }

  *searchFile(): GeneratorFn<void> {
    if (this.fileSearchCommandLoadingState.isInProgress) {
      return;
    }
    this.fileSearchCommandLoadingState.inProgress();
    this.fileSearchCommandResults = (yield this.client.findFiles(
      this.fileSearchCommandState.text,
      this.fileSearchCommandState.isRegExp,
    )) as string[];
    this.fileSearchCommandLoadingState.pass();
  }

  *searchText(): GeneratorFn<void> {
    if (this.textSearchCommandLoadingState.isInProgress) {
      return;
    }
    this.textSearchCommandLoadingState.inProgress();
    this.setActiveAuxPanelMode(AUX_PANEL_MODE.SEARCH_RESULT);
    this.auxPanelDisplayState.open();
    try {
      const results = (
        (yield this.client.searchText(
          this.textSearchCommandState.text,
          this.textSearchCommandState.isCaseSensitive,
          this.textSearchCommandState.isRegExp,
        )) as PlainObject<SearchResultEntry>[]
      ).map((result) => getSearchResultEntry(result));
      this.setSearchState(new TextSearchResultState(this, results));
      this.textSearchCommandLoadingState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
      this.textSearchCommandLoadingState.fail();
    }
  }

  *findUsages(coordinate: FileCoordinate): GeneratorFn<void> {
    const errorMessage =
      'Error finding references. Please make sure that the code compiles and that you are looking for references of non primitive types!';
    let concept: UsageConcept;
    try {
      concept = (yield this.client.getConceptPath(
        coordinate.file,
        coordinate.line,
        coordinate.column,
      )) as UsageConcept;
    } catch {
      this.applicationStore.notifyWarning(errorMessage);
      return;
    }
    try {
      this.applicationStore.setBlockingAlert({
        message: 'Finding concept usages...',
        prompt: `Finding references of ${getUsageConceptLabel(concept)}`,
        showLoading: true,
      });
      const usages = (
        (yield this.client.getUsages(
          concept.owner
            ? concept.type
              ? 'meta::pure::ide::findusages::findUsagesForEnum_String_1__String_1__SourceInformation_MANY_'
              : 'meta::pure::ide::findusages::findUsagesForProperty_String_1__String_1__SourceInformation_MANY_'
            : 'meta::pure::ide::findusages::findUsagesForPath_String_1__SourceInformation_MANY_',
          (concept.owner ? [`'${concept.owner}'`] : []).concat(
            `'${concept.path}'`,
          ),
        )) as PlainObject<Usage>[]
      ).map((usage) => deserialize(Usage, usage));
      this.setSearchState(new UsageResultState(this, concept, usages));
      this.setActiveAuxPanelMode(AUX_PANEL_MODE.SEARCH_RESULT);
      this.auxPanelDisplayState.open();
    } catch {
      this.applicationStore.notifyWarning(errorMessage);
    } finally {
      this.applicationStore.setBlockingAlert(undefined);
    }
  }

  *command(
    cmd: () => Promise<PlainObject<CommandResult>>,
  ): GeneratorFn<boolean> {
    try {
      const result = deserializeCommandResult(
        (yield cmd()) as PlainObject<CommandResult>,
      );
      if (result instanceof CommandFailureResult) {
        if (result.errorDialog) {
          this.applicationStore.notifyWarning(`Error: ${result.text}`);
        } else {
          this.setConsoleText(result.text);
        }
        return false;
      }
      return true;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notifyError(error);
      return false;
    }
  }

  *createNewDirectory(path: string): GeneratorFn<void> {
    yield flowResult(
      this.command(() => this.client.createFolder(trimPathLeadingSlash(path))),
    );
    yield flowResult(this.directoryTreeState.refreshTreeData());
  }

  *createNewFile(path: string): GeneratorFn<void> {
    const result = (yield flowResult(
      this.command(() => this.client.createFile(trimPathLeadingSlash(path))),
    )) as boolean;
    yield flowResult(this.directoryTreeState.refreshTreeData());
    if (result) {
      yield flowResult(this.loadFile(path));
    }
  }

  *deleteDirectoryOrFile(
    path: string,
    isDirectory: boolean,
    hasChildContent: boolean,
  ): GeneratorFn<void> {
    const _delete = async (): Promise<void> => {
      await flowResult(
        this.command(() =>
          this.client.deleteDirectoryOrFile(trimPathLeadingSlash(path)),
        ),
      );
      const editorStatesToClose = this.tabManagerState.tabs.filter(
        (tab) =>
          tab instanceof FileEditorState && tab.filePath.startsWith(path),
      );
      editorStatesToClose.forEach((tab) => this.tabManagerState.closeTab(tab));
      await flowResult(this.directoryTreeState.refreshTreeData());
    };
    this.applicationStore.setActionAlertInfo({
      message: `Are you sure you would like to delete this ${
        isDirectory ? 'directory' : 'file'
      }?`,
      prompt: hasChildContent
        ? 'Beware! This directory is not empty, this action is not undo-able, you have to manually revert using VCS'
        : 'Beware! This action is not undo-able, you have to manually revert using VCS',
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Delete anyway',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: () => {
            _delete().catch(this.applicationStore.alertUnhandledError);
          },
        },
        {
          label: 'Abort',
          type: ActionAlertActionType.PROCEED,
          default: true,
        },
      ],
    });
  }
}
