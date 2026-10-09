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

import {
  type CubeContext,
  DataProductAccessPointSource,
} from '@finos/legend-cube';
import { PanelLoadingIndicator } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS,
  CUBE_SNAPSHOT_VERSION_LABEL,
  CUBE_WAREHOUSE_APPLY_TITLE,
  getCubeWarehouseErrorHint,
} from '../../__lib__/LegendCubeDataProductLabels.js';
import {
  CUBE_PENDING_LABEL,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import {
  CubeDataProductRunErrorKind,
  type CubeDataProductRuntimeState,
} from '../../stores/CubeDataProductRuntimeState.js';
import { CubeButton } from '../CubeButton.js';
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/**
 * The warehouse the cube runs on, edited in place: Apply, or Enter, runs the
 * cube on another one, as one undo step. Text typed but not applied belongs
 * to the cube's context it was typed on; once the context changes, e.g. on
 * Undo, the control shows the cube's warehouse again
 */
const CubeWarehouseControl = observer(
  (props: { runtime: CubeDataProductRuntimeState; readOnly: boolean }) => {
    const { runtime, readOnly } = props;
    const { context } = runtime.editorState.document;
    const current = runtime.effectiveWarehouse ?? '';
    const [draft, setDraft] = useState<
      { context: CubeContext | undefined; text: string } | undefined
    >();
    const text =
      draft !== undefined && draft.context === context ? draft.text : current;
    const disabled = readOnly || !runtime.canEditWarehouse;
    const canApply =
      !disabled && text.trim().length > 0 && text.trim() !== current;
    const apply = (): void => {
      if (canApply && runtime.setWarehouse(text)) {
        setDraft(undefined);
      }
    };
    return (
      <span className="flex min-w-0 items-center gap-1">
        <input
          className="h-6 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]"
          aria-label="Warehouse"
          spellCheck={false}
          disabled={disabled}
          title={readOnly ? READ_ONLY_CUBE_TITLE : undefined}
          value={text}
          onChange={(event) => setDraft({ context, text: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              apply();
            }
          }}
        />
        <CubeButton
          title={readOnly ? READ_ONLY_CUBE_TITLE : CUBE_WAREHOUSE_APPLY_TITLE}
          disabled={!canApply}
          onClick={apply}
        >
          Apply
        </CubeButton>
      </span>
    );
  },
);

/**
 * A data product's access point (PLAN §6.8): where it reads from, the
 * cube's project, class and warehouse, which can be edited, its columns as
 * the deployed artifact types them, and Refresh, which reads them again
 */
export const CubeDataProductSourceEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { editorState, readOnly } = props;
    const source = guaranteeType(
      props.draft.original,
      DataProductAccessPointSource,
    );
    const { resolution } = source;
    const refreshing = editorState.isPendingSource(source);
    const runtime = editorState.dataProductRuntime;
    const { project } = runtime;
    const marketplaceLink = project
      ? editorState.host.dataProductCatalog?.getMarketplaceLink({
          dataProductId: source.dataProductId,
          deploymentId: source.deploymentId,
          environmentType: project.environmentType,
          accessPointGroup: source.accessPointGroup,
        })
      : undefined;
    return (
      <div className="relative flex flex-col gap-2">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-[var(--color-text-secondary)]">Data product</dt>
          <dd className="min-w-0 break-all" title={source.dataProduct}>
            {source.dataProductName}
            {marketplaceLink !== undefined && (
              <a
                className="ml-2 text-[var(--color-accent)] underline"
                href={marketplaceLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Marketplace
              </a>
            )}
          </dd>
          <dt className="text-[var(--color-text-secondary)]">Access point</dt>
          <dd className="min-w-0 break-all">{source.accessPoint}</dd>
          <dt className="text-[var(--color-text-secondary)]">Group</dt>
          <dd className="min-w-0 break-all">{source.accessPointGroup}</dd>
          {project && (
            <>
              <dt className="text-[var(--color-text-secondary)]">Project</dt>
              <dd className="min-w-0 break-all">
                {`${project.groupId}:${project.artifactId}:${project.versionId}`}
                {runtime.isSnapshot && (
                  <span className="block text-sm text-[var(--color-status-warn)]">
                    {CUBE_SNAPSHOT_VERSION_LABEL}
                  </span>
                )}
              </dd>
              <dt className="text-[var(--color-text-secondary)]">
                Environment
              </dt>
              <dd className="min-w-0 break-all">
                {CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS[project.environmentType]}
              </dd>
              <dt className="self-center text-[var(--color-text-secondary)]">
                Warehouse
              </dt>
              <dd className="min-w-0">
                <CubeWarehouseControl runtime={runtime} readOnly={readOnly} />
                {runtime.runErrorKind ===
                  CubeDataProductRunErrorKind.WAREHOUSE && (
                  <span
                    className="mt-1 block text-sm text-[var(--color-status-error)]"
                    role="alert"
                  >
                    {getCubeWarehouseErrorHint(
                      runtime.effectiveWarehouse ?? '',
                    )}
                  </span>
                )}
              </dd>
            </>
          )}
        </dl>
        <div className="flex items-center gap-2">
          <CubeButton
            title="Read the access point's columns again from the deployed data product"
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
              : 'The access point has not been typed yet.'}
          </div>
        )}
      </div>
    );
  },
);
