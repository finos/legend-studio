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
import {
  CUBE_ACCESS_POINT_GROUP_ACCESS_LABELS,
  CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS,
  CUBE_NO_ACCESS_LABEL,
  CUBE_SNAPSHOT_VERSION_LABEL,
  getCubeRequestAccessLabel,
} from '../../__lib__/LegendCubeDataProductLabels.js';
import {
  CUBE_PENDING_LABEL,
  NULL_CELL_TEXT,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import type { CubeDataProductEnvironmentType } from '../../graph-manager/CubeDataProduct.js';
import {
  type CubeDataProductTabError,
  type CubeDataProductTabState,
  CUBE_DATA_PRODUCT_TAB_MESSAGE,
} from '../../stores/source-picker/CubeDataProductTabState.js';
import type { CubeAccessPoint } from '../../graph-manager/CubeDataProductCatalog.js';
import type { CubeResultValue } from '../../graph-manager/CubeEngine.js';
import {
  CUBE_PICKER_LIST_CLASS,
  CubePickerListItem,
} from './CubePickerListItem.js';
import { CubeButton } from '../CubeButton.js';
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';
import { CubePickerStep } from './CubePickerStep.js';
import { CUBE_PROJECT_SOURCE_LABEL } from '../../__lib__/LegendCubeProjectSourceLabels.js';
import { isCubeProjectHost } from '../../stores/CubeHost.js';

const INPUT_CLASS =
  'h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]';

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
 * The viewer's access to a group, once read: granted or on its way, or a
 * link to request it in the marketplace; nothing while unread or unreadable
 */
const CubeAccessPointGroupBadge = observer(
  (props: { tab: CubeDataProductTabState; groupId: string }) => {
    const { tab, groupId } = props;
    const access = tab.access?.get(groupId);
    if (access === undefined) {
      return null;
    }
    const label = CUBE_ACCESS_POINT_GROUP_ACCESS_LABELS[access];
    if (label !== undefined) {
      return (
        <span className="shrink-0 rounded-sm bg-[var(--color-bg-panel-header)] px-1">
          {label}
        </span>
      );
    }
    const link = tab.getAccessPointGroupLink(groupId);
    return link !== undefined ? (
      <a
        className="shrink-0 text-[var(--color-accent)] underline"
        href={link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {getCubeRequestAccessLabel(undefined, undefined)}
      </a>
    ) : (
      <span className="shrink-0">{CUBE_NO_ACCESS_LABEL}</span>
    );
  },
);

/** A sample value as the preview shows it; an empty one plainly */
const CubeSampleValue: React.FC<{ value: CubeResultValue }> = ({ value }) =>
  value === null ? (
    <span className="text-[var(--color-text-muted)]">{NULL_CELL_TEXT}</span>
  ) : (
    <>{String(value)}</>
  );

/**
 * The picked access point, from the deployed artifact alone (PLAN §6.8):
 * its description, its columns, up to five of the artifact's sample rows,
 * and its product's page in the marketplace
 */
const CubeAccessPointPreview: React.FC<{
  accessPoint: CubeAccessPoint;
  marketplaceLink: string | undefined;
  /** False where products have no deployed artifact to read sample rows from, as a Studio workspace's */
  fromArtifact?: boolean | undefined;
}> = ({ accessPoint, marketplaceLink, fromArtifact = true }) => (
  <section
    className="flex flex-col gap-1 rounded-sm border border-[var(--color-border-default)] p-2"
    aria-label="Access point preview"
  >
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate font-medium">
        {accessPoint.title ?? accessPoint.id}
      </span>
      {marketplaceLink !== undefined && (
        <a
          className="shrink-0 text-base text-[var(--color-accent)] underline"
          href={marketplaceLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Marketplace
        </a>
      )}
    </div>
    <span className="text-base text-[var(--color-text-secondary)]">
      {accessPoint.description ?? 'No description'}
    </span>
    {accessPoint.schema && (
      <CubeSchemaColumnsTable schema={accessPoint.schema} />
    )}
    {accessPoint.sampleRows.length && accessPoint.schema ? (
      <div className="overflow-x-auto">
        <table className="text-base" aria-label="Sample rows">
          <thead>
            <tr className="text-left text-[var(--color-text-secondary)]">
              {accessPoint.schema.columns.map((column) => (
                <th key={column.name} className="pr-3 font-normal">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accessPoint.sampleRows.map((row, index) => (
              // eslint-disable-next-line react/no-array-index-key -- sample rows have no identity
              <tr key={index}>
                {row.map((value, column) => (
                  // eslint-disable-next-line react/no-array-index-key -- by position, as the columns
                  <td key={column} className="whitespace-nowrap pr-3">
                    <CubeSampleValue value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : fromArtifact ? (
      <span className="text-base text-[var(--color-text-muted)]">
        No sample rows in the deployed artifact
      </span>
    ) : null}
  </section>
);

/** A product's access points, by group, each picked or ticked to add */
const CubeAccessPointList = observer(
  (props: { tab: CubeDataProductTabState }) => {
    const { tab } = props;
    if (!tab.description) {
      return null;
    }
    return (
      <ul
        className={`max-h-56 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
        aria-label="Access points"
      >
        {tab.description.groups.map((group) => (
          <li key={group.id}>
            <div className="flex items-center gap-2 px-2 pt-1 text-sm text-[var(--color-text-secondary)]">
              <span className="min-w-0 flex-1 truncate">
                {group.title ?? group.id}
              </span>
              <CubeAccessPointGroupBadge tab={tab} groupId={group.id} />
            </div>
            <ul aria-label={`Access points of ${group.title ?? group.id}`}>
              {group.accessPoints.map((point) => (
                <CubePickerListItem
                  key={point.id}
                  picked={tab.isAccessPointPicked(group.id, point.id)}
                  disabled={!point.isPickable}
                  title={point.disabledReason ?? point.description}
                  adds={true}
                  onPick={() => tab.selectAccessPoint(group.id, point.id)}
                  onToggle={() => tab.toggleAccessPoint(group.id, point.id)}
                  toggleLabel={point.title ?? point.id}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {point.title ?? point.id}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {point.isPickable
                      ? `${point.schema?.columns.length ?? 0} columns`
                      : point.disabledReason}
                  </span>
                </CubePickerListItem>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  },
);

/**
 * The Data Product tab on a host reading one project's data products
 * (Studio): the project's products by name, each path muted beside it, then
 * a product's access points; the runtime its runs use is named, not picked
 */
const CubeProjectDataProductTab = observer(
  (props: { tab: CubeDataProductTabState }) => {
    const { tab } = props;
    const candidates = tab.candidates;
    return (
      <div className="flex flex-col gap-2">
        <span
          className="text-sm text-[var(--color-text-muted)]"
          aria-label="Runtime"
        >
          {tab.projectRuntime
            ? CUBE_PROJECT_SOURCE_LABEL.RUNS_ON(tab.projectRuntime.label)
            : tab.isReadingProjectRuntime
              ? CUBE_PROJECT_SOURCE_LABEL.READING_RUNTIME
              : ''}
        </span>
        {tab.projectRuntimeError !== undefined && (
          <CubeDataProductTabAlert error={tab.projectRuntimeError} />
        )}
        {tab.isListing && (
          <div className="text-base text-[var(--color-text-secondary)]">
            listing data products
          </div>
        )}
        {tab.listError !== undefined && (
          <CubeDataProductTabAlert error={tab.listError}>
            <div>
              <CubeButton onClick={() => tab.retryListing()}>Retry</CubeButton>
            </div>
          </CubeDataProductTabAlert>
        )}
        {candidates && (
          <ul
            className={`max-h-40 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
            aria-label="Data products"
          >
            {candidates.map((candidate) => (
              <CubePickerListItem
                key={candidate.dataProductPath}
                picked={tab.candidate === candidate}
                title={candidate.description ?? candidate.dataProductPath}
                onPick={() => tab.selectCandidate(candidate)}
              >
                <span className="shrink-0">{candidate.title}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-muted)]">
                  {candidate.dataProductPath}
                </span>
              </CubePickerListItem>
            ))}
          </ul>
        )}
        {candidates?.length === 0 && (
          <span className="text-sm text-[var(--color-text-muted)]">
            {CUBE_PROJECT_SOURCE_LABEL.NO_DATA_PRODUCTS}
          </span>
        )}
        {tab.isDescribing && (
          <div className="text-base text-[var(--color-text-secondary)]">
            loading access points
          </div>
        )}
        <CubeAccessPointList tab={tab} />
        {tab.accessPoint?.isPickable === true && (
          <CubeAccessPointPreview
            accessPoint={tab.accessPoint}
            marketplaceLink={undefined}
            fromArtifact={false}
          />
        )}
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

/**
 * The source dialog's Data Product tab (PLAN §6.8), as Data Cube's selection
 * goes: the mode, a deployed data product, one of its access points, and the
 * warehouse. The dialog's Add adds the access point.
 */
export const CubeDataProductTab = observer(
  (props: { tab: CubeDataProductTabState }) => {
    const { tab } = props;
    const warehouseId = useId();
    const project = tab.fixedProject;
    // a host reading one project's data products, as Studio, lists them
    // alone: no class, search or warehouse to pick, its runtime named instead
    if (isCubeProjectHost(tab.editorState.host)) {
      return <CubeProjectDataProductTab tab={tab} />;
    }
    return (
      <div className="flex flex-col gap-2">
        <CubePickerStep
          label="Mode"
          value={tab.environmentType}
          options={(tab.catalog?.environmentTypes ?? []).map((type) => ({
            value: type,
            label: CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS[type],
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
        {tab.isSnapshot && (
          <span className="text-sm text-[var(--color-status-warn)]">
            {CUBE_SNAPSHOT_VERSION_LABEL}
          </span>
        )}
        <input
          className={INPUT_CLASS}
          placeholder="Search data products"
          aria-label="Search data products"
          value={tab.search}
          onChange={(event) => tab.setSearch(event.target.value)}
        />
        {project && (
          <div
            className="flex items-center gap-3 text-base"
            role="radiogroup"
            aria-label="Data products shown"
          >
            {[
              { label: 'In this project', value: false },
              { label: 'Search all', value: true },
            ].map(({ label, value }) => (
              <label key={label} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="cube-data-products-shown"
                  checked={tab.showAllProjects === value}
                  onChange={() => tab.setShowAllProjects(value)}
                />
                {label}
              </label>
            ))}
          </div>
        )}
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
          className={`max-h-40 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
          aria-label="Data products"
        >
          {tab.shownCandidates.map((candidate) => {
            const isPicked = tab.candidate === candidate;
            const reason = tab.getCandidateDisabledReason(candidate);
            return (
              <CubePickerListItem
                key={`${candidate.id}/${candidate.deploymentId}`}
                picked={isPicked}
                disabled={reason !== undefined}
                title={reason ?? candidate.description}
                onPick={() => tab.selectCandidate(candidate)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {candidate.title}
                </span>
                <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                  {reason ?? `${candidate.id} · ${candidate.versionId}`}
                </span>
              </CubePickerListItem>
            );
          })}
        </ul>
        {project !== undefined &&
          !tab.showAllProjects &&
          !tab.isListing &&
          tab.listError === undefined &&
          tab.candidates !== undefined &&
          tab.search.trim().length > 0 &&
          !tab.shownCandidates.length && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {CUBE_DATA_PRODUCT_TAB_MESSAGE.NONE_IN_PROJECT}
            </span>
          )}
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
        <CubeAccessPointList tab={tab} />
        {tab.accessPoint?.isPickable === true && (
          <CubeAccessPointPreview
            accessPoint={tab.accessPoint}
            marketplaceLink={tab.marketplaceLink}
          />
        )}
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-base" htmlFor={warehouseId}>
            Warehouse
          </label>
          <input
            id={warehouseId}
            className={clsx(INPUT_CLASS, 'min-w-0 flex-1')}
            spellCheck={false}
            disabled={project !== undefined || tab.editorState.readOnly}
            title={tab.editorState.readOnly ? READ_ONLY_CUBE_TITLE : undefined}
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
