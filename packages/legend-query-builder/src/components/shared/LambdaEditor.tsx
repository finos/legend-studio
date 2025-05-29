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

import { useRef, useEffect, useState, useMemo } from 'react';
import {
  editor as monacoEditorAPI,
  type IDisposable,
  languages as monacoLanguagesAPI,
  type IPosition,
} from 'monaco-editor';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  FilledWindowMaximizeIcon,
  LongArrowAltDownIcon,
  LongArrowAltUpIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalFooterButton,
} from '@finos/legend-art';
import {
  getBaseCodeEditorOptions,
  getCodeEditorValue,
  normalizeLineEnding,
  clearMarkers,
  setErrorMarkers,
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  PURE_CODE_EDITOR_WORD_SEPARATORS,
  type CompletionItem,
} from '@finos/legend-code-editor';
import { disposeCodeEditor } from '@finos/legend-lego/code-editor';
import type { LambdaEditorState } from '../../stores/shared/LambdaEditorState.js';
import {
  debounce,
  guaranteeNonNullable,
  noop,
  removePrefix,
  type DebouncedFunc,
  type GeneratorFn,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { ParserError, type EngineError, type Type } from '@finos/legend-graph';
import {
  DEFAULT_TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';

const LambdaEditor_ErrorFeedback: React.FC<{
  error?: EngineError | undefined;
  discardChanges: () => void;
}> = (props) => {
  const { error, discardChanges } = props;

  if (!error) {
    return null;
  }
  return (
    <div className="lambda-editor__error-feedback">
      <div className="lambda-editor__error-feedback__error__message">
        {error.message}
      </div>
      {error instanceof ParserError && (
        <div className="lambda-editor__error-feedback__parsing-error__content">
          <button
            className="lambda-editor__error-feedback__parsing-error__discard-changes-btn"
            onClick={discardChanges}
            tabIndex={-1}
          >
            Discard Changes
          </button>
        </div>
      )}
    </div>
  );
};

export async function getCodeSuggestions(
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  lambdaEditorState: LambdaEditorState,
) {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const currentWord = model.getWordAtPosition(position);

  let suggestions: CompletionItem[] = [];
  const SPECIAL_CHAR = '>';
  try {
    suggestions = (await lambdaEditorState.getCodeComplete(textUntilPosition))
      .completions;
    suggestions.forEach((suggestion) => {
      if (textUntilPosition.length) {
        // HACK for special char '>' behaving weirdly
        const lastCharInContext = textUntilPosition.slice(-1);
        const firstCharInSuggestion = suggestion.completion[0];
        if (
          lastCharInContext === SPECIAL_CHAR &&
          firstCharInSuggestion === SPECIAL_CHAR
        ) {
          {
            suggestion.completion = removePrefix(
              suggestion.completion,
              guaranteeNonNullable(textUntilPosition.slice(-1)),
            );
          }
        }
      }
    });
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }
  return suggestions.map(
    (suggestion) =>
      ({
        label: suggestion.display,
        kind: monacoLanguagesAPI.CompletionItemKind.Text, // TODO?: the engine should provide this information
        filterText: suggestion.display,
        insertTextRules:
          monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
        insertText: suggestion.completion,
        // NOTE: the following replace range is equivalent to the current word range, if there is a current word,
        // replace this word with the suggestions, otherwise, if there is no current word, we use the current position
        // as insertion point for the suggestion. This is due to the fact that the auto-completer gives full word
        // suggestions even when the user is typing the middle of that word
        //
        // For example, if the current input is 'a' and the suggestion is 'abc', we need to make sure
        // the suggestion is inserted so that the final result is 'abc', not 'aabc'
        range: {
          startLineNumber: position.lineNumber,
          startColumn: currentWord?.startColumn ?? position.column,
          endLineNumber: position.lineNumber,
          endColumn: currentWord?.endColumn ?? position.column,
        },
        command: {
          id: 'editor.action.triggerSuggest',
        },
      }) as monacoLanguagesAPI.CompletionItem,
  );
}

const LambdaEditor_Inner = observer(
  (props: {
    className?: string | undefined;
    disabled: boolean;
    inline?: boolean | undefined;
    lambdaEditorState: LambdaEditorState;
    transformStringToLambda: DebouncedFunc<() => GeneratorFn<void>> | null;
    expectedType?: Type | undefined;
    matchedExpectedType?: (() => boolean) | undefined;
    onExpectedTypeLabelSelect?: (() => void) | undefined;
    hideErrorBar?: boolean | undefined;
    forceBackdrop: boolean;
    disablePopUp?: boolean | undefined;
    autoFocus?: boolean | undefined;
    openInPopUp?: (() => void) | undefined;
    onEditorFocus?: (() => void) | undefined;
    onEditorBlur?: (() => void) | undefined;
    disableExpansion?: boolean | undefined;
    forceExpansion?: boolean | undefined;
  }) => {
    const {
      className,
      disabled,
      lambdaEditorState,
      transformStringToLambda,
      expectedType,
      onExpectedTypeLabelSelect,
      matchedExpectedType,
      forceBackdrop,
      disableExpansion,
      forceExpansion,
      disablePopUp,
      inline,
      hideErrorBar,
      autoFocus,
      openInPopUp,
      onEditorFocus,
      onEditorBlur,
    } = props;
    const applicationStore = useApplicationStore();
    const onDidChangeModelContentEventDisposer = useRef<
      IDisposable | undefined
    >(undefined);
    const onDidFocusEditorWidgetDisposer = useRef<IDisposable | undefined>(
      undefined,
    );
    const onDidBlurEditorTextDisposer = useRef<IDisposable | undefined>(
      undefined,
    );
    const suggestionsProvider = useRef<IDisposable | undefined>(undefined);
    const value = normalizeLineEnding(lambdaEditorState.lambdaString);
    const parserError = lambdaEditorState.parserError;
    const compilationError = lambdaEditorState.compilationError;
    const selectTypeLabel = (): void => onExpectedTypeLabelSelect?.();
    const [isExpanded, setExpanded] = useState(Boolean(forceExpansion));
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    const textInputRef = useRef<HTMLDivElement>(null);

    const transformLambdaToString = async (pretty: boolean): Promise<void> => {
      transformStringToLambda?.cancel();
      return flowResult(
        lambdaEditorState.convertLambdaObjectToGrammarString({
          pretty: pretty,
        }),
      ).catch(applicationStore.alertUnhandledError);
    };

    const discardChanges = applicationStore.guardUnhandledError(() =>
      transformLambdaToString(isExpanded),
    );
    const toggleExpandedMode = (): void => {
      if (!forceExpansion && !parserError) {
        transformLambdaToString(!isExpanded).catch(
          applicationStore.alertUnhandledError,
        );
        setExpanded(!isExpanded);
      } else if (!forceExpansion && parserError) {
        setExpanded(!isExpanded);
      }
    };

    useEffect(() => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const lambdaEditorOptions: monacoEditorAPI.IStandaloneEditorConstructionOptions =
          inline
            ? {
                renderLineHighlight: 'none',
                lineHeight: 24,
                overviewRulerBorder: false, // hide overview ruler (no current way to hide this completely yet)
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: false,
                glyphMargin: false,
                folding: false,
                minimap: { enabled: false },
                lineNumbers: 'off',
                lineNumbersMinChars: 0,
                lineDecorationsWidth: 5,
                snippetSuggestions: 'none',
                scrollbar: { vertical: 'hidden' },
              }
            : {
                padding: { top: 20, bottom: 20 },
              };
        const _editor = monacoEditorAPI.create(element, {
          ...getBaseCodeEditorOptions(),
          language: CODE_EDITOR_LANGUAGE.PURE,
          theme: applicationStore.layoutService
            .TEMPORARY__isLightColorThemeEnabled
            ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
            : CODE_EDITOR_THEME.DEFAULT_DARK,
          ...lambdaEditorOptions,
        });
        setEditor(_editor);
      }
    }, [editor, applicationStore, inline]);

    // set styling for expanded mode
    useEffect(() => {
      if (editor) {
        const currentClassName = editor.getRawOptions().extraEditorClassName;
        const isInExpanded = currentClassName === 'lambda-editor__expanded';
        if (isInExpanded !== isExpanded) {
          editor.updateOptions(
            isExpanded
              ? {
                  extraEditorClassName:
                    'lambda-editor__editor__input__expanded',
                }
              : {
                  extraEditorClassName:
                    'lambda-editor__editor__input__compressed',
                },
          );
          // set the value here so we don't lose the error when toggling between expand/collape modes
          const currentValue = getCodeEditorValue(editor);
          editor.setValue(currentValue);
        }
      }
    }, [editor, isExpanded]);

    // set styling when theme changes
    useEffect(() => {
      if (editor) {
        editor.updateOptions({
          theme: applicationStore.layoutService
            .TEMPORARY__isLightColorThemeEnabled
            ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
            : CODE_EDITOR_THEME.DEFAULT_DARK,
        });
      }
    }, [
      editor,
      applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled,
    ]);

    // set styling when theme changes
    useEffect(() => {
      if (editor) {
        // NOTE: since engine suggestions are computed based on the current text content
        // we put it in this block to simplify the flow and really to "bend" monaco-editor
        // suggestion provider to our needs. But we also need to make sure this suggestion
        // provider is scoped to the current editor only by checking the editor model
        suggestionsProvider.current?.dispose();
        if (lambdaEditorState.typeAheadEnabled) {
          suggestionsProvider.current =
            monacoLanguagesAPI.registerCompletionItemProvider(
              CODE_EDITOR_LANGUAGE.PURE,
              {
                // NOTE: this is a hack to fetch suggestions from engine for every keystroke
                triggerCharacters: [...PURE_CODE_EDITOR_WORD_SEPARATORS, '$'],
                provideCompletionItems: async (model, position) => {
                  let suggestions: monacoLanguagesAPI.CompletionItem[] = [];
                  suggestions = suggestions.concat(
                    await getCodeSuggestions(
                      position,
                      model,
                      lambdaEditorState,
                    ),
                  );

                  return { suggestions };
                },
              },
            );
        }
      }
    }, [editor, lambdaEditorState, lambdaEditorState.typeAheadEnabled]);

    // set backdrop to force user to fix parser error when it happens
    useEffect(() => {
      if (parserError) {
        applicationStore.layoutService.setShowBackdrop(true);
      } else if (!forceBackdrop) {
        // make sure the backdrop is no longer `needed` for blocking by another parser error before hiding it
        // NOTE: this has a serious drawback, see the documentation for `forceBackdrop` prop of `LambdaEditor`
        // for better context
        applicationStore.layoutService.setShowBackdrop(false);
      }
    }, [applicationStore, parserError, forceBackdrop]);

    if (editor) {
      /**
       * See the extensive note about this instantiation in `LambdaEditor`. The fact that `transformStringToLambda` can change
       * since it does not solely depends on `LambdaEditorState` but also the `disabled` flag means that the update function
       * can go stale, so we cannot place this `onDidChangeModelContent` in a one-time called instantiation of the editor
       * (i.e. the first `useEffect` where we create the editor). As such, we have to use refs and disposer to update this every time
       * the lambda editor is re-rendered.
       *
       * A potential bug that could come up if we place this logic in the `useEffect` for instantiating the editor is:
       * 1. Initially set the `disabled` to true, then switch it back to `false` (using a timer or something)
       * 2. Type something in the lambda editor, the transform function is `undefined` and does not update the underlying lambda
       */
      onDidChangeModelContentEventDisposer.current?.dispose();
      onDidChangeModelContentEventDisposer.current =
        editor.onDidChangeModelContent((event) => {
          const currentVal = getCodeEditorValue(editor);
          /**
           * Avoid unecessary setting of lambda string. Also, this prevents clearing the non-parser error on first render.
           * Since this method is guaranteed to be called one time during the first rendering when we first set the
           * value for the lambda editor, we do not want to clear any existing non-parser error in case it is set by methods
           * like reveal error in each editor
           */
          if (currentVal !== value) {
            lambdaEditorState.setLambdaString(currentVal);
            /**
             * Here we clear the error as user changes the input
             * NOTE: we don't reset the parser error here, we could, but with that, we have to assume that the parsing check is
             * pretty quick--almost near real time, but if after typing new character, we clear the parsing error and the user
             * still make mistake, then the warning message will appear to flash, which is bad UX, so for now, we leave it be
             */
            lambdaEditorState.setCompilationError(undefined);
          }
          /**
           * This method MUST run on the first rendering of the lambda editor, as it will update the lambda object. This is
           * needed for new lambda where a lot of time is just a stub lambda. Without having this method called on the first
           * rendering, that stub lambda will remain stub lambda until user starts typing something in the lambda editor.
           * This stub lambda sometimes does not even get registered in change detection and causing the user to lose data
           * Although, technically a stub lambda is useless, so this is not too serious, but it may come across as buggy
           */
          transformStringToLambda?.cancel();
          if (transformStringToLambda) {
            const stringToLambdaTransformation = transformStringToLambda();
            if (stringToLambdaTransformation) {
              flowResult(stringToLambdaTransformation).catch(
                applicationStore.alertUnhandledError,
              );
            }
          }
        });

      onDidFocusEditorWidgetDisposer.current?.dispose();
      onDidFocusEditorWidgetDisposer.current = editor.onDidFocusEditorWidget(
        () => {
          onEditorFocus?.();
        },
      );
      if (onEditorBlur) {
        onDidBlurEditorTextDisposer.current = editor.onDidBlurEditorText(() => {
          transformStringToLambda?.cancel();
          onEditorBlur();
        });
      }
      // Set the text value
      const currentValue = getCodeEditorValue(editor);
      const editorModel = editor.getModel();
      const currentConfig = editor.getRawOptions();
      if (currentValue !== value) {
        editor.setValue(value);
      }
      if (currentConfig.readOnly !== disabled) {
        editor.updateOptions({
          readOnly: disabled,
        });
      }

      // Set the errors
      if (editorModel) {
        editorModel.updateOptions({ tabSize: DEFAULT_TAB_SIZE });
        const error = parserError ?? compilationError;
        if (error?.sourceInformation) {
          setErrorMarkers(editorModel, [
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

    // auto-focus
    useEffect(() => {
      if (editor && autoFocus) {
        editor.focus();
      }
    }, [autoFocus, editor]);

    // dispose editor
    useEffect(
      () => (): void => {
        if (editor) {
          disposeCodeEditor(editor);

          onDidChangeModelContentEventDisposer.current?.dispose();
          onDidFocusEditorWidgetDisposer.current?.dispose();
          suggestionsProvider.current?.dispose();
        }
      },
      [editor],
    );

    return (
      <>
        <div
          className={clsx('lambda-editor', className, {
            'lambda-editor__expanded': isExpanded,
          })}
        >
          <div
            data-testid={QUERY_BUILDER_TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT}
            className="lambda-editor__editor__input"
          >
            <div className="code-editor__body" ref={textInputRef} />
          </div>
          {Boolean(expectedType) && (
            <div className="lambda-editor__editor__info">
              {onExpectedTypeLabelSelect && (
                <button
                  className={clsx(
                    'lambda-editor__editor__expected-return-type lambda-editor__editor__expected-return-type--clickable',
                    {
                      'lambda-editor__editor__expected-return-type--highlighted':
                        matchedExpectedType?.(),
                    },
                  )}
                  onClick={selectTypeLabel}
                  tabIndex={-1}
                  title="Toggle highlight expected type"
                >
                  {expectedType?.name ?? 'unknown'}
                </button>
              )}
              {!onExpectedTypeLabelSelect && (
                <div
                  className={clsx(
                    'lambda-editor__editor__expected-return-type',
                    {
                      'lambda-editor__editor__expected-return-type--highlighted':
                        matchedExpectedType?.(),
                    },
                  )}
                >
                  {expectedType?.name ?? 'unknown'}
                </div>
              )}
            </div>
          )}
          {!disableExpansion && !forceExpansion && (
            <button
              className="lambda-editor__editor__expand-btn"
              onClick={toggleExpandedMode}
              tabIndex={-1}
              title="Toggle Expand"
            >
              {isExpanded ? <LongArrowAltUpIcon /> : <LongArrowAltDownIcon />}
            </button>
          )}
          {!disablePopUp && (
            <button
              className="lambda-editor__action"
              onClick={openInPopUp}
              tabIndex={-1}
              title="Open in a popup..."
            >
              <FilledWindowMaximizeIcon />
            </button>
          )}
        </div>
        {!hideErrorBar && (
          <LambdaEditor_ErrorFeedback
            error={parserError ?? compilationError}
            discardChanges={discardChanges}
          />
        )}
      </>
    );
  },
);

const LambdaEditor_PopUp = observer(
  (props: {
    title?: string | undefined;
    className?: string | undefined;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    transformStringToLambda: DebouncedFunc<() => GeneratorFn<void>> | null;
    onClose: () => void;
  }) => {
    const {
      className,
      disabled,
      lambdaEditorState,
      transformStringToLambda,
      title,
      onClose,
    } = props;
    const applicationStore = useApplicationStore();
    const onDidChangeModelContentEventDisposer = useRef<
      IDisposable | undefined
    >(undefined);
    const value = normalizeLineEnding(lambdaEditorState.lambdaString);
    const parserError = lambdaEditorState.parserError;
    const compilationError = lambdaEditorState.compilationError;
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    const textInputRef = useRef<HTMLDivElement>(null);

    const transformLambdaToString = async (pretty: boolean): Promise<void> => {
      transformStringToLambda?.cancel();
      return flowResult(
        lambdaEditorState.convertLambdaObjectToGrammarString({
          pretty: pretty,
        }),
      ).catch(applicationStore.alertUnhandledError);
    };
    const discardChanges = applicationStore.guardUnhandledError(() =>
      transformLambdaToString(true),
    );

    const onEnter = (): void => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const _editor = monacoEditorAPI.create(element, {
          ...getBaseCodeEditorOptions(),
          language: CODE_EDITOR_LANGUAGE.PURE,
          theme: applicationStore.layoutService
            .TEMPORARY__isLightColorThemeEnabled
            ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
            : CODE_EDITOR_THEME.DEFAULT_DARK,
        });
        setEditor(_editor);
      }
    };

    if (editor) {
      /**
       * See the extensive note about this instantiation in `LambdaEditor`. The fact that `transformStringToLambda` can change
       * since it does not solely depends on `LambdaEditorState` but also the `disabled` flag means that the update function
       * can go stale, so we cannot place this `onDidChangeModelContent` in a one-time called instantiation of the editor
       * (i.e. the first `useEffect` where we create the editor). As such, we have to use refs and disposer to update this every time
       * the lambda editor is re-rendered.
       *
       * A potential bug that could come up if we place this logic in the `useEffect` for instantiating the editor is:
       * 1. Initially set the `disabled` to true, then switch it back to `false` (using a timer or something)
       * 2. Type something in the lambda editor, the transform function is `undefined` and does not update the underlying lambda
       */
      onDidChangeModelContentEventDisposer.current?.dispose();
      onDidChangeModelContentEventDisposer.current =
        editor.onDidChangeModelContent((event) => {
          const currentVal = getCodeEditorValue(editor);
          /**
           * Avoid unecessary setting of lambda string. Also, this prevents clearing the non-parser error on first render.
           * Since this method is guaranteed to be called one time during the first rendering when we first set the
           * value for the lambda editor, we do not want to clear any existing non-parser error in case it is set by methods
           * like reveal error in each editor
           */
          if (currentVal !== value) {
            lambdaEditorState.setLambdaString(currentVal);
            /**
             * Here we clear the error as user changes the input
             * NOTE: we don't reset the parser error here, we could, but with that, we have to assume that the parsing check is
             * pretty quick--almost near real time, but if after typing new character, we clear the parsing error and the user
             * still make mistake, then the warning message will appear to flash, which is bad UX, so for now, we leave it be
             */
            lambdaEditorState.setCompilationError(undefined);
          }
          /**
           * This method MUST run on the first rendering of the lambda editor, as it will update the lambda object. This is
           * needed for new lambda where a lot of time is just a stub lambda. Without having this method called on the first
           * rendering, that stub lambda will remain stub lambda until user starts typing something in the lambda editor.
           * This stub lambda sometimes does not even get registered in change detection and causing the user to lose data
           * Although, technically a stub lambda is useless, so this is not too serious, but it may come across as buggy
           */
          transformStringToLambda?.cancel();
          if (transformStringToLambda) {
            const stringToLambdaTransformation = transformStringToLambda();
            if (stringToLambdaTransformation) {
              flowResult(stringToLambdaTransformation).catch(
                applicationStore.alertUnhandledError,
              );
            }
          }
        });

      // Set the text value
      const currentValue = getCodeEditorValue(editor);
      const editorModel = editor.getModel();
      const currentConfig = editor.getRawOptions();
      if (currentValue !== value) {
        editor.setValue(value);
      }
      if (currentConfig.readOnly !== disabled) {
        editor.updateOptions({
          readOnly: disabled,
        });
      }

      // Set the errors
      if (editorModel) {
        editorModel.updateOptions({ tabSize: DEFAULT_TAB_SIZE });
        const error = parserError ?? compilationError;
        if (error?.sourceInformation) {
          setErrorMarkers(editorModel, [
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

    useEffect(() => {
      if (!lambdaEditorState.parserError) {
        flowResult(
          lambdaEditorState.convertLambdaObjectToGrammarString({
            pretty: true,
            preserveCompilationError: true,
          }),
        ).catch(applicationStore.alertUnhandledError);
      }
    }, [applicationStore, lambdaEditorState]);

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
      <Dialog
        open={true}
        TransitionProps={{
          onEnter,
        }}
        onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className={clsx(
            'editor-modal lambda-editor__popup__modal',
            {
              'lambda-editor__popup__modal--has-error': Boolean(
                lambdaEditorState.parserError,
              ),
            },
            {
              'lambda-editor--light':
                applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled,
            },
          )}
        >
          <ModalHeader>
            <ModalTitle title={title ?? 'Edit Lambda'} />
            {lambdaEditorState.parserError && (
              <div className="modal__title__error-badge">
                Failed to parse lambda
              </div>
            )}
          </ModalHeader>
          <ModalBody>
            <div className={clsx('lambda-editor__popup__content', className)}>
              <div
                data-testid={QUERY_BUILDER_TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT}
                className="lambda-editor__editor__input"
              >
                <div className="code-editor__body" ref={textInputRef} />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Proceed"
              onClick={onClose}
              disabled={Boolean(lambdaEditorState.parserError)}
            />
            <ModalFooterButton
              className="btn--caution"
              text="Cancel"
              onClick={discardChanges}
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

type LambdaEditorBaseProps = {
  className?: string | undefined;
  disabled: boolean;
  lambdaEditorState: LambdaEditorState;
  /**
   * As backdrop element is often shared in the application, and there could be multiple
   * editor using that backdrop, we could end up in situation where some such editors
   * have parser errors and some don't (this can happen when user make edits very quickly 2 lambda
   * editor and causes parsers error simultaneously). In this case, we want to make sure when
   * parser error is fixed in one editor, the backdrop is not dismissed immediately.
   *
   * NOTE: the current approach has a critical flaw, where on the same screen, there could be multiple
   * sets of lambda editors with different values for `forceBackdrop`. So really, the only way to
   * accomondate for this is to have `forceBackdrop` as a global value. Or we should get rid of this
   * backdrop mechanism altogether as it's not a common UX pattern. i.e. quick evaluation makes
   * us believe that this is a good option, user will lose what they type, but the most recent parsable
   * input will still be captured.
   */
  forceBackdrop: boolean;
  autoFocus?: boolean | undefined;
  onEditorFocus?: (() => void) | undefined;
  onEditorBlur?: (() => void) | undefined;
};

export const InlineLambdaEditor = observer(
  (
    props: LambdaEditorBaseProps & {
      /**
       * TODO: when we pass in these expected type we should match a type as expected type if it's covariance, i.e. it is a subtype of
       * the expected type. Note that we also have to handle that relationship for Primitive type
       * See https://dzone.com/articles/covariance-and-contravariance
       */
      expectedType?: Type | undefined;
      matchedExpectedType?: (() => boolean) | undefined;
      onExpectedTypeLabelSelect?: (() => void) | undefined;
      /**
       * To whether or not disable expasipn toggler
       */
      disableExpansion?: boolean | undefined;
      /**
       * To whether show the inline editor in expanded mode initially and
       * disable expansion toggler
       *
       * This flag will override the effect of `forceExpansion`
       */
      forceExpansion?: boolean | undefined;
      /**
       * To whether or not disable popup mode
       */
      disablePopUp?: boolean | undefined;
      /**
       * To whether or not hide parser error bar in inline mode
       */
      hideErrorBar?: boolean | undefined;
    },
  ) => {
    const {
      className,
      lambdaEditorState,
      disabled,
      forceBackdrop,
      expectedType,
      onExpectedTypeLabelSelect,
      matchedExpectedType,
      disableExpansion,
      forceExpansion,
      disablePopUp,
      hideErrorBar,
      autoFocus,
      onEditorFocus,
      onEditorBlur,
    } = props;
    const [showPopUp, setShowPopUp] = useState(false);
    const openInPopUp = (): void => setShowPopUp(true);
    const closePopUp = (): void => setShowPopUp(false);
    const debouncedTransformStringToLambda = useMemo(
      () =>
        disabled
          ? null
          : debounce(
              () => lambdaEditorState.convertLambdaGrammarStringToObject(),
              1000,
            ),
      [lambdaEditorState, disabled],
    );

    if (!disablePopUp && showPopUp) {
      return (
        <>
          <div className="lambda-editor" />
          <LambdaEditor_PopUp
            className={className}
            disabled={disabled}
            lambdaEditorState={lambdaEditorState}
            transformStringToLambda={debouncedTransformStringToLambda}
            onClose={closePopUp}
          />
        </>
      );
    }
    return (
      <LambdaEditor_Inner
        /**
         * See the usage of `transformStringToLambda` as well as the instatiation of the editor in `LambdaEditorInner`.
         * One of the big problem is that the editor uses lambda editor state (there are some non-trivial logic there, that
         * handles string <-> lambda object conversion), but there are certain operations in this app that can potentially
         * remove and recreate the lambda editor state, such as global generate or global compile, for such case, `LambdaEditorInner`
         * receives a new lambda editor state, but since React is smart about redrawing the DOM, it will not recreate the instance
         * of `monaco-editor` (see the useEffect() block), as such, the editor is using a stale state. That is definitely a bug;
         * and to demonstrate, we can try the following sequence of actions:
         *
         * 1. Type something that parses in the lambda editor
         * 2. Wait till the parse call finishes, hit F10 (trigger state update)
         * 3. Type something to cause parser error
         * 4. We will see that nothing happens. If we inspect network call, we will see a call returns with parsing error, but
         *    the editor is refering to the old state, hence no reporting
         *
         * As such, the most appropriate resolution is to intentionally force remount of lambda editor when user perform a state
         * refresh operations. To do this, we use React `key` field with UUID bound to the state, as the state is recreated, the UUID
         * changes and the editor is recreated. However, this alone is not enough because we use `useMemo` for the debounced
         * transform function, which relies on another value other than the state (i.e. `disabled` flag), the same problem happens
         * as the function goes stale if `disabled` flag changes value. For that, see the implementation trick below (involving refs and disposer)
         *
         * So technically, we don't need to do the force-remount using `key`, but to be cleaner, we prevent other poential bugs, we do it anyway
         * to reset everything.
         */
        key={lambdaEditorState.uuid}
        className={className}
        inline={true}
        disabled={disabled}
        lambdaEditorState={lambdaEditorState}
        transformStringToLambda={debouncedTransformStringToLambda}
        expectedType={expectedType}
        matchedExpectedType={matchedExpectedType}
        onExpectedTypeLabelSelect={onExpectedTypeLabelSelect}
        forceBackdrop={forceBackdrop}
        disableExpansion={disableExpansion}
        disablePopUp={disablePopUp}
        autoFocus={autoFocus}
        openInPopUp={openInPopUp}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
        hideErrorBar={hideErrorBar}
        forceExpansion={
          disableExpansion !== undefined
            ? !disableExpansion && forceExpansion
            : forceExpansion
        }
      />
    );
  },
);

export const LambdaEditor = observer((props: LambdaEditorBaseProps) => {
  const {
    className,
    lambdaEditorState,
    disabled,
    forceBackdrop,
    autoFocus,
    onEditorFocus,
  } = props;
  const debouncedTransformStringToLambda = useMemo(
    () =>
      disabled
        ? null
        : debounce(
            () => lambdaEditorState.convertLambdaGrammarStringToObject(),
            1000,
          ),
    [lambdaEditorState, disabled],
  );
  return (
    <LambdaEditor_Inner
      key={lambdaEditorState.uuid}
      className={className}
      disabled={disabled}
      lambdaEditorState={lambdaEditorState}
      transformStringToLambda={debouncedTransformStringToLambda}
      forceBackdrop={forceBackdrop}
      autoFocus={autoFocus}
      onEditorFocus={onEditorFocus}
      disableExpansion={true}
      forceExpansion={true}
      disablePopUp={true}
      hideErrorBar={true}
    />
  );
});
