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

import { UserIcon, UsersIcon } from '@finos/legend-art';
import { type Workspace, WorkspaceType } from '@finos/legend-server-sdlc';

export interface WorkspaceOption {
  label: string;
  value: Workspace;
}

export const buildWorkspaceOption = (
  workspace: Workspace,
): WorkspaceOption => ({
  label: workspace.workspaceId,
  value: workspace,
});

export const formatWorkspaceOptionLabel = (
  option: WorkspaceOption,
): React.ReactNode => (
  <div className="workspace-selector__option">
    <div className="workspace-selector__option__label">
      <div className="workspace-selector__option__icon">
        {option.value.workspaceType === WorkspaceType.GROUP ? (
          <UsersIcon />
        ) : (
          <UserIcon />
        )}
      </div>
      <div className="workspace-selector__option__name">{option.label}</div>
    </div>
    <div className="workspace-selector__option__source">
      {option.value.source && (
        <div className="workspace-selector__option__source__patch">{`patch/${option.value.source}`}</div>
      )}
    </div>
  </div>
);
