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

// The words of a data space source (PLAN §11.25)

/** Above the query builder in a data space source's editor */
export const CUBE_DATA_SPACE_EDITOR_HINT =
  "The query builder's data space, entity, explorer, columns and filter. Aggregates, query options and post-filters are Cube's own steps, after this one.";

/** The Data Space tab's text */
export const CUBE_DATA_SPACE_TAB_LABEL = {
  INTRO:
    "A class of a data space, as the query builder queries it. Add opens the source's editor, where its entity, columns and filter are picked.",
  LOADING: 'listing data spaces',
  READING: 'reading the data space',
  /** The project the cube reads, at the version picked */
  PROJECT: (project: string): string => `From ${project}`,
} as const;

/** How many of the matching data spaces the list shows, when it can't show all */
export const getShownDataSpacesLabel = (
  shown: number,
  matching: number,
): string | undefined =>
  shown < matching
    ? `Showing ${shown} of ${matching} data spaces: search to narrow the list`
    : undefined;

export const getDataSpaceDriftWarning = (diff: SchemaDiff): string =>
  `This data space source's columns changed since the cube was saved: ${getSchemaChangeList(diff)}`;

export const getDataSpaceRecheckWarning = (firstLine: string): string =>
  `Could not re-check this data space source, so it keeps its saved columns: ${firstLine}`;

export const CUBE_DATA_SPACE_MESSAGE = {
  NO_ANSWER: "The engine gave no columns for this data space source's query",
  NONE: 'The depot has no released data space.',
  NO_MATCH: 'No data space matches the search.',
  CUBE_CHANGED:
    'The cube changed while the data space was being added; pick it again.',
  /** The editor's query runs in another execution context than the cube's other data space sources */
  OTHER_CONTEXT: (context: string, cubeContext: string): string =>
    `The cube's other data space sources run in execution context "${cubeContext}", not "${context}": pick it, or remove them first.`,
  LOADING: 'Loading the data space…',
  /** A page whose host has no data space editor, e.g. a cube opened elsewhere */
  NO_EDITOR: "This page can't edit data spaces: its host has no query builder",
  /** The cube's model isn't a project at a released version */
  NO_PROJECT:
    "The cube's project can't be read, so its data space can't be edited",
  /** The query builder holds no query Cube can run yet */
  NO_QUERY: 'Pick an entity and at least one column',
} as const;
