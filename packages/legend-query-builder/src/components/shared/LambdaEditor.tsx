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
  type IKeyboardEvent,
} from 'monaco-editor';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  setErrorMarkers,
  disposeEditor,
  disableEditorHotKeys,
  baseTextEditorSettings,
  getEditorValue,
  normalizeLineEnding,
  FilledWindowMaximizeIcon,
  LongArrowAltDownIcon,
  LongArrowAltUpIcon,
  Dialog,
  useResizeDetector,
} from '@finos/legend-art';
import type { LambdaEditorState } from '../../stores/shared/LambdaEditorState.js';
import {
  debounce,
  noop,
  type DebouncedFunc,
  type GeneratorFn,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { ParserError, type EngineError, type Type } from '@finos/legend-graph';
import {
  EDITOR_LANGUAGE,
  EDITOR_THEME,
  TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';

export type LambdaEditorOnKeyDownEventHandler = {
  matcher: (event: IKeyboardEvent) => boolean;
  action: (event: IKeyboardEvent) => void;
};

const LambdaErrorFeedback: React.FC<{
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

const LambdaEditorInline = observer(
  (props: {
    className?: string | undefined;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    transformStringToLambda: DebouncedFunc<() => GeneratorFn<void>> | undefined;
    expectedType?: Type | undefined;
    matchedExpectedType?: (() => boolean) | undefined;
    onExpectedTypeLabelSelect?: (() => void) | undefined;
    useBaseTextEditorSettings?: boolean | undefined;
    hideErrorBar?: boolean | undefined;
    forceBackdrop: boolean;
    disableExpansion?: boolean | undefined;
    forceExpansion?: boolean | undefined;
    disablePopUp?: boolean | undefined;
    backdropSetter?: ((val: boolean) => void) | undefined;
    onKeyDownEventHandlers: LambdaEditorOnKeyDownEventHandler[];
    openInPopUp: () => void;
    onEditorFocusEventHandler?: (() => void) | undefined;
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
      backdropSetter,
      disableExpansion,
      forceExpansion,
      disablePopUp,
      useBaseTextEditorSettings,
      hideErrorBar,
      onKeyDownEventHandlers,
      openInPopUp,
      onEditorFocusEventHandler,
    } = props;
    const applicationStore = useApplicationStore();
    const onDidChangeModelContentEventDisposer = useRef<
      IDisposable | undefined
    >(undefined);
    const onKeyDownEventDisposer = useRef<IDisposable | undefined>(undefined);
    const onDidFocusEditorWidgetDisposer = useRef<IDisposable | undefined>(
      undefined,
    );
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
        lambdaEditorState.convertLambdaObjectToGrammarString(pretty),
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
      }
    };

    const { ref, width, height } = useResizeDetector<HTMLDivElement>();
    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    useEffect(() => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const lambdaEditorOptions: monacoEditorAPI.IStandaloneEditorConstructionOptions =
          useBaseTextEditorSettings
            ? {}
            : {
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
              };
        const _editor = monacoEditorAPI.create(element, {
          ...baseTextEditorSettings,
          language: EDITOR_LANGUAGE.PURE,
          theme: applicationStore.TEMPORARY__isLightThemeEnabled
            ? EDITOR_THEME.TEMPORARY__VSCODE_LIGHT
            : EDITOR_THEME.LEGEND,
          ...lambdaEditorOptions,
        });
        disableEditorHotKeys(_editor);
        setEditor(_editor);
      }
    }, [editor, applicationStore, useBaseTextEditorSettings]);

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
          const currentValue = getEditorValue(editor);
          editor.setValue(currentValue);
        }
      }
    }, [editor, isExpanded]);

    // set backdrop to force user to fix parser error when it happens
    useEffect(() => {
      if (backdropSetter) {
        if (parserError) {
          backdropSetter(true);
        } else if (!forceBackdrop) {
          // make sure the backdrop is no longer `needed` for blocking by another parser error before hiding it
          // NOTE: this has a serious drawback, see the documentation for `forceBackdrop` prop of `LambdaEditor`
          // for better context
          backdropSetter(false);
        }
      }
    }, [parserError, forceBackdrop, backdropSetter]);

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
        editor.onDidChangeModelContent(() => {
          const currentVal = getEditorValue(editor);
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

      // set hotkeys (before calling the action, finish parsing the current text value)
      onKeyDownEventDisposer.current?.dispose(); // dispose to avoid trigger hotkeys multiple times
      /**
       * NOTE: We can use `setCommand` here but that does not expose the event so we cannot `stopPropagation`, and we need to
       * use `stopPropagation` to prevent the event top bubble up to global hotkeys listener.
       * If we really want to use `setCommand` the other approach is to set <HotKeys/> around this lambda editor to override F9
       * perhaps that's the cleaner approach because we use `react-hotkeys` to handle it's business, but there is an on-going
       * issue with <HotKeys/> keybindings are lost when component rerenders and this happen as users type because we call `setValue`
       * See https://github.com/greena13/react-hotkeys/issues/209
       *
       * The main role of this section is to disable `monaco-editor` command and override with global actions, such as generate, compile,
       * toggle text mode, etc. The important thing is before we do so, we would like to finish the parsing of the current string, otherwise,
       * those operations can end up flushing the current state and trashing the user input, which is bad, as such, we make sure the
       * parsing passes before actually calling those global operations.
       */
      onKeyDownEventDisposer.current = editor.onKeyDown((event) => {
        onKeyDownEventHandlers.forEach((handler) => {
          if (handler.matcher(event)) {
            event.preventDefault();
            event.stopPropagation();
            transformStringToLambda?.cancel();
            handler.action(event);
          }
        });
      });

      onDidFocusEditorWidgetDisposer.current?.dispose();
      onDidFocusEditorWidgetDisposer.current = editor.onDidFocusEditorWidget(
        () => {
          onEditorFocusEventHandler?.();
        },
      );

      // Set the text value
      const currentValue = getEditorValue(editor);
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
        editorModel.updateOptions({ tabSize: TAB_SIZE });
        const error = parserError ?? compilationError;
        if (error?.sourceInformation) {
          setErrorMarkers(
            editorModel,
            error.message,
            error.sourceInformation.startLine,
            error.sourceInformation.startColumn,
            error.sourceInformation.endLine,
            error.sourceInformation.endColumn,
          );
        } else {
          monacoEditorAPI.setModelMarkers(editorModel, 'Error', []);
        }
      }
    }

    useEffect(
      () => (): void => {
        if (editor) {
          disposeEditor(editor);
        }
      },
      [editor],
    ); // dispose editor

    return (
      <>
        <div
          className={clsx('lambda-editor', className, {
            'lambda-editor__expanded': isExpanded,
          })}
        >
          <div
            ref={ref}
            data-testid={QUERY_BUILDER_TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT}
            className="lambda-editor__editor__input"
          >
            <div className="text-editor__body" ref={textInputRef} />
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
              disabled={Boolean(parserError)}
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
              disabled={Boolean(parserError)}
              tabIndex={-1}
              title="Open..."
            >
              <FilledWindowMaximizeIcon />
            </button>
          )}
        </div>
        {!hideErrorBar && (
          <LambdaErrorFeedback
            error={parserError ?? compilationError}
            discardChanges={discardChanges}
          />
        )}
      </>
    );
  },
);

