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

import { ArrowCircleRightIcon, ExclamationCircleIcon } from '@finos/legend-art';
import type { Project } from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from '../../stores/LegendStudioBaseStore.js';
import { generateViewProjectRoute } from '../../stores/LegendStudioRouter.js';
import type { ProjectSetupStore } from '../../stores/project-setup/ProjectSetupStore.js';

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
  setupStore: ProjectSetupStore,
): ((option: ProjectOption) => React.ReactNode) =>
  function ProjectOptionLabel(option: ProjectOption): React.ReactNode {
    const viewProject = (): void =>
      applicationStore.navigator.visitAddress(
        applicationStore.navigator.generateAddress(
          generateViewProjectRoute(option.value.projectId),
        ),
      );
    const openReview = (): void => {
      if (setupStore.currentProjectConfigurationReviewUrl) {
        applicationStore.navigator.visitAddress(
          setupStore.currentProjectConfigurationReviewUrl,
        );
      }
    };

    return (
      <div className="project-selector__option">
        <div className="project-selector__option__label">
          <div className="project-selector__option__label__name">
            {option.label}
          </div>
        </div>
        {setupStore.currentProject &&
          setupStore.currentProject.name === option.label &&
          setupStore.currentProjectConfigurationStatus?.projectConfigured ===
            false && (
            <div className="project-selector__option__project-modal-not-configured">
              <ExclamationCircleIcon
                title="Your project is not configured correctly. To complete the configuration, please click the visit button and commit it"
                className="project-selector__option__project-model-not-configured-icon"
              />
              <button
                type="button"
                className="project-selector__option__visit-btn"
                tabIndex={-1}
                onClick={openReview}
              >
                <div className="project-selector__option__visit-btn__label">
                  review
                </div>
                <div className="project-selector__option__visit-btn__icon">
                  <ArrowCircleRightIcon />
                </div>
              </button>
            </div>
          )}
        {setupStore.currentProject &&
          setupStore.currentProject.name === option.label &&
          setupStore.currentProjectConfigurationStatus?.projectConfigured ===
            true && (
            <button
              type="button" // prevent this toggler being activated on form submission
              className="project-selector__option__visit-btn"
              tabIndex={-1}
              onClick={viewProject}
            >
              <div className="project-selector__option__visit-btn__label">
                view
              </div>
              <div className="project-selector__option__visit-btn__icon">
                <ArrowCircleRightIcon />
              </div>
            </button>
          )}
      </div>
    );
  };
