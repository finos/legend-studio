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
  ArrowCircleRightIcon,
  clsx,
  ExclamationCircleIcon,
  getSelectorInputOptionEmbeddedButtonProps,
} from '@finos/legend-art';
import type { Project } from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from '../../stores/LegendStudioBaseStore.js';
import { generateViewProjectRoute } from '../../__lib__/LegendStudioNavigation.js';
import type { ProjectConfigurationStatus } from '../../stores/workspace-setup/ProjectConfigurationStatus.js';

export interface ProjectOption {
  label: string;
  value: Project;
}

export const buildProjectOption = (project: Project): ProjectOption => ({
  label: project.name,
  value: project,
});

export const getProjectOptionLabelFormatter = (
  applicationStore: LegendStudioApplicationStore,
  projectConfigurationStatus?: ProjectConfigurationStatus | undefined,
): ((option: ProjectOption) => React.ReactNode) =>
  function ProjectOptionLabel(option: ProjectOption): React.ReactNode {
    const viewProject = (): void =>
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          generateViewProjectRoute(option.value.projectId),
        ),
      );
    const configure = (): void => {
      if (projectConfigurationStatus?.reviewUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          projectConfigurationStatus.reviewUrl,
        );
      } else {
        applicationStore.notificationService.notifyWarning(
          `Can't find project configuration review: opening the project web page...`,
        );
        applicationStore.navigationService.navigator.visitAddress(
          option.value.webUrl,
        );
      }
    };

    return (
      <div className="project-selector__option">
        <div
          className={clsx('project-selector__option__label', {
            'project-selector__option__label--selected':
              projectConfigurationStatus &&
              option.value.projectId === projectConfigurationStatus.projectId &&
              projectConfigurationStatus.isConfigured,
            'project-selector__option__label--not-configured':
              projectConfigurationStatus &&
              option.value.projectId === projectConfigurationStatus.projectId &&
              !projectConfigurationStatus.isConfigured,
          })}
        >
          <div className="project-selector__option__label__name">
            {option.label}
          </div>
        </div>
        {projectConfigurationStatus &&
          option.value.projectId === projectConfigurationStatus.projectId && (
            <>
              {projectConfigurationStatus.isConfigured && (
                <button
                  type="button" // prevent this toggler being activated on form submission
                  className="project-selector__option__visit-btn"
                  tabIndex={-1}
                  onClick={viewProject}
                  {...getSelectorInputOptionEmbeddedButtonProps()}
                >
                  <div className="project-selector__option__visit-btn__label">
                    view
                  </div>
                  <div className="project-selector__option__visit-btn__icon">
                    <ArrowCircleRightIcon />
                  </div>
                </button>
              )}
              {!projectConfigurationStatus.isConfigured && (
                <button
                  className="project-selector__option__configure-btn"
                  type="button" // prevent this toggler being activated on form submission
                  tabIndex={-1}
                  onClick={configure}
                  {...getSelectorInputOptionEmbeddedButtonProps()}
                  title="The project has not been configured properly. Click to see the review and commit it to get complete the configuration."
                >
                  <div className="project-selector__option__configure-btn__warning-icon">
                    <ExclamationCircleIcon />
                  </div>
                  <div className="project-selector__option__configure-btn__label">
                    configure
                  </div>
                  <div className="project-selector__option__configure-btn__icon">
                    <ArrowCircleRightIcon />
                  </div>
                </button>
              )}
            </>
          )}
      </div>
    );
  };
