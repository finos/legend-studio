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
import { useEditorStore } from '@finos/legend-application-studio';
import { flowResult } from 'mobx';
import { hashObject, noop } from '@finos/legend-shared';
import { QueryBuilder_EditorExtensionState } from '../stores/QueryBuilder_EditorExtensionState.js';
import {
  useApplicationNavigationContext,
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import {
  QueryBuilder,
  type QueryBuilderState,
} from '@finos/legend-application-query';
import { QUERY_BUILDER_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../stores/QueryBuilder_LegendStudioApplicationNavigationContext.js';

/**
 * NOTE: Query builder is by right a mini-app so we have it hosted in a full-screen modal dialog
 * See https://material.io/components/dialogs#full-screen-dialog
 */
const QueryBuilderDialog = observer(
  (props: {
    queryBuilderExtensionState: QueryBuilder_EditorExtensionState;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { queryBuilderExtensionState, queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const [isMaximized, setIsMaximized] = useState(false);
    const toggleMaximize = (): void => setIsMaximized(!isMaximized);
    const closeQueryBuilder = (): void => {
      flowResult(
        queryBuilderExtensionState.setEmbeddedQueryBuilderConfiguration(
          undefined,
        ),
      ).catch(applicationStore.alertUnhandledError);
    };

    useApplicationNavigationContext(
      QUERY_BUILDER_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_QUERY_BUILDER,
    );

    const confirmCloseQueryBuilder = (): void => {
      // NOTE: This is poor-man change detection for query
      // in the future, we could consider a similar approach to how we do change detection in Studio
      if (
        queryBuilderState.changeDetectionState.isEnabled &&
        queryBuilderState.changeDetectionState.queryHashCode !==
          hashObject(queryBuilderState.buildQuery())
      ) {
        applicationStore.setActionAlertInfo({
          message:
            'Unsaved changes to your query will be lost if you continue. Do you still want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: applicationStore.guardUnhandledError(async () =>
                closeQueryBuilder(),
              ),
            },
            {
              label: 'Cancel',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      } else {
        closeQueryBuilder();
      }
    };

    return (
      <Dialog
        open={Boolean(queryBuilderExtensionState.queryBuilderState)}
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
              {queryBuilderExtensionState.actionConfigs.map((config) => (
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
  const queryBuilderExtensionState = editorStore.getEditorExtensionState(
    QueryBuilder_EditorExtensionState,
  );

  if (!queryBuilderExtensionState.queryBuilderState) {
    return null;
  }
  return (
    <QueryBuilderDialog
      queryBuilderExtensionState={queryBuilderExtensionState}
      queryBuilderState={queryBuilderExtensionState.queryBuilderState}
    />
  );
});
