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

import { observer } from 'mobx-react-lite';
import { DataCubeIcon } from '@finos/legend-art';
import { useEffect } from 'react';
import { useREPLStore } from '../../REPLStoreProvider.js';

// const DataCubeCodeEditor = observer(() => {
//   const replStore = useREPLStore();
//   const applicationStore = replStore.applicationStore;
//   const dataCubeState = replStore.dataCubeState;
//   const queryEditorState = dataCubeState.editor.codePanel.queryEditorState;
//   const onDidChangeModelContentEventDisposer = useRef<IDisposable | undefined>(
//     undefined,
//   );
//   const value = normalizeLineEnding(queryEditorState.query);
//   const parserError = queryEditorState.parserError;
//   const [editor, setEditor] = useState<
//     monacoEditorAPI.IStandaloneCodeEditor | undefined
//   >();
//   const textInputRef = useRef<HTMLDivElement>(null);
//   const autoCompleteSuggestionProviderDisposer = useRef<
//     IDisposable | undefined
//   >(undefined);

//   const debouncedParseQuery = useMemo(
//     () =>
//       debounce((): void => {
//         flowResult(dataCubeState.editor.codePanel.parseQuery()).catch(
//           replStore.applicationStore.logUnhandledError,
//         );
//       }, 1000),
//     [dataCubeState, replStore.applicationStore.logUnhandledError],
//   );

//   if (editor) {
//     onDidChangeModelContentEventDisposer.current?.dispose();
//     onDidChangeModelContentEventDisposer.current =
//       editor.onDidChangeModelContent(() => {
//         const currentVal = getCodeEditorValue(editor);
//         if (currentVal !== value) {
//           queryEditorState.setQuery(currentVal);
//           debouncedParseQuery.cancel();
//           debouncedParseQuery();
//         }
//       });

//     // Set the text value
//     const currentValue = getCodeEditorValue(editor);
//     const editorModel = editor.getModel();

//     if (currentValue !== value) {
//       editor.setValue(value);
//     }

//     // auto complete suggestions
//     autoCompleteSuggestionProviderDisposer.current?.dispose();
//     autoCompleteSuggestionProviderDisposer.current =
//       monacoLanguagesAPI.registerCompletionItemProvider(
//         CODE_EDITOR_LANGUAGE.PURE,
//         {
//           triggerCharacters: ['>', '.', '$', '~'],
//           provideCompletionItems: async (model, position, context) => {
//             // TODO: @akphi - do this later when we support typeahead for extended columns, etc.
//             // const suggestions: monacoLanguagesAPI.CompletionItem[] =
//             //   await dataCubeState.getTypeaheadResults(position, model);
//             const suggestions: monacoLanguagesAPI.CompletionItem[] = [];
//             return { suggestions };
//           },
//         },
//       );

//     // Set the errors
//     if (editorModel) {
//       editorModel.updateOptions({ tabSize: DEFAULT_TAB_SIZE });
//       const error = parserError;
//       if (error?.sourceInformation) {
//         setErrorMarkers(editorModel, [
//           {
//             message: error.message,
//             startLineNumber: error.sourceInformation.startLine,
//             startColumn: error.sourceInformation.startColumn,
//             endLineNumber: error.sourceInformation.endLine,
//             endColumn: error.sourceInformation.endColumn,
//           },
//         ]);
//       } else {
//         clearMarkers();
//       }
//     }
//   }

//   useEffect(() => {
//     if (!editor && textInputRef.current) {
//       const element = textInputRef.current;
//       const _editor = monacoEditorAPI.create(element, {
//         ...getBaseCodeEditorOptions(),
//         language: CODE_EDITOR_LANGUAGE.PURE,
//         theme: applicationStore.layoutService
//           .TEMPORARY__isLightColorThemeEnabled
//           ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
//           : CODE_EDITOR_THEME.DEFAULT_DARK,
//       });
//       setEditor(_editor);
//     }
//   }, [
//     applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled,
//     editor,
//   ]);

//   // dispose editor
//   useEffect(
//     () => (): void => {
//       if (editor) {
//         disposeCodeEditor(editor);

//         onDidChangeModelContentEventDisposer.current?.dispose();
//       }
//     },
//     [editor],
//   );

//   return (
//     <div className={clsx('repl__query__content__editor__content')}>
//       <div className="code-editor__body" ref={textInputRef} />
//     </div>
//   );
// });

export const DataCubeEditorCodePanel = observer(() => {
  const replStore = useREPLStore();
  const panel = replStore.dataCube.editor.sorts;
  // const executeLambda = (): void => {
  //   // TODO: @akphi
  //   // flowResult(dataCubeState.executeLambda()).catch(
  //   //   editorStore.applicationStore.logUnhandledError,
  //   // );
  // };

  useEffect(() => {}, [panel]); // TODO: @akphi - remove this dummy useEffect

  return (
    <div className="h-full w-full select-none p-2">
      <div className="flex h-6">
        <div className="flex h-6 items-center text-xl font-medium">
          <DataCubeIcon.Code />
        </div>
        <div className="ml-1 flex h-6 items-center text-xl font-medium">
          Code
        </div>
      </div>
      <div className="flex h-[calc(100%_-_24px)] w-full"></div>
    </div>
    // <div className="repl__content__query">
    //   <div className="repl__query">
    //     <div className="repl__query__editor">
    //       <div className="repl__query__header">
    //         <div className="repl__query__label">Curent Query</div>
    //         <div className="repl__query__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
    //           <button
    //             className="btn__dropdown-combo__label"
    //             onClick={executeLambda}
    //             tabIndex={-1}
    //           >
    //             <PlayIcon className="btn__dropdown-combo__label__icon" />
    //             <div className="btn__dropdown-combo__label__title">
    //               Run Query
    //             </div>
    //           </button>
    //         </div>
    //       </div>
    //       <div className="repl__query__content">
    //         <DataCubeCodeEditor />
    //       </div>
    //     </div>
    //   </div>
    //   {/* {dataCubeState.editor.codeEditorState.currentSubQuery !== undefined && (
    //     <div className="repl__query">
    //       <div className="repl__query__editor">
    //         <div className="repl__query__header">
    //           <div className="repl__query__label__sub__query">
    //             Current Row Group Sub Query
    //           </div>
    //           <div className="repl__query__label__sub__query__read--only">
    //             Read Only
    //           </div>
    //         </div>
    //         <div className="repl__query__content">
    //           <CodeEditor
    //             lightTheme={
    //               isLightTheme
    //                 ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_HC_LIGHT
    //                 : CODE_EDITOR_THEME.BUILT_IN__VSCODE_HC_BLACK
    //             }
    //             language={CODE_EDITOR_LANGUAGE.PURE}
    //             isReadOnly={true}
    //             inputValue={
    //               dataCubeState.editor.codeEditorState.currentSubQuery
    //             }
    //             hideActionBar={true}
    //             hidePadding={true}
    //           />
    //         </div>
    //       </div>
    //     </div>
    //   )} */}
    // </div>
  );
});
