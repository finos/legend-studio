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
import {
  FolderIcon,
  HistoryIcon,
  TimesIcon,
  UserIcon,
  UsersIcon,
} from '@finos/legend-art';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import type { WorkspaceSetupStore } from '../../stores/workspace-setup/WorkspaceSetupStore.js';
import { generateEditorRoute } from '../../__lib__/LegendStudioNavigation.js';

const MAX_TILES = 6;

const formatRelativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) {
    return 'just now';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${Math.floor(days / 365)}y ago`;
};

export const RecentWorkspacesPanel = observer(
  (props: { setupStore: WorkspaceSetupStore }) => {
    const { setupStore } = props;
    const applicationStore = setupStore.applicationStore;

    // Recents are stored in LRU order (most-recent first). Show the top N
    // workspaces; map each to its project name (or fall back to projectId
    // if the matching project entry was evicted independently).
    const tiles = setupStore.recentWorkspaces.slice(0, MAX_TILES);
    if (tiles.length === 0) {
      return null;
    }

    const projectNameById = new Map(
      setupStore.recentProjects.map((p) => [p.projectId, p.name]),
    );

    const openWorkspace = (
      projectId: string,
      workspaceId: string,
      workspaceType: WorkspaceType,
    ): void => {
      applicationStore.navigationService.navigator.goToLocation(
        generateEditorRoute(projectId, undefined, workspaceId, workspaceType),
      );
    };

    return (
      <div className="workspace-setup__recents">
        <div className="workspace-setup__recents__header">
          <div className="workspace-setup__recents__header__title">
            <HistoryIcon />
            <span>Recent workspaces</span>
          </div>
        </div>
        <div className="workspace-setup__recents__grid">
          {tiles.map((entry) => {
            const projectName =
              projectNameById.get(entry.projectId) ?? entry.projectId;
            const key = `${entry.projectId}::${entry.workspaceType}::${entry.workspaceId}`;
            const handleRemove = (
              event: React.MouseEvent<HTMLButtonElement>,
            ): void => {
              event.stopPropagation();
              setupStore.removeRecentWorkspace({
                projectId: entry.projectId,
                workspaceId: entry.workspaceId,
                workspaceType: entry.workspaceType,
              });
            };
            return (
              <button
                key={key}
                type="button"
                className="workspace-setup__recents__tile"
                title={`Open ${projectName} / ${entry.workspaceId}`}
                onClick={() =>
                  openWorkspace(
                    entry.projectId,
                    entry.workspaceId,
                    entry.workspaceType,
                  )
                }
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className="workspace-setup__recents__tile__remove"
                  title="Remove from recents"
                  onClick={handleRemove}
                >
                  <TimesIcon />
                </button>
                <div className="workspace-setup__recents__tile__project">
                  <FolderIcon />
                  <span className="workspace-setup__recents__tile__project__name">
                    {projectName}
                  </span>
                </div>
                <div className="workspace-setup__recents__tile__workspace">
                  {entry.workspaceType === WorkspaceType.GROUP ? (
                    <UsersIcon />
                  ) : (
                    <UserIcon />
                  )}
                  <span className="workspace-setup__recents__tile__workspace__name">
                    {entry.workspaceId}
                  </span>
                </div>
                <div className="workspace-setup__recents__tile__time">
                  {formatRelativeTime(entry.lastOpenedAt)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
