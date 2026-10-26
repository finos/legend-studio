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

import { useState, useRef, useEffect, type ReactNode } from 'react';
import {
  type IDisposable,
  editor as monacoEditorAPI,
  KeyCode,
  KeyMod,
  languages as monacoLanguagesAPI,
} from 'monaco-editor';
import {
  getBaseCodeEditorOptions,
  resetLineNumberGutterWidth,
  getCodeEditorValue,
  normalizeLineEnding,
  type CODE_EDITOR_LANGUAGE,
  setErrorMarkers,
  clearMarkers,
  type CODE_EDITOR_THEME,
  configureCodeEditor,
  getCodeEditorThemeForAppTheme,
} from '@finos/legend-code-editor';
import { autorun } from 'mobx';
import {
  DEFAULT_TAB_SIZE,
  useApplicationStore,
  APPLICATION_EVENT,
  DEFAULT_MONOSPACED_FONT_FAMILY,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { clsx, WordWrapIcon } from '@finos/legend-art';
import type { CompilationError, ParserError } from '@finos/legend-graph';
import { LogEvent } from '@finos/legend-shared';

export const configureCodeEditorComponent = async (
  applicationStore: GenericLegendApplicationStore,
): Promise<void> => {
  await configureCodeEditor(DEFAULT_MONOSPACED_FONT_FAMILY, (error) =>
    applicationStore.logService.error(
      LogEvent.create(APPLICATION_EVENT.APPLICATION_SETUP__FAILURE),
      error.message,
    ),
  );

  // override native hotkeys supported by monaco-editor
  // here we map these keys to a dummy command that would just dispatch the key combination
  // to the application keyboard shortcut service, effectively bypassing the command associated
  // with the native keybinding
  const OVERRIDE_DEFAULT_KEYBINDING_COMMAND =
    'legend.code-editor.override-default-keybinding';
  monacoEditorAPI.registerCommand(
    OVERRIDE_DEFAULT_KEYBINDING_COMMAND,
    (accessor, ...args) => {
      applicationStore.keyboardShortcutsService.dispatch(args[0]);
    },
  );
  const hotkeyMapping: [number, string][] = [
    [KeyCode.F1, 'F1'], // show command center
    [KeyCode.F8, 'F8'], // show error
    [KeyCode.F9, 'F9'], // toggle debugger breakpoint
    [KeyMod.WinCtrl | KeyCode.KeyG, 'Control+KeyG'], // go-to line command
    [KeyMod.WinCtrl | KeyCode.KeyB, 'Control+KeyB'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyO, 'Control+KeyO'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyD, 'Control+KeyD'], // cursor move (core command)
    [KeyMod.WinCtrl | KeyCode.KeyP, 'Control+KeyP'], // cursor move (core command)
    [KeyMod.Shift | KeyCode.F10, 'Shift+F10'], // show editor context menu
    [KeyMod.WinCtrl | KeyCode.F2, 'Control+F2'], // change all instances
    [KeyMod.WinCtrl | KeyCode.F12, 'Control+F12'], // go-to definition
  ];
  monacoEditorAPI.addKeybindingRules(
    hotkeyMapping.map(([nativeCodeEditorKeyBinding, keyCombination]) => ({
      keybinding: nativeCodeEditorKeyBinding,
      command: OVERRIDE_DEFAULT_KEYBINDING_COMMAND,
      commandArgs: keyCombination,
    })),
  );

  // Sync Monaco's global editor theme with the application's color theme.
  // `monaco.editor.setTheme` is process-global — calling it here applies the
  // new theme to every existing Monaco instance, and any editor created later
  // with no explicit `theme:` option will inherit it as well. The autorun
  // runs once immediately (setting the initial theme based on whatever
  // colorTheme the app booted with) and re-runs on every theme change.
  //
  // This is intentionally a long-lived subscription with no disposer — it's
  // application lifetime, the editor module is initialized once per app boot.
  autorun(() => {
    monacoEditorAPI.setTheme(
      getCodeEditorThemeForAppTheme(
        applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled,
      ),
    );
  });
};

/**
 * Normally `monaco-editor` worker disposes after 5 minutes staying idle, but we fasten
 * this pace just in case the usage of the editor causes memory-leak somehow
 */
export const disposeCodeEditor = (
  editor: monacoEditorAPI.IStandaloneCodeEditor,
): void => {
  editor.dispose();
  // NOTE: just to be sure, we dispose the model after disposing the editor
  editor.getModel()?.dispose();
};

/** What a completion is: a field, a function, a variable or plain text */
export enum CodeEditorCompletionKind {
  FIELD = 'field',
  FUNCTION = 'function',
  VARIABLE = 'variable',
  TEXT = 'text',
}

/** A completion an editor offers at its cursor */
export interface CodeEditorCompletion {
  readonly label: string;
  /** What replaces the word being typed; a snippet when `isSnippet`, e.g. `contains('${1}')` */
  readonly insertText: string;
  readonly isSnippet?: boolean | undefined;
  /** Shown beside the label, e.g. a column's type */
  readonly detail?: string | undefined;
  readonly kind?: CodeEditorCompletionKind | undefined;
  /** How many characters before the cursor it replaces: the word being typed */
  readonly replaceLength?: number | undefined;
  /** Markdown, shown in the completion's details: e.g. a function's signature and what it does */
  readonly documentation?: string | undefined;
  /** Opens the signature help once written, as a call's `(` typed would: for a call written with its arguments to fill */
  readonly opensSignatureHelp?: boolean | undefined;
}

/** Where an editor's completions come from: the text before the cursor in, completions out */
export interface CodeEditorCompletionSource {
  /** Characters that open the completions as they are typed, e.g. `.` */
  readonly triggerCharacters: readonly string[];
  getCompletions(
    textBeforeCursor: string,
  ): Promise<readonly CodeEditorCompletion[]> | readonly CodeEditorCompletion[];
}

/** Where an editor's hover comes from: the word under the pointer, with the text before and after it, in; Markdown out, or none */
export interface CodeEditorHoverSource {
  getHover(
    word: string,
    textBefore: string,
    textAfter: string,
  ): Promise<string | undefined> | string | undefined;
}

/** A signature an editor shows while a call's arguments are written */
export interface CodeEditorSignature {
  /** e.g. `contains(source: String[1], val: String[1]): Boolean[1]` */
  readonly label: string;
  /** Markdown */
  readonly documentation?: string | undefined;
  /** Each as written in the label, e.g. `val: String[1]`, or where the label writes it: its start and end offsets */
  readonly parameters: readonly {
    readonly label: string | readonly [number, number];
    /** Markdown */
    readonly documentation?: string | undefined;
  }[];
}

/** The signatures of the call being written, and which one and which argument the cursor is at */
export interface CodeEditorSignatureHelp {
  readonly signatures: readonly CodeEditorSignature[];
  readonly activeSignature: number;
  readonly activeParameter: number;
}

/** Where an editor's signature help comes from: the text before the cursor in, the call's signatures out, or none */
export interface CodeEditorSignatureHelpSource {
  /** Characters that open the help as they are typed, e.g. `(` and `,` */
  readonly triggerCharacters: readonly string[];
  getSignatureHelp(
    textBeforeCursor: string,
  ): CodeEditorSignatureHelp | undefined;
}

/**
 * Writes text at an editor's cursor, as a click outside it asks (e.g. a
 * column's chip), with a space before and after where code touches it;
 * false when the editor has no text or cursor to write at
 */
export type CodeEditorTextInserter = (text: string) => boolean;

/** A range of an editor's text: lines and columns from 1, its end column excluded, as Monaco counts them */
export interface CodeEditorRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

/** Text written over a range of an editor's text: an empty range writes it at a position */
export interface CodeEditorTextEdit {
  readonly range: CodeEditorRange;
  readonly text: string;
}

/**
 * Writes edits into an editor's text as one step, which Undo takes back,
 * each range as the text was before; false when the editor has no text to
 * edit
 */
export type CodeEditorTextEditor = (
  edits: readonly CodeEditorTextEdit[],
) => boolean;

const COMPLETION_KINDS: Readonly<
  Record<CodeEditorCompletionKind, monacoLanguagesAPI.CompletionItemKind>
> = {
  [CodeEditorCompletionKind.FIELD]: monacoLanguagesAPI.CompletionItemKind.Field,
  [CodeEditorCompletionKind.FUNCTION]:
    monacoLanguagesAPI.CompletionItemKind.Function,
  [CodeEditorCompletionKind.VARIABLE]:
    monacoLanguagesAPI.CompletionItemKind.Variable,
  [CodeEditorCompletionKind.TEXT]: monacoLanguagesAPI.CompletionItemKind.Text,
};

/** The completions as Monaco shows them, in the order given, each replacing the word being typed */
const toMonacoCompletions = async (
  source: CodeEditorCompletionSource,
  model: monacoEditorAPI.ITextModel,
  position: { lineNumber: number; column: number },
): Promise<monacoLanguagesAPI.CompletionList> => {
  const textBeforeCursor = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  let completions: readonly CodeEditorCompletion[] = [];
  try {
    completions = await source.getCompletions(textBeforeCursor);
  } catch {
    // no completions when they can't be read
  }
  return {
    suggestions: completions.map((completion, index) => ({
      label: completion.label,
      insertText: completion.insertText,
      sortText: String(index).padStart(5, '0'),
      ...(completion.isSnippet
        ? {
            insertTextRules:
              monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
          }
        : {}),
      ...(completion.detail !== undefined ? { detail: completion.detail } : {}),
      ...(completion.documentation !== undefined
        ? { documentation: { value: completion.documentation } }
        : {}),
      ...(completion.opensSignatureHelp
        ? {
            command: {
              id: 'editor.action.triggerParameterHints',
              title: 'Show the signature',
            },
          }
        : {}),
      kind: COMPLETION_KINDS[completion.kind ?? CodeEditorCompletionKind.TEXT],
      range: {
        startLineNumber: position.lineNumber,
        startColumn: Math.max(
          1,
          position.column - (completion.replaceLength ?? 0),
        ),
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
    })),
  };
};

/** The hover of the word under the pointer, as Monaco shows it */
const toMonacoHover = async (
  source: CodeEditorHoverSource,
  model: monacoEditorAPI.ITextModel,
  position: { lineNumber: number; column: number },
): Promise<monacoLanguagesAPI.Hover | null> => {
  const word = model.getWordAtPosition(position);
  if (!word) {
    return null;
  }
  const lastLine = model.getLineCount();
  const textBefore = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: word.startColumn,
  });
  const textAfter = model.getValueInRange({
    startLineNumber: position.lineNumber,
    startColumn: word.endColumn,
    endLineNumber: lastLine,
    endColumn: model.getLineMaxColumn(lastLine),
  });
  let markdown: string | undefined;
  try {
    markdown = await source.getHover(word.word, textBefore, textAfter);
  } catch {
    // no hover when it can't be read
  }
  return markdown
    ? {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        },
        contents: [{ value: markdown }],
      }
    : null;
};

