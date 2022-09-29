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
import { observer } from 'mobx-react-lite';
import {
  clsx,
  Dialog,
  TimesIcon,
  WindowMaximizeIcon,
  EmptyWindowRestoreIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { noop } from '@finos/legend-shared';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import {
  QueryBuilder,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../stores/LegendStudioApplicationNavigationContext.js';
import { useEditorStore } from './editor/EditorStoreProvider.js';
import type { EmbeddedQueryBuilderState } from '../stores/EmbeddedQueryBuilderState.js';

/**
 * NOTE: Query builder is by right a mini-app so we have it hosted in a full-screen modal dialog
 * See https://material.io/components/dialogs#full-screen-dialog
 */
const QueryBuilderDialog = observer(
  (props: {
    embeddedQueryBuilderState: EmbeddedQueryBuilderState;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { embeddedQueryBuilderState, queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const [isMaximized, setIsMaximized] = useState(false);
    const toggleMaximize = (): void => setIsMaximized(!isMaximized);

    const confirmCloseQueryBuilder = (): void => {
      queryBuilderState.changeDetectionState.alertUnsavedChanges((): void => {
        flowResult(
          embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
            undefined,
          ),
        ).catch(applicationStore.alertUnhandledError);
      });
    };

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_QUERY_BUILDER,
    );

    return (
      <Dialog
        open={Boolean(embeddedQueryBuilderState.queryBuilderState)}
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
              {embeddedQueryBuilderState.actionConfigs.map((config) => (
                <Fragment key={config.key}>
                  {config.renderer(queryBuilderState)}
                </Fragment>
              ))}
              <button
                className="query-builder__dialog__header__action"
                tabIndex={-1}
                onClick={toggleMaximize}
              >
                {isMaximized ? (
                  <EmptyWindowRestoreIcon />
                ) : (
                  <WindowMaximizeIcon />
                )}
              </button>
              <button
                className="query-builder__dialog__header__action"
                tabIndex={-1}
                onClick={confirmCloseQueryBuilder}
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div className="query-builder__dialog__content">
            <QueryBuilder queryBuilderState={queryBuilderState} />
          </div>
        </div>
      </Dialog>
    );
  },
);

export const EmbeddedQueryBuilder = observer(() => {
  const editorStore = useEditorStore();
  const queryBuilderExtensionState = editorStore.embeddedQueryBuilderState;

  if (!queryBuilderExtensionState.queryBuilderState) {
    return null;
  }
  return (
    <QueryBuilderDialog
      embeddedQueryBuilderState={queryBuilderExtensionState}
      queryBuilderState={queryBuilderExtensionState.queryBuilderState}
    />
  );
});
