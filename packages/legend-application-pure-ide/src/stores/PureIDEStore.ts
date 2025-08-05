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
  flow,
  flowResult,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import {
  ACTIVITY_MODE,
  PANEL_MODE,
  ROOT_PACKAGE_PATH,
  WELCOME_FILE_PATH,
} from './PureIDEConfig.js';
import { FileEditorState } from './FileEditorState.js';
import { serialize, deserialize } from 'serializr';
import {
  FileCoordinate,
  FileErrorCoordinate,
  File,
  trimPathLeadingSlash,
} from '../server/models/File.js';
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
  UnknownSymbolResult,
  GetConceptResult,
  deserializeExecutionResult,
  ExecutionFailureResult,
  ExecutionSuccessResult,
} from '../server/models/Execution.js';
import { SearchResultCoordinate } from '../server/models/SearchEntry.js';
import { TestRunnerState } from './TestRunnerState.js';
import {
  type ConceptInfo,
  getConceptInfoLabel,
  Usage,
  FIND_USAGE_FUNCTION_PATH,
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
  uniq,
  filterByType,
} from '@finos/legend-shared';
import { PureServerClient as PureServerClient } from '../server/PureServerClient.js';
import { PanelDisplayState } from '@finos/legend-art';
import { DiagramEditorState } from './DiagramEditorState.js';
import { DiagramInfo, serializeDiagram } from '../server/models/DiagramInfo.js';
import type { LegendPureIDEApplicationStore } from './LegendPureIDEBaseStore.js';
import { FileSearchCommandState } from './FileSearchCommandState.js';
import {
  PureIDETabManagerState,
  PureIDETabState,
} from './PureIDETabManagerState.js';
import {
  EditorSplitRootState,
  EditorSplitOrientation,
} from './EditorSplitGroupState.js';
import {
  LEGEND_PURE_IDE_COMMAND_KEY,
  LEGEND_PURE_IDE_TERMINAL_COMMAND,
} from '../__lib__/LegendPureIDECommand.js';
import { ExecutionError } from '../server/models/ExecutionError.js';
import { ELEMENT_PATH_DELIMITER } from '@finos/legend-graph';
import type { SourceModificationResult } from '../server/models/Source.js';
import { ConceptType } from '../server/models/ConceptTree.js';
import { setupTerminal } from './LegendPureIDETerminal.js';
import {
  type CodeFixSuggestion,
  UnknownSymbolCodeFixSuggestion,
  UnmatchedFunctionCodeFixSuggestion,
} from './CodeFixSuggestion.js';
import { ReferenceUsageResult } from './ReferenceUsageResult.js';
import { TextSearchState } from './TextSearchState.js';
import type { TabState } from '@finos/legend-lego/application';
import { PCTAdapter } from '../server/models/Test.js';

export class PureIDEStore implements CommandRegistrar {
  readonly applicationStore: LegendPureIDEApplicationStore;

  readonly initState = ActionState.create();
  readonly directoryTreeState: DirectoryTreeState;
  readonly conceptTreeState: ConceptTreeState;
  readonly client: PureServerClient;

  // Layout
  activePanelMode = PANEL_MODE.TERMINAL;
  readonly panelGroupDisplayState = new PanelDisplayState({
    initial: 0,
    default: 300,
    snap: 100,
  });
  activeActivity?: string = ACTIVITY_MODE.CONCEPT_EXPLORER;
  readonly sideBarDisplayState = new PanelDisplayState({
    initial: 300,
    default: 300,
    snap: 150,
  });
  readonly editorSplitState = new EditorSplitRootState(this);

  readonly executionState = ActionState.create();
  navigationStack: FileCoordinate[] = []; // TODO?: we might want to limit the number of items in this stack

  // File Search Command
  readonly fileSearchCommandLoadState = ActionState.create();
  readonly fileSearchCommandState = new FileSearchCommandState();
  openFileSearchCommand = false;
  fileSearchCommandResults: string[] = [];

  // Code-fix Suggestions Panel
  codeFixSuggestion?: CodeFixSuggestion | undefined;

  // Reference Usage Panel
  readonly referenceUsageLoadState = ActionState.create();
  referenceUsageResult?: ReferenceUsageResult | undefined;

  // Text Search Panel
  readonly textSearchState: TextSearchState;

  // Test Runner Panel
  readonly testRunState = ActionState.create();
  testRunnerState?: TestRunnerState | undefined;
  PCTAdapters: PCTAdapter[] = [];
  selectedPCTAdapter?: PCTAdapter | undefined;
  PCTRunPath?: string | undefined;