const LambdaEditorPopUp = observer(
  (props: {
    className?: string | undefined;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    transformStringToLambda: DebouncedFunc<() => GeneratorFn<void>> | undefined;
    onKeyDownEventHandlers: LambdaEditorOnKeyDownEventHandler[];
    onClose: () => void;
  }) => {
    const {
      className,
      disabled,
      lambdaEditorState,
      transformStringToLambda,
      onKeyDownEventHandlers,
      onClose,
    } = props;
    const applicationStore = useApplicationStore();
    const onKeyDownEventDisposer = useRef<IDisposable | undefined>(undefined);
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
        lambdaEditorState.convertLambdaObjectToGrammarString(pretty),
      ).catch(applicationStore.alertUnhandledError);
    };
    const discardChanges = applicationStore.guardUnhandledError(() =>
      transformLambdaToString(true),
    );

    const { ref, width, height } = useResizeDetector<HTMLDivElement>();
    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    const onEnter = (): void => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const _editor = monacoEditorAPI.create(element, {
          ...baseTextEditorSettings,
          language: EDITOR_LANGUAGE.PURE,
          theme: EDITOR_THEME.LEGEND,
        });
        disableEditorHotKeys(_editor);
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
        editor.onDidChangeModelContent(() => {
          const currentVal = getEditorValue(editor);
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

      // set hotkeys (before calling the action, finish parsing the current text value)
      onKeyDownEventDisposer.current?.dispose(); // dispose to avoid trigger hotkeys multiple times
      /**
       * NOTE: We can use `setCommand` here but that does not expose the event so we cannot `stopPropagation`, and we need to
       * use `stopPropagation` to prevent the event top bubble up to global hotkeys listener.
       * If we really want to use `setCommand` the other approach is to set <HotKeys/> around this lambda editor to override F9
       * perhaps that's the cleaner approach because we use `react-hotkeys` to handle it's business, but there is an on-going
       * issue with <HotKeys/> keybindings are lost when component rerenders and this happen as users type because we call `setValue`
       * See https://github.com/greena13/react-hotkeys/issues/209
       *
       * The main role of this section is to disable `monaco-editor` command and override with global actions, such as generate, compile,
       * toggle text mode, etc. The important thing is before we do so, we would like to finish the parsing of the current string, otherwise,
       * those operations can end up flushing the current state and trashing the user input, which is bad, as such, we make sure the
       * parsing passes before actually calling those global operations.
       */
      onKeyDownEventDisposer.current = editor.onKeyDown((event) => {
        onKeyDownEventHandlers.forEach((handler) => {
          if (handler.matcher(event)) {
            event.preventDefault();
            event.stopPropagation();
            transformStringToLambda?.cancel();
            handler.action(event);
          }
        });
      });

      // Set the text value
      const currentValue = getEditorValue(editor);
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
        editorModel.updateOptions({ tabSize: TAB_SIZE });
        const error = parserError ?? compilationError;
        if (error?.sourceInformation) {
          setErrorMarkers(
            editorModel,
            error.message,
            error.sourceInformation.startLine,
            error.sourceInformation.startColumn,
            error.sourceInformation.endLine,
            error.sourceInformation.endColumn,
          );
        } else {
          monacoEditorAPI.setModelMarkers(editorModel, 'Error', []);
        }
      }
    }

    useEffect(() => {
      flowResult(
        lambdaEditorState.convertLambdaObjectToGrammarString(true),
      ).catch(applicationStore.alertUnhandledError);
    }, [applicationStore, lambdaEditorState]);

    useEffect(
      () => (): void => {
        if (editor) {
          disposeEditor(editor);
        }
      },
      [editor],
    ); // dispose editor

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
        <div
          className={clsx(
            'modal modal--dark editor-modal lambda-editor__popup__modal',
            {
              'lambda-editor__popup__modal--has-error': Boolean(
                lambdaEditorState.parserError,
              ),
            },
          )}
        >
          <div className="modal__header">
            <div className="modal__title">Edit Lambda</div>
            {lambdaEditorState.parserError && (
              <div className="modal__title__error-badge">
                Failed to parse lambda
              </div>
            )}
          </div>
          <div className="modal__body">
            <div className={clsx('lambda-editor__popup__content', className)}>
              <div
                ref={ref}
                data-testid={QUERY_BUILDER_TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT}
                className="lambda-editor__editor__input"
              >
                <div className="text-editor__body" ref={textInputRef} />
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button
              className="btn btn--dark btn--caution"
              onClick={discardChanges}
            >
              Discard changes
            </button>
            <button
              className="btn btn--dark"
              onClick={onClose}
              disabled={Boolean(lambdaEditorState.parserError)}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

