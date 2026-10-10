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

import { IngestDatasetSource } from '@finos/legend-cube';
import { PanelLoadingIndicator } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS } from '../../__lib__/LegendCubeDataProductLabels.js';
import { CUBE_PENDING_LABEL } from '../../__lib__/LegendCubeLabels.js';
import { getCubeIngestSettings } from '../../graph-manager/CubeIngest.js';
import { CubeButton } from '../CubeButton.js';
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';
import { CubeWarehouseControl } from './CubeWarehouseControl.js';

/**
 * An ingest data set (PLAN §6.7): where it reads from, the cube's class,
 * producer deployment and warehouse, which can be edited, its columns as
 * its deployed definition declares them, and Refresh, which reads the
 * definition again
 */
export const CubeIngestSourceEditor = observer((props: CubeNodeEditorProps) => {
  const { editorState, readOnly } = props;
  const source = guaranteeType(props.draft.original, IngestDatasetSource);
  const { resolution } = source;
  const refreshing = editorState.isPendingSource(source);
  const model = editorState.document.context?.model;
  const settings = model ? getCubeIngestSettings(model) : undefined;
  return (
    <div className="relative flex flex-col gap-2">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-base">
        <dt className="text-[var(--color-text-secondary)]">Definition</dt>
        <dd className="min-w-0 break-all" title={source.ingestDefinitionUrn}>
          {source.ingestDefinition}
        </dd>
        <dt className="text-[var(--color-text-secondary)]">Data set</dt>
        <dd className="min-w-0 break-all">{source.dataSet}</dd>
        {settings && (
          <>
            <dt className="text-[var(--color-text-secondary)]">Environment</dt>
            <dd className="min-w-0 break-all">
              {CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS[settings.environmentType]}
            </dd>
            <dt className="text-[var(--color-text-secondary)]">Producer</dt>
            <dd className="min-w-0 break-all">
              {`Deployment ${settings.producerDeploymentId}`}
            </dd>
            <dt className="self-center text-[var(--color-text-secondary)]">
              Warehouse
            </dt>
            <dd className="min-w-0">
              <CubeWarehouseControl
                runtime={editorState.dataProductRuntime}
                readOnly={readOnly}
              />
            </dd>
          </>
        )}
      </dl>
      <div className="flex items-center gap-2">
        <CubeButton
          title="Read the data set's columns again from the deployed ingest definition"
          disabled={refreshing}
          onClick={() => {
            flowResult(editorState.refreshSource(source.id)).catch(
              editorState.host.applicationStore.alertUnhandledError,
            );
          }}
        >
          Refresh
        </CubeButton>
        {refreshing && (
          <span className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.REFRESHING_SOURCE}
          </span>
        )}
      </div>
      <PanelLoadingIndicator isLoading={refreshing} />
      {resolution.kind === 'resolved' ? (
        <CubeSchemaColumnsTable schema={resolution.schema} />
      ) : (
        <div className="text-base text-[var(--color-text-secondary)]">
          {resolution.kind === 'failed'
            ? resolution.message
            : 'The data set has not been typed yet.'}
        </div>
      )}
    </div>
  );
});
