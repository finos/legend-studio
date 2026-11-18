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

import { DatabaseImportIcon, TimesIcon } from '@finos/legend-art';
import type { V1_DataProductArtifact } from '@finos/legend-graph';
import { Drawer } from '@mui/material';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import type {
  DataProductIngestViewState,
  DataProductProducerViewsState,
} from '../../stores/DataProduct/DataProductProducerViewsState.js';
import { DataProductDefinitionSection } from './DataProductAccessPointCode.js';
import { DataProductDefinitionUnavailable } from './DataProductAccessPointDefinitionFlow.js';

// A materialized view of Producer Info, in a panel on the right of the page:
// what it reads, its key and the access points that read it, then its
// function, as Legend Cube's flow or as Pure.

/** The access points whose definitions read the data set, by the artifact */
const getAccessPointsReading = (
  artifact: V1_DataProductArtifact | undefined,
  ingestDefinitionPath: string,
  dataSet: string,
): string[] =>
  artifact?.accessPointGroups.flatMap((group) =>
    group.accessPointImplementations
      .filter((accessPoint) =>
        accessPoint.dependencyDatasets.some(
          (read) =>
            read.ingestDefinition.path === ingestDefinitionPath &&
            read.dataset === dataSet,
        ),
      )
      .map((accessPoint) => accessPoint.id),
  ) ?? [];

/** Fetches a view's function as Pure, telling of a failure */
const fetchPure = (view: DataProductIngestViewState): void => {
  flowResult(view.fetchPure()).catch(
    view.producerViewsState.viewerState.applicationStore.alertUnhandledError,
  );
};

/** "View": a data set whose rows its ingest definition computes */
export const DataProductIngestViewTag: React.FC = () => (
  <span
    className="data-product__viewer__producer-view__view-tag"
    title="A materialized view: its ingest definition computes its rows with a function"
  >
    View
  </span>
);

const DataProductProducerViewDefinition = observer(
  (props: {
    view: DataProductIngestViewState;
    artifact: V1_DataProductArtifact | undefined;
  }) => {
    const { view, artifact } = props;
    const { producerViewsState } = view;

    useEffect(() => {
      fetchPure(view);
    }, [view]);

    const reads = view.reads;
    const readBy = getAccessPointsReading(
      artifact,
      view.ingestDefinitionPath,
      view.name,
    );

    return (
      <DataProductDefinitionSection
        flowState={view.definitionFlowState}
        className="data-product__viewer__definition--panel"
        label={`How ${view.name} is made`}
        title={
          <span className="data-product__viewer__producer-view__view-title">
            <DatabaseImportIcon />
            {view.name}
            <DataProductIngestViewTag />
          </span>
        }
        caption={`A materialized view: its ingest definition computes its rows${
          reads.length === 0
            ? ''
            : reads.length === 1
              ? ' from a data set'
              : ' from other data sets'
        } with a function, and keeps them.`}
        copyLabel="function"
        pure={view.pure}
        isFetchingPure={
          view.fetchingPureState.isInInitialState ||
          view.fetchingPureState.isInProgress
        }
        onRetryPure={() => {
          view.resetPure();
          fetchPure(view);
        }}
        unavailable={(onRetry) => (
          <DataProductDefinitionUnavailable
            subject="this view's function"
            onRetry={onRetry}
          />
        )}
      >
        <dl className="data-product__viewer__producer-view__facts">
          {/* none found when it reads them only through the functions it
          calls, whose bodies come from Depot: its flow shows them */}
          {reads.length > 0 && (
            <div className="data-product__viewer__producer-view__fact">
              <dt>Reads</dt>
              <dd>
                {reads.map((read) => {
                  const readView = producerViewsState.getView(
                    read.ingestDefinitionPath,
                    read.datasetName,
                  );
                  const key = `${read.ingestDefinitionPath}.${read.datasetName}`;
                  const chip = (
                    <>
                      <DatabaseImportIcon />
                      <span className="data-product__viewer__producer-view__chip__name">
                        {read.datasetName}
                      </span>
                      {readView && <DataProductIngestViewTag />}
                    </>
                  );
                  return readView ? (
                    <button
                      key={key}
                      type="button"
                      className="data-product__viewer__producer-view__chip data-product__viewer__producer-view__chip--link"
                      title={`See how ${read.datasetName} is made`}
                      onClick={() => producerViewsState.showView(readView)}
                    >
                      {chip}
                    </button>
                  ) : (
                    <span
                      key={key}
                      className="data-product__viewer__producer-view__chip"
                      title={read.ingestDefinitionPath}
                    >
                      {chip}
                    </span>
                  );
                })}
              </dd>
            </div>
          )}
          <div className="data-product__viewer__producer-view__fact">
            <dt>Key</dt>
            <dd className="data-product__viewer__producer-view__fact--code">
              {view.dataSet.primaryKey.length
                ? view.dataSet.primaryKey.join(', ')
                : '—'}
            </dd>
          </div>
          {readBy.length > 0 && (
            <div className="data-product__viewer__producer-view__fact">
              <dt>Read by</dt>
              <dd className="data-product__viewer__producer-view__fact--code">
                {readBy.join(', ')}
              </dd>
            </div>
          )}
        </dl>
      </DataProductDefinitionSection>
    );
  },
);

/**
 * The view Producer Info's Flow opened, in a panel over the right of the
 * page, with room for its whole flow
 */
export const DataProductProducerViewPanel = observer(
  (props: {
    producerViewsState: DataProductProducerViewsState;
    artifact: V1_DataProductArtifact | undefined;
  }) => {
    const { producerViewsState, artifact } = props;
    const view = producerViewsState.shownView;
    const close = (): void => producerViewsState.hideView();

    return (
      <Drawer
        anchor="right"
        open={view !== undefined}
        onClose={close}
        slotProps={{
          paper: { className: 'data-product__viewer__producer-view-panel' },
        }}
      >
        {view && (
          <div className="data-product__viewer__producer-view-panel__body">
            <div className="data-product__viewer__producer-view-panel__top">
              <span className="data-product__viewer__producer-view-panel__crumb">
                {`Producer Info · ${view.ingestDefinitionPath}`}
              </span>
              <button
                type="button"
                className="data-product__viewer__producer-view-panel__close"
                title="Close"
                aria-label="Close"
                onClick={close}
              >
                <TimesIcon />
              </button>
            </div>
            <DataProductProducerViewDefinition
              // a view read by this one opens in its place
              key={`${view.ingestDefinitionPath}.${view.name}`}
              view={view}
              artifact={artifact}
            />
          </div>
        )}
      </Drawer>
    );
  },
);