/**
 * This is not strictly meant for lambda. The idea is to create an editor that allows
 * editing _something_ but allows user to edit via text.
 */
export const LambdaEditor = observer(
  (props: {
    className?: string | undefined;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    /**
     * TODO: when we pass in these expected type we should match a type as expected type if it's covariance, i.e. it is a subtype of
     * the expected type. Note that we also have to handle that relationship for Primitive type
     * See https://dzone.com/articles/covariance-and-contravariance
     */
    expectedType?: Type | undefined;
    matchedExpectedType?: (() => boolean) | undefined;
    onExpectedTypeLabelSelect?: (() => void) | undefined;
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
     * backdrop mechanism altogether as it's not really a good UX pattern. i.e. quick evaluation makes
     * us believe that this is a good option, user will lose what they type, but the most recent parsable
     * input will still be captured.
     */
    forceBackdrop: boolean;
    /**
     * (de)activator for backdrop that is usually used to block any background interactions
     * while there is a parser error in the editor
     */
    backdropSetter?: ((val: boolean) => void) | undefined;
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
     * To whether or not style inline editor
     */
    useBaseTextEditorSettings?: boolean | undefined;
    /**
     * To whether or not hide parser error bar in inline mode
     */
    hideErrorBar?: boolean | undefined;
    /**
     * Allow adding hotkeys handler to the editor, this is usually used
     * to allow activating global hotkeys while typing in the editor
     */
    onKeyDownEventHandlers?: LambdaEditorOnKeyDownEventHandler[];
    onEditorFocusEventHandler?: (() => void) | undefined;
  }) => {
    const {
      className,
      lambdaEditorState,
      disabled,
      forceBackdrop,
      backdropSetter,
      expectedType,
      onExpectedTypeLabelSelect,
      matchedExpectedType,
      disableExpansion,
      forceExpansion,
      disablePopUp,
      useBaseTextEditorSettings,
      hideErrorBar,
      onKeyDownEventHandlers,
      onEditorFocusEventHandler,
    } = props;
    const [showPopUp, setShowPopUp] = useState(false);
    const openInPopUp = (): void => setShowPopUp(true);
    const closePopUp = (): void => setShowPopUp(false);
    const debouncedTransformStringToLambda = useMemo(
      () =>
        disabled
          ? undefined
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
          <LambdaEditorPopUp
            className={className}
            disabled={disabled}
            lambdaEditorState={lambdaEditorState}
            transformStringToLambda={debouncedTransformStringToLambda}
            onKeyDownEventHandlers={onKeyDownEventHandlers ?? []}
            onClose={closePopUp}
          />
        </>
      );
    }
    return (
      <LambdaEditorInline
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
        disabled={disabled}
        lambdaEditorState={lambdaEditorState}
        transformStringToLambda={debouncedTransformStringToLambda}
        expectedType={expectedType}
        matchedExpectedType={matchedExpectedType}
        onExpectedTypeLabelSelect={onExpectedTypeLabelSelect}
        forceBackdrop={forceBackdrop}
        backdropSetter={backdropSetter}
        disableExpansion={disableExpansion}
        forceExpansion={
          disableExpansion !== undefined
            ? !disableExpansion && forceExpansion
            : forceExpansion
        }
        disablePopUp={disablePopUp}
        useBaseTextEditorSettings={useBaseTextEditorSettings}
        hideErrorBar={hideErrorBar}
        onKeyDownEventHandlers={onKeyDownEventHandlers ?? []}
        openInPopUp={openInPopUp}
        onEditorFocusEventHandler={onEditorFocusEventHandler}
      />
    );
  },
);
