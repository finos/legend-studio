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
import type { IDisposable } from 'monaco-editor';
import { editor as monacoEditorAPI, KeyCode } from 'monaco-editor';
import { observer } from 'mobx-react-lite';
import {
  setErrorMarkers,
  disposeEditor,
  disableEditorHotKeys,
  baseTextEditorSettings,
} from '../../utils/TextEditorUtil';
import { useEditorStore } from '../../stores/EditorStore';
import { useResizeDetector } from 'react-resize-detector';
import {
  TAB_SIZE,
  EDITOR_THEME,
  EDITOR_LANGUAGE,
} from '../../stores/EditorConfig';
import { clsx } from '@finos/legend-studio-components';
import { MdMoreVert } from 'react-icons/md';
import { FaLongArrowAltUp } from 'react-icons/fa';
import type { LambdaEditorState } from '../../stores/editor-state/element-editor-state/LambdaEditorState';
import type { DebouncedFunc } from '@finos/legend-studio-shared';
import { debounce } from '@finos/legend-studio-shared';
import { CORE_TEST_ID } from '../../const';
import { useApplicationStore } from '../../stores/ApplicationStore';
import type { EngineError } from '../../models/metamodels/pure/action/EngineError';
import { ParserError } from '../../models/metamodels/pure/action/EngineError';
import type { Type } from '../../models/metamodels/pure/model/packageableElements/domain/Type';
import { flowResult } from 'mobx';

const LambdaErrorFeedback: React.FC<{
  error?: EngineError;
  discardChanges: () => Promise<void>;
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
          <div className="lambda-editor__error-feedback__parsing-error__message">
            fix error or discard changes to leave
          </div>
        </div>
      )}
    </div>
  );
};

