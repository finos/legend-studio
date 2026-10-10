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
import { CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS } from '../../__lib__/LegendCubeDataProductLabels.js';
import { getDroppedDefinitionsLabel } from '../../__lib__/LegendCubeIngestLabels.js';
import {
  CUBE_PENDING_LABEL,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import type { CubeDataProductEnvironmentType } from '../../graph-manager/CubeDataProduct.js';
import type {
  CubeIngestTabError,
  CubeIngestTabState,
} from '../../stores/source-picker/CubeIngestTabState.js';
import { CubeButton } from '../CubeButton.js';
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';
import { CubePickerStep } from './CubePickerStep.js';

const INPUT_CLASS =
  'h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]';

const LIST_ITEM_CLASS =
  'flex w-full items-center gap-2 px-2 py-1 text-left text-base enabled:hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]';

/** An error as the tab shows it: its first line, the rest on demand, and an action when it has one */
const CubeIngestTabAlert: React.FC<{
  error: CubeIngestTabError;
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
 * The source dialog's Ingest tab (PLAN §6.7): Mode, the viewer's
 * environment (read-only), a producer deployment, one of its definitions,
 * then a data set with its columns. The cube's first data set fixes the
 * Mode, the producer deployment and the warehouse.
 */
export const CubeIngestTab = observer((props: { tab: CubeIngestTabState }) => {
  const { tab } = props;
  const warehouseId = useId();
  const settings = tab.fixedSettings;
  const dropped = getDroppedDefinitionsLabel(
    tab.definitionList?.droppedCount ?? 0,
  );
  return (
    <div className="flex flex-col gap-2">
      <CubePickerStep
        label="Mode"
        value={tab.environmentType}
        options={(tab.catalog?.environmentTypes ?? []).map((type) => ({
          value: type,
          label: CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS[type],
        }))}
        disabled={settings !== undefined}
        onChange={(value) => {
          if (value) {
            tab.setEnvironmentType(value as CubeDataProductEnvironmentType);
          }
        }}
      />
      <div className="flex items-center gap-2 text-base">
        <span className="w-20 shrink-0">Environment</span>
        <span aria-label="Environment">
          {tab.environment?.name ??
            (tab.isLoadingEnvironment ? 'reading your environment' : '')}
        </span>
      </div>
      <CubePickerStep
        label="Producer"
        value={tab.producerDeploymentId}
        options={(tab.producers ?? []).map((producer) => ({
          value: producer.deploymentId,
          label: `Deployment ${producer.deploymentId}`,
        }))}
        disabled={settings !== undefined}
        onChange={(value) => tab.selectProducer(value)}
      />
      {settings && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {`All of the cube's data sets come from producer deployment ${settings.producerDeploymentId}.`}
        </span>
      )}
      {tab.producerDeploymentId !== undefined && (
        <input
          className={INPUT_CLASS}
          placeholder="Search ingest definitions"
          aria-label="Search ingest definitions"
          value={tab.definitionSearch}
          onChange={(event) => tab.setDefinitionSearch(event.target.value)}
        />
      )}
      {tab.isListingDefinitions && (
        <div className="text-base text-[var(--color-text-secondary)]">
          listing ingest definitions
        </div>
      )}
      {tab.definitionList && (
        <ul
          className="max-h-40 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
          aria-label="Ingest definitions"
        >
          {tab.shownDefinitions.map((candidate) => {
            const isPicked = tab.definition?.urn === candidate.urn;
            return (
              <li key={candidate.urn}>
                <button
                  type="button"
                  className={clsx(LIST_ITEM_CLASS, {
                    'bg-[var(--color-bg-selected)]': isPicked,
                  })}
                  aria-pressed={isPicked}
                  title={candidate.definition}
                  onClick={() => tab.selectDefinition(candidate)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {candidate.name}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {`${candidate.groupId}:${candidate.artifactId}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {dropped !== undefined && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {dropped}
        </span>
      )}
      {tab.isDescribing && (
        <div className="text-base text-[var(--color-text-secondary)]">
          reading the definition
        </div>
      )}
      {tab.dataSets && (
        <ul
          className="max-h-40 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
          aria-label="Data sets"
        >
          {tab.dataSets.map((dataSet) => {
            const isPicked = tab.dataSetName === dataSet.name;
            return (
              <li key={dataSet.name}>
                <button
                  type="button"
                  className={clsx(LIST_ITEM_CLASS, {
                    'bg-[var(--color-bg-selected)]': isPicked,
                  })}
                  aria-pressed={isPicked}
                  disabled={!dataSet.isPickable}
                  title={dataSet.disabledReason}
                  onClick={() => tab.selectDataSet(dataSet.name)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {dataSet.name}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {dataSet.isPickable
                      ? `${dataSet.schema?.columns.length ?? 0} columns`
                      : dataSet.disabledReason}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {tab.dataSet?.schema && (
        <section aria-label="Data set preview">
          <CubeSchemaColumnsTable schema={tab.dataSet.schema} />
        </section>
      )}
      <div className="flex items-center gap-2">
        <label className="w-20 shrink-0 text-base" htmlFor={warehouseId}>
          Warehouse
        </label>
        <input
          id={warehouseId}
          className={clsx(INPUT_CLASS, 'min-w-0 flex-1')}
          spellCheck={false}
          disabled={settings !== undefined || tab.editorState.readOnly}
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
        <CubeIngestTabAlert error={tab.error}>
          <div>
            <CubeButton onClick={() => tab.retry()}>Retry</CubeButton>
          </div>
        </CubeIngestTabAlert>
      )}
    </div>
  );
});
