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

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IRange,
  type Token,
  type IDisposable,
} from 'monaco-editor';
import type {
  FileEditorRenameConceptState,
  FileEditorState,
} from '../../../stores/FileEditorState.js';
import {
  EDITOR_LANGUAGE,
  EDITOR_THEME,
  getInlineSnippetSuggestions,
  getParserElementSnippetSuggestions,
  getParserKeywordSuggestions,
  isTokenOneOf,
  PURE_GRAMMAR_TOKEN,
  useApplicationStore,
  useCommands,
} from '@finos/legend-application';
import {
  clsx,
  Dialog,
  getBaseTextEditorOptions,
  moveCursorToPosition,
  useResizeDetector,
  WordWrapIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  collectExtraInlineSnippetSuggestions,
  collectParserElementSnippetSuggestions,
  collectParserKeywordSuggestions,
  getArrowFunctionSuggestions,
  getAttributeSuggestions,
  getCastingClassSuggestions,
  getConstructorClassSuggestions,
  getCopyrightHeaderSuggestions,
  getIdentifierSuggestions,
  getIncompletePathSuggestions,
  getVariableSuggestions,
} from '../../../stores/PureFileEditorUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { FileCoordinate } from '../../../server/models/File.js';
import { LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY } from '../../../stores/LegendPureIDECommand.js';
import { GoToLinePrompt } from './GenericFileEditor.js';

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_][a-zA-Z0-9_$]*/;