  constructor(applicationStore: LegendPureIDEApplicationStore) {
    makeObservable(this, {
      activePanelMode: observable,
      activeActivity: observable,
      navigationStack: observable,
      openFileSearchCommand: observable,
      fileSearchCommandResults: observable,
      fileSearchCommandState: observable,

      codeFixSuggestion: observable,
      referenceUsageResult: observable,
      testRunnerState: observable,

      PCTAdapters: observable.struct,
      selectedPCTAdapter: observable,
      setSelectedPCTAdapter: action,
      PCTRunPath: observable,
      setPCTRunPath: action,

      setCodeFixSuggestion: action,
      setReferenceUsageResult: action,

      setOpenFileSearchCommand: action,
      setActivePanelMode: action,
      setActiveActivity: action,
      setTestRunnerState: action,
      pullInitializationActivity: action,
      pullExecutionStatus: action,

      initialize: flow,
      checkIfSessionWakingUp: flow,
      loadDiagram: flow,
      loadFile: flow,
      execute: flow,
      executeGo: flow,
      runDebugger: flow,
      manageExecuteGoResult: flow,
      executeTests: flow,
      executeFullTestSuite: flow,
      executeNavigation: flow,
      navigateBack: flow,
      fullReCompile: flow,
      command: flow,

      findUsagesFromCoordinate: flow,
      findUsages: flow,
      renameConcept: flow,
      movePackageableElements: flow,

      updateFileUsingSuggestionCandidate: flow,
      updateFile: flow,
      searchFile: flow,

      createNewDirectory: flow,
      createNewFile: flow,
      renameFile: flow,
      deleteDirectoryOrFile: flow,
    });

    this.applicationStore = applicationStore;

    this.textSearchState = new TextSearchState(this);
    this.directoryTreeState = new DirectoryTreeState(this);
    this.conceptTreeState = new ConceptTreeState(this);
    this.client = new PureServerClient(
      new NetworkClient({
        baseUrl: this.applicationStore.config.useDynamicPureServer
          ? window.location.origin
          : this.applicationStore.config.pureUrl,
      }),
    );

    setupTerminal(this);
  }

  setOpenFileSearchCommand(val: boolean): void {
    this.openFileSearchCommand = val;
  }

  setSelectedPCTAdapter(val: PCTAdapter | undefined): void {
    this.selectedPCTAdapter = val;
  }

  setPCTRunPath(val: string | undefined): void {
    this.PCTRunPath = val;
  }

  setActivePanelMode(val: PANEL_MODE): void {
    this.activePanelMode = val;
  }

  setCodeFixSuggestion(val: CodeFixSuggestion | undefined): void {
    this.codeFixSuggestion = val;
  }

  setReferenceUsageResult(val: ReferenceUsageResult | undefined): void {
    this.referenceUsageResult = val;
  }

  setTestRunnerState(val: TestRunnerState | undefined): void {
    this.testRunnerState = val;
  }

