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

import type { SchemaDiff } from '@finos/legend-cube';
import { CubeDataProductEnvironmentType } from '../graph-manager/CubeDataProduct.js';
import { CubeAccessPointGroupAccess } from '../graph-manager/CubeDataProductCatalog.js';
import { getSchemaChangeList } from './LegendCubeLabels.js';

// The text of data product sources (PLAN §6.8): the source dialog's Data
// product tab and a data product source's panel

/** The deployment classes' labels, as Data Cube shows them */
export const CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS: Readonly<
  Record<CubeDataProductEnvironmentType, string>
> = {
  [CubeDataProductEnvironmentType.PRODUCTION]: 'Production',
  [CubeDataProductEnvironmentType.PRODUCTION_PARALLEL]: 'Production (parallel)',
};

/** Said of a project deployed from a SNAPSHOT version */
export const CUBE_SNAPSHOT_VERSION_LABEL =
  'A SNAPSHOT version: its data and columns may change';

export const CUBE_WAREHOUSE_APPLY_TITLE =
  "Run the cube on this warehouse; it's remembered for your next cubes";

/** The warning on an access point that changed since the cube was saved; its new columns are used */
export const getAccessPointDriftWarning = (diff: SchemaDiff): string =>
  `This access point changed since the cube was saved: ${getSchemaChangeList(diff)}`;

/** The warning on an access point Cube couldn't re-check, which keeps its saved columns */
export const getAccessPointRecheckWarning = (firstLine: string): string =>
  `Could not re-check this access point, so it keeps its saved columns: ${firstLine}`;

export const CUBE_DATA_PRODUCT_RECHECK_MESSAGE = {
  NO_ANSWER: 'The data product catalog gave no columns for this access point',
  NO_CATALOG: "This Legend deployment doesn't serve data products",
} as const;

/** Beside a run's error that says the cube's warehouse can't be used */
export const getCubeWarehouseErrorHint = (warehouse: string): string =>
  `The run couldn't use the warehouse ${warehouse}. Pick another one in a data product source's panel.`;

/** A link to ask for access to an access point group in the marketplace */
export const getCubeRequestAccessLabel = (
  accessPointGroup: string | undefined,
  dataProductName: string | undefined,
): string =>
  accessPointGroup && dataProductName
    ? `Request access to ${accessPointGroup} in ${dataProductName}`
    : 'Request access';

/**
 * The viewer's access to a group, as the marketplace says it; a group with
 * no access, or refused, offers to request it instead
 */
export const CUBE_ACCESS_POINT_GROUP_ACCESS_LABELS: Readonly<
  Partial<Record<CubeAccessPointGroupAccess, string>>
> = {
  [CubeAccessPointGroupAccess.ENTERPRISE]: 'Enterprise access',
  [CubeAccessPointGroupAccess.APPROVED]: 'Entitled',
  [CubeAccessPointGroupAccess.SUBMITTED_FOR_APPROVALS]:
    'Submitted for approval',
  [CubeAccessPointGroupAccess.PENDING_MANAGER_APPROVAL]:
    'Pending manager approval',
  [CubeAccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL]:
    'Pending data owner approval',
};

export const CUBE_NO_ACCESS_LABEL = 'No access';
