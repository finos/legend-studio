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

import { forwardRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import type { WorkspaceOption } from '../../stores/workspace-setup/WorkspaceSetupStore.js';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import {
  type SelectComponent,
  compareLabelFn,
  CustomSelectorInput,
  PlusIcon,
  UserIcon,
  UsersIcon,
  GitBranchIcon,
} from '@finos/legend-art';
import { generateSetupRoute } from '../../stores/LegendStudioRouter.js';
import { useWorkspaceSetupStore } from './WorkspaceSetupStoreProvider.js';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';

const formatOptionLabel = (option: WorkspaceOption): React.ReactNode => (
  <div className="workspace-setup__workspace__label">
    <div className="workspace-setup__workspace__label-icon">
      {option.value.workspaceType === WorkspaceType.GROUP ? (
        <UsersIcon />
      ) : (
        <UserIcon />
      )}
    </div>
    <div className="workspace-setup__workspace__label__name">
      {option.label}
    </div>
  </div>
);

export const WorkspaceSelector = observer(
  forwardRef<
    SelectComponent,
    {
      onChange: (focusNext: boolean) => void;
      create: () => void;
    }
  >(function WorkspaceSelector(props, ref) {
    const { onChange, create } = props;
    const setupStore = useWorkspaceSetupStore();
    const applicationStore = useLegendStudioApplicationStore();
    const currentWorkspaceCompositeId = setupStore.currentWorkspaceCompositeId;
    const options =
      setupStore.currentProjectWorkspaceOptions.sort(compareLabelFn);
    const selectedOption =
      options.find(
        (option) =>
          setupStore.buildWorkspaceCompositeId(option.value) ===
          currentWorkspaceCompositeId,
      ) ?? null;
    const isLoadingOptions =
      setupStore.loadProjectsState.isInProgress ||
      setupStore.loadWorkspacesState.isInProgress;

    const onSelectionChange = (val: WorkspaceOption | null): void => {
      if (
        (val !== null || selectedOption !== null) &&
        (!val || !selectedOption || val.value !== selectedOption.value)
      ) {
        setupStore.setCurrentWorkspaceIdentifier(val?.value);
        onChange(Boolean(selectedOption));
        applicationStore.navigator.goTo(
          generateSetupRoute(
            setupStore.currentProjectId ?? '',
            val?.value.workspaceId,
            val?.value.workspaceType,
          ),
        );
      }
    };

    useEffect(() => {
      if (setupStore.currentProjectWorkspaces && !currentWorkspaceCompositeId) {
        onChange(false);
      }
    }, [setupStore.currentProjectWorkspaces, setupStore.currentProjectId, currentWorkspaceCompositeId, onChange]);

    const workspaceSelectorPlacerHold = isLoadingOptions
      ? 'Loading workspaces'
      : !setupStore.currentProjectId
      ? 'In order to select a workspace, a project must be selected'
      : options.length
      ? 'Choose an existing workspace'
      : 'You have no workspaces. Please create one';

    return (
      <div className="workspace-setup-selector">
        <div className="workspace-setup-selector__icon-box">
          <GitBranchIcon className="workspace-setup-selector__icon" />
        </div>
        <CustomSelectorInput
          className="workspace-setup-selector__input"
          allowCreating={false}
          ref={ref}
          options={options}
          disabled={!setupStore.currentProjectId || isLoadingOptions}
          isLoading={isLoadingOptions}
          onChange={onSelectionChange}
          formatOptionLabel={formatOptionLabel}
          value={selectedOption}
          placeholder={workspaceSelectorPlacerHold}
          isClearable={true}
          escapeClearsValue={true}
          darkMode={true}
        />
        <button
          className="workspace-setup-selector__action btn--dark"
          onClick={create}
          tabIndex={-1}
          title="Create a Workspace"
        >
          <PlusIcon />
        </button>
      </div>
    );
  }),
);
