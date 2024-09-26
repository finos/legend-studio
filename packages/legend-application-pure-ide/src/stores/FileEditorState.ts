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
  type CommandRegistrar,
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  clearMarkers,
  setErrorMarkers,
  type CodeEditorPosition,
  CODE_EDITOR_LANGUAGE,
} from '@finos/legend-code-editor';
import { DIRECTORY_PATH_DELIMITER } from '@finos/legend-graph';
import {
  assertErrorThrown,
  getNullableLastEntry,
  guaranteeNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  editor as monacoEditorAPI,
  type Position,
  type Selection,
} from 'monaco-editor';
import { ConceptType } from '../server/models/ConceptTree.js';
import {
  FileCoordinate,
  type File,
  trimPathLeadingSlash,
  type FileErrorCoordinate,
} from '../server/models/File.js';
import {
  type ConceptInfo,
  FIND_USAGE_FUNCTION_PATH,
} from '../server/models/Usage.js';
import type { PureIDEStore } from './PureIDEStore.js';
import { PureIDETabState } from './PureIDETabManagerState.js';
import { LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY } from '../__lib__/LegendPureIDECommand.js';
import type { TabState } from '@finos/legend-lego/application';

const getFileEditorLanguage = (filePath: string): string => {
  const extension = getNullableLastEntry(filePath.split('.'));
  switch (extension) {
    case 'pure':
      return CODE_EDITOR_LANGUAGE.PURE;
    case 'java':
      return CODE_EDITOR_LANGUAGE.JAVA;
    case 'md':
      return CODE_EDITOR_LANGUAGE.MARKDOWN;
    case 'sql':
      return CODE_EDITOR_LANGUAGE.SQL;
    case 'json':
      return CODE_EDITOR_LANGUAGE.JSON;
    case 'xml':
      return CODE_EDITOR_LANGUAGE.XML;
    case 'yml':
    case 'yaml':
      return CODE_EDITOR_LANGUAGE.YAML;
    case 'graphql':
      return CODE_EDITOR_LANGUAGE.GRAPHQL;
    default:
      return CODE_EDITOR_LANGUAGE.TEXT;
  }
};

class FileTextEditorState {
  readonly model: monacoEditorAPI.ITextModel;

  editor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  private _dummyCursorObservable = {};

  language!: string;
  viewState?: monacoEditorAPI.ICodeEditorViewState | undefined;

  forcedCursorPosition: CodeEditorPosition | undefined;
  wrapText = false;

  constructor(fileEditorState: FileEditorState) {
    makeObservable<FileTextEditorState, '_dummyCursorObservable'>(this, {
      viewState: observable.ref,
      editor: observable.ref,
      _dummyCursorObservable: observable.ref,
      forcedCursorPosition: observable.ref,
      wrapText: observable,
      cursorObserver: computed,
      notifyCursorObserver: action,
      setViewState: action,
      setEditor: action,
      setForcedCursorPosition: action,
      setWrapText: action,
    });

    this.language = getFileEditorLanguage(fileEditorState.filePath);
    this.model = monacoEditorAPI.createModel(
      fileEditorState.uuid,
      this.language,
    );
    this.model.setValue(fileEditorState.file.content);
  }

  // trigger for the manual observer of editor cursor
  notifyCursorObserver(): void {
    this._dummyCursorObservable = {};
  }

  // subscriber for the manual observer of editor cursor
  get cursorObserver():
    | {
        position: Position | undefined;
        selection: Selection | undefined;
      }
    | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this._dummyCursorObservable; // manually trigger cursor observer
    return this.editor
      ? {
          position: this.editor.getPosition() ?? undefined,
          selection: this.editor.getSelection() ?? undefined,
        }
      : undefined;
  }

  setViewState(val: monacoEditorAPI.ICodeEditorViewState | undefined): void {
    this.viewState = val;
  }

  setEditor(val: monacoEditorAPI.IStandaloneCodeEditor | undefined): void {
    this.editor = val;
  }

  setForcedCursorPosition(val: CodeEditorPosition | undefined): void {
    this.forcedCursorPosition = val;
  }

  setWrapText(val: boolean): void {
    const oldVal = this.wrapText;
    this.wrapText = val;
    if (oldVal !== val && this.editor) {
      this.editor.updateOptions({
        wordWrap: val ? 'on' : 'off',
      });
      this.editor.focus();
    }
  }
}

export class FileEditorRenameConceptState {
  readonly fileEditorState: FileEditorState;
  readonly concept: ConceptInfo;
  readonly coordinate: FileCoordinate;

  constructor(
    fileEditorState: FileEditorState,
    concept: ConceptInfo,
    coordiate: FileCoordinate,
  ) {
    this.fileEditorState = fileEditorState;
    this.concept = concept;
    this.coordinate = coordiate;
  }
}

