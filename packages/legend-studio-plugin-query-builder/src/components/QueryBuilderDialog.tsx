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

import { useState } from 'react';
import Dialog from '@material-ui/core/Dialog';
import { observer } from 'mobx-react-lite';
import {
  FaTimes,
  FaRegWindowMaximize,
  FaRegWindowRestore,
} from 'react-icons/fa';
import { clsx } from '@finos/legend-studio-components';
import { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryBuilder } from './QueryBuilder';
import { useApplicationStore, useEditorStore } from '@finos/legend-studio';
import { flowResult } from 'mobx';
/**
 * NOTE: Query builder is by right its own mini-app so we have it hosted in a full-screen modal dialog
 * See https://material.io/components/dialogs#full-screen-dialog
 */
export const QueryBuilderDialog = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useEditorStore();
  const queryBuilderState =
    editorStore.getEditorExtensionState(QueryBuilderState);
  const [isMaximized, setIsMaximized] = useState(false);
  const toggleMaximize = (): void => setIsMaximized(!isMaximized);
  const closeQueryBuilder = (): void => {
    flowResult(queryBuilderState.setOpenQueryBuilder(false)).catch(
      applicationStore.alertIllegalUnhandledError,
    );
    queryBuilderState.reset();
  };

  return (
    <Dialog
      open={Boolean(queryBuilderState.openQueryBuilder)}
      onClose={closeQueryBuilder}
      disableBackdropClick={true}
      disableEscapeKeyDown={true}
      classes={{
        root: 'editor-modal__root-container',
        container: 'editor-modal__container',
        paper:
          'editor-modal__content query-builder__dialog__container__content',
      }}
    >
      <div
        className={clsx(
          'modal modal--dark editor-modal query-builder__dialog',
          { 'query-builder__dialog--expanded': isMaximized },
        )}
      >
        <div className="query-builder__dialog__header">
          <div className="query-builder__dialog__header__actions">
            <button
              className="query-builder__dialog__header__action"
              tabIndex={-1}
              onClick={toggleMaximize}
            >
              {isMaximized ? <FaRegWindowRestore /> : <FaRegWindowMaximize />}
            </button>
            <button
              className="query-builder__dialog__header__action"
              tabIndex={-1}
              onClick={closeQueryBuilder}
            >
              <FaTimes />
            </button>
          </div>
        </div>
        <div className="query-builder__dialog__content">
          <QueryBuilder queryBuilderState={queryBuilderState} />
        </div>
      </div>
    </Dialog>
  );
});
