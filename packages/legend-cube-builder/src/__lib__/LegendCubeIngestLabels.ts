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
import { getSchemaChangeList } from './LegendCubeLabels.js';

// The text of ingest data set sources (PLAN §6.7): the source dialog's
// Ingest tab and an ingest data set's panel

export const getDataSetDriftWarning = (diff: SchemaDiff): string =>
  `This data set changed since the cube was saved: ${getSchemaChangeList(diff)}`;

export const getDataSetRecheckWarning = (firstLine: string): string =>
  `Could not re-check this data set, so it keeps its saved columns: ${firstLine}`;

export const CUBE_INGEST_RECHECK_MESSAGE = {
  NO_ANSWER: 'The ingest catalog gave no columns for this data set',
  NO_CATALOG: "This Legend deployment doesn't serve ingest data sets",
} as const;

/** How many of a producer deployment's definitions the tab leaves out, or nothing when it lists them all */
export const getDroppedDefinitionsLabel = (
  count: number,
): string | undefined =>
  count === 0
    ? undefined
    : `${count} ${count === 1 ? 'definition' : 'definitions'} not deployed from a project, or deployed to another environment, not shown`;