/** The signature help of the call being written, as Monaco shows it */
const toMonacoSignatureHelp = (
  source: CodeEditorSignatureHelpSource,
  model: monacoEditorAPI.ITextModel,
  position: { lineNumber: number; column: number },
): monacoLanguagesAPI.SignatureHelpResult | null => {
  let help: CodeEditorSignatureHelp | undefined;
  try {
    help = source.getSignatureHelp(
      model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      }),
    );
  } catch {
    // no help when it can't be read
  }
  if (!help?.signatures.length) {
    return null;
  }
  return {
    value: {
      signatures: help.signatures.map((signature) => ({
        label: signature.label,
        ...(signature.documentation !== undefined
          ? { documentation: { value: signature.documentation } }
          : {}),
        parameters: signature.parameters.map((parameter) => ({
          label:
            typeof parameter.label === 'string'
              ? parameter.label
              : [parameter.label[0], parameter.label[1]],
          ...(parameter.documentation !== undefined
            ? { documentation: { value: parameter.documentation } }
            : {}),
        })),
      })),
      activeSignature: help.activeSignature,
      activeParameter: help.activeParameter,
    },
    dispose: () => undefined,
  };
};

const OVERFLOW_WIDGETS_ROOT_ID = 'legend-code-editor-overflow-widgets';