  cleanUp(): void {
    // dismiss all the alerts as these are parts of application, if we don't do this, we might
    // end up blocking other parts of the app
    // e.g. trying going to an unknown workspace, we will be redirected to the home page
    // but the blocking alert for not-found workspace will still block the app
    this.applicationStore.alertService.setBlockingAlert(undefined);
    this.applicationStore.alertService.setActionAlertInfo(undefined);

    // dispose the terminal
    this.applicationStore.terminalService.terminal.dispose();
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
      this.applicationStore.notificationService.notifyIllegalState(
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
      this.applicationStore.alertService.setBlockingAlert({
        message: 'Loading Pure IDE...',
        prompt:
          'Please be patient as we are building the initial application state',
        showLoading: true,
      });
      const initializationPromise = this.client
        .initialize(!fullInit)
        .catch((error) => {
          assertErrorThrown(error);
          this.applicationStore.notificationService.notifyError(error);
          this.initState.fail();
          this.applicationStore.alertService.setBlockingAlert({
            message: `Failed to initialize IDE`,
            prompt: `Before debugging, make sure the server is running then restart the application`,
          });
        });
      yield this.pullInitializationActivity();
      this.applicationStore.alertService.setBlockingAlert(undefined);
      const openWelcomeFilePromise = flowResult(
        this.loadFile(WELCOME_FILE_PATH),
      ).then(() => {
        const welcomeFileTab = this.editorSplitState.leaves
          .flatMap((leaf) => leaf.tabManagerState.tabs)
          .find(
            (tab) =>
              tab instanceof FileEditorState &&
              tab.filePath === WELCOME_FILE_PATH,
          );
        if (welcomeFileTab) {
          const leaf = this.editorSplitState.leaves.find((l) =>
            l.tabManagerState.tabs.includes(welcomeFileTab),
          );
          if (leaf) {
            leaf.tabManagerState.pinTab(welcomeFileTab);
          }
        }
      });
      const directoryTreeInitPromise = this.directoryTreeState.initialize();
      const conceptTreeInitPromise = this.conceptTreeState.initialize();
      const getPCTAdaptersPromise = this.client
        .getPCTAdapters()
        .then((result) => {
          runInAction(() => {
            this.PCTAdapters = (
              result as { first: string; second: string }[]
            ).map((adapter) => new PCTAdapter(adapter.first, adapter.second));
            this.selectedPCTAdapter =
              this.PCTAdapters.find(
                (adapter) => adapter.name === 'In-Memory',
              ) ?? (this.PCTAdapters.length ? this.PCTAdapters[0] : undefined);
          });
        });
      const result = deserializeInitializationnResult(
        (yield initializationPromise) as PlainObject<InitializationResult>,
      );
      if (result.text) {
        this.applicationStore.terminalService.terminal.output(result.text, {
          systemCommand: 'initialize application',
        });
      }
      this.setActivePanelMode(PANEL_MODE.TERMINAL);
      this.panelGroupDisplayState.open();
      if (result instanceof InitializationFailureResult) {
        if (result.sessionError) {
          this.applicationStore.alertService.setBlockingAlert({
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
          getPCTAdaptersPromise,
        ]);
      }
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.initState.fail();
      this.applicationStore.alertService.setActionAlertInfo({
        message: `Failed to initialize IDE`,
        prompt: `This can either due to an internal server error, which you would need to manually resolve; or a compilation, which you can proceed to debug`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Compile to debug',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            default: true,
            handler: () => {
              flowResult(this.executeGo()).catch(
                this.applicationStore.alertUnhandledError,
              );
            },
          },
        ],
      });
    } finally {
      // initialize the terminal
      this.applicationStore.terminalService.terminal.clear();
    }
  }

  *checkIfSessionWakingUp(message?: string): GeneratorFn<void> {
    this.applicationStore.alertService.setBlockingAlert({
      message: message ?? 'Checking IDE session...',
      showLoading: true,
    });
    yield this.pullInitializationActivity(
      (activity: InitializationActivity) => {
        if (activity.text) {
          this.applicationStore.alertService.setBlockingAlert({
            message: message ?? 'Checking IDE session...',
            prompt: activity.text,
            showLoading: true,
          });
        }
      },
    );
    this.applicationStore.alertService.setBlockingAlert(undefined);
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
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_FILE,
      action: () => this.setOpenFileSearchCommand(true),
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_TEXT,
      action: () => {
        this.setActivePanelMode(PANEL_MODE.SEARCH);
        this.panelGroupDisplayState.open();
        this.textSearchState.focus();
        this.textSearchState.select();
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_FILE,
      action: () => {
        if (this.editorSplitState.currentTab instanceof FileEditorState) {
          this.directoryTreeState.revealPath(
            this.editorSplitState.currentTab.filePath,
            {
              forceOpenExplorerPanel: true,
            },
          );
        }
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.TOGGLE_TERMINAL_PANEL,
      action: () => {
        // toggle the panel and activate terminal tab if needs be
        // if the terminal is already open, and not yet focused, focus on it
        // else, close it
        if (this.panelGroupDisplayState.isOpen) {
          if (this.activePanelMode !== PANEL_MODE.TERMINAL) {
            this.setActivePanelMode(PANEL_MODE.TERMINAL);
            this.applicationStore.terminalService.terminal.focus();
          } else {
            if (!this.applicationStore.terminalService.terminal.isFocused()) {
              this.applicationStore.terminalService.terminal.focus();
            } else {
              this.panelGroupDisplayState.close();
            }
          }
        } else {
          this.setActivePanelMode(PANEL_MODE.TERMINAL);
          this.panelGroupDisplayState.open();
        }
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.EXECUTE,
      action: () => {
        flowResult(this.executeGo()).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE,
      action: () => {
        flowResult(this.fullReCompile(false)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE_WITH_FULL_INIT,
      action: () => {
        flowResult(this.fullReCompile(true)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.RUN_ALL_TESTS,
      action: () => {
        flowResult(this.executeFullTestSuite(false)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.RUN_RELAVANT_TESTS,
      action: () => {
        flowResult(this.executeFullTestSuite(true)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.SPLIT_EDITOR_RIGHT,
      action: () => {
        if (this.editorSplitState.activeLeaf) {
          this.editorSplitState.splitActiveLeaf(
            EditorSplitOrientation.VERTICAL,
          );
        }
      },
    });
    this.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_COMMAND_KEY.SPLIT_EDITOR_DOWN,
      action: () => {
        if (this.editorSplitState.activeLeaf) {
          this.editorSplitState.splitActiveLeaf(
            EditorSplitOrientation.HORIZONTAL,
          );
        }
      },
    });
  }

  deregisterCommands(): void {
    [
      LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_FILE,
      LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_TEXT,
      LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_FILE,
      LEGEND_PURE_IDE_COMMAND_KEY.TOGGLE_TERMINAL_PANEL,
      LEGEND_PURE_IDE_COMMAND_KEY.EXECUTE,
      LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE,
      LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE_WITH_FULL_INIT,
      LEGEND_PURE_IDE_COMMAND_KEY.RUN_ALL_TESTS,
      LEGEND_PURE_IDE_COMMAND_KEY.RUN_RELAVANT_TESTS,
      LEGEND_PURE_IDE_COMMAND_KEY.SPLIT_EDITOR_RIGHT,
      LEGEND_PURE_IDE_COMMAND_KEY.SPLIT_EDITOR_DOWN,
    ].forEach((key) =>
      this.applicationStore.commandService.deregisterCommand(key),
    );
  }

  setActiveActivity(
    activity: string,
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

  *loadDiagram(
    filePath: string,
    diagramPath: string,
    line: number,
    column: number,
  ): GeneratorFn<void> {
    let editorState = this.editorSplitState.leaves
      .flatMap((leaf) => leaf.tabManagerState.tabs)
      .find(
        (tab): tab is DiagramEditorState =>
          tab instanceof DiagramEditorState && tab.diagramPath === diagramPath,
      );
    if (!editorState) {
      yield flowResult(this.checkIfSessionWakingUp());
      editorState = new DiagramEditorState(
        this,
        deserialize(DiagramInfo, yield this.client.getDiagramInfo(diagramPath)),
        diagramPath,
        filePath,
        line,
        column,
      );
    }
    this.editorSplitState.openTab(editorState);
  }

  *loadFile(filePath: string, coordinate?: FileCoordinate): GeneratorFn<void> {
    try {
      let editorState = this.editorSplitState.leaves
        .flatMap((leaf) => leaf.tabManagerState.tabs)
        .find(
          (tab): tab is FileEditorState =>
            tab instanceof FileEditorState && tab.filePath === filePath,
        );
      if (!editorState) {
        yield flowResult(this.checkIfSessionWakingUp());
        editorState = new FileEditorState(
          this,
          deserialize(File, yield this.client.getFile(filePath)),
          filePath,
        );
      }
      this.editorSplitState.openTab(editorState);
      if (coordinate) {
        editorState.textEditorState.setForcedCursorPosition({
          lineNumber: coordinate.line,
          column: coordinate.column,
        });
        if (coordinate instanceof FileErrorCoordinate) {
          editorState.showError(coordinate);
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.terminalService.terminal.fail(error.message, {
        systemCommand: `load file ${filePath}`,
      });
    }
  }

  async reloadFile(filePath: string): Promise<void> {
    const tabsToClose: PureIDETabState[] = [];
    await Promise.all(
      this.editorSplitState.allTabs.map(async (tab) => {
        if (tab instanceof FileEditorState && tab.filePath === filePath) {
          tab.setFile(deserialize(File, await this.client.getFile(filePath)));
        } else if (
          tab instanceof DiagramEditorState &&
          tab.filePath === filePath
        ) {
          try {
            tab.rebuild(
              deserialize(
                DiagramInfo,
                await this.client.getDiagramInfo(tab.diagramPath),
              ),
            );
          } catch {
            // something happened, most likely the diagram has been removed or renamed,
            // we should close the tab then
            tabsToClose.push(tab);
          }
        }
      }),
    );
    tabsToClose.forEach((tab) => this.editorSplitState.closeTab(tab));
  }

  *execute(
    url: string,
    extraParams: Record<PropertyKey, unknown>,
    checkExecutionStatus: boolean,
    manageResult: (
      result: ExecutionResult,
      potentiallyAffectedFiles: string[],
    ) => Promise<void>,
    command: string | undefined,
    options?: {
      /**
       * Some execution, such as find concept produces no output
       * so we should not reset the console text in that case
       */
      silentTerminalOnSuccess?: boolean;
      clearTerminal?: boolean;
    },
  ): GeneratorFn<void> {
    if (!this.initState.hasCompleted) {
      this.applicationStore.notificationService.notifyWarning(
        `Can't execute while initializing application`,
      );
      return;
    }
    if (this.executionState.isInProgress) {
      this.applicationStore.notificationService.notifyWarning(
        'Another execution is already in progress!',
      );
      return;
    }
    // reset suggestions before execution
    this.setCodeFixSuggestion(undefined);
    this.executionState.inProgress();
    const potentiallyAffectedFiles = this.editorSplitState.allTabs
      .filter(filterByType(FileEditorState))
      .map((tab) => tab.filePath);
    try {
      const openedFiles = this.editorSplitState.allTabs
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
        new Promise((resolve, reject) =>
          setTimeout(
            () => {
              if (!executionPromiseFinished && checkExecutionStatus) {
                this.applicationStore.alertService.setBlockingAlert({
                  message: 'Executing...',
                  prompt: 'Please do not refresh the application',
                  showLoading: true,
                });
                resolve(
                  this.pullExecutionStatus().finally(() => {
                    this.applicationStore.alertService.setBlockingAlert(
                      undefined,
                    );
                  }),
                );
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
      this.applicationStore.alertService.setBlockingAlert(undefined);
      if (result instanceof ExecutionFailureResult) {
        this.applicationStore.notificationService.notifyError(
          `Execution failed${result.text ? `: ${result.text}` : ''}`,
        );
        this.applicationStore.terminalService.terminal.fail(result.text, {
          systemCommand: command ?? 'execute',
        });
        if (result.sessionError) {
          this.applicationStore.alertService.setBlockingAlert({
            message: 'Session corrupted',
            prompt: result.sessionError,
          });
        } else {
          yield flowResult(manageResult(result, potentiallyAffectedFiles));
        }
      } else {
        if (!options?.silentTerminalOnSuccess) {
          this.applicationStore.terminalService.terminal.output(
            result.text ?? '',
            {
              clear: options?.clearTerminal,
              systemCommand: command ?? 'execute',
            },
          );
        }
        if (result instanceof ExecutionSuccessResult) {
          this.applicationStore.notificationService.notifySuccess(
            'Execution succeeded!',
          );
          if (result.reinit) {
            this.applicationStore.alertService.setBlockingAlert({
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
                      command,
                    ),
                  ),
                this.client.mode,
                this.client.compilerMode,
              ),
            );
          } else {
            yield flowResult(manageResult(result, potentiallyAffectedFiles));
          }
        } else {
          yield flowResult(manageResult(result, potentiallyAffectedFiles));
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.terminalService.terminal.fail(error.message, {
        systemCommand: command ?? 'execute',
      });
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.executionState.reset();
    }
  }

  // NOTE: currently backend do not suppor this operation, so we temporarily disable it, but
  // in theory, this will pull up a blocking modal to show the execution status to user
  async pullExecutionStatus(): Promise<void> {
    const result =
      (await this.client.getExecutionActivity()) as unknown as ExecutionActivity;
    this.applicationStore.alertService.setBlockingAlert({
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
    this.applicationStore.alertService.setBlockingAlert({
      message: 'Executing...',
      prompt: 'Please do not refresh the application',
      showLoading: true,
    });
    return Promise.resolve();
  }

  *executeGo(): GeneratorFn<void> {
    yield flowResult(
      this.execute(
        'executeGo',
        {},
        true,
        (result: ExecutionResult, potentiallyAffectedFiles: string[]) =>
          flowResult(
            this.manageExecuteGoResult(result, potentiallyAffectedFiles),
          ),
        LEGEND_PURE_IDE_TERMINAL_COMMAND.GO,
        {
          clearTerminal: true,
        },
      ),
    );
  }

  *runDebugger(command: { args: string[] }): GeneratorFn<void> {
    yield flowResult(
      this.client
        .execute([], 'debugging', command)
        .then((r) => {
          const execResult = deserializeExecutionResult(
            guaranteeNonNullable(r),
          );
          if (execResult.text) {
            this.applicationStore.terminalService.terminal.output(
              execResult.text,
            );
          }
        })
        .catch((er) => {
          this.applicationStore.terminalService.terminal.fail(er.message);
        }),
    );
  }

  *manageExecuteGoResult(
    result: ExecutionResult,
    potentiallyAffectedFiles: string[],
  ): GeneratorFn<void> {
    const refreshTreesPromise = this.refreshTrees();

    // reset errors on all tabs before potentially show the latest error
    this.editorSplitState.allTabs
      .filter(filterByType(FileEditorState))
      .filter((tab) => potentiallyAffectedFiles.includes(tab.filePath))
      .forEach((tab) => tab.clearError());

    if (result instanceof ExecutionFailureResult) {
      if (result.source) {
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
      }
      if (result instanceof UnmatchedFunctionResult) {
        this.setCodeFixSuggestion(
          new UnmatchedFunctionCodeFixSuggestion(this, result),
        );
        this.setActivePanelMode(PANEL_MODE.CODE_FIX_SUGGESTION);
        this.panelGroupDisplayState.open();
      } else if (result instanceof UnknownSymbolResult) {
        this.setCodeFixSuggestion(
          new UnknownSymbolCodeFixSuggestion(this, result),
        );
        this.setActivePanelMode(PANEL_MODE.CODE_FIX_SUGGESTION);
        this.panelGroupDisplayState.open();
      }
      this.resetChangeDetection(potentiallyAffectedFiles);
    } else if (result instanceof ExecutionSuccessResult) {
      if (result.modifiedFiles.length) {
        for (const path of result.modifiedFiles) {
          yield this.reloadFile(path);
        }
      }
      this.resetChangeDetection(
        potentiallyAffectedFiles.concat(result.modifiedFiles),
      );
      // NOTE: this is for the case where compilation failed during IDE initialization
      // this is when we fix the compilation and execute for the first time, which in turn
      // will properly `initialize` the application
      // therefore, we will need to re-initialize the concept tree which was not initialized
      // before
      if (this.initState.hasFailed || !this.conceptTreeState.treeData) {
        yield flowResult(this.conceptTreeState.initialize());
        this.initState.pass();
      }
    }
    yield refreshTreesPromise;
  }

  *executeTests(
    path: string,
    relevantTestsOnly?: boolean | undefined,
    pctAdapter?: string | undefined,
  ): GeneratorFn<void> {
    if (relevantTestsOnly) {
      this.applicationStore.notificationService.notifyUnsupportedFeature(
        `Run relevant tests! (reason: VCS required)`,
      );
      return;
    }
    if (this.testRunState.isInProgress) {
      this.applicationStore.notificationService.notifyWarning(
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
          pctAdapter,
          relevantTestsOnly,
        },
        false,
        async (result: ExecutionResult, potentiallyAffectedFiles: string[]) => {
          const refreshTreesPromise = this.refreshTrees();
          if (result instanceof ExecutionFailureResult) {
            if (result.source) {
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
            }
            this.setActivePanelMode(PANEL_MODE.TERMINAL);
            this.panelGroupDisplayState.open();
            this.testRunState.fail();
          } else if (result instanceof TestExecutionResult) {
            this.setActivePanelMode(PANEL_MODE.TEST_RUNNER);
            this.panelGroupDisplayState.open();
            const testRunnerState = new TestRunnerState(this, result);
            this.setTestRunnerState(testRunnerState);
            await flowResult(testRunnerState.buildTestTreeData());
            if (testRunnerState.testExecutionResult.count <= 100) {
              testRunnerState.expandTree();
            }
            // make sure we refresh tree so it is shown in the explorer panel
            // NOTE: we could potentially expand the tree here, but this operation is expensive since we have all nodes observable
            // so it will lag the UI if we have too many nodes open
            testRunnerState.refreshTree();
            await flowResult(testRunnerState.pollTestRunnerResult());
            this.testRunState.pass();
          }
          this.resetChangeDetection(potentiallyAffectedFiles);
          // do nothing?
          await refreshTreesPromise;
        },
        `${LEGEND_PURE_IDE_TERMINAL_COMMAND.TEST} ${path}`,
      ),
    );
  }

  *executeFullTestSuite(relevantTestsOnly?: boolean): GeneratorFn<void> {
    yield flowResult(this.executeTests(ROOT_PACKAGE_PATH, relevantTestsOnly));
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
        async (result: ExecutionResult, potentiallyAffectedFiles: string[]) => {
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
          this.resetChangeDetection(potentiallyAffectedFiles);
        },
        `navigate`,
        { silentTerminalOnSuccess: true },
      ),
    );
  }

  *navigateBack(): GeneratorFn<void> {
    if (this.navigationStack.length === 0) {
      this.applicationStore.notificationService.notifyWarning(
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

  *fullReCompile(fullInit: boolean): GeneratorFn<void> {
    this.applicationStore.alertService.setActionAlertInfo({
      message: 'Are you sure you want to perform a full re-compile?',
      prompt: 'This may take a long time to complete',
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Perform full re-compile',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: () => {
            flowResult(
              this.execute(
                'executeSaveAndReset',
                {},
                true,
                async (
                  result: ExecutionResult,
                  potentiallyAffectedFiles: string[],
                ) => {
                  this.initState.reset();
                  await flowResult(
                    this.initialize(
                      fullInit,
                      undefined,
                      this.client.mode,
                      this.client.compilerMode,
                    ),
                  );
                  this.resetChangeDetection(potentiallyAffectedFiles);
                  this.setActiveActivity(ACTIVITY_MODE.CONCEPT_EXPLORER, {
                    keepShowingIfMatchedCurrent: true,
                  });
                },
                `recompile`,
              ),
            ).catch(this.applicationStore.alertUnhandledError);
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

  resetChangeDetection(files: string[]): void {
    this.editorSplitState.allTabs
      .filter(filterByType(FileEditorState))
      .filter((tab) => files.includes(tab.filePath))
      .forEach((tab) => tab.resetChangeDetection());
  }

  async refreshTrees(): Promise<void> {
    await Promise.all([
      this.directoryTreeState.refreshTreeData(),
      this.conceptTreeState.refreshTreeData(),
    ]);

    if (this.directoryTreeState.selectedNode) {
      document
        .getElementById(this.directoryTreeState.selectedNode.id)
        ?.scrollIntoView({
          behavior: 'instant',
          block: 'center',
        });
    }
    if (this.conceptTreeState.selectedNode) {
      document
        .getElementById(this.conceptTreeState.selectedNode.id)
        ?.scrollIntoView({
          behavior: 'instant',
          block: 'center',
        });
    }
  }

  async revealConceptInTree(coordinate: FileCoordinate): Promise<void> {
    const errorMessage =
      'Error revealing concept. Please make sure that the code compiles and that you are looking for a valid concept';
    let concept: ConceptInfo;
    try {
      concept = await this.client.getConceptInfo(
        coordinate.file,
        coordinate.line,
        coordinate.column,
      );
    } catch {
      this.applicationStore.notificationService.notifyWarning(
        `Can't find concept info. Please make sure that the code compiles and that you are looking for references of non primitive types!`,
      );
      return;
    }
    if (!concept.path) {
      return;
    }
    this.applicationStore.alertService.setBlockingAlert({
      message: 'Revealing concept in tree...',
      showLoading: true,
    });
    try {
      if (this.activeActivity !== ACTIVITY_MODE.CONCEPT_EXPLORER) {
        this.setActiveActivity(ACTIVITY_MODE.CONCEPT_EXPLORER);
      }
      const parts = concept.path.split(ELEMENT_PATH_DELIMITER);
      let currentPath = guaranteeNonNullable(parts[0]);
      let currentNode = guaranteeNonNullable(
        this.conceptTreeState.getTreeData().nodes.get(currentPath),
      );
      for (let i = 1; i < parts.length; ++i) {
        currentPath = `${currentPath}${ELEMENT_PATH_DELIMITER}${parts[i]}`;
        if (!this.conceptTreeState.getTreeData().nodes.get(currentPath)) {
          await flowResult(this.conceptTreeState.expandNode(currentNode));
        }
        currentNode = guaranteeNonNullable(
          this.conceptTreeState.getTreeData().nodes.get(currentPath),
        );
      }
      this.conceptTreeState.setSelectedNode(currentNode);
      document.getElementById(currentNode.id)?.scrollIntoView({
        behavior: 'instant',
        block: 'center',
      });
    } catch {
      this.applicationStore.notificationService.notifyWarning(errorMessage);
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
    }
  }

  *command(
    fn: () => Promise<PlainObject<CommandResult>>,
    command: string,
  ): GeneratorFn<boolean> {
    try {
      const result = deserializeCommandResult(
        (yield fn()) as PlainObject<CommandResult>,
      );
      if (result instanceof CommandFailureResult) {
        if (result.errorDialog) {
          this.applicationStore.notificationService.notifyWarning(
            `Can't run command '${command}': ${result.text}`,
          );
        } else {
          this.applicationStore.terminalService.terminal.output(result.text, {
            systemCommand: command,
          });
        }
        return false;
      }
      return true;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.terminalService.terminal.fail(error.message, {
        systemCommand: command,
      });
      return false;
    }
  }

  async getConceptInfo(
    coordinate: FileCoordinate,
    options?: {
      silent?: boolean | undefined;
    },
  ): Promise<ConceptInfo | undefined> {
    try {
      const concept = await this.client.getConceptInfo(
        coordinate.file,
        coordinate.line,
        coordinate.column,
      );
      return concept;
    } catch {
      if (!options?.silent) {
        this.applicationStore.notificationService.notifyWarning(
          `Can't find concept info. Please make sure that the code compiles and that you are looking for references of non primitive types!`,
        );
      }
      return undefined;
    }
  }

  async findConceptUsages(func: string, param: string[]): Promise<Usage[]> {
    return (await this.client.getUsages(func, param)).map((usage) =>
      deserialize(Usage, usage),
    );
  }

  *findUsagesFromCoordinate(coordinate: FileCoordinate): GeneratorFn<void> {
    const concept = (yield this.getConceptInfo(coordinate)) as
      | ConceptInfo
      | undefined;
    if (!concept) {
      return;
    }
    yield flowResult(this.findUsages(concept));
  }

  *findUsages(concept: ConceptInfo): GeneratorFn<void> {
    try {
      this.referenceUsageLoadState.inProgress();
      this.applicationStore.alertService.setBlockingAlert({
        message: 'Finding concept usages...',
        prompt: `Finding references of ${getConceptInfoLabel(concept)}`,
        showLoading: true,
      });
      const usages = (yield this.findConceptUsages(
        concept.pureType === ConceptType.ENUM_VALUE
          ? FIND_USAGE_FUNCTION_PATH.ENUM
          : concept.pureType === ConceptType.PROPERTY ||
              concept.pureType === ConceptType.QUALIFIED_PROPERTY
            ? FIND_USAGE_FUNCTION_PATH.PROPERTY
            : FIND_USAGE_FUNCTION_PATH.ELEMENT,
        (concept.owner ? [`'${concept.owner}'`] : []).concat(
          `'${concept.path}'`,
        ),
      )) as Usage[];
      const searchResultCoordinates = (
        (yield this.client.getTextSearchPreview(
          usages.map((usage) =>
            serialize(
              SearchResultCoordinate,
              new SearchResultCoordinate(
                usage.source,
                usage.startLine,
                usage.startColumn,
                usage.endLine,
                usage.endColumn,
              ),
            ),
          ),
        )) as PlainObject<SearchResultCoordinate>[]
      ).map((preview) => deserialize(SearchResultCoordinate, preview));
      this.setReferenceUsageResult(
        new ReferenceUsageResult(
          this,
          concept,
          usages,
          searchResultCoordinates,
        ),
      );
      this.setActivePanelMode(PANEL_MODE.REFERENCES);
      this.panelGroupDisplayState.open();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.applicationStore.alertService.setBlockingAlert(undefined);
      this.referenceUsageLoadState.complete();
    }
  }

  *renameConcept(
    oldName: string,
    newName: string,
    pureType: string,
    usages: Usage[],
  ): GeneratorFn<void> {
    try {
      yield this.client.renameConcept({
        oldName,
        newName,
        pureType,
        sourceInformations: usages.map((usage) => ({
          sourceId: usage.source,
          line: usage.line,
          column: usage.column,
        })),
      });
      const potentiallyModifiedFiles = usages.map((usage) => usage.source);
      for (const file of potentiallyModifiedFiles) {
        yield this.reloadFile(file);
      }
      yield this.refreshTrees();
      this.applicationStore.notificationService.notifyWarning(
        `Please re-compile the code after refacting`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Can't rename concept '${oldName}'`,
      );
    }
  }

  *movePackageableElements(
    inputs: {
      pureName: string;
      pureType: string;
      sourcePackage: string;
      destinationPackage: string;
      usages: Usage[];
    }[],
  ): GeneratorFn<void> {
    try {
      yield this.client.movePackageableElements(
        inputs.map((input) => ({
          pureName: input.pureName,
          pureType: input.pureType,
          sourcePackage: input.sourcePackage,
          destinationPackage: input.destinationPackage,
          sourceInformations: input.usages.map((usage) => ({
            sourceId: usage.source,
            line: usage.line,
            column: usage.column,
          })),
        })),
      );
      const potentiallyModifiedFiles = uniq(
        inputs.flatMap((input) => input.usages.map((usage) => usage.source)),
      );
      for (const file of potentiallyModifiedFiles) {
        yield this.reloadFile(file);
      }
      yield this.refreshTrees();
      this.applicationStore.notificationService.notifyWarning(
        `Please re-compile the code after refacting`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Can't move packageable elements:\n${error.message}`,
      );
    }
  }

  *updateFileUsingSuggestionCandidate(
    candidate: CandidateWithPackageNotImported,
  ): GeneratorFn<void> {
    this.setCodeFixSuggestion(undefined);
    yield flowResult(
      this.updateFile(
        candidate.fileToBeModified,
        candidate.lineToBeModified,
        candidate.columnToBeModified,
        candidate.add,
        candidate.messageToBeModified,
      ),
    );
    this.setActivePanelMode(PANEL_MODE.TERMINAL);
    this.panelGroupDisplayState.open();
  }

  *updateFile(
    path: string,
    line: number,
    column: number,
    add: boolean,
    message: string,
  ): GeneratorFn<void> {
    try {
      const result = (yield this.client.updateSource([
        {
          path,
          line,
          column,
          message,
          add,
        },
      ])) as SourceModificationResult;
      if (result.modifiedFiles.length) {
        for (const file of result.modifiedFiles) {
          yield this.reloadFile(file);
        }
      }
      this.applicationStore.notificationService.notifyWarning(
        `Please re-compile the code after refacting`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Can't update file '${path}'`,
      );
    }
  }

  *searchFile(): GeneratorFn<void> {
    if (
      this.fileSearchCommandLoadState.isInProgress ||
      this.fileSearchCommandState.text.length <= 3
    ) {
      return;
    }
    this.fileSearchCommandLoadState.inProgress();
    this.fileSearchCommandResults = (yield this.client.findFiles(
      this.fileSearchCommandState.text,
      this.fileSearchCommandState.isRegExp,
    )) as string[];
    this.fileSearchCommandLoadState.pass();
  }

  *createNewDirectory(path: string): GeneratorFn<void> {
    try {
      yield flowResult(
        this.command(
          () => this.client.createFolder(trimPathLeadingSlash(path)),
          LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_DIRECTORY,
        ),
      );

      yield flowResult(this.directoryTreeState.refreshTreeData());
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  *createNewFile(path: string): GeneratorFn<void> {
    try {
      const result = (yield flowResult(
        this.command(
          () => this.client.createFile(trimPathLeadingSlash(path)),
          LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_FILE,
        ),
      )) as boolean;
      yield flowResult(this.directoryTreeState.refreshTreeData());
      if (result) {
        yield flowResult(this.loadFile(path));
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  *renameFile(oldPath: string, newPath: string): GeneratorFn<void> {
    try {
      yield flowResult(
        this.command(
          () => this.client.renameFile(oldPath, newPath),
          LEGEND_PURE_IDE_TERMINAL_COMMAND.MOVE,
        ),
      );
      yield flowResult(this.directoryTreeState.refreshTreeData());
      const openTab = this.editorSplitState.allTabs.find(
        (tab) => tab instanceof FileEditorState && tab.filePath === oldPath,
      );
      if (openTab) {
        this.editorSplitState.closeTab(openTab);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  *deleteDirectoryOrFile(
    path: string,
    isDirectory: boolean | undefined,
    hasChildContent: boolean | undefined,
  ): GeneratorFn<void> {
    const _delete = async (): Promise<void> => {
      await flowResult(
        this.command(
          () => this.client.deleteDirectoryOrFile(trimPathLeadingSlash(path)),
          LEGEND_PURE_IDE_TERMINAL_COMMAND.REMOVE,
        ),
      );
      const editorStatesToClose = this.editorSplitState.allTabs.filter(
        (tab) =>
          tab instanceof FileEditorState &&
          (isDirectory === undefined || isDirectory
            ? tab.filePath.startsWith(`${path}/`)
            : tab.filePath === path),
      );
      editorStatesToClose.forEach((tab) => this.editorSplitState.closeTab(tab));
      await flowResult(this.directoryTreeState.refreshTreeData());
    };
    if (isDirectory === undefined || hasChildContent === undefined) {
      _delete().catch(this.applicationStore.alertUnhandledError);
    } else {
      this.applicationStore.alertService.setActionAlertInfo({
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
}
