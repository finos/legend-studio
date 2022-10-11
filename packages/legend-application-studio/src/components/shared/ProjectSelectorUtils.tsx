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

import { ArrowCircleRightIcon } from '@finos/legend-art';
import type { Project } from '@finos/legend-server-sdlc';
import type { LegendStudioApplicationStore } from '../../stores/LegendStudioBaseStore.js';
import { generateViewProjectRoute } from '../../stores/LegendStudioRouter.js';

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
): ((option: ProjectOption) => React.ReactNode) =>
  function ProjectOptionLabel(option: ProjectOption): React.ReactNode {
    const viewProject = (): void =>
      applicationStore.navigator.visitAddress(
        applicationStore.navigator.generateAddress(
          generateViewProjectRoute(option.value.projectId),
        ),
      );

    return (
      <div className="project-selector__option">
        <div className="project-selector__option__label">
          <div className="project-selector__option__label__name">
            {option.label}
          </div>
        </div>
        <button
          type="button" // prevent this toggler being activated on form submission
          className="project-selector__option__visit-btn"
          tabIndex={-1}
          onClick={viewProject}
        >
          <div className="project-selector__option__visit-btn__label">view</div>
          <div className="project-selector__option__visit-btn__icon">
            <ArrowCircleRightIcon />
          </div>
        </button>
      </div>
    );
  };
