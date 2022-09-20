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
import {
  type SelectComponent,
  compareLabelFn,
  CustomSelectorInput,
  PlusIcon,
  RepoIcon,
} from '@finos/legend-art';
import { generateSetupRoute } from '../../stores/LegendStudioRouter.js';
import { flowResult } from 'mobx';
import { useWorkspaceSetupStore } from './WorkspaceSetupStoreProvider.js';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';
import {
  buildProjectOption,
  getProjectOptionLabelFormatter,
  type ProjectOption,
} from '../shared/ProjectSelectorUtils.js';

export const ProjectSelector = observer(
  forwardRef<
    SelectComponent,
    {
      onChange: (focusNext: boolean) => void;
      create: () => void;
    }
  >(function ProjectSelector(props, ref) {
    const { onChange, create } = props;
    const setupStore = useWorkspaceSetupStore();
    const applicationStore = useLegendStudioApplicationStore();
    const currentProjectId = setupStore.currentProjectId;
    const options = (
      setupStore.projects
        ? Array.from(setupStore.projects.values()).map(buildProjectOption)
        : []
    ).sort(compareLabelFn);
    const selectedOption =
      options.find((option) => option.value === currentProjectId) ?? null;
    const isLoadingOptions = setupStore.loadProjectsState.isInProgress;

    const onSelectionChange = (val: ProjectOption | null): void => {
      if (
        (val !== null || selectedOption !== null) &&
        (!val || !selectedOption || val.value !== selectedOption.value)
      ) {
        onChange(Boolean(selectedOption));
        setupStore.setCurrentProjectId(val?.value);
        if (val && !setupStore.currentProjectWorkspaces) {
          flowResult(setupStore.fetchWorkspaces(val.value)).catch(
            applicationStore.alertUnhandledError,
          );
        }
        applicationStore.navigator.goTo(generateSetupRoute(val?.value));
      }
    };

    useEffect(() => {
      if (setupStore.projects && !setupStore.currentProject) {
        if (currentProjectId) {
          // For first load, if the project is not found, reset the URL
          applicationStore.navigator.goTo(generateSetupRoute(undefined));
        }
        onChange(false);
      }
    }, [applicationStore, setupStore.projects, setupStore.currentProject, currentProjectId, onChange]);

    return (
      <div className="workspace-setup__selector">
        <div className="workspace-setup__selector__icon" title="project">
          <RepoIcon className="workspace-setup__selector__icon--project" />
        </div>
        <CustomSelectorInput
          className="workspace-setup__selector__input"
          ref={ref}
          options={options}
          disabled={isLoadingOptions || !options.length}
          isLoading={isLoadingOptions}
          onChange={onSelectionChange}
          value={selectedOption}
          placeholder={
            isLoadingOptions
              ? 'Loading projects'
              : setupStore.loadProjectsState.hasFailed
              ? 'Error fetching projects'
              : options.length
              ? 'Choose an existing project'
              : 'You have no projects, please create or acquire access for at least one'
          }
          isClearable={true}
          escapeClearsValue={true}
          darkMode={true}
          formatOptionLabel={getProjectOptionLabelFormatter(applicationStore)}
        />
        <button
          className="workspace-setup__selector__action btn--dark"
          onClick={create}
          tabIndex={-1}
          title="Create a Project"
        >
          <PlusIcon />
        </button>
      </div>
    );
  }),
);
