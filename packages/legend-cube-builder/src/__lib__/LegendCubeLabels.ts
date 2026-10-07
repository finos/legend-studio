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

import { CubeTableFlag } from '../graph-manager/CubeEngine.js';

// The page's own text and settings; validation messages live in the core's
// CubeMessages (PLAN §4.11)

/** The rows a run returns by default (PLAN §9, Settled before M1.8) */
export const DEFAULT_ROW_LIMIT = 1000;
/** Above this, the row limit input warns that the tab may slow down; there is no hard cap */
export const ROW_LIMIT_WARNING_THRESHOLD = 100_000;
/** At most this many undo steps are kept */
export const MAX_UNDO_STEPS = 100;

export enum LEGEND_CUBE_USER_DATA_KEY {
  ROW_LIMIT = 'legend-cube.row-limit',
}

export const UNSAVED_CUBE_NAME = 'Unsaved Query';
/** How a SQL NULL shows in the grid, distinct from an empty string */
export const NULL_CELL_TEXT = '(null)';

/** Pending labels: lower-case gerunds, shown as they are (spec §17.13) */
export enum CUBE_PENDING_LABEL {
  LOADING_MODEL = 'loading model',
  RESOLVING_SOURCE = 'resolving source',
  EXECUTING_QUERY = 'executing query',
  RENDERING_QUERY = 'rendering query',
}

export const getRowLimitError = (text: string): string | undefined => {
  const value = Number(text.trim());
  return text.trim() === '' || !Number.isSafeInteger(value) || value < 1
    ? 'The row limit must be a whole number of at least 1.'
    : undefined;
};

export const getTruncationMessage = (rowLimit: number): string =>
  `Showing the first ${rowLimit.toLocaleString('en-US')} rows; the query returned more.`;

/** How the picker shows a table's problem, and why (PLAN §6.2.6) */
export const CUBE_TABLE_FLAG_LABELS: Readonly<
  Record<CubeTableFlag, { label: string; description: string }>
> = {
  [CubeTableFlag.UNAVAILABLE]: {
    label: 'unavailable',
    description: "A column's type (BINARY or VARBINARY) can't be read by Cube.",
  },
  [CubeTableFlag.LENGTH_UNKNOWN]: {
    label: 'length unknown',
    description: 'A CHAR column: its length is not known to Cube.',
  },
  [CubeTableFlag.TYPE_UNKNOWN]: {
    label: 'type unknown',
    description: "A column's type (OTHER or ARRAY) is not known to Cube.",
  },
};