const RenameConceptPrompt = observer(
  (props: { renameConceptState: FileEditorRenameConceptState }) => {
    const { renameConceptState } = props;
    const applicationStore = useApplicationStore();
    const fileEditorState = renameConceptState.fileEditorState;
    const conceptName = renameConceptState.concept.pureName;
    const [value, setValue] = useState(conceptName);
    const inputRef = useRef<HTMLInputElement>(null);

    // validation
    const isValidValue = Boolean(value.match(IDENTIFIER_PATTERN));
    const isSameValue = conceptName === value;
    const error = !isValidValue ? 'Invalid path' : undefined;

    // actions
    const closeModal = (): void => {
      flowResult(fileEditorState.setConceptToRenameState(undefined)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const onValueChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => setValue(event.target.value);
    const rename = (
      event: React.FormEvent<HTMLFormElement | HTMLButtonElement>,
    ): void => {
      event.preventDefault();
      if (isSameValue) {
        return;
      }
      fileEditorState
        .renameConcept(value)
        .catch(applicationStore.alertUnhandledError)
        .finally(() => closeModal());
    };
    const handleEnter = (): void => inputRef.current?.focus();

    return (
      <Dialog
        open={true}
        onClose={closeModal}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{ container: 'command-modal__container' }}
        PaperProps={{ classes: { root: 'command-modal__inner-container' } }}
      >
        <div className="modal modal--dark command-modal">
          <div className="modal__title">Rename concept</div>
          <div className="command-modal__content">
            <form className="command-modal__content__form" onSubmit={rename}>
              <div className="input-group command-modal__content__input">
                <input
                  ref={inputRef}
                  className="input input--dark"
                  onChange={onValueChange}
                  value={value}
                  spellCheck={false}
                />
                {error && (
                  <div className="input-group__error-message">{error}</div>
                )}
              </div>
            </form>
            <button
              className="command-modal__content__submit-btn btn--dark"
              disabled={Boolean(error)}
              onClick={rename}
            >
              Rename
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

export const PureFileEditor = observer(
  (props: { editorState: FileEditorState }) => {
    const { editorState } = props;
    const definitionProviderDisposer = useRef<IDisposable | undefined>(
      undefined,
    );
    const pureConstructSuggestionProviderDisposer = useRef<
      IDisposable | undefined
    >(undefined);
    const pureIdentifierSuggestionProviderDisposer = useRef<
      IDisposable | undefined
    >(undefined);
    const textInputRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const newEditor = monacoEditorAPI.create(element, {
          ...getBaseTextEditorOptions(),
          language: EDITOR_LANGUAGE.PURE,
          theme: EDITOR_THEME.LEGEND,
          wordWrap: editorState.textEditorState.wrapText ? 'on' : 'off',
          contextmenu: true,
          // NOTE: since things like context-menus, tooltips are mounted into Shadow DOM
          // by default, we can't override their CSS by design, we need to disable Shadow DOM
          // to style them to our needs
          // See https://github.com/microsoft/monaco-editor/issues/2396
          // See https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
          useShadowDOM: false,
        });
        // NOTE: (hacky) hijack the editor service so we can alternate the behavior of goto definition
        // since we cannot really override the editor service anymore, but must provide a full editor service
        // implementation in place, which is not practical for now
        // See https://github.com/microsoft/monaco-editor/issues/852
        // See https://github.com/microsoft/monaco-editor/issues/2000#issuecomment-649622966
        (
          newEditor as monacoEditorAPI.IEditorOverrideServices
        )._codeEditorService.openCodeEditor = async () => {
          const currentPosition = newEditor.getPosition();
          if (currentPosition) {
            flowResult(
              editorStore.executeNavigation(
                new FileCoordinate(
                  editorState.filePath,
                  currentPosition.lineNumber,
                  currentPosition.column,
                ),
              ),
            ).catch(applicationStore.alertUnhandledError);
          }
        };
        // NOTE: with the way we create suggestion tokens, there's a problem
        // where for the definition coming from the same URI, the goto-definition
        // action will by default just go to the token, i.e. do nothing in our case
        // as such, we have to override `gotoLocation.alternativeDefinitionCommand`
        // in order for `editorService.openCodeEditor` to be called
        // See https://github.com/microsoft/vscode/issues/110060
        // See https://github.com/microsoft/vscode/issues/107841
        newEditor.updateOptions({
          gotoLocation: {
            multiple: 'goto',
            multipleDefinitions: 'goto',
            alternativeDefinitionCommand: 'DUMMY',
          },
        });

        // NOTE: we need to find a way to remove some items in context-menu
        // but currently there's no API exposed by monaco-editor to do so
        // hence, we have to use this hack where we will hijack the mounted context-menu
        // and remove undesired DOM nodes
        // See https://github.com/microsoft/monaco-editor/issues/1567
        // However, it's not enough to just do the DOM surgery in `onContextMenu`
        // since at this point, the context menu is not rendered yet, so we have to
        // make use of `useState` and `useEffect` to achieve this goal
        // as `useEffect` is called after DOM rendering occurs
        newEditor.onContextMenu(() => setIsContextMenuOpen(true));
        newEditor.addAction({
          id: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.FIND_USAGES,
          label: 'Find Usages',
          contextMenuGroupId: 'navigation',
          contextMenuOrder: 1000,
          run: function (_editor) {
            const currentPosition = _editor.getPosition();
            if (currentPosition) {
              const coordinate = new FileCoordinate(
                editorState.filePath,
                currentPosition.lineNumber,
                currentPosition.column,
              );
              editorState.findConceptUsages(coordinate);
            }
          },
        });
        newEditor.addAction({
          id: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.REVEAL_CONCEPT_IN_TREE,
          label: 'Reveal Concept',
          contextMenuGroupId: 'navigation',
          contextMenuOrder: 1000,
          run: function (_editor) {
            const currentPosition = _editor.getPosition();
            if (currentPosition) {
              editorStore
                .revealConceptInTree(
                  new FileCoordinate(
                    editorState.filePath,
                    currentPosition.lineNumber,
                    currentPosition.column,
                  ),
                )
                .catch(applicationStore.alertUnhandledError);
            }
          },
        });
        newEditor.addAction({
          id: LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.RENAME_CONCEPT,
          label: 'Rename',
          contextMenuGroupId: 'navigation',
          contextMenuOrder: 1000,
          run: function (_editor) {
            const currentPosition = _editor.getPosition();
            if (currentPosition) {
              const currentWord =
                editorState.textEditorState.model.getWordAtPosition(
                  currentPosition,
                );
              if (!currentWord) {
                return;
              }
              const coordinate = new FileCoordinate(
                editorState.filePath,
                currentPosition.lineNumber,
                currentPosition.column,
              );
              flowResult(editorState.setConceptToRenameState(coordinate)).catch(
                editorStore.applicationStore.alertUnhandledError,
              );
            }
          },
        });

        newEditor.onDidChangeModelContent(() => {
          const currentVal = newEditor.getValue();
          if (currentVal !== editorState.file.content) {
            // the assertion above is to ensure we don't accidentally clear error on initialization of the editor
            editorState.clearError(); // clear error on content change/typing
          }
          editorState.file.setContent(currentVal);
        });
        // manual trigger to support cursor observability
        newEditor.onDidChangeCursorPosition(() => {
          editorState.textEditorState.notifyCursorObserver();
        });
        newEditor.onDidChangeCursorSelection(() => {
          editorState.textEditorState.notifyCursorObserver();
        });

        // Restore the editor model and view state
        newEditor.setModel(editorState.textEditorState.model);
        if (editorState.textEditorState.viewState) {
          newEditor.restoreViewState(editorState.textEditorState.viewState);
        }
        newEditor.focus(); // focus on the editor initially
        editorState.textEditorState.setEditor(newEditor);
        setEditor(newEditor);
      }
    }, [editorStore, applicationStore, editorState, editor]);

    definitionProviderDisposer.current?.dispose();
    definitionProviderDisposer.current =
      monacoLanguagesAPI.registerDefinitionProvider(EDITOR_LANGUAGE.PURE, {
        provideDefinition: (model, position) => {
          // NOTE: there is a quirky problem with monaco-editor or our integration with it
          // where sometimes, hovering the mouse on the right half of the last character of a definition token
          // and then hitting Ctrl/Cmd key will not be trigger definition provider. We're not quite sure what
          // to do with that for the time being.
          const lineTokens = monacoEditorAPI.tokenize(
            model.getLineContent(position.lineNumber),
            EDITOR_LANGUAGE.PURE,
          )[0];
          if (!lineTokens) {
            return [];
          }
          let currentToken: Token | undefined = undefined;
          let currentTokenRange: IRange | undefined = undefined;
          for (let i = 1; i < lineTokens.length; ++i) {
            const token = guaranteeNonNullable(lineTokens[i]);
            if (token.offset + 1 > position.column) {
              currentToken = guaranteeNonNullable(lineTokens[i - 1]);
              // this is the selection of text from another file for peeking/preview the definition
              // We can't really do much here since we do goto-definition asynchronously, we will
              // show the token itself
              currentTokenRange = {
                startLineNumber: position.lineNumber,
                startColumn: currentToken.offset + 1,
                endLineNumber: position.lineNumber,
                endColumn: token.offset + 1, // NOTE: seems like this needs to be exclusive
              };
              break;
            }
          }
          if (
            currentToken &&
            currentTokenRange &&
            // NOTE: only allow goto definition for these tokens
            isTokenOneOf(currentToken.type, [
              PURE_GRAMMAR_TOKEN.TYPE,
              PURE_GRAMMAR_TOKEN.VARIABLE,
              PURE_GRAMMAR_TOKEN.PROPERTY,
              PURE_GRAMMAR_TOKEN.PARAMETER,
              PURE_GRAMMAR_TOKEN.IDENTIFIER,
            ])
          ) {
            return [
              {
                uri: editorState.textEditorState.model.uri,
                range: currentTokenRange,
              },
            ];
          }
          return [];
        },
      });

    // suggestions
    pureConstructSuggestionProviderDisposer.current?.dispose();
    pureConstructSuggestionProviderDisposer.current =
      monacoLanguagesAPI.registerCompletionItemProvider(EDITOR_LANGUAGE.PURE, {
        triggerCharacters: ['#', ':', '>', '.', '@', '^', '$'],
        provideCompletionItems: async (model, position, context) => {
          let suggestions: monacoLanguagesAPI.CompletionItem[] = [];

          if (
            context.triggerKind ===
            monacoLanguagesAPI.CompletionTriggerKind.TriggerCharacter
          ) {
            switch (context.triggerCharacter) {
              // parser section header
              case '#': {
                suggestions = suggestions.concat(
                  getParserKeywordSuggestions(
                    position,
                    model,
                    collectParserKeywordSuggestions(),
                  ),
                );
                break;
              }
              // incomplete path (::)
              case ':': {
                suggestions = suggestions.concat(
                  await getIncompletePathSuggestions(
                    position,
                    model,
                    editorStore,
                  ),
                );
                break;
              }
              // arrow function (->)
              // NOTE: we can't really do type matching on document being edited
              // since in order to get the semantics of these token, we need the
              // currently typed text to compile, but that's not always possible
              // especially mid typing an expression sequence
              case '>': {
                suggestions = suggestions.concat(
                  await getArrowFunctionSuggestions(
                    position,
                    model,
                    editorStore,
                  ),
                );
                break;
              }
              // calling property, attribute, enum value, tag, stereotype, etc.
              // NOTE: we can't really do type matching on document being edited
              // since in order to get the semantics of these token, we need the
              // currently typed text to compile, but that's not always possible
              // especially mid typing an expression sequence
              case '.': {
                suggestions = suggestions.concat(
                  await getAttributeSuggestions(position, model, editorStore),
                );
                break;
              }
              // constructing a new class instance
              case '^': {
                suggestions = suggestions.concat(
                  await getConstructorClassSuggestions(
                    position,
                    model,
                    editorStore,
                  ),
                );
                break;
              }
              // casting to a class
              case '@': {
                suggestions = suggestions.concat(
                  await getCastingClassSuggestions(
                    position,
                    model,
                    editorStore,
                  ),
                );
                break;
              }
              // variables
              case '$': {
                suggestions = suggestions.concat(
                  await getVariableSuggestions(
                    position,
                    model,
                    editorState.filePath,
                    editorStore,
                  ),
                );
                break;
              }
              default:
                break;
            }
          }

          return { suggestions };
        },
      });

    pureIdentifierSuggestionProviderDisposer.current?.dispose();
    pureIdentifierSuggestionProviderDisposer.current =
      monacoLanguagesAPI.registerCompletionItemProvider(EDITOR_LANGUAGE.PURE, {
        triggerCharacters: [],
        provideCompletionItems: async (model, position, context) => {
          let suggestions: monacoLanguagesAPI.CompletionItem[] = [];

          if (
            context.triggerKind ===
            monacoLanguagesAPI.CompletionTriggerKind.Invoke
          ) {
            // copyright header
            suggestions = suggestions.concat(getCopyrightHeaderSuggestions());

            // suggestions for parser element snippets
            suggestions = suggestions.concat(
              getParserElementSnippetSuggestions(
                position,
                model,
                (parserName: string) =>
                  collectParserElementSnippetSuggestions(parserName),
              ),
            );

            // code snippet suggestions
            suggestions = suggestions.concat(
              getInlineSnippetSuggestions(
                position,
                model,
                collectExtraInlineSnippetSuggestions(),
              ),
            );

            // identifier suggestions (fetched asynchronously)
            suggestions = suggestions.concat(
              await getIdentifierSuggestions(position, model, editorStore),
            );
          }

          return { suggestions };
        },
      });

    useCommands(editorState);

    useEffect(() => {
      // NOTE: we have tried to remove the DOM node, but since the context-menu height is computed
      // this causes a problem with the UI, so we just can disable the item until an official API
      // is supported and we can removed this hack
      // See https://github.com/microsoft/monaco-editor/issues/1567
      if (isContextMenuOpen) {
        const contextMenuNode = document.querySelector(
          '.file-editor .monaco-menu',
        );
        if (contextMenuNode) {
          const MENU_ITEMS_TO_DISABLE = ['Peek'];
          Array.from(
            document.querySelectorAll(
              '.file-editor .monaco-menu .action-label',
            ),
          )
            .filter((element) =>
              MENU_ITEMS_TO_DISABLE.includes(element.innerHTML),
            )
            .forEach((element) => {
              const menuItem = element.parentElement?.parentElement;
              if (menuItem) {
                menuItem.classList.add('disabled');
                menuItem.style.opacity = '0.3';
                menuItem.style.pointerEvents = 'none';
              }
            });
        }
        setIsContextMenuOpen(false);
      }
    }, [isContextMenuOpen]);

    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    useEffect(() => {
      if (editor) {
        if (editorState.textEditorState.forcedCursorPosition) {
          moveCursorToPosition(
            editor,
            editorState.textEditorState.forcedCursorPosition,
          );
          editorState.textEditorState.setForcedCursorPosition(undefined);
        }
      }
    }, [editor, editorState, editorState.textEditorState.forcedCursorPosition]);

    // clean up
    useEffect(
      () => (): void => {
        if (editor) {
          // persist editor view state (cursor, scroll, etc.) to restore on re-open
          editorState.textEditorState.setViewState(
            editor.saveViewState() ?? undefined,
          );
          // NOTE: dispose the editor to prevent potential memory-leak
          editor.dispose();
        }

        definitionProviderDisposer.current?.dispose();

        pureConstructSuggestionProviderDisposer.current?.dispose();
        pureIdentifierSuggestionProviderDisposer.current?.dispose();
      },
      [editorState, editor],
    );

    return (
      <div className="panel edit-panel file-editor">
        <div className="panel__header file-editor__header">
          <div className="file-editor__header__actions">
            <button
              className={clsx('file-editor__header__action', {
                'file-editor__header__action--active':
                  editorState.textEditorState.wrapText,
              })}
              tabIndex={-1}
              onClick={(): void =>
                editorState.textEditorState.setWrapText(
                  !editorState.textEditorState.wrapText,
                )
              }
              title="Toggle Text Wrap"
            >
              <WordWrapIcon className="file-editor__icon--text-wrap" />
            </button>
            {editorState.renameConceptState && (
              <RenameConceptPrompt
                renameConceptState={editorState.renameConceptState}
              />
            )}
            {editorState.showGoToLinePrompt && (
              <GoToLinePrompt fileEditorState={editorState} />
            )}
          </div>
        </div>
        <div className="panel__content file-editor__content">
          <div ref={ref} className="text-editor__container">
            <div className="text-editor__body" ref={textInputRef} />
          </div>
        </div>
      </div>
    );
  },
);
