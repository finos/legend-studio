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

import { clsx } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { CUBE_PENDING_LABEL } from '../../__lib__/LegendCubeLabels.js';
import { CubeDataProductEnvironmentType } from '../../graph-manager/CubeDataProduct.js';
import {
  type CubeDataProductTabError,
  type CubeDataProductTabState,
  CUBE_DATA_PRODUCT_TAB_MESSAGE,
} from '../../stores/source-picker/CubeDataProductTabState.js';
import { CubeButton } from '../CubeButton.js';
import { CubePickerStep } from './CubePickerStep.js';

const INPUT_CLASS =
  'h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]';

const LIST_ITEM_CLASS =
  'flex w-full items-center gap-2 px-2 py-1 text-left text-base enabled:hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]';

/** The classes' labels, as Data Cube shows them */
const ENVIRONMENT_TYPE_LABELS: Readonly<
  Record<CubeDataProductEnvironmentType, string>
> = {
  [CubeDataProductEnvironmentType.PRODUCTION]: 'Production',
  [CubeDataProductEnvironmentType.PRODUCTION_PARALLEL]: 'Production (parallel)',
};

/** An error as the tab shows it: its first line, the rest on demand, and an action when it has one */
const CubeDataProductTabAlert: React.FC<{
  error: CubeDataProductTabError;
  children?: React.ReactNode;
}> = ({ error, children }) => (
  <div
    className="flex flex-col gap-1 text-base text-[var(--color-status-error)]"
    role="alert"
  >
    <span>{error.message}</span>
    {error.detail !== undefined && (
      <details className="text-sm">
        <summary className="cursor-pointer">Details</summary>
        <pre className="whitespace-pre-wrap break-words">{error.detail}</pre>
      </details>
    )}
    {children}
  </div>
);

/**
 * The source dialog's Data product tab (PLAN §6.8), as Data Cube's selection
 * goes: the mode, a deployed data product, one of its access points, and the
 * warehouse. The dialog's Add adds the access point.
 */
export const CubeDataProductTab = observer(
  (props: { tab: CubeDataProductTabState }) => {
    const { tab } = props;
    const warehouseId = useId();
    const project = tab.fixedProject;
    return (
      <div className="flex flex-col gap-2">
        <CubePickerStep
          label="Mode"
          value={tab.environmentType}
          options={(tab.catalog?.environmentTypes ?? []).map((type) => ({
            value: type,
            label: ENVIRONMENT_TYPE_LABELS[type],
          }))}
          disabled={project !== undefined}
          onChange={(value) => {
            if (value) {
              tab.setEnvironmentType(value as CubeDataProductEnvironmentType);
            }
          }}
        />
        {project && (
          <span className="text-sm text-[var(--color-text-muted)]">
            {`All of the cube's data products come from ${project.groupId}:${project.artifactId}:${project.versionId}.`}
          </span>
        )}
        <input
          className={INPUT_CLASS}
          placeholder="Search data products"
          aria-label="Search data products"
          value={tab.search}
          onChange={(event) => tab.setSearch(event.target.value)}
        />
        {tab.isListing && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {tab.searchesOnServer
              ? 'searching data products'
              : 'listing data products'}
          </div>
        )}
        {tab.listError !== undefined && (
          <CubeDataProductTabAlert error={tab.listError}>
            <div>
              <CubeButton onClick={() => tab.retryListing()}>Retry</CubeButton>
            </div>
          </CubeDataProductTabAlert>
        )}
        <ul
          className="max-h-40 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
          aria-label="Data products"
        >
          {tab.visibleCandidates.map((candidate) => {
            const isPicked = tab.candidate === candidate;
            return (
              <li key={`${candidate.id}/${candidate.deploymentId}`}>
                <button
                  type="button"
                  className={clsx(LIST_ITEM_CLASS, {
                    'bg-[var(--color-bg-selected)]': isPicked,
                  })}
                  aria-pressed={isPicked}
                  title={candidate.description}
                  onClick={() => tab.selectCandidate(candidate)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {candidate.title}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {`${candidate.id} · ${candidate.versionId}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {tab.isTruncated && (
          <span className="text-sm text-[var(--color-text-muted)]">
            {CUBE_DATA_PRODUCT_TAB_MESSAGE.TRUNCATED}
          </span>
        )}
        {tab.isDescribing && (
          <div className="text-base text-[var(--color-text-secondary)]">
            loading access points
          </div>
        )}
        {tab.description && (
          <ul
            className="max-h-56 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
            aria-label="Access points"
          >
            {tab.description.groups.map((group) => (
              <li key={group.id}>
                <div className="px-2 pt-1 text-sm text-[var(--color-text-secondary)]">
                  {group.title ?? group.id}
                </div>
                <ul aria-label={`Access points of ${group.title ?? group.id}`}>
                  {group.accessPoints.map((point) => {
                    const isPicked =
                      tab.accessPointKey?.group === group.id &&
                      tab.accessPointKey.id === point.id;
                    return (
                      <li key={point.id}>
                        <button
                          type="button"
                          className={clsx(LIST_ITEM_CLASS, {
                            'bg-[var(--color-bg-selected)]': isPicked,
                          })}
                          aria-pressed={isPicked}
                          disabled={!point.isPickable}
                          title={point.disabledReason ?? point.description}
                          onClick={() =>
                            tab.selectAccessPoint(group.id, point.id)
                          }
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {point.title ?? point.id}
                          </span>
                          <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                            {point.isPickable
                              ? `${point.schema?.columns.length ?? 0} columns`
                              : point.disabledReason}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-base" htmlFor={warehouseId}>
            Warehouse
          </label>
          <input
            id={warehouseId}
            className={clsx(INPUT_CLASS, 'min-w-0 flex-1')}
            spellCheck={false}
            disabled={project !== undefined}
            value={tab.warehouse}
            onChange={(event) => tab.setWarehouse(event.target.value)}
          />
        </div>
        {tab.isAdding && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.RESOLVING_SOURCE}
          </div>
        )}
        {tab.error !== undefined && (
          <CubeDataProductTabAlert error={tab.error} />
        )}
      </div>
    );
  },
);