/**
 * Where editors render their floating widgets (completions, hovers) when
 * asked to: in the page's body, above everything, since Monaco places them
 * with `position: fixed`, which a CSS-transformed container around the
 * editor (a popper, a dialog) would misplace.
 * See https://github.com/microsoft/monaco-editor/issues/2793#issuecomment-999337740
 */
const getOverflowWidgetsRoot = (): HTMLElement => {
  const existing = document.getElementById(OVERFLOW_WIDGETS_ROOT_ID);
  if (existing) {
    return existing;
  }
  const root = document.createElement('div');
  root.id = OVERFLOW_WIDGETS_ROOT_ID;
  // the class Monaco's widget styles hang on
  root.className = 'monaco-editor';
  Object.assign(root.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    zIndex: '999999',
  });
  document.body.appendChild(root);
  return root;
};

/**
 * Whether the target is in the floating widgets editors render in the page's
 * body (`floatingWidgetsInBody`): a press there is in the editor, for a
 * container closing on a press outside it
 */
export const isInCodeEditorFloatingWidgets = (target: Element): boolean =>
  target.closest(`#${OVERFLOW_WIDGETS_ROOT_ID}`) !== null;

export const CodeEditor: React.FC<{
  inputValue: string;
  isReadOnly?: boolean | undefined;
  lightTheme?: CODE_EDITOR_THEME;
  language: CODE_EDITOR_LANGUAGE | string;
  hideMinimap?: boolean | undefined;
  hideGutter?: boolean | undefined;
  hidePadding?: boolean | undefined;
  hideActionBar?: boolean | undefined;
  updateInput?: ((val: string) => void) | undefined;
  lineToScroll?: number | undefined;
  extraEditorOptions?:
    | (monacoEditorAPI.IEditorOptions & monacoEditorAPI.IGlobalEditorOptions)
    | undefined;
  error?: ParserError | CompilationError | undefined;
  rightActions?: ReactNode;
  /**
   * Completions this editor offers, e.g. the columns a Pure expression can
   * read, offered for its language only while this editor has the focus, so
   * other editors of the language never offer them
   */
  completions?: CodeEditorCompletionSource | undefined;
  /** Hover help over this editor's text, e.g. a function's documentation */
  hover?: CodeEditorHoverSource | undefined;
  /** Signature help while a call's arguments are written in this editor */
  signatureHelp?: CodeEditorSignatureHelpSource | undefined;
  /** Set to a function writing text at this editor's cursor, while the editor exists */
  textInserterRef?: { current: CodeEditorTextInserter | undefined } | undefined;
  /** Set to a function writing edits into this editor's text, while the editor exists, e.g. a quick fix */
  textEditorRef?: { current: CodeEditorTextEditor | undefined } | undefined;
  /** A range of the text to highlight, e.g. the part of an expression pointed at elsewhere */
  highlightedRange?: CodeEditorRange | undefined;
  /**
   * Renders the floating widgets (completions, hovers) in the page's body,
   * for an editor inside a CSS-transformed container, e.g. a popper
   */
  floatingWidgetsInBody?: boolean | undefined;
}> = (props) => {
  const {
    inputValue,
    updateInput,
    lightTheme,
    language,
    isReadOnly,
    hideMinimap,
    hideGutter,
    hidePadding,
    hideActionBar,
    lineToScroll,
    extraEditorOptions,
    error,
    rightActions,
    completions,
    hover,
    signatureHelp,
    textInserterRef,
    textEditorRef,
    highlightedRange,
    floatingWidgetsInBody,
  } = props;
  const applicationStore = useApplicationStore();
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const [isWordWrap, setIsWordWrap] = useState(false);
  const onDidChangeModelContentEventDisposer = useRef<IDisposable | undefined>(
    undefined,
  );
  // the sources as given now, which the providers registered on focus ask
  const completionsRef = useRef(completions);
  completionsRef.current = completions;
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const signatureHelpRef = useRef(signatureHelp);
  signatureHelpRef.current = signatureHelp;
  const hasHover = hover !== undefined;
  const hasSignatureHelp = signatureHelp !== undefined;
  const signatureTriggerCharacters = signatureHelp?.triggerCharacters.join('');
  const hasCompletions = completions !== undefined;
  const completionTriggerCharacters = completions?.triggerCharacters.join('');

  /**
   * NOTE: we want to normalize line ending here since if the original
   * input value includes CR '\r' character, it will get normalized, calling
   * the updateInput method and cause a rerender. With the way we setup
   * `onChange` method, React will warn about `setState` being called in
   * `render` method.
   * See https://github.com/finos/legend-studio/issues/608
   */
  const value = normalizeLineEnding(inputValue);
  const textInputRef = useRef<HTMLDivElement>(null);

  const toggleWordWrap = (): void => {
    const updatedWordWrap = !isWordWrap;
    setIsWordWrap(updatedWordWrap);
    editor?.updateOptions({
      wordWrap: updatedWordWrap ? 'on' : 'off',
    });
  };

  useEffect(() => {
    if (!editor && textInputRef.current) {
      const element = textInputRef.current;
      const _editor = monacoEditorAPI.create(element, {
        ...getBaseCodeEditorOptions(),
        theme:
          applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled &&
          lightTheme
            ? lightTheme
            : getCodeEditorThemeForAppTheme(
                applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled,
              ),

        // layout
        glyphMargin: !hidePadding,
        padding: !hidePadding ? { top: 20, bottom: 20 } : { top: 0, bottom: 0 },

        formatOnType: true,
        formatOnPaste: true,
        ...(floatingWidgetsInBody
          ? {
              fixedOverflowWidgets: true,
              overflowWidgetsDomNode: getOverflowWidgetsRoot(),
            }
          : {}),
      });
      setEditor(_editor);
    }
  }, [
    applicationStore,
    lightTheme,
    hidePadding,
    editor,
    floatingWidgetsInBody,
  ]);

  useEffect(() => {
    if (editor) {
      resetLineNumberGutterWidth(editor);
      const model = editor.getModel();
      if (model) {
        monacoEditorAPI.setModelLanguage(model, language);
      }
    }
  }, [editor, language]);

  // completions, registered while this editor has the focus
  useEffect(() => {
    if (!editor || !hasCompletions) {
      return undefined;
    }
    let registered: IDisposable | undefined;
    const register = (): void => {
      registered?.dispose();
      registered = monacoLanguagesAPI.registerCompletionItemProvider(language, {
        triggerCharacters: Array.from(completionTriggerCharacters ?? ''),
        provideCompletionItems: (model, position) => {
          const source = completionsRef.current;
          return source
            ? toMonacoCompletions(source, model, position)
            : { suggestions: [] };
        },
      });
    };
    const unregister = (): void => {
      registered?.dispose();
      registered = undefined;
    };
    // possibly none, as an editor mocked in tests gives
    const subscriptions = [
      editor.onDidFocusEditorText(register),
      editor.onDidBlurEditorText(unregister),
    ] as (IDisposable | undefined)[];
    if (editor.hasTextFocus()) {
      register();
    }
    return () => {
      subscriptions.forEach((subscription) => subscription?.dispose());
      unregister();
    };
  }, [editor, language, hasCompletions, completionTriggerCharacters]);

  // hover and signature help, registered while this editor exists, for its own text only:
  // a hover shows before the editor has the focus, and not over another editor of the language
  useEffect(() => {
    if (!editor || (!hasHover && !hasSignatureHelp)) {
      return undefined;
    }
    const isOwn = (model: monacoEditorAPI.ITextModel): boolean =>
      model === editor.getModel();
    // possibly none, as Monaco mocked in tests gives
    const registered: (IDisposable | undefined)[] = [];
    if (hasHover) {
      registered.push(
        monacoLanguagesAPI.registerHoverProvider(language, {
          provideHover: (model, position) => {
            const source = hoverRef.current;
            return source && isOwn(model)
              ? toMonacoHover(source, model, position)
              : null;
          },
        }),
      );
    }
    if (hasSignatureHelp) {
      registered.push(
        monacoLanguagesAPI.registerSignatureHelpProvider(language, {
          signatureHelpTriggerCharacters: Array.from(
            signatureTriggerCharacters ?? '',
          ),
          signatureHelpRetriggerCharacters: Array.from(
            signatureTriggerCharacters ?? '',
          ),
          provideSignatureHelp: (model, position) => {
            const source = signatureHelpRef.current;
            return source && isOwn(model)
              ? toMonacoSignatureHelp(source, model, position)
              : null;
          },
        }),
      );
    }
    return () => {
      registered.forEach((provider) => provider?.dispose());
    };
  }, [
    editor,
    language,
    hasHover,
    hasSignatureHelp,
    signatureTriggerCharacters,
  ]);

  // writing text at the cursor, for a click outside the editor
  useEffect(() => {
    if (!editor || !textInserterRef) {
      return undefined;
    }
    textInserterRef.current = (text: string): boolean => {
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection) {
        return false;
      }
      const before =
        selection.startColumn > 1
          ? model.getValueInRange({
              startLineNumber: selection.startLineNumber,
              startColumn: selection.startColumn - 1,
              endLineNumber: selection.startLineNumber,
              endColumn: selection.startColumn,
            })
          : '';
      const after = model.getValueInRange({
        startLineNumber: selection.endLineNumber,
        startColumn: selection.endColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn + 1,
      });
      // a space first but at the start, after a space, or an opening bracket: `a == $x.B`, `f($x.B`;
      // a space after before more code but a space, a closing bracket or a separator: `$x.B $x.C`, `f($x.B)`
      const spaced = `${before && !/[\s([{.!]/u.test(before) ? ' ' : ''}${text}${
        after && !/[\s)\]},.;]/u.test(after) ? ' ' : ''
      }`;
      editor.pushUndoStop();
      editor.executeEdits('insert', [
        { range: selection, text: spaced, forceMoveMarkers: true },
      ]);
      editor.pushUndoStop();
      editor.focus();
      return true;
    };
    return () => {
      textInserterRef.current = undefined;
    };
  }, [editor, textInserterRef]);

  // writing edits, for a click outside the editor
  useEffect(() => {
    if (!editor || !textEditorRef) {
      return undefined;
    }
    textEditorRef.current = (edits: readonly CodeEditorTextEdit[]): boolean => {
      if (!editor.getModel()) {
        return false;
      }
      editor.pushUndoStop();
      editor.executeEdits(
        'edit',
        edits.map((edit) => ({
          range: edit.range,
          text: edit.text,
          forceMoveMarkers: true,
        })),
      );
      editor.pushUndoStop();
      return true;
    };
    return () => {
      textEditorRef.current = undefined;
    };
  }, [editor, textEditorRef]);

  // the highlighted range, while it is given
  const highlightedRangeRef = useRef(highlightedRange);
  highlightedRangeRef.current = highlightedRange;
  const highlightKey = highlightedRange
    ? `${highlightedRange.startLineNumber}:${highlightedRange.startColumn}:${highlightedRange.endLineNumber}:${highlightedRange.endColumn}`
    : undefined;
  useEffect(() => {
    const range = highlightedRangeRef.current;
    if (!editor || !range || highlightKey === undefined) {
      return undefined;
    }
    // possibly none, as an editor mocked in tests gives
    const decorations = editor.createDecorationsCollection([
      { range, options: { className: 'code-editor__highlighted-range' } },
    ]) as monacoEditorAPI.IEditorDecorationsCollection | undefined;
    return () => decorations?.clear();
  }, [editor, highlightKey]);

  useEffect(() => {
    if (editor && lineToScroll !== undefined) {
      editor.revealLineInCenter(lineToScroll);
    }
  }, [editor, lineToScroll]);

  if (editor) {
    // dispose the old editor content setter in case the `updateInput` handler changes
    // for a more extensive note on this, see `LambdaEditor`
    onDidChangeModelContentEventDisposer.current?.dispose();
    onDidChangeModelContentEventDisposer.current =
      editor.onDidChangeModelContent(() => {
        const currentVal = getCodeEditorValue(editor);
        if (currentVal !== value) {
          updateInput?.(currentVal);
        }
      });

    // Set the text value and editor options
    const currentValue = getCodeEditorValue(editor);
    if (currentValue !== value) {
      editor.setValue(value);
    }
    editor.updateOptions({
      readOnly: Boolean(isReadOnly),
      minimap: { enabled: !hideMinimap },
      // Hide the line number gutter
      // See https://github.com/microsoft/vscode/issues/30795
      ...(hideGutter
        ? {
            glyphMargin: !hidePadding,
            folding: false,
            lineNumbers: 'off',
            lineDecorationsWidth: 0,
          }
        : {}),
      ...(extraEditorOptions ?? {}),
    });
    const model = editor.getModel();
    model?.updateOptions({ tabSize: DEFAULT_TAB_SIZE });
    if (model) {
      if (error?.sourceInformation) {
        setErrorMarkers(model, [
          {
            message: error.message,
            startLineNumber: error.sourceInformation.startLine,
            startColumn: error.sourceInformation.startColumn,
            endLineNumber: error.sourceInformation.endLine,
            endColumn: error.sourceInformation.endColumn,
          },
        ]);
      } else {
        clearMarkers();
      }
    }
  }

  // dispose editor
  useEffect(
    () => (): void => {
      if (editor) {
        disposeCodeEditor(editor);

        onDidChangeModelContentEventDisposer.current?.dispose();
      }
    },
    [editor],
  );

  return (
    <div className="code-editor">
      {!hideActionBar && (
        <div className="code-editor__header">
          <button
            tabIndex={-1}
            className={clsx('code-editor__header__action', {
              'code-editor__header__action--active': isWordWrap,
            })}
            onClick={toggleWordWrap}
            title={`[${isWordWrap ? 'on' : 'off'}] Toggle word wrap`}
          >
            <WordWrapIcon />
          </button>
          {rightActions}
        </div>
      )}
      <div
        className={clsx('code-editor__content', {
          'code-editor__content--padding': !hidePadding,
          'code-editor__content--with__header': !hideActionBar,
        })}
      >
        <div className="code-editor__body" ref={textInputRef} />
      </div>
    </div>
  );
};
