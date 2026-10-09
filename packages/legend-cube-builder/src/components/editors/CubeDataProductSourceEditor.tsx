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

import { DataProductAccessPointSource } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { getColumnTypeLabel } from '../../__lib__/LegendCubeLabels.js';
import {
  getCubeDataProductProject,
  getEffectiveCubeWarehouse,
} from '../../graph-manager/CubeDataProduct.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/**
 * A data product's access point (PLAN §6.8): where it reads from, the
 * cube's project and warehouse, and its columns as the deployed artifact
 * types them. Nothing here is edited
 */
export const CubeDataProductSourceEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { editorState } = props;
    const source = guaranteeType(
      props.draft.original,
      DataProductAccessPointSource,
    );
    const { resolution } = source;
    const model = editorState.document.context?.model;
    const project = model ? getCubeDataProductProject(model) : undefined;
    return (
      <div className="relative flex flex-col gap-2">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-[var(--color-text-secondary)]">Data product</dt>
          <dd className="min-w-0 break-all" title={source.dataProduct}>
            {source.dataProductName}
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
              </dd>
              <dt className="text-[var(--color-text-secondary)]">Warehouse</dt>
              <dd className="min-w-0 break-all">
                {getEffectiveCubeWarehouse(project, undefined)}
              </dd>
            </>
          )}
        </dl>
        {resolution.kind === 'resolved' ? (
          <table className="w-full text-base" aria-label="Columns">
            <thead>
              <tr className="text-left text-[var(--color-text-secondary)]">
                <th className="font-normal">Column</th>
                <th className="font-normal">Type</th>
              </tr>
            </thead>
            <tbody>
              {resolution.schema.columns.map((column) => (
                <tr key={column.name}>
                  <td className="break-all pr-2">{column.name}</td>
                  <td title={column.type.fullName}>
                    <span className="flex items-center gap-1">
                      <CubeColumnTypeIcon
                        type={column.type}
                        className="text-[var(--color-text-secondary)]"
                      />
                      {getColumnTypeLabel(column)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
