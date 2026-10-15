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
import { Fragment, useId } from 'react';
import {
  getDroppedDefinitionsLabel,
  getFixedProducerLabel,
  getIngestEnvironmentLabel,
} from '../../__lib__/LegendCubeIngestLabels.js';
import {
  CUBE_PENDING_LABEL,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeIngestTabError,
  type CubeIngestTabState,
  getCubeIngestEnvironmentId,
} from '../../stores/source-picker/CubeIngestTabState.js';
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
 * The data sets of the opened definitions, as both Ingest screens list them,
 * each picked or ticked to add, under its definition's name when several are
 * opened; the one picked last previewed
 */
const CubeIngestDataSets = observer((props: { tab: CubeIngestTabState }) => {
  const { tab } = props;
  const read = tab.definitions.filter(
    (definition) => tab.getDataSets(definition.urn) !== undefined,
  );
  const grouped = tab.definitions.length > 1;
  return (
    <>
      {tab.isDescribing && (
        <div className="text-base text-[var(--color-text-secondary)]">
          reading the definition
        </div>
      )}
      {read.length > 0 && (
        <ul
          className={`max-h-48 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
          aria-label="Data sets"
        >
          {read.map((definition) => (
            <Fragment key={definition.urn}>
              {grouped && (
                <li className="px-2 pt-1 text-sm text-[var(--color-text-muted)]">
                  {definition.name}
                </li>
              )}
              {(tab.getDataSets(definition.urn) ?? []).map((dataSet) => (
                <CubePickerListItem
                  key={dataSet.name}
                  picked={tab.isDataSetPicked(dataSet.name, definition.urn)}
                  disabled={!dataSet.isPickable}
                  title={dataSet.disabledReason}
                  adds={true}
                  onPick={() => tab.selectDataSet(dataSet.name, definition.urn)}
                  onToggle={() =>
                    tab.toggleDataSet(dataSet.name, definition.urn)
                  }
                  toggleLabel={
                    grouped
                      ? `${dataSet.name} of ${definition.name}`
                      : dataSet.name
                  }
                >
                  <span className="min-w-0 flex-1 truncate">
                    {dataSet.name}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                    {dataSet.isPickable
                      ? `${dataSet.schema?.columns.length ?? 0} columns`
                      : dataSet.disabledReason}
                  </span>
                </CubePickerListItem>
              ))}
            </Fragment>
          ))}
        </ul>
      )}
      {tab.dataSet?.schema && (
        <section aria-label="Data set preview" className="flex flex-col gap-1">
          {grouped && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {`${tab.dataSet.name} of ${tab.previewedDefinition?.name ?? ''}`}
            </span>
          )}
          <CubeSchemaColumnsTable schema={tab.dataSet.schema} />
        </section>
      )}
    </>
  );
});

/**
 * The Ingest tab on a host reading one project's definitions (Studio): the
 * project's definitions by name, each path muted beside it, then the data
 * sets of the one picked, or of several ticked; the runtime its runs use is
 * named, not picked
 */
const CubeProjectIngestTab = observer((props: { tab: CubeIngestTabState }) => {
  const { tab } = props;
  const candidates = tab.definitionList?.candidates;
  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-sm text-[var(--color-text-muted)]"
        aria-label="Runtime"
      >
        {tab.environment
          ? CUBE_PROJECT_SOURCE_LABEL.RUNS_ON(tab.environment.name)
          : tab.isLoadingEnvironment
            ? CUBE_PROJECT_SOURCE_LABEL.READING_RUNTIME
            : ''}
      </span>
      {tab.isListingDefinitions && (
        <div className="text-base text-[var(--color-text-secondary)]">
          listing ingest definitions
        </div>
      )}
      {candidates && (
        <ul
          className={`max-h-40 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
          aria-label="Ingest definitions"
        >
          {candidates.map((candidate) => (
            <CubePickerListItem
              key={candidate.urn}
              picked={tab.isDefinitionOpened(candidate)}
              title={candidate.definition}
              onPick={() => tab.selectDefinition(candidate)}
              onToggle={() => tab.toggleDefinition(candidate)}
              toggleLabel={candidate.name}
            >
              <span className="shrink-0">{candidate.name}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-muted)]">
                {candidate.definition}
              </span>
            </CubePickerListItem>
          ))}
        </ul>
      )}
      {candidates?.length === 0 && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {CUBE_PROJECT_SOURCE_LABEL.NO_INGEST_DEFINITIONS}
        </span>
      )}
      <CubeIngestDataSets tab={tab} />
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

/**
 * The source dialog's Ingest tab (PLAN §6.7): an ingest environment of any
 * class, the viewer's own production one first picked, a producer
 * deployment, one of its definitions, or several ticked, then data sets
 * with their columns. The cube's first data set fixes the environment, the
 * producer deployment and the warehouse.
 */
export const CubeIngestTab = observer((props: { tab: CubeIngestTabState }) => {
  const { tab } = props;
  const warehouseId = useId();
  const settings = tab.fixedSettings;
  const dropped = getDroppedDefinitionsLabel(
    tab.definitionList?.droppedCount ?? 0,
  );
  // a host reading one project's definitions, as Studio, lists them alone:
  // no class, deployment or warehouse to pick, its runtime named instead
  const projectScoped = isCubeProjectHost(tab.editorState.host);
  if (projectScoped) {
    return <CubeProjectIngestTab tab={tab} />;
  }
  return (
    <div className="flex flex-col gap-2">
      <CubePickerStep
        label="Environment"
        value={
          tab.environment
            ? getCubeIngestEnvironmentId(tab.environment)
            : undefined
        }
        options={(tab.environments ?? []).map((environment) => ({
          value: getCubeIngestEnvironmentId(environment),
          label: getIngestEnvironmentLabel(environment),
        }))}
        disabled={settings !== undefined}
        onChange={(value) => {
          const picked = tab.environments?.find(
            (environment) => getCubeIngestEnvironmentId(environment) === value,
          );
          if (picked) {
            tab.setEnvironment(picked);
          }
        }}
      />
      {tab.isLoadingEnvironment && !tab.environment && (
        <span className="text-sm text-[var(--color-text-muted)]">
          reading the ingest environments
        </span>
      )}
      <CubePickerStep
        label="Producer"
        value={tab.producerDeploymentId}
        options={(tab.producers ?? []).map((producer) => ({
          value: producer.deploymentId,
          label: tab.getProducerLabel(producer.deploymentId),
        }))}
        disabled={settings !== undefined}
        onChange={(value) => tab.selectProducer(value)}
      />
      {settings && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {`All of the cube's data sets come from producer deployment ${getFixedProducerLabel(settings.producerDeploymentId, tab.producerNames.get(settings.producerDeploymentId))}.`}
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
          className={`max-h-40 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
          aria-label="Ingest definitions"
        >
          {tab.shownDefinitions.map((candidate) => {
            const isPicked = tab.isDefinitionOpened(candidate);
            return (
              <CubePickerListItem
                key={candidate.urn}
                picked={isPicked}
                title={candidate.definition}
                onPick={() => tab.selectDefinition(candidate)}
                onToggle={() => tab.toggleDefinition(candidate)}
                toggleLabel={candidate.name}
              >
                <span className="min-w-0 flex-1 truncate">
                  {candidate.name}
                </span>
                <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                  {`${candidate.groupId}:${candidate.artifactId}`}
                </span>
              </CubePickerListItem>
            );
          })}
        </ul>
      )}
      {dropped !== undefined && (
        <span className="text-sm text-[var(--color-text-muted)]">
          {dropped}
        </span>
      )}
      <CubeIngestDataSets tab={tab} />
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
