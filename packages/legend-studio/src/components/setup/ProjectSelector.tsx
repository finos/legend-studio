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
import type { ProjectOption } from '../../stores/SetupStore.js';
import {
  type SelectComponent,
  compareLabelFn,
  CustomSelectorInput,
  PlusIcon,
  RepoIcon,
  ArrowCircleRightIcon,
} from '@finos/legend-art';
import {
  generateSetupRoute,
  generateViewProjectRoute,
} from '../../stores/LegendStudioRouter.js';
import { flowResult } from 'mobx';
import { useSetupStore } from './SetupStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendStudioConfig } from '../../application/LegendStudioConfig.js';

export const ProjectSelector = observer(
  forwardRef<
    SelectComponent,
    {
      onChange: (focusNext: boolean) => void;
      create: () => void;
    }
  >(function ProjectSelector(props, ref) {
    const { onChange, create } = props;
    const setupStore = useSetupStore();
    const applicationStore = useApplicationStore<LegendStudioConfig>();
    const currentProjectId = setupStore.currentProjectId;
    const options = setupStore.projectOptions.sort(compareLabelFn);
    const selectedOption =
      options.find((option) => option.value === currentProjectId) ?? null;
    const isLoadingOptions = setupStore.loadProjectsState.isInProgress;

    const formatOptionLabel = (option: ProjectOption): React.ReactNode => {
      const viewProject = (): void =>
        applicationStore.navigator.openNewWindow(
          applicationStore.navigator.generateLocation(
            generateViewProjectRoute(option.value),
          ),
        );

      return (
        <div className="setup__project-option">
          <div className="setup__project-option__label">
            <div className="setup__project-option__label__name">
              {option.label}
            </div>
          </div>
          <button
            className="setup__project-option__visit-btn"
            tabIndex={-1}
            onClick={viewProject}
          >
            <div className="setup__project-option__visit-btn__label">view</div>
            <div className="setup__project-option__visit-btn__icon">
              <ArrowCircleRightIcon />
            </div>
          </button>
        </div>
      );
    };

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

    const projectSelectorPlaceholder = isLoadingOptions
      ? 'Loading projects'
      : setupStore.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : options.length
      ? 'Choose an existing project'
      : 'You have no projects, please create or acquire access for at least one';

    return (
      <div className="setup-selector">
        <div className="setup-selector__icon-box">
          <RepoIcon className="setup-selector__icon" />
        </div>
        <CustomSelectorInput
          className="setup-selector__input"
          ref={ref}
          options={options}
          disabled={isLoadingOptions || !options.length}
          isLoading={isLoadingOptions}
          onChange={onSelectionChange}
          value={selectedOption}
          placeholder={projectSelectorPlaceholder}
          isClearable={true}
          escapeClearsValue={true}
          darkMode={true}
          formatOptionLabel={formatOptionLabel}
        />
        <button
          className="setup-selector__action btn--dark"
          onClick={create}
          tabIndex={-1}
          title={'Create a Project'}
        >
          <PlusIcon />
        </button>
      </div>
    );
  }),
);
