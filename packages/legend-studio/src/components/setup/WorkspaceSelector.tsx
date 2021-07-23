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
import { useSetupStore } from '../../stores/SetupStore';
import type { SelectComponent } from '@finos/legend-studio-components';
import { CustomSelectorInput } from '@finos/legend-studio-components';
import type { WorkspaceSelectOption } from '../../models/sdlc/models/workspace/Workspace';
import { FaPlus } from 'react-icons/fa';
import { generateSetupRoute } from '../../stores/LegendStudioRouter';
import { useApplicationStore } from '../../stores/ApplicationStore';
import { ACTION_STATE } from '@finos/legend-studio-shared';

export const WorkspaceSelector = observer(
  (
    props: {
      onChange: (focusNext: boolean) => void;
      create: () => void;
    },
    ref: React.Ref<SelectComponent>,
  ) => {
    const { onChange, create } = props;
    const setupStore = useSetupStore();
    const applicationStore = useApplicationStore();
    const currentWorkspaceId = setupStore.currentWorkspaceId;
    const options = setupStore.currentProjectWorkspaceOptions;
    const selectedOption =
      options.find((option) => option.value === currentWorkspaceId) ?? null;
    const isLoadingOptions =
      setupStore.loadProjectsState === ACTION_STATE.IN_PROGRESS ||
      setupStore.loadWorkspacesState === ACTION_STATE.IN_PROGRESS;

    const onSelectionChange = (val: WorkspaceSelectOption | null): void => {
      if (
        (val !== null || selectedOption !== null) &&
        (!val || !selectedOption || val.value !== selectedOption.value)
      ) {
        setupStore.setCurrentWorkspaceId(val?.value);
        onChange(Boolean(selectedOption));
        applicationStore.historyApiClient.push(
          generateSetupRoute(
            applicationStore.config.sdlcServerKey,
            setupStore.currentProjectId ?? '',
            val?.value,
          ),
        );
      }
    };

    useEffect(() => {
      if (setupStore.currentProjectWorkspaces && !currentWorkspaceId) {
        onChange(false);
      }
    }, [
      setupStore.currentProjectWorkspaces,
      setupStore.currentProjectId,
      currentWorkspaceId,
      onChange,
    ]);

    const workspaceSelectorPlacerHold = isLoadingOptions
      ? 'Loading workspaces'
      : !setupStore.currentProjectId
      ? 'In order to select a workspace, a project must be selected'
      : options.length
      ? 'Choose an existing workspace'
      : 'You have no workspaces. Please create one';

    return (
      <div className="setup-selector">
        <button
          className="setup-selector__action btn--dark"
          onClick={create}
          tabIndex={-1}
          title={'Create a Workspace'}
        >
          <FaPlus />
        </button>
        <CustomSelectorInput
          className="setup-selector__input"
          allowCreating={false}
          ref={ref}
          options={options}
          disabled={!setupStore.currentProjectId || isLoadingOptions}
          isLoading={isLoadingOptions}
          onChange={onSelectionChange}
          value={selectedOption}
          placeholder={workspaceSelectorPlacerHold}
          isClearable={true}
          escapeClearsValue={true}
          darkMode={true}
        />
      </div>
    );
  },
  { forwardRef: true },
);

WorkspaceSelector.displayName = 'WorkspaceSelector';
