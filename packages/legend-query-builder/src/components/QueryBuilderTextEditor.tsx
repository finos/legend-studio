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
import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalFooterStatus,
  ModalHeader,
  PanelLoadingIndicator,
  RefreshIcon,
} from '@finos/legend-art';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { LambdaEditor } from './shared/LambdaEditor.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';

export const QueryBuilderTextEditor = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const queryTextEditorState = queryBuilderState.textEditorState;
    const isReadOnly = queryTextEditorState.isReadOnly;
    const close = applicationStore.guardUnhandledError(() =>
      flowResult(queryBuilderState.textEditorState.closeModal()),
    );
    const discardChanges = (): void => {
      queryBuilderState.textEditorState.setMode(undefined);
      // force close the backdrop just in case changes are discarded when there are grammar issues
      applicationStore.layoutService.setShowBackdrop(false);
    };
    const mode = queryTextEditorState.mode;
    const isEditingPure =
      mode === QueryBuilderTextEditorMode.TEXT && !isReadOnly;
    const title =
      mode === QueryBuilderTextEditorMode.TEXT
        ? isReadOnly
          ? 'Pure Query'
          : 'Edit Pure Query'
        : 'Pure Query Protocol';

    const copyExpression = (): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(queryTextEditorState.text ?? '')
        .then(() =>
          applicationStore.notificationService.notifySuccess(
            'Query Copied',
            undefined,
            2500,
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };
    useEffect(() => {
      flowResult(
        queryTextEditorState.convertLambdaObjectToGrammarString({
          pretty: true,
        }),
      ).catch(applicationStore.alertUnhandledError);
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
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className={clsx('editor-modal query-builder-text-mode__modal', {
            'query-builder-text-mode__modal--has-error': Boolean(
              queryTextEditorState.parserError,
            ),
          })}
        >
          <ModalHeader>
            <div className="modal__title">{title}</div>
            {queryTextEditorState.parserError && (
              <div className="modal__title__error-badge">
                Failed to parse query
              </div>
            )}
          </ModalHeader>
          <PanelLoadingIndicator
            isLoading={
              queryBuilderState.textEditorState.closingQueryState.isInProgress
            }
          />
          <ModalBody>
            <div
              className={clsx('query-builder-text-mode__modal__content', {
                backdrop__element: Boolean(queryTextEditorState.parserError),
              })}
            >
              {mode === QueryBuilderTextEditorMode.TEXT &&
                (isReadOnly ? (
                  <CodeEditor
                    language={CODE_EDITOR_LANGUAGE.PURE}
                    inputValue={queryTextEditorState.fullLambdaString}
                    isReadOnly={true}
                  />
                ) : (
                  <LambdaEditor
                    className="query-builder-text-mode__lambda-editor"
                    disabled={queryTextEditorState.isConvertingLambdaToString}
                    lambdaEditorState={queryTextEditorState}
                    forceBackdrop={false}
                    autoFocus={true}
                  />
                ))}
              {mode === QueryBuilderTextEditorMode.JSON && (
                <CodeEditor
                  language={CODE_EDITOR_LANGUAGE.JSON}
                  inputValue={queryTextEditorState.readOnlylambdaJson}
                  isReadOnly={true}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            {queryBuilderState.textEditorState.closingQueryState
              .isInProgress && (
              <ModalFooterStatus>Closing Query...</ModalFooterStatus>
            )}
            {queryBuilderState.queryCompileState.isInProgress && (
              <ModalFooterStatus>
                <div className="loading-icon__container--spinning">
                  <RefreshIcon />
                </div>
                Compiling Query...
              </ModalFooterStatus>
            )}
            {isEditingPure ? (
              <ModalFooterButton
                className="btn--caution"
                onClick={discardChanges}
                text="Discard Changes"
              />
            ) : (
              <ModalFooterButton
                formatText={false}
                onClick={copyExpression}
                text="Copy to Clipboard"
              />
            )}
            <ModalFooterButton
              onClick={close}
              disabled={
                Boolean(queryTextEditorState.parserError) ||
                queryBuilderState.textEditorState.closingQueryState.isInProgress
              }
              type="secondary"
            >
              {queryBuilderState.textEditorState.closingQueryState
                .isInProgress ? (
                <>
                  <div className="loading-icon__container--spinning">
                    <RefreshIcon />
                    Closing
                  </div>
                </>
              ) : (
                <> Close </>
              )}
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
