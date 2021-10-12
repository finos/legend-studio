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
import { clsx, PanelLoadingIndicator } from '@finos/legend-art';
import { MdRefresh } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import {
  FaCircleNotch,
  FaPauseCircle,
  FaQuestionCircle,
  FaBan,
  FaTimesCircle,
  FaCheckCircle,
} from 'react-icons/fa';
import { STUDIO_TEST_ID } from '../../StudioTestID';
import { flowResult } from 'mobx';
import { WorkflowStatus } from '@finos/legend-server-sdlc';
import { useEditorStore } from '../EditorStoreProvider';
import { useApplicationStore } from '@finos/legend-application';

const getWorkflowStatusIcon = (
  workflowStatus: WorkflowStatus,
): React.ReactNode => {
  switch (workflowStatus) {
    case WorkflowStatus.PENDING:
      return (
        <div
          title="Pipeline is suspended"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--suspended"
        >
          <FaPauseCircle />
        </div>
      );
    case WorkflowStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--in-progress"
        >
          <FaCircleNotch />
        </div>
      );
    case WorkflowStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--succeeded"
        >
          <FaCheckCircle />
        </div>
      );
    case WorkflowStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--failed"
        >
          <FaTimesCircle />
        </div>
      );
    case WorkflowStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--canceled"
        >
          <FaBan />
        </div>
      );
    case WorkflowStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workspace-workflows__item__link__content__status__indicator workspace-workflows__item__link__content__status__indicator--unknown"
        >
          <FaQuestionCircle />
        </div>
      );
  }
};

export const WorkspaceWorkflows = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const workspaceWorkflowsState = editorStore.workspaceWorkflowsState;
  const isDispatchingAction = workspaceWorkflowsState.isFetchingWorkflows;
  const refresh = applicationStore.guaranteeSafeAction(() =>
    flowResult(workspaceWorkflowsState.fetchAllWorkspaceWorkflows()),
  );

  useEffect(() => {
    flowResult(workspaceWorkflowsState.fetchAllWorkspaceWorkflows()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, workspaceWorkflowsState]);

  return (
    <div className="panel workspace-workflows">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title workspace-workflows__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            WORKSPACE WORKFLOWS
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className={clsx(
              'panel__header__action side-bar__header__action workspace-workflows__refresh-btn',
              {
                'workspace-workflows__refresh-btn--loading':
                  isDispatchingAction,
              },
            )}
            disabled={isDispatchingAction}
            onClick={refresh}
            tabIndex={-1}
            title="Refresh"
          >
            <MdRefresh />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel side-bar__panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content">WORKFLOWS</div>
            </div>
            <div
              className="side-bar__panel__header__changes-count"
              data-testid={STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
            >
              {workspaceWorkflowsState.workflows.length}
            </div>
          </div>
          <div className="panel__content">
            {workspaceWorkflowsState.workflows.map((workflow) => (
              <a
                key={workflow.id}
                className="side-bar__panel__item workspace-workflows__item__link"
                rel="noopener noreferrer"
                target="_blank"
                href={workflow.webURL}
                title={'See build detail'}
              >
                <div className="workspace-workflows__item__link__content">
                  <span className="workspace-workflows__item__link__content__status">
                    {getWorkflowStatusIcon(workflow.status)}
                  </span>
                  <span className="workspace-workflows__item__link__content__id">
                    #{workflow.id}
                  </span>
                  <span className="workspace-workflows__item__link__content__created-at">
                    created{' '}
                    {formatDistanceToNow(workflow.createdAt, {
                      includeSeconds: true,
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
