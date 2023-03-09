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

import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { CloudDownloadIcon, SyncIcon } from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useServiceQueryEditorStore } from './ServiceQueryEditorStoreProvider.js';

export const ServiceQueryEditorWorkspaceStatus = observer(() => {
  const editorStore = useServiceQueryEditorStore();
  const applicationStore = useApplicationStore();
  const isWorkspaceOutOfSync = editorStore.sdlcState.isWorkspaceOutOfSync;
  const isWorkspaceOutated = editorStore.sdlcState.isWorkspaceOutdated;

  const updateWorkspace = (): void => {
    applicationStore.alertService.setActionAlertInfo({
      // TODO?: we might want to factor in change-detection to have more confidence here
      message: `Please backup your work. Proceed to update workspace?`,
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Proceed',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: () => {
            flowResult(editorStore.recreateWorkspace()).catch(
              applicationStore.alertUnhandledError,
            );
          },
        },
        {
          label: 'Abort',
          type: ActionAlertActionType.PROCEED,
          default: true,
        },
      ],
    });
  };

  const syncWorkspace = (): void => {
    applicationStore.alertService.setActionAlertInfo({
      // TODO?: we might want to factor in change-detection to have more confidence here
      message: `Please backup your work. Proceed to sync workspace?`,
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: 'Proceed',
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: (): void =>
            applicationStore.navigationService.navigator.reload(),
        },
        {
          label: 'Abort',
          type: ActionAlertActionType.PROCEED,
          default: true,
        },
      ],
    });
  };

  return (
    <>
      {isWorkspaceOutOfSync && (
        <button
          className="service-query-editor__header__action service-query-editor__workspace-status service-query-editor__workspace-status--out-of-sync"
          title={`Local workspace is out-of-sync. Please backup your work and refresh the application\n\nClick to sync workspace`}
          tabIndex={-1}
          onClick={syncWorkspace}
        >
          <div className="service-query-editor__workspace-status__icon">
            <SyncIcon />
          </div>
          <div className="service-query-editor__workspace-status__text">
            OUT-OF-SYNC
          </div>
        </button>
      )}
      {isWorkspaceOutated && !isWorkspaceOutOfSync && (
        <button
          className="service-query-editor__header__action service-query-editor__workspace-status service-query-editor__workspace-status--outdated"
          title="Workspace is outdated. Click to update"
          tabIndex={-1}
          onClick={updateWorkspace}
        >
          <div className="service-query-editor__workspace-status__icon">
            <CloudDownloadIcon />
          </div>
          <div className="service-query-editor__workspace-status__text">
            OUTDATED
          </div>
        </button>
      )}
      {!isWorkspaceOutated && !isWorkspaceOutOfSync && (
        <button
          className="service-query-editor__header__action service-query-editor__workspace-status service-query-editor__workspace-status--up-to-date"
          tabIndex={-1}
          disabled={true}
          title="Workspace is up-to-date"
        >
          <CloudDownloadIcon />
        </button>
      )}
    </>
  );
});
