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
import {
  CUBE_DATA_SPACE_MESSAGE,
  CUBE_DATA_SPACE_TAB_LABEL,
  getShownDataSpacesLabel,
} from '../../__lib__/LegendCubeDataSpaceLabels.js';
import { CUBE_PROJECT_LABEL } from '../../__lib__/LegendCubeProjectLabels.js';
import { formatCubeProject } from '../../graph-manager/CubeProject.js';
import {
  type CubeDataSpaceTabState,
  getCubeDataSpaceKey,
} from '../../stores/source-picker/CubeDataSpaceTabState.js';
import { CubeButton } from '../CubeButton.js';
import {
  CUBE_PICKER_LIST_CLASS,
  CubePickerListItem,
} from './CubePickerListItem.js';
import { CubePickerStep } from './CubePickerStep.js';

const INPUT_CLASS =
  'h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]';

/**
 * The source dialog's Data Space tab (PLAN §11.25): the depot's released
 * data spaces, searched by title and path, then the picked one's version and
 * execution context. Add puts the data space on the canvas and opens its
 * editor, the query builder, where its entity, columns and filter are picked.
 * Once the cube has a data space source, only its data space, version and
 * execution context are offered.
 */
export const CubeDataSpaceTab = observer(
  (props: { tab: CubeDataSpaceTabState }) => {
    const { tab } = props;
    const { applicationStore } = tab.editorState.host;
    const isFixed = tab.fixed !== undefined;
    const { picked } = tab;
    const shownLabel = getShownDataSpacesLabel(
      tab.shownDataSpaces.length,
      tab.matchingDataSpaces.length,
    );
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">
          {CUBE_DATA_SPACE_TAB_LABEL.INTRO}
        </span>
        {!isFixed && (
          <input
            className={INPUT_CLASS}
            placeholder="Search data spaces"
            aria-label="Search data spaces"
            value={tab.search}
            onChange={(event) => tab.setSearch(event.target.value)}
          />
        )}
        {tab.isLoading && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_DATA_SPACE_TAB_LABEL.LOADING}
          </div>
        )}
        {tab.offeredDataSpaces && (
          <>
            {tab.shownDataSpaces.length ? (
              <ul
                className={`${isFixed ? '' : 'h-48'}overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
                aria-label="Data spaces"
              >
                {tab.shownDataSpaces.map((summary) => {
                  const key = getCubeDataSpaceKey(summary);
                  return (
                    <CubePickerListItem
                      key={key}
                      picked={tab.pickedKey === key}
                      title={summary.path}
                      adds={true}
                      onPick={() => {
                        flowResult(tab.pick(key)).catch(
                          applicationStore.alertUnhandledError,
                        );
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {summary.title ?? summary.path}
                      </span>
                      <span className="max-w-[50%] shrink-0 truncate text-sm text-[var(--color-text-muted)]">
                        {`${summary.project.groupId}:${summary.project.artifactId}`}
                      </span>
                    </CubePickerListItem>
                  );
                })}
              </ul>
            ) : (
              <div className="text-base text-[var(--color-text-secondary)]">
                {tab.offeredDataSpaces.length
                  ? CUBE_DATA_SPACE_MESSAGE.NO_MATCH
                  : CUBE_DATA_SPACE_MESSAGE.NONE}
              </div>
            )}
            {shownLabel !== undefined && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {shownLabel}
              </span>
            )}
          </>
        )}
        {picked && (
          <section
            aria-label="Data space details"
            className="flex flex-col gap-2 text-base"
          >
            <span className="break-all text-[var(--color-text-secondary)]">
              {picked.path}
            </span>
            {picked.description !== undefined &&
              picked.description.trim() !== '' && (
                <p className="max-h-16 overflow-auto whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                  {picked.description}
                </p>
              )}
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
              onChange={(version) => {
                if (version !== undefined) {
                  flowResult(tab.selectVersion(version)).catch(
                    applicationStore.alertUnhandledError,
                  );
                }
              }}
            />
            <CubePickerStep
              label="Context"
              value={tab.executionContext}
              options={(tab.description?.executionContexts ?? []).map(
                (context) => ({
                  value: context.name,
                  label: context.title ?? context.name,
                }),
              )}
              disabled={isFixed}
              onChange={(name) => {
                if (name !== undefined) {
                  tab.setExecutionContext(name);
                }
              }}
            />
            {(tab.isLoadingVersions || tab.isDescribing) && (
              <div className="text-base text-[var(--color-text-secondary)]">
                {CUBE_DATA_SPACE_TAB_LABEL.READING}
              </div>
            )}
            {tab.versionId !== undefined && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {CUBE_DATA_SPACE_TAB_LABEL.PROJECT(
                  formatCubeProject({
                    ...picked.project,
                    versionId: tab.versionId,
                  }),
                )}
              </span>
            )}
          </section>
        )}
        {tab.error !== undefined && (
          <div
            className="flex flex-col gap-1 text-base text-[var(--color-status-error)]"
            role="alert"
          >
            <span>{tab.error.message}</span>
            {tab.error.detail !== undefined && (
              <details className="text-sm">
                <summary className="cursor-pointer">Details</summary>
                <pre className="whitespace-pre-wrap break-words">
                  {tab.error.detail}
                </pre>
              </details>
            )}
            {tab.dataSpaces === undefined && !isFixed && (
              <div>
                <CubeButton onClick={() => tab.retry()}>Retry</CubeButton>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
