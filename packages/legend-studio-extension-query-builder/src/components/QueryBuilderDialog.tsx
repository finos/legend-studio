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

import { Fragment, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import { observer } from 'mobx-react-lite';
import {
  FaTimes,
  FaRegWindowMaximize,
  FaRegWindowRestore,
} from 'react-icons/fa';
import { clsx } from '@finos/legend-art';
import { useEditorStore } from '@finos/legend-studio';
import { flowResult } from 'mobx';
import { noop } from '@finos/legend-shared';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState';
import { useApplicationStore } from '@finos/legend-application';
import { QueryBuilder } from '@finos/legend-query';

/**
 * NOTE: Query builder is by right a mini-app so we have it hosted in a full-screen modal dialog
 * See https://material.io/components/dialogs#full-screen-dialog
 */
export const QueryBuilderDialog = observer(() => {
  const applicationStore = useApplicationStore();
  const editorStore = useEditorStore();
  const queryBuilderExtensionState = editorStore.getEditorExtensionState(
    QueryBuilder_EditorExtensionState,
  );
  const [isMaximized, setIsMaximized] = useState(false);
  const toggleMaximize = (): void => setIsMaximized(!isMaximized);
  const closeQueryBuilder = (): void => {
    flowResult(
      queryBuilderExtensionState.setEmbeddedQueryBuilderMode(undefined),
    ).catch(applicationStore.alertIllegalUnhandledError);
    queryBuilderExtensionState.reset();
  };

  return (
    <Dialog
      open={Boolean(queryBuilderExtensionState.mode)}
      onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
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
            {queryBuilderExtensionState.mode?.actionConfigs.map((config) => (
              <Fragment key={config.key}>{config.renderer()}</Fragment>
            ))}
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
          <QueryBuilder
            queryBuilderState={queryBuilderExtensionState.queryBuilderState}
          />
        </div>
      </div>
    </Dialog>
  );
});
