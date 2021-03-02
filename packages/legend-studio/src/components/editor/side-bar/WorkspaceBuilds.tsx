/**
 * Copyright 2020 Goldman Sachs
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
import { useEditorStore } from '../../../stores/EditorStore';
import { clsx, PanelLoadingIndicator } from '@finos/legend-studio-components';
import { MdRefresh } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import { BuildStatus } from '../../../models/sdlc/models/build/Build';
import {
  FaCircleNotch,
  FaPauseCircle,
  FaQuestionCircle,
  FaBan,
  FaTimesCircle,
  FaCheckCircle,
} from 'react-icons/fa';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { CORE_TEST_ID } from '../../../const';

const getBuildStatusIcon = (buildStatus: BuildStatus): React.ReactNode => {
  switch (buildStatus) {
    case BuildStatus.PENDING:
      return (
        <div
          title="Pipeline is suspended"
          className="workspace-builds__item__link__content__status__indicator workspace-builds__item__link__content__status__indicator--suspended"
        >
          <FaPauseCircle />
        </div>
      );
    case BuildStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="workspace-builds__item__link__content__status__indicator workspace-builds__item__link__content__status__indicator--in-progress"
        >
          <FaCircleNotch />
        </div>
      );
    case BuildStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="workspace-builds__item__link__content__status__indicator workspace-builds__item__link__content__status__indicator--succeeded"
        >
          <FaCheckCircle />
        </div>
      );
    case BuildStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="workspace-builds__item__link__content__status__indicator workspace-builds__item__link__content__status__indicator--failed"
        >
          <FaTimesCircle />
        </div>
      );
    case BuildStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="workspace-builds__item__link__content__status__indicator workspace-builds__item__link__content__status__indicator--canceled"
        >
          <FaBan />
        </div>
      );
    case BuildStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="workspace-builds__item__link__content__status__indicator workspace-builds__item__link__content__status__indicator--unknown"
        >
          <FaQuestionCircle />
        </div>
      );
  }
};

export const WorkspaceBuilds = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const workspaceBuildsState = editorStore.workspaceBuildsState;
  const isDispatchingAction = workspaceBuildsState.isFetchingBuilds;
  const refresh = applicationStore.guaranteeSafeAction(() =>
    workspaceBuildsState.fetchAllWorkspaceBuilds(),
  );

  useEffect(() => {
    workspaceBuildsState
      .fetchAllWorkspaceBuilds()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, workspaceBuildsState]);

  return (
    <div className="panel workspace-builds">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title workspace-builds__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            WORKSPACE BUILDS
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className={clsx(
              'panel__header__action side-bar__header__action workspace-builds__refresh-btn',
              { 'workspace-builds__refresh-btn--loading': isDispatchingAction },
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
              <div className="panel__header__title__content">BUILDS</div>
            </div>
            <div
              className="side-bar__panel__header__changes-count"
              data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
            >
              {workspaceBuildsState.builds.length}
            </div>
          </div>
          <div className="panel__content">
            {workspaceBuildsState.builds.map((build) => (
              <a
                key={build.id}
                className="side-bar__panel__item workspace-builds__item__link"
                rel="noopener noreferrer"
                target="_blank"
                href={build.webURL}
                title={'See build detail'}
              >
                <div className="workspace-builds__item__link__content">
                  <span className="workspace-builds__item__link__content__status">
                    {getBuildStatusIcon(build.status)}
                  </span>
                  <span className="workspace-builds__item__link__content__id">
                    #{build.id}
                  </span>
                  <span className="workspace-builds__item__link__content__created-at">
                    created{' '}
                    {formatDistanceToNow(build.createdAt, {
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