const LambdaEditorInner = observer(
  (props: {
    className?: string;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    transformStringToLambda: DebouncedFunc<() => Promise<void>> | undefined;
    expectedType?: Type;
    matchedExpectedType?: () => boolean;
    onExpectedTypeLabelSelect?: () => void;
    forceBackdrop: boolean;
    forceExpansion?: boolean;
    useBaseTextEditorSettings?: boolean;
    hideErrorBar?: boolean;
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
      forceExpansion,
      useBaseTextEditorSettings,
      hideErrorBar,
    } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const onDidChangeModelContentEventDisposer =
      useRef<IDisposable | undefined>(undefined);
    const onKeyDownEventDisposer = useRef<IDisposable | undefined>(undefined);
    const value = lambdaEditorState.lambdaString;
    const parserError = lambdaEditorState.parserError;
    const compilationError = lambdaEditorState.compilationError;
    const selectTypeLabel = (): void => onExpectedTypeLabelSelect?.();
    const [isExpanded, setExpanded] = useState(Boolean(forceExpansion));
    const [editor, setEditor] =
      useState<monacoEditorAPI.IStandaloneCodeEditor | undefined>();
    const textInput = useRef<HTMLDivElement>(null);

    const transformLambdaToString = (pretty: boolean): Promise<void> => {
      transformStringToLambda?.cancel();
      return lambdaEditorState
        .convertLambdaObjectToGrammarString(pretty)
        .catch(applicationStore.alertIllegalUnhandledError);
    };
    const discardChanges = applicationStore.guaranteeSafeAction(() =>
      transformLambdaToString(isExpanded),
    );
    const toggleExpandedMode = (): void => {
      if (!forceExpansion && !parserError) {
        transformLambdaToString(!isExpanded).catch(
          applicationStore.alertIllegalUnhandledError,
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
      if (!editor && textInput.current) {
        const element = textInput.current;
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
          theme: EDITOR_THEME.STUDIO,
          ...lambdaEditorOptions,
        });
        disableEditorHotKeys(_editor);
        setEditor(_editor);
      }
    }, [editor, useBaseTextEditorSettings]);

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
          const currentValue = editor.getValue();
          editor.setValue(currentValue);
        }
      }
    }, [editor, isExpanded]);

    // set backdrop to force user to fix parser error when it happens
    useEffect(() => {
      if (parserError) {
        editorStore.setBackdrop(true);
      } else if (!forceBackdrop) {
        // make sure the backdrop is no longer `needed` for blocking by another parser error before hiding it
        editorStore.setBackdrop(false);
      }
    }, [editorStore, parserError, forceBackdrop]);

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
          const currentVal = editor.getValue();
          /**
           * Avoid unecessary setting of lambda string. Also, this prevents clearing the non-parser error on first render.
           * Since this method is guaranteed to be called one time during the first rendering when we first set the
           * value for the lambda editor, we do not want to clear any existing non-parser error in case it is set by methods
           * like reveal error in each editor
           */
          if (currentVal !== lambdaEditorState.lambdaString) {
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
          transformStringToLambda?.()?.catch(
            applicationStore.alertIllegalUnhandledError,
          );
        });

      // set hotkeys (before calling the action, finish parsing the current text value)
      onKeyDownEventDisposer.current?.dispose(); // dispose to avoid trigger multiple compilation/generation/etc.
      /**
       * NOTE: We can use `setCommand` here but that does not expose the event so we cannot `stopPropagation`, but we need to
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
        const applicableLambdaEditorHotkeyConfigurations =
          editorStore.applicationStore.pluginManager
            .getEditorPlugins()
            .flatMap(
              (plugin) =>
                plugin.getExtraLambdaEditorHotkeyConfigurations?.() ?? [],
            )
            .filter((configuration) => configuration.eventMatcher(event));
        const enableGlobalAction =
          !applicableLambdaEditorHotkeyConfigurations.length ||
          applicableLambdaEditorHotkeyConfigurations.every(
            (configuration) => !configuration.skipGlobalAction,
          );
        if (applicableLambdaEditorHotkeyConfigurations.length) {
          applicableLambdaEditorHotkeyConfigurations.forEach(
            (configuration) => {
              event.preventDefault();
              event.stopPropagation();
              transformStringToLambda?.cancel();
              configuration.action(editorStore, lambdaEditorState, !disabled);
            },
          );
        }
        if (enableGlobalAction) {
          if (event.keyCode === KeyCode.F8) {
            event.preventDefault();
            event.stopPropagation();
            transformStringToLambda?.cancel();
            editorStore.graphState
              .checkLambdaParsingError(lambdaEditorState, !disabled, () =>
                editorStore.toggleTextMode(),
              )
              .catch(applicationStore.alertIllegalUnhandledError);
          } else if (event.keyCode === KeyCode.F9) {
            event.preventDefault();
            event.stopPropagation();
            transformStringToLambda?.cancel();
            editorStore.graphState
              .checkLambdaParsingError(lambdaEditorState, !disabled, () =>
                flowResult(editorStore.graphState.globalCompileInFormMode()),
              )
              .catch(applicationStore.alertIllegalUnhandledError);
          } else if (event.keyCode === KeyCode.F10) {
            event.preventDefault();
            event.stopPropagation();
            transformStringToLambda?.cancel();
            editorStore.graphState
              .checkLambdaParsingError(lambdaEditorState, !disabled, () =>
                editorStore.graphState.graphGenerationState.globalGenerate(),
              )
              .catch(applicationStore.alertIllegalUnhandledError);
          }
        }
      });

      // Set the text value
      const currentValue = editor.getValue();
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
          setErrorMarkers(editorModel, error.sourceInformation, error.message);
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
            data-testid={CORE_TEST_ID.LAMBDA_EDITOR__EDITOR_INPUT}
            className="lambda-editor__editor__input"
          >
            <div className="text-editor__body" ref={textInput} />
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
                  title={'Toggle highlight expected type'}
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
          {!forceExpansion && (
            <button
              className="lambda-editor__editor__expand-btn"
              onClick={toggleExpandedMode}
              disabled={Boolean(parserError)}
              tabIndex={-1}
              title={'Expand/Collapse'}
            >
              {isExpanded ? <FaLongArrowAltUp /> : <MdMoreVert />}
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

/**
 * This is not strictly meant for lambda. The idea is to create an editor that allows
 * editing _something_ but allows user to edit via text.
 */
export const LambdaEditor = observer(
  (props: {
    className?: string;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    /**
     * TODO: when we pass in these expected type we should match a type as expected type if it's covariance, i.e. it is a subtype of
     * the expected type. Note that we also have to handle that relationship for Primitive type
     * See https://dzone.com/articles/covariance-and-contravariance
     */
    expectedType?: Type;
    matchedExpectedType?: () => boolean;
    onExpectedTypeLabelSelect?: () => void;
    forceBackdrop: boolean;
    forceExpansion?: boolean;
    useBaseTextEditorSettings?: boolean;
    hideErrorBar?: boolean;
  }) => {
    const {
      className,
      lambdaEditorState,
      disabled,
      forceBackdrop,
      expectedType,
      onExpectedTypeLabelSelect,
      matchedExpectedType,
      forceExpansion,
      useBaseTextEditorSettings,
      hideErrorBar,
    } = props;
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

    return (
      <LambdaEditorInner
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
        forceExpansion={forceExpansion}
        useBaseTextEditorSettings={useBaseTextEditorSettings}
        hideErrorBar={hideErrorBar}
      />
    );
  },
);
