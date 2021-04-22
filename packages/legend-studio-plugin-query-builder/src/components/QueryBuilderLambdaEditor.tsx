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

import { useEffect } from 'react';
import Dialog from '@material-ui/core/Dialog';
import { observer } from 'mobx-react-lite';
import { clsx } from '@finos/legend-studio-components';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryTextEditorMode } from '../stores/QueryTextEditorState';
import {
  useApplicationStore,
  LambdaEditor,
  TextInputEditor,
  EDITOR_LANGUAGE,
} from '@finos/legend-studio';

export const QueryBuilderLambdaEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const queryTextEditorState = queryBuilderState.queryTextEditorState;
    const close = (): Promise<void> =>
      queryBuilderState.queryTextEditorState.closeModal();
    const mode = queryTextEditorState.mode;
    useEffect(() => {
      queryTextEditorState
        .convertLambdaObjectToGrammarString(true)
        .catch(applicationStore.alertIllegalUnhandledError);
    }, [applicationStore, queryTextEditorState]);

    return (
      <Dialog
        open={Boolean(mode)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal query-builder-text-mode__modal">
          <div className="modal__header">
            <div className="modal__title">Query </div>
          </div>
          <div className="modal__body">
            <div
              className={clsx('query-builder-text-mode__modal__content', {
                backdrop__element: Boolean(queryTextEditorState.parserError),
              })}
            >
              {mode === QueryTextEditorMode.TEXT && (
                <LambdaEditor
                  className={'query-builder-text-mode__lambda-editor'}
                  disabled={queryTextEditorState.isConvertingLambdaToString}
                  lambdaEditorState={queryTextEditorState}
                  forceBackdrop={false}
                  forceExpansion={true}
                  useBaseTextEditorSettings={true}
                />
              )}
              {mode === QueryTextEditorMode.JSON && (
                <div className="panel__content mapping-execution-panel__json-editor">
                  <TextInputEditor
                    language={EDITOR_LANGUAGE.JSON}
                    inputValue={queryTextEditorState.lambdaJson}
                    isReadOnly={true}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="modal__footer">
            <button
              className="btn query-builder-text-mode__modal__close-btn"
              onClick={close}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);
