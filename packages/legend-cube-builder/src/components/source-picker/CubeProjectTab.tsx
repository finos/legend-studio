/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { CUBE_PROJECT_LABEL } from '../../__lib__/LegendCubeProjectLabels.js';
import {
  type CubeProjectTabState,
  getCubeProjectKey,
} from '../../stores/source-picker/CubeProjectTabState.js';
import { CubeButton } from '../CubeButton.js';
import { CubeOutlineSteps } from './CubeInlineModelTab.js';
import { CubePickerStep } from './CubePickerStep.js';

/**
 * The source dialog's Project Database tab (PLAN §6.3): a published project,
 * one of its released versions, then, as in the Sample Data tab, one of its
 * own Databases, a runtime keyed by it, a schema and a table
 */
export const CubeProjectTab = observer(
  (props: { tab: CubeProjectTabState }) => {
    const { tab } = props;
    const { applicationStore } = tab.editorState.host;
    // the cube's model is fixed, even one Cube can't read as a project
    const isFixed = tab.fixedContext !== undefined;
    const noRuntime =
      tab.databasePath !== undefined &&
      !tab.isLoadingModel &&
      tab.runtimes.length === 0;
    return (
      <div className="flex flex-col gap-2">
        {tab.isLoadingProjects && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PROJECT_LABEL.LOADING_PROJECTS}
          </div>
        )}
        <CubePickerStep
          label="Project"
          value={tab.projectKey}
          options={(isFixed && tab.projectKey !== undefined
            ? [tab.projectKey]
            : (tab.projects ?? []).map(getCubeProjectKey)
          ).map((key) => ({ value: key, label: key }))}
          disabled={isFixed}
          onChange={(key) => {
            flowResult(tab.selectProject(key)).catch(
              applicationStore.alertUnhandledError,
            );
          }}
        />
        <CubePickerStep
          label="Version"
          value={tab.versionId}
          options={(tab.versions ?? []).map((version, index) => ({
            value: version,
            label:
              index === 0 && !isFixed
                ? `${version} ${CUBE_PROJECT_LABEL.LATEST}`
                : version,
          }))}
          disabled={isFixed}
          onChange={(version) => tab.selectVersion(version)}
        />
        {tab.isLoadingVersions && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PROJECT_LABEL.LOADING_VERSIONS}
          </div>
        )}
        {tab.listError !== undefined && (
          <div className="flex flex-col gap-1" role="alert">
            <span className="text-base text-[var(--color-status-error)]">
              {tab.listError}
            </span>
            {tab.projects === undefined && (
              <span>
                <CubeButton
                  onClick={() => {
                    flowResult(tab.loadProjects()).catch(
                      applicationStore.alertUnhandledError,
                    );
                  }}
                >
                  Retry
                </CubeButton>
              </span>
            )}
          </div>
        )}
        <CubeOutlineSteps tab={tab} />
        {noRuntime && (
          <div
            className="text-base text-[var(--color-status-warn)]"
            role="note"
          >
            {CUBE_PROJECT_LABEL.NO_RUNTIME}
          </div>
        )}
      </div>
    );
  },
);
