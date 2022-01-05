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
import { FaPlus } from 'react-icons/fa';
import type { ProjectOption } from '../../stores/SetupStore';
import {
  type SelectComponent,
  compareLabelFn,
  clsx,
  CustomSelectorInput,
} from '@finos/legend-art';
import { generateSetupRoute } from '../../stores/LegendStudioRouter';
import { flowResult } from 'mobx';
import { useSetupStore } from './SetupStoreProvider';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendStudioConfig } from '../../application/LegendStudioConfig';

const formatOptionLabel = (option: ProjectOption): React.ReactNode => (
  <div className="setup__project__label">
    <div
      className={clsx([
        `setup__project__label__tag setup__project__label__tag--${option.tag.toLowerCase()}`,
        { 'setup__project__label__tag--disabled': option.disabled },
      ])}
    >
      {option.tag}
    </div>
    <div className="setup__project__label__name">{option.label}</div>
  </div>
);

export const ProjectSelector = observer(
  (
    props: {
      onChange: (focusNext: boolean) => void;
      create: () => void;
    },
    ref: React.Ref<SelectComponent>,
  ) => {
    const { onChange, create } = props;
    const setupStore = useSetupStore();
    const applicationStore = useApplicationStore<LegendStudioConfig>();
    const currentProjectId = setupStore.currentProjectId;
    const options = setupStore.projectOptions.sort(compareLabelFn);
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
            applicationStore.alertIllegalUnhandledError,
          );
        }
        applicationStore.navigator.goTo(
          generateSetupRoute(
            applicationStore.config.currentSDLCServerOption,
            val?.value ?? '',
          ),
        );
      }
    };

    useEffect(() => {
      if (setupStore.projects && !setupStore.currentProject) {
        if (currentProjectId) {
          // For first load, if the project is not found, reset the URL
          applicationStore.navigator.goTo(
            generateSetupRoute(
              applicationStore.config.currentSDLCServerOption,
              undefined,
            ),
          );
        }
        onChange(false);
      }
    }, [
      applicationStore,
      setupStore.projects,
      setupStore.currentProject,
      currentProjectId,
      onChange,
    ]);

    const projectSelectorPlaceholder = isLoadingOptions
      ? 'Loading projects'
      : setupStore.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : options.length
      ? 'Choose an existing project'
      : 'You have no projects, please create or acquire access for at least one';

    return (
      <div className="setup-selector">
        <button
          className="setup-selector__action btn--dark"
          onClick={create}
          tabIndex={-1}
          disabled={
            applicationStore.config.options
              .TEMPORARY__disableSDLCProjectCreation
          }
          title={'Create a Project'}
        >
          <FaPlus />
        </button>
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
          isOptionDisabled={(option: { disabled: boolean }): boolean =>
            option.disabled
          }
        />
      </div>
    );
  },
  { forwardRef: true },
);