export class FileEditorState
  extends PureIDETabState
  implements CommandRegistrar
{
  readonly filePath: string;
  readonly textEditorState!: FileTextEditorState;
  private _currentHashCode: string;

  file: File;
  renameConceptState: FileEditorRenameConceptState | undefined;
  showGoToLinePrompt = false;

  constructor(ideStore: PureIDEStore, file: File, filePath: string) {
    super(ideStore);

    makeObservable<FileEditorState, '_currentHashCode'>(this, {
      _currentHashCode: observable,
      file: observable,
      renameConceptState: observable,
      showGoToLinePrompt: observable,
      hasChanged: computed,
      resetChangeDetection: action,
      setFile: action,
      setShowGoToLinePrompt: action,
      setConceptToRenameState: flow,
    });

    this.file = file;
    this._currentHashCode = file.hashCode;
    this.filePath = filePath;
    this.textEditorState = new FileTextEditorState(this);
  }

  get label(): string {
    return trimPathLeadingSlash(this.filePath);
  }

  override get description(): string | undefined {
    return `File: ${trimPathLeadingSlash(this.filePath)}${
      this.file.RO ? ' (readonly)' : ''
    }`;
  }

  get fileName(): string {
    return guaranteeNonNullable(
      getNullableLastEntry(this.filePath.split(DIRECTORY_PATH_DELIMITER)),
    );
  }

  override match(tab: TabState): boolean {
    return tab instanceof FileEditorState && this.filePath === tab.filePath;
  }

  override onClose(): void {
    // dispose text model to avoid memory leak
    this.textEditorState.model.dispose();
  }

  get hasChanged(): boolean {
    return this._currentHashCode !== this.file.hashCode;
  }

  resetChangeDetection(): void {
    this._currentHashCode = this.file.hashCode;
  }

  setFile(val: File): void {
    this.file = val;
    this.textEditorState.model.setValue(val.content);
    this.resetChangeDetection();
  }

  setShowGoToLinePrompt(val: boolean): void {
    this.showGoToLinePrompt = val;
  }

  *setConceptToRenameState(
    coordinate: FileCoordinate | undefined,
  ): GeneratorFn<void> {
    if (!coordinate) {
      this.renameConceptState = undefined;
      return;
    }
    if (this.hasChanged) {
      this.ideStore.applicationStore.notificationService.notifyWarning(
        `Can't rename concept: source is not compiled`,
      );
      return;
    }
    const concept = (yield this.ideStore.getConceptInfo(coordinate)) as
      | ConceptInfo
      | undefined;
    this.renameConceptState = concept
      ? new FileEditorRenameConceptState(this, concept, coordinate)
      : undefined;
  }

  showError(coordinate: FileErrorCoordinate): void {
    setErrorMarkers(
      this.textEditorState.model,
      [
        {
          message: coordinate.error.message,
          startLineNumber: coordinate.line,
          startColumn: coordinate.column,
          endLineNumber: coordinate.line,
          endColumn: coordinate.column,
        },
      ],
      this.uuid,
    );
  }

  clearError(): void {
    clearMarkers(this.uuid);
  }

  registerCommands(): void {
    if (this.textEditorState.language === CODE_EDITOR_LANGUAGE.PURE) {
      this.ideStore.applicationStore.commandService.registerCommand({
        key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_TO_DEFINITION,
        trigger: () =>
          this.ideStore.tabManagerState.currentTab === this &&
          Boolean(this.textEditorState.editor?.hasTextFocus()),
        action: () => {
          const currentPosition = this.textEditorState.editor?.getPosition();
          if (currentPosition) {
            flowResult(
              this.ideStore.executeNavigation(
                new FileCoordinate(
                  this.filePath,
                  currentPosition.lineNumber,
                  currentPosition.column,
                ),
              ),
            ).catch(this.ideStore.applicationStore.alertUnhandledError);
          }
        },
      });
      this.ideStore.applicationStore.commandService.registerCommand({
        key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_BACK,
        action: () => {
          flowResult(this.ideStore.navigateBack()).catch(
            this.ideStore.applicationStore.alertUnhandledError,
          );
        },
      });
      this.ideStore.applicationStore.commandService.registerCommand({
        key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.REVEAL_CONCEPT_IN_TREE,
        trigger: () =>
          this.ideStore.tabManagerState.currentTab === this &&
          Boolean(this.textEditorState.editor?.hasTextFocus()),
        action: () => {
          const currentPosition = this.textEditorState.editor?.getPosition();
          if (currentPosition) {
            this.ideStore
              .revealConceptInTree(
                new FileCoordinate(
                  this.filePath,
                  currentPosition.lineNumber,
                  currentPosition.column,
                ),
              )
              .catch(this.ideStore.applicationStore.alertUnhandledError);
          }
        },
      });
      this.ideStore.applicationStore.commandService.registerCommand({
        key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.FIND_USAGES,
        trigger: () =>
          this.ideStore.tabManagerState.currentTab === this &&
          Boolean(this.textEditorState.editor?.hasTextFocus()),
        action: () => {
          const currentPosition = this.textEditorState.editor?.getPosition();
          if (currentPosition) {
            const coordinate = new FileCoordinate(
              this.filePath,
              currentPosition.lineNumber,
              currentPosition.column,
            );
            this.findConceptUsages(coordinate);
          }
        },
      });
      this.ideStore.applicationStore.commandService.registerCommand({
        key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.RENAME_CONCEPT,
        trigger: () =>
          this.ideStore.tabManagerState.currentTab === this &&
          Boolean(this.textEditorState.editor?.hasTextFocus()),
        action: () => {
          const currentPosition = this.textEditorState.editor?.getPosition();
          if (currentPosition) {
            const currentWord =
              this.textEditorState.model.getWordAtPosition(currentPosition);
            if (!currentWord) {
              return;
            }
            const coordinate = new FileCoordinate(
              this.filePath,
              currentPosition.lineNumber,
              currentPosition.column,
            );
            flowResult(this.setConceptToRenameState(coordinate)).catch(
              this.ideStore.applicationStore.alertUnhandledError,
            );
          }
        },
      });
    }
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.DELETE_LINE,
      trigger: () =>
        this.ideStore.tabManagerState.currentTab === this &&
        Boolean(this.textEditorState.editor?.hasTextFocus()),
      action: () => {
        const currentPosition = this.textEditorState.editor?.getPosition();
        if (currentPosition) {
          this.textEditorState.model.pushEditOperations(
            [],
            [
              {
                range: {
                  startLineNumber: currentPosition.lineNumber,
                  startColumn: 1,
                  endLineNumber: currentPosition.lineNumber + 1,
                  endColumn: 1,
                },
                text: '',
                forceMoveMarkers: true,
              },
            ],
            () => null,
          );
        }
      },
    });
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_TO_LINE,
      trigger: () => this.ideStore.tabManagerState.currentTab === this,
      action: () => {
        this.setShowGoToLinePrompt(true);
      },
    });
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.TOGGLE_TEXT_WRAP,
      trigger: () => this.ideStore.tabManagerState.currentTab === this,
      action: () => {
        this.textEditorState.setWrapText(!this.textEditorState.wrapText);
      },
    });
  }

  findConceptUsages(coordinate: FileCoordinate): void {
    const proceed = (): void => {
      flowResult(this.ideStore.findUsagesFromCoordinate(coordinate)).catch(
        this.ideStore.applicationStore.alertUnhandledError,
      );
    };
    if (this.hasChanged) {
      this.ideStore.applicationStore.alertService.setActionAlertInfo({
        message:
          'Source is not compiled, finding concept usages might be inaccurate. Do you want compile to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Compile and Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              flowResult(this.ideStore.executeGo())
                .then(proceed)
                .catch(this.ideStore.applicationStore.alertUnhandledError);
            },
          },
          {
            label: 'Abort',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      proceed();
    }
  }

  async renameConcept(newName: string): Promise<void> {
    if (!this.renameConceptState) {
      return;
    }
    const concept = this.renameConceptState.concept;
    try {
      this.ideStore.applicationStore.alertService.setBlockingAlert({
        message: 'Finding concept usages...',
        showLoading: true,
      });
      const usages = await this.ideStore.findConceptUsages(
        concept.pureType === ConceptType.ENUM_VALUE
          ? FIND_USAGE_FUNCTION_PATH.ENUM
          : concept.pureType === ConceptType.PROPERTY ||
              concept.pureType === ConceptType.QUALIFIED_PROPERTY
            ? FIND_USAGE_FUNCTION_PATH.PROPERTY
            : FIND_USAGE_FUNCTION_PATH.ELEMENT,
        (concept.owner ? [`'${concept.owner}'`] : []).concat(
          `'${concept.path}'`,
        ),
      );
      await flowResult(
        this.ideStore.renameConcept(
          concept.pureName,
          newName,
          concept.pureType,
          usages,
        ),
      );
      this.textEditorState.setForcedCursorPosition({
        lineNumber: this.renameConceptState.coordinate.line,
        column: this.renameConceptState.coordinate.column,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.ideStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.ideStore.applicationStore.alertService.setBlockingAlert(undefined);
    }
  }

  deregisterCommands(): void {
    if (this.textEditorState.language === CODE_EDITOR_LANGUAGE.PURE) {
      [
        LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_TO_DEFINITION,
        LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_BACK,
        LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.REVEAL_CONCEPT_IN_TREE,
        LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.FIND_USAGES,
        LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.RENAME_CONCEPT,
      ].forEach((key) =>
        this.ideStore.applicationStore.commandService.deregisterCommand(key),
      );
    }
    [
      LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_TO_LINE,
      LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.DELETE_LINE,
      LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.TOGGLE_TEXT_WRAP,
    ].forEach((key) =>
      this.ideStore.applicationStore.commandService.deregisterCommand(key),
    );
  }
}
